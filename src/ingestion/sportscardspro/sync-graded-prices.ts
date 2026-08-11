// SportsCardsPro sync — a second, independent pricing source alongside the
// eBay sweep (src/ingestion/ebay/sweep-catalog.ts). Two things eBay doesn't
// give us directly: (1) a single authoritative ungraded reference price per
// card instead of a statistical median over noisy listings, and (2) real
// per-grade price tiers (PSA 10, BGS 10, CGC 10, SGC 10, Grade 9, Grade 8,
// Grade 7) feeding GradedPriceObservation, which had schema support but no
// ongoing feed before this (only a one-off seed script had ever written to
// it — see src/lib/pricing/write-graded-observation.ts's doc comment).
//
// Owned-variants-first, same priority reasoning as the eBay sweep's Tier 0:
// real demand (a user actually owns this) beats catalog-wide breadth. Unlike
// the eBay sweep, this doesn't need a resumable cursor for now — at
// SportsCardsPro's real documented limit (1 call/sec) a full owned-variants
// pass finishes in well under half an hour, comfortably inside a single
// invocation, so cursoring is deferred until this also needs to cover the
// full catalog.
//
// Run: npx tsx src/ingestion/sportscardspro/sync-graded-prices.ts
import { prisma } from "../engine/prisma";
import { getOrCreateDataSource } from "../engine/media";
import { searchProducts, penniesToUsd, PRICE_FIELD_MEANING, type SportsCardsProProduct } from "./api-client";
import { titleMatchesCard } from "../ebay/api-client";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { writeGradedPriceObservationsBatch, type RawGradedPriceObservation } from "@/lib/pricing/write-graded-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import { throttleRequest, type RateLimitWindow } from "@/lib/pricing/rate-limit";
import type { RawPriceObservation } from "@/lib/pricing/types";

const SOURCE_ID = "sportscardspro_api";
// Documented real limit: "1 call every second." No daily cap is published,
// unlike eBay's — this window is the only one that matters.
const RATE_WINDOWS: RateLimitWindow[] = [{ windowSeconds: 1, maxPerWindow: 1 }];

const GRADED_FIELD_KEYS = Object.keys(PRICE_FIELD_MEANING).filter((k) => k !== "loose-price") as Array<
  Exclude<keyof typeof PRICE_FIELD_MEANING, "loose-price">
>;

interface OwnedTarget {
  variantId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
}

async function loadOwnedTargets(): Promise<OwnedTarget[]> {
  const rows = await prisma.instance.findMany({
    select: { variant: { select: { id: true, card: { select: { name: true, number: true, set: { select: { name: true } } } } } } },
    distinct: ["variantId"],
  });
  const seen = new Set<string>();
  const targets: OwnedTarget[] = [];
  for (const r of rows) {
    if (seen.has(r.variant.id)) continue;
    seen.add(r.variant.id);
    targets.push({
      variantId: r.variant.id,
      cardName: r.variant.card.name,
      cardNumber: r.variant.card.number,
      setName: r.variant.card.set.name,
    });
  }
  return targets;
}

/** Picks the best-matching product from a search result, or null if nothing passes the real-match check. */
function pickMatch(products: SportsCardsProProduct[], target: OwnedTarget): SportsCardsProProduct | null {
  for (const p of products) {
    const title = p["product-name"] ?? "";
    if (!title) continue;
    if (titleMatchesCard(title, target.cardName, target.cardNumber, target.setName)) return p;
  }
  return null;
}

async function main() {
  const sourceId = await getOrCreateDataSource(SOURCE_ID, "OFFICIAL_API");
  const targets = await loadOwnedTargets();
  console.log(`SportsCardsPro sync — ${targets.length} distinct owned variant(s) to check.`);

  let matched = 0;
  let noMatch = 0;
  let errored = 0;
  const touchedVariantIds = new Set<string>();

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    await throttleRequest(SOURCE_ID, RATE_WINDOWS);

    let product: SportsCardsProProduct | null = null;
    try {
      const query = `${target.setName} ${target.cardName} #${target.cardNumber}`.trim();
      const results = await searchProducts(query);
      product = pickMatch(results, target);
    } catch (e) {
      errored++;
      console.log(`  [${i + 1}/${targets.length}] "${target.setName} ${target.cardName} #${target.cardNumber}" — error: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (!product) {
      noMatch++;
      console.log(`  [${i + 1}/${targets.length}] "${target.setName} ${target.cardName} #${target.cardNumber}" — no match`);
      continue;
    }

    const observedAt = new Date();
    const ungradedUsd = penniesToUsd(product["loose-price"]);
    const ungradedRows: Array<RawPriceObservation & { sourceId: string }> = [];
    if (ungradedUsd != null) {
      ungradedRows.push({
        variantId: target.variantId,
        kind: "LISTING",
        price: ungradedUsd,
        currency: "USD",
        observedAt,
        externalRef: product.id,
        sourceId,
      });
    }

    const gradedRows: RawGradedPriceObservation[] = [];
    for (const key of GRADED_FIELD_KEYS) {
      const usd = penniesToUsd(product[key]);
      if (usd == null) continue;
      const meaning = PRICE_FIELD_MEANING[key];
      gradedRows.push({
        variantId: target.variantId,
        company: meaning.company,
        grade: meaning.grade,
        price: usd,
        currency: "USD",
        observedAt,
        externalRef: `${product.id}:${key}`,
      });
    }

    if (ungradedRows.length > 0) await writePriceObservationsBatch(ungradedRows);
    if (gradedRows.length > 0) await writeGradedPriceObservationsBatch(gradedRows, sourceId);

    if (ungradedRows.length > 0 || gradedRows.length > 0) {
      matched++;
      touchedVariantIds.add(target.variantId);
      console.log(
        `  [${i + 1}/${targets.length}] "${target.setName} ${target.cardName} #${target.cardNumber}" — matched "${product["product-name"]}", ungraded=${ungradedUsd ?? "n/a"}, ${gradedRows.length} graded tier(s)`
      );
    } else {
      noMatch++;
      console.log(`  [${i + 1}/${targets.length}] "${target.setName} ${target.cardName} #${target.cardNumber}" — matched but no usable price fields`);
    }

    // Recompute CurrentPrice in batches rather than per-card — same
    // reasoning as the eBay sweep, cheaper than one query per card.
    if (touchedVariantIds.size >= 50) {
      await recomputeCurrentPricesForVariants([...touchedVariantIds]);
      touchedVariantIds.clear();
    }
  }

  if (touchedVariantIds.size > 0) {
    await recomputeCurrentPricesForVariants([...touchedVariantIds]);
  }

  console.log(`\nDone. matched=${matched} noMatch=${noMatch} errored=${errored} of ${targets.length} total.`);
}

main()
  .catch((e) => {
    console.error("SportsCardsPro sync failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
