// One-off/ad-hoc: price only the Variants a specific user actually owns
// within one named Set — narrower than sync-ebay-prices-for-set.ts (which
// prices one base-preferred representative per Card, catalog-style) and
// narrower than sweep-catalog.ts's Tier 0 (which does this for every owned
// Variant across ALL users, catalog-wide). Reuses the exact same matching
// helpers as both (titleMatchesVariant, variantMatchKeywords,
// describeVariantForQuery) so an owned parallel/insert gets verified against
// its own distinctive keywords, and an owned base variant gets excludeKeywords
// built from its card's sibling parallels — same anti-cross-contamination
// protection as the full sweep, just scoped to one user + one set.
//
// CLI: npx tsx src/scripts/sync-ebay-prices-owned-for-set.ts "Topps Chrome Basketball 2024-25" "allipuramsamanyu@gmail.com"
import { prisma } from "../ingestion/engine/prisma";
import { getOrCreateDataSource, attachHotlinkImage } from "../ingestion/engine/media";
import { processMediaRow } from "../ingestion/engine/process-media";
import { searchItems, isLikelyBulkListing, isLikelyGraded, titleMatchesCard } from "../ingestion/ebay/api-client";
import { median, dropGrossOutlierPairs } from "../ingestion/ebay/sync-prices";
import { titleMatchesVariant, variantMatchKeywords } from "../ingestion/ebay/sweep-catalog";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import { throttleRequest, type RateLimitWindow } from "@/lib/pricing/rate-limit";
import type { RawPriceObservation } from "@/lib/pricing/types";

const SOURCE_ID = "ebay_browse_api";
const MAX_OBSERVATIONS_PER_CARD = 8;
const EBAY_DAILY_WINDOW: RateLimitWindow[] = [{ windowSeconds: 86400, maxPerWindow: 4800 }];
const IMAGE_STEP_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))]);
}

interface VariantTarget {
  cardId: string;
  variantId: string;
  query: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  serialTo: number | null;
  variantKeywords?: string[]; // set when this owned variant IS a parallel/insert
  excludeKeywords?: string[]; // set when this owned variant IS the base print
}

