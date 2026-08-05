// Real Tier-1 price source (docs/adr/003-price-engine-architecture.md): eBay's
// Browse API, an official credentialed API (Production keys provisioned this
// session). Mirrors ../pokemon/sync-prices.ts's overall shape.
//
// IMPORTANT — what this actually observes: item_summary/search returns ACTIVE
// listings (asks), not completed sales. Every observation this job writes is
// kind: "LISTING", never "SOLD" — real sold-comp data would need eBay's
// separately-gated Marketplace Insights API, which this project doesn't have
// access to yet. Don't relabel these as sold prices anywhere downstream.
//
// COMPLIANCE — read before scheduling this as a recurring job. eBay's API
// License Agreement (§8.1, checked against the archived 2018 text — the live
// page 403s to non-browser fetches, verified via web.archive.org) imposes two
// concrete obligations this one-shot pilot does NOT yet satisfy:
//   (b)(1) "When the eBay Content is no longer publicly available, you must
//          delete it from your Application." — a listing image/price we
//          store persistently must be removed once that specific listing
//          ends. No re-verification/deletion job exists yet for eBay-sourced
//          data (the existing image-verifier.ts job doesn't cover this
//          source). Required before any long-running/scheduled use.
//          USER DECISION (explicit, informed): prices and images are kept as
//          reference data even after the source listing ends, refreshed
//          periodically (not deleted-on-delisting) — accepted risk, not an
//          oversight. Images now go further than a hotlink: they're
//          downloaded and re-hosted in Supabase Storage (see below) rather
//          than just linked, which is a stronger copy of eBay Content than
//          this clause originally contemplated — flagged, not blocking,
//          since it's the same accepted-risk decision extended to images.
//   (c)   "Displayed item listing information may not be more than six (6)
//          hours older than information displayed on the eBay Site" — i.e.
//          anything shown to users as current eBay data needs a <=6h refresh
//          cadence, not a one-time pull treated as evergreen.
// A third clause (8.1.d.1.D) restricts deriving "Average selling price... for
// any eBay category" without eBay's written permission. Read in context (a
// list alongside site-wide statistics and seller-performance aggregates) this
// reads as targeting marketplace-wide category analytics, not a per-product
// price computed from a handful of listings matching one specific card —
// which is the Browse API's own stated shopping/price-comparison use case.
// That's an interpretation, not a certainty, and worth a real legal read
// before this scales past a pilot.
import { prisma } from "../engine/prisma";
import { getOrCreateDataSource, attachHotlinkImage } from "../engine/media";
import { processMediaRow } from "../engine/process-media";
import { searchItems, sleep, isLikelyBulkListing, isLikelyGraded, titleMatchesCard } from "./api-client";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import type { RawPriceObservation } from "@/lib/pricing/types";

const SOURCE_ID = "ebay_browse_api";
const MAX_OBSERVATIONS_PER_VARIANT = 8; // top-N listings written as individual observations, same spirit as Pokemon's low/market/high writes

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Drops prices more than 3x away from the median before writing — a cheap
// first-pass sanity filter (wrong-item matches in keyword search tend to be
// wildly off, e.g. a $4 base card query matching a $400 graded slab or a
// lot-of-50). recompute.ts's own outlier flagging still runs on top of this.
export function dropGrossOutliers(prices: number[]): number[] {
  const med = median(prices);
  if (med == null || med === 0) return prices;
  return prices.filter((p) => p / med < 3 && med / p < 3);
}

interface QueryTarget {
  variantId: string;
  query: string;
  cardId: string;
  cardName: string; // structured, for titleMatchesCard() post-filtering — don't re-parse out of `query`
  cardNumber: string;
  setName: string;
}

async function buildQueryTargets(variantIds: string[]): Promise<QueryTarget[]> {
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: {
      card: { include: { set: true } },
      parallel: true,
      insert: true,
    },
  });

  return variants.map((v) => {
    const parts = [v.card.set.name, v.card.name, `#${v.card.number}`];
    if (v.parallel?.name) parts.push(v.parallel.name);
    else if (v.insert?.name && v.insert.name !== v.card.supertype) parts.push(v.insert.name);
    if (v.serialTo) parts.push(`/${v.serialTo}`);
    return { variantId: v.id, cardId: v.cardId, query: parts.join(" "), cardName: v.card.name, cardNumber: v.card.number, setName: v.card.set.name };
  });
}

export interface SyncResult {
  variantId: string;
  query: string;
  totalFound: number;
  observationsWritten: number;
  medianPriceUsd: number | null;
  imageAttached: boolean;
  imageUrl: string | null;
  topTitles: string[];
  error?: string;
}

