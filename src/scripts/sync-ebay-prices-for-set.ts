// One-off/ad-hoc: price every card in a single named Set via the eBay Browse
// API, reusing the exact same search/match/write pipeline as the full-catalog
// sweep (sweep-catalog.ts) — including titleMatchesVariant's base/parallel
// exclusion fix — just scoped to one set instead of the whole catalog. One
// representative (base-preferred) Variant per Card, same as the sweep's
// Priority 2 tier. Shares the sweep's DataSource id ("ebay_browse_api") so
// it respects the same daily quota bucket if both ever run close together.
//
// CLI: npx tsx src/scripts/sync-ebay-prices-for-set.ts "Topps Chrome Basketball 2024-25"
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
// Bounds the image-attach step (attachHotlinkImage + processMediaRow) —
// real incident 2026-08-12: a Supabase pooler connection blip on
// `mediaVariant.findFirst` sent prisma.ts's own transient-error retry
// wrapper into a long exponential-backoff ladder (up to 10 attempts), which
// stalled the entire per-card loop for minutes on a single image while every
// other card behind it waited. Prices are already written earlier in the
// per-card try block by the time this step runs, so a slow/stuck image must
// never block or fail the card's price data — just skip the image and move
// on within a bounded window.
const IMAGE_STEP_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))]);
}

function rank(v: { parallelId: string | null; insertId: string | null; isAuto: boolean; isPatch: boolean; isRelic: boolean; serialTo: number | null }): number {
  return v.parallelId || v.insertId || v.isAuto || v.isPatch || v.isRelic || v.serialTo ? 1 : 0; // 0 = plain base, preferred
}

interface CardTarget {
  id: string;
  variantId: string;
  query: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  serialTo?: number | null;
  excludeKeywords?: string[];
}

async function buildTargets(setId: string, setName: string): Promise<CardTarget[]> {
  const cards = await prisma.card.findMany({ where: { setId }, orderBy: { id: "asc" }, select: { id: true, name: true, number: true } });
  const variants = await prisma.variant.findMany({
    where: { card: { setId } },
    select: {
      id: true,
      cardId: true,
      parallelId: true,
      insertId: true,
      isAuto: true,
      isPatch: true,
      isRelic: true,
      serialTo: true,
      parallel: { select: { name: true, color: true } },
      insert: { select: { name: true } },
    },
  });

  const byCard = new Map<string, typeof variants>();
  for (const v of variants) {
    const list = byCard.get(v.cardId) ?? [];
    list.push(v);
    byCard.set(v.cardId, list);
  }

  const targets: CardTarget[] = [];
  for (const card of cards) {
    const cardVariants = byCard.get(card.id) ?? [];
    if (cardVariants.length === 0) continue; // shouldn't happen, skip defensively
    let best = cardVariants[0];
    for (const v of cardVariants) if (rank(v) < rank(best)) best = v;

    const isBase = !best.parallelId && !best.insertId;
    const excludeKeywords = isBase
      ? [...new Set(cardVariants.filter((v) => v.id !== best.id).flatMap((v) => variantMatchKeywords(v, setName, card.name)))]
      : undefined;

    targets.push({
      id: card.id,
      variantId: best.id,
      query: `${setName} ${card.name} #${card.number}`.trim(),
      cardName: card.name,
      cardNumber: card.number,
      setName,
      serialTo: best.serialTo,
      excludeKeywords: excludeKeywords && excludeKeywords.length > 0 ? excludeKeywords : undefined,
    });
  }
  return targets;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  // --no-images: skips attachHotlinkImage/processMediaRow entirely — added
  // 2026-08-12 after a live run stalled repeatedly on `[db-retry]
  // MediaVariant.findFirst` (Supabase pooler flakiness under load) inside
  // that step, with each retry ladder burning up to ~30s before the next
  // card even started. Prices don't depend on images landing.
  const noImages = rawArgs.includes("--no-images");
  // --force: re-fetch every card even if it already has a CurrentPrice row.
  // Skip-if-already-priced is the default (not opt-in) because this process
  // has now been killed by something outside the script twice mid-run (once
  // at card 71, once at card 274) — restarting from card 1 every time wastes
  // real minutes and eBay quota re-fetching cards that already succeeded.
  const force = rawArgs.includes("--force");
  const setName = rawArgs.filter((a) => a !== "--no-images" && a !== "--force").join(" ").trim();
  if (!setName) {
    console.error('Usage: npx tsx src/scripts/sync-ebay-prices-for-set.ts "<Set Name>" [--no-images] [--force]');
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

  console.log(`[setup] building card/variant targets...`);
  let targets = await buildTargets(set.id, set.name);
  console.log(`[setup] ${targets.length} candidate target(s) built.`);
  if (!force) {
    console.log(`[setup] checking which targets already have a price...`);
    const alreadyPriced = await prisma.currentPrice.findMany({
      where: { variantId: { in: targets.map((t) => t.variantId) } },
      select: { variantId: true },
    });
    const pricedIds = new Set(alreadyPriced.map((p) => p.variantId));
    // A card only counts as "done" (skippable) if it already has a price
    // AND — when this run is actually fetching images — an image too.
    // Otherwise a prices-only run's output would permanently block a later
    // images-enabled run from ever visiting those same cards for their photo.
    let doneCardIds = new Set<string>();
    if (!noImages) {
      console.log(`[setup] checking which cards already have an image...`);
      const existingImages = await prisma.mediaAttachment.findMany({
        where: { entityType: "Card", entityId: { in: targets.map((t) => t.id) }, usage: "EBAY_LISTING_PHOTO" },
        select: { entityId: true },
      });
      doneCardIds = new Set(existingImages.map((m) => m.entityId));
    }
    const before = targets.length;
    targets = targets.filter((t) => !pricedIds.has(t.variantId) || (!noImages && !doneCardIds.has(t.id)));
    if (before !== targets.length) console.log(`Skipping ${before - targets.length} card(s) already fully done (pass --force to re-fetch everything).`);
  }
  console.log(`Set "${set.name}" (${set.id}): ${targets.length} card(s) to price.\n`);

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
              entityId: target.id,
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
          // Price data above is already written — an image hiccup must never
          // look like a failed card. Just note it and move on.
          console.log(`    (image skipped for "${target.query}": ${imgErr.message})`);
        }
      }

      if (written > 0) await recomputeCurrentPricesForVariants([target.variantId], now, prisma);

      processed++;
      console.log(
        `  [${i + 1}/${targets.length}] "${target.query}" — ${cleanPrices.length} clean price(s), median $${median(cleanPrices)?.toFixed(2) ?? "n/a"}, image=${imageAttachedThisCard}`
      );
    } catch (e: any) {
      console.log(`  [${i + 1}/${targets.length}] "${target.query}" — FAILED (${e.message})`);
      failed.push(target.id);
    }
  }

  console.log(`\nDone. Processed ${processed}/${targets.length}, wrote ${observationsWritten} observation(s), attached ${imagesAttached} image(s).`);
  if (failed.length > 0) console.log(`${failed.length} failed card id(s): ${failed.slice(0, 20).join(", ")}${failed.length > 20 ? "…" : ""}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