async function buildTargets(userId: string, setId: string, setName: string): Promise<VariantTarget[]> {
  const owned = await prisma.instance.findMany({
    where: { userId, variant: { card: { setId } } },
    distinct: ["variantId"],
    select: { variantId: true },
  });
  const ownedVariantIds = [...new Set(owned.map((o) => o.variantId))];
  if (ownedVariantIds.length === 0) return [];

  const ownedVariants = await prisma.variant.findMany({
    where: { id: { in: ownedVariantIds } },
    include: { card: true, parallel: true, insert: true },
  });

  const cardIds = [...new Set(ownedVariants.map((v) => v.cardId))];
  const siblings = await prisma.variant.findMany({
    where: { cardId: { in: cardIds } },
    include: { parallel: true, insert: true },
  });
  const allSiblingsByCard = new Map<string, typeof siblings>();
  for (const s of siblings) {
    const list = allSiblingsByCard.get(s.cardId) ?? [];
    list.push(s);
    allSiblingsByCard.set(s.cardId, list);
  }

  const targets: VariantTarget[] = [];
  for (const v of ownedVariants) {
    const isBase = !v.parallelId && !v.insertId;
    const excludeKeywords = isBase
      ? [...new Set((allSiblingsByCard.get(v.cardId) ?? []).filter((s) => s.id !== v.id).flatMap((s) => variantMatchKeywords(s, setName, v.card.name)))]
      : undefined;

    targets.push({
      cardId: v.cardId,
      variantId: v.id,
      query: `${setName} ${v.card.name} #${v.card.number}`.trim(),
      cardName: v.card.name,
      cardNumber: v.card.number,
      setName,
      serialTo: v.serialTo,
      variantKeywords: isBase ? undefined : variantMatchKeywords(v, setName, v.card.name),
      excludeKeywords: excludeKeywords && excludeKeywords.length > 0 ? excludeKeywords : undefined,
    });
  }
  return targets;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const noImages = rawArgs.includes("--no-images");
  const force = rawArgs.includes("--force");
  const positional = rawArgs.filter((a) => a !== "--no-images" && a !== "--force");
  const [setName, userEmail] = positional;
  if (!setName || !userEmail) {
    console.error('Usage: npx tsx src/scripts/sync-ebay-prices-owned-for-set.ts "<Set Name>" "<user email>" [--no-images] [--force]');
    process.exit(1);
  }

  console.log(`[setup] looking up user "${userEmail}"...`);
  const user = await prisma.user.findFirst({ where: { email: { equals: userEmail, mode: "insensitive" } } });
  if (!user) {
    console.error(`No User found matching "${userEmail}"`);
    process.exit(1);
  }

  console.log(`[setup] looking up set "${setName}"...`);
  const set = await prisma.set.findFirst({ where: { name: { equals: setName, mode: "insensitive" } } });
  if (!set) {
    console.error(`No Set found matching "${setName}"`);
    process.exit(1);
  }

  console.log(`[setup] found set ${set.id}, resolving data source...`);
  const sourceId = await getOrCreateDataSource(SOURCE_ID, "OFFICIAL_API");
  await prisma.dataSource.update({ where: { id: sourceId }, data: { lastSyncedAt: new Date() } });

  console.log(`[setup] building owned targets for ${userEmail} in "${set.name}"...`);
  let targets = await buildTargets(user.id, set.id, set.name);
  console.log(`[setup] ${targets.length} owned variant(s) found.`);

  if (!force) {
    const alreadyPriced = await prisma.currentPrice.findMany({
      where: { variantId: { in: targets.map((t) => t.variantId) } },
      select: { variantId: true },
    });
    const pricedIds = new Set(alreadyPriced.map((p) => p.variantId));
    let doneCardIds = new Set<string>();
    if (!noImages) {
      const existingImages = await prisma.mediaAttachment.findMany({
        where: { entityType: "Card", entityId: { in: targets.map((t) => t.cardId) }, usage: "EBAY_LISTING_PHOTO" },
        select: { entityId: true },
      });
      doneCardIds = new Set(existingImages.map((m) => m.entityId));
    }
    const before = targets.length;
    targets = targets.filter((t) => !pricedIds.has(t.variantId) || (!noImages && !doneCardIds.has(t.cardId)));
    if (before !== targets.length) console.log(`Skipping ${before - targets.length} variant(s) already fully done (pass --force to re-fetch everything).`);
  }
  console.log(`Set "${set.name}" (${set.id}), user ${userEmail}: ${targets.length} owned variant(s) to price.\n`);

  let processed = 0;
  let observationsWritten = 0;
  let imagesAttached = 0;
  const failed: string[] = [];

  for (const [i, target] of targets.entries()) {
    try {
      await throttleRequest(sourceId, EBAY_DAILY_WINDOW, prisma, Infinity);
      const { items } = await searchItems(target.query, { limit: 50 });
      const cleanItems = items.filter(
        (it) =>
          it.price?.currency === "USD" &&
          !isLikelyBulkListing(it.title) &&
          !isLikelyGraded(it.title) &&
          titleMatchesCard(it.title, target.cardName, target.cardNumber, target.setName) &&
          titleMatchesVariant(it.title, target)
      );
      const pricedItems = cleanItems
        .map((item) => ({ item, price: Number(item.price!.value) }))
        .filter((p) => Number.isFinite(p.price) && p.price > 0);
      const cleanPairs = dropGrossOutlierPairs(pricedItems).slice(0, MAX_OBSERVATIONS_PER_CARD);
      const cleanPrices = cleanPairs.map((p) => p.price);

      const now = new Date();
      const rows: Array<RawPriceObservation & { sourceId: string }> = cleanPairs.map(({ price, item }) => ({
        variantId: target.variantId,
        kind: "LISTING",
        price,
        currency: "USD",
        observedAt: now,
        sourceUrl: item.itemWebUrl ?? undefined,
        externalRef: item.itemId,
        sourceId,
      }));
      const written = await writePriceObservationsBatch(rows, prisma);
      observationsWritten += written;

      const bestImage = cleanItems.find((it) => it.imageUrl)?.imageUrl ?? null;
      let imageAttachedThisCard = false;
      if (bestImage && !noImages) {
        try {
          const attached = await withTimeout(
            attachHotlinkImage({
              url: bestImage,
              entityType: "Card",
              entityId: target.cardId,
              usage: "EBAY_LISTING_PHOTO",
              sourceIdentifier: SOURCE_ID,
              sourceKind: "OFFICIAL_API",
              replaceExisting: true,
            }),
            IMAGE_STEP_TIMEOUT_MS,
            "attachHotlinkImage"
          );
          if (attached) {
            const p = await withTimeout(processMediaRow(attached.mediaId), IMAGE_STEP_TIMEOUT_MS, "processMediaRow");
            if (p.status !== "failed") {
              imagesAttached++;
              imageAttachedThisCard = true;
            }
          }
        } catch (imgErr: any) {
          console.log(`    (image skipped for "${target.query}": ${imgErr.message})`);
        }
      }

      if (written > 0) await recomputeCurrentPricesForVariants([target.variantId], now, prisma);

      processed++;
      console.log(
        `  [${i + 1}/${targets.length}] "${target.query}" (variant ${target.variantId}) — ${cleanPrices.length} clean price(s), median $${median(cleanPrices)?.toFixed(2) ?? "n/a"}, image=${imageAttachedThisCard}`
      );
    } catch (e: any) {
      console.log(`  [${i + 1}/${targets.length}] "${target.query}" — FAILED (${e.message})`);
      failed.push(target.variantId);
    }
  }

  console.log(`\nDone. Processed ${processed}/${targets.length}, wrote ${observationsWritten} observation(s), attached ${imagesAttached} image(s).`);
  if (failed.length > 0) console.log(`${failed.length} failed variant id(s): ${failed.slice(0, 20).join(", ")}${failed.length > 20 ? "…" : ""}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