export async function syncEbayPricesForVariants(variantIds: string[]): Promise<SyncResult[]> {
  const sourceId = await getOrCreateDataSource(SOURCE_ID, "OFFICIAL_API");
  await prisma.dataSource.update({ where: { id: sourceId }, data: { lastSyncedAt: new Date() } });

  const targets = await buildQueryTargets(variantIds);
  const results: SyncResult[] = [];
  const touchedVariantIds: string[] = [];

  for (const [i, target] of targets.entries()) {
    try {
      const { total, items } = await searchItems(target.query, { limit: 10 });
      const usdItems = items.filter(
        (it) =>
          it.price &&
          it.price.currency === "USD" &&
          !isLikelyBulkListing(it.title) &&
          !isLikelyGraded(it.title) &&
          titleMatchesCard(it.title, target.cardName, target.cardNumber, target.setName)
      );
      const rawPrices = usdItems.map((it) => Number(it.price!.value)).filter((v) => Number.isFinite(v) && v > 0);
      const cleanPrices = dropGrossOutliers(rawPrices).slice(0, MAX_OBSERVATIONS_PER_VARIANT);

      const now = new Date();
      const rows: Array<RawPriceObservation & { sourceId: string }> = cleanPrices.map((price, idx) => ({
        variantId: target.variantId,
        kind: "LISTING",
        price,
        currency: "USD",
        observedAt: now,
        sourceUrl: usdItems[idx]?.itemWebUrl ?? undefined,
        externalRef: usdItems[idx]?.itemId,
        sourceId,
      }));

      const written = await writePriceObservationsBatch(rows, prisma);
      if (written > 0) touchedVariantIds.push(target.variantId);

      // Best-match image. Downloaded and re-hosted in our own Supabase Storage
      // (not left as a bare eBay CDN hotlink) so it survives the source listing
      // expiring — user decision, since eBay listings are far shorter-lived than
      // the official-artwork hotlinks every other ingestion source uses. The
      // attach step still creates the Media row via the same hotlink convention
      // (cheap, no network I/O), then processMediaRow immediately downloads and
      // flips it from provider="external" to provider="supabase" in place.
      const bestImage = items.find(
        (it) =>
          it.imageUrl &&
          !isLikelyBulkListing(it.title) &&
          !isLikelyGraded(it.title) &&
          titleMatchesCard(it.title, target.cardName, target.cardNumber, target.setName)
      )?.imageUrl ?? null;
      let imageAttached = false;
      if (bestImage) {
        const attached = await attachHotlinkImage({
          url: bestImage,
          entityType: "Card",
          entityId: target.cardId,
          usage: "EBAY_LISTING_PHOTO",
          sourceIdentifier: SOURCE_ID,
          sourceKind: "OFFICIAL_API",
          replaceExisting: true, // a re-run's better-matched image must replace a stale/wrong one, not sit alongside it
        });
        if (attached) {
          const processed = await processMediaRow(attached.mediaId);
          imageAttached = processed.status !== "failed";
        }
      }

      results.push({
        variantId: target.variantId,
        query: target.query,
        totalFound: total,
        observationsWritten: written,
        medianPriceUsd: median(cleanPrices),
        imageAttached,
        imageUrl: bestImage,
        topTitles: items.slice(0, 3).map((it) => it.title),
      });

      console.log(
        `  [${i + 1}/${targets.length}] "${target.query}" — ${total} found, ${written} obs written, median $${median(cleanPrices)?.toFixed(2) ?? "n/a"}, image=${imageAttached}`
      );
    } catch (e: any) {
      console.log(`  [${i + 1}/${targets.length}] "${target.query}" — FAILED (${e.message})`);
      results.push({
        variantId: target.variantId,
        query: target.query,
        totalFound: 0,
        observationsWritten: 0,
        medianPriceUsd: null,
        imageAttached: false,
        imageUrl: null,
        topTitles: [],
        error: e.message,
      });
    }
    await sleep(300); // gentle pacing — see rate-limit findings in the pilot report
  }

  if (touchedVariantIds.length > 0) {
    await recomputeCurrentPricesForVariants(touchedVariantIds, new Date(), prisma);
  }

  return results;
}

// CLI entry point: `npx tsx src/ingestion/ebay/sync-prices.ts <variantId> [variantId...]`
if (require.main === module) {
  const variantIds = process.argv.slice(2);
  if (variantIds.length === 0) {
    console.error("Usage: npx tsx src/ingestion/ebay/sync-prices.ts <variantId> [variantId...]");
    process.exit(1);
  }
  syncEbayPricesForVariants(variantIds)
    .then((results) => {
      console.log("\n" + JSON.stringify(results, null, 2));
    })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
