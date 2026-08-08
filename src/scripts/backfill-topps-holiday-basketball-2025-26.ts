import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * One-off, fully-comprehensive price + image backfill for 2025-26 Topps
 * Holiday Basketball (4,606 Variant rows) — explicit user exception to the
 * normal global scheduler (owned > base catalog > unowned rarities, see
 * sweep-catalog.ts), because this one set should be fully populated from
 * day one. Does NOT touch the global scheduler or its cursor — this is a
 * separate script, sharing only the real eBay rate-limit counter (same
 * DataSource identifier "ebay_browse_api", so it can't blow past the true
 * daily quota the cron also draws from).
 *
 * Internal ordering within this set, per explicit instruction:
 *   1. "owned"  — any Variant in this set a user already owns (Instance row)
 *   2. "base"   — the 200 plain H1-H200 base cards (one search each)
 *   3. "simple" — SSP Photo/Back Variations + the 5 no-parallel Insert
 *                 subsets (170 cards, one Variant each, no parallel ladder)
 *   4. "variant"— every parallel/auto/relic ladder row (the bulk, ~3,951
 *                  rows) — the least likely to have real eBay comps, so
 *                  deliberately last within this set too
 * After this script is done (or interrupted by quota/time), ongoing price
 * refreshes for these same cards fall back to the normal cron — this script
 * does not reschedule itself or modify DataSource.syncCursor.
 *
 * Resumable by construction, not by a cursor: every target is skipped if
 * its Variant already has a CurrentPrice row, so a killed/quota-exhausted
 * run just re-invokes and picks up exactly where it left off — no separate
 * progress-tracking state to get out of sync.
 *
 * Images: reuses the exact same attachHotlinkImage + processMediaRow calls
 * the global sweep uses — since process-media.ts's storageAdapter() now
 * prefers Appwrite when configured (2026-08-07), these writes land in
 * Appwrite automatically, no separate image-storage code needed here.
 */
import { getOrCreateDataSource, attachHotlinkImage } from "../ingestion/engine/media";
import { processMediaRow } from "../ingestion/engine/process-media";
import { searchItems, isLikelyBulkListing, isLikelyGraded, titleMatchesCard } from "../ingestion/ebay/api-client";
import { dropGrossOutliers } from "../ingestion/ebay/sync-prices";
import { describeVariantForQuery, variantMatchKeywords, titleMatchesVariant } from "../ingestion/ebay/sweep-catalog";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import { throttleRequest, RateLimitExceededError, type RateLimitWindow } from "@/lib/pricing/rate-limit";
import type { RawPriceObservation } from "@/lib/pricing/types";

const SET_ID = "topps-holiday-basketball-2025-26";
const SOURCE_ID = "ebay_browse_api"; // shared with the global sweep — same real eBay quota, not a second budget
const EBAY_DAILY_WINDOW: RateLimitWindow[] = [{ windowSeconds: 86400, maxPerWindow: 4800 }];
const MAX_OBSERVATIONS_PER_CARD = 8;
const DEFAULT_TIME_BUDGET_MS = 240_000;
// Bounded (not Infinity): if the shared daily quota is genuinely exhausted,
// fail fast and stop rather than sleep for hours — "continues automatically
// on the next run" means a clean exit now, not a long hang.
const MAX_RATE_LIMIT_WAIT_MS = 120_000;

type Tier = "owned" | "base" | "simple" | "variant";
const TIER_ORDER: Record<Tier, number> = { owned: 0, base: 1, simple: 2, variant: 3 };

interface Target {
  cardId: string;
  variantId: string;
  query: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  serialTo?: number | null;
  variantKeywords?: string[];
  tier: Tier;
}

async function buildTargets(prisma: typeof import("../ingestion/engine/prisma").prisma): Promise<Target[]> {
  const set = await prisma.set.findUniqueOrThrow({ where: { id: SET_ID }, select: { name: true } });

  const variants = await prisma.variant.findMany({
    where: { card: { setId: SET_ID }, currentPrice: null }, // resumability: already-priced rows are just never targeted again
    include: { card: true, parallel: true, insert: true },
  });

  const ownedRows = await prisma.instance.findMany({
    where: { variant: { card: { setId: SET_ID } } },
    select: { variantId: true },
    distinct: ["variantId"],
  });
  const ownedVariantIds = new Set(ownedRows.map((r) => r.variantId));

  const targets: Target[] = variants.map((v) => {
    const desc = describeVariantForQuery(v);
    const query = `${set.name} ${v.card.name} #${v.card.number}${desc ? " " + desc : ""}`.trim();
    const isLadderRow = !!v.parallelId || v.isAuto || v.isPatch || v.isRelic || !!v.serialTo;

    let tier: Tier;
    if (ownedVariantIds.has(v.id)) tier = "owned";
    else if (isLadderRow) tier = "variant";
    else if (v.insertId) tier = "simple"; // SSP Photo/Back + the 5 no-parallel insert subsets
    else tier = "base"; // plain H1-H200

    return {
      cardId: v.card.id,
      variantId: v.id,
      query,
      cardName: v.card.name,
      cardNumber: v.card.number,
      setName: set.name,
      serialTo: v.serialTo,
      variantKeywords: v.parallelId || v.insertId ? variantMatchKeywords(v) : undefined,
      tier,
    };
  });

  targets.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
  return targets;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const unbounded = process.argv.includes("--unbounded");
  const timeBudgetArg = process.argv.slice(2).find((a) => a !== "--dry-run" && a !== "--unbounded");
  const timeBudgetMs = unbounded ? Number.MAX_SAFE_INTEGER : timeBudgetArg ? Number(timeBudgetArg) : DEFAULT_TIME_BUDGET_MS;

  const { prisma } = await import("../ingestion/engine/prisma");
  const t0 = Date.now();

  const sourceId = await getOrCreateDataSource(SOURCE_ID, "OFFICIAL_API");
  const targets = await buildTargets(prisma);

  const counts: Record<Tier, number> = { owned: 0, base: 0, simple: 0, variant: 0 };
  for (const t of targets) counts[t.tier]++;
  console.log(
    `${targets.length} remaining target(s) (already-priced Variants excluded) — owned:${counts.owned} base:${counts.base} simple:${counts.simple} variant:${counts.variant}`
  );

  if (dryRun) {
    console.log("Dry run — not writing.");
    return;
  }

  let processed = 0;
  let priced = 0;
  let noData = 0;
  let imagesAttached = 0;
  let imagesFailed = 0;
  let searches = 0;
  let stoppedReason: "time_budget" | "quota_exhausted" | "completed" = "completed";
  const failedTargets: Target[] = [];
  // "Found listings, but none survived the precision filters" — a genuinely
  // different signal from noData (eBay had nothing at all): worth a human
  // look, since it can mean the query needs refinement or a real mismatch.
  const filteredOutTargets: Target[] = [];

  // Concurrency (2026-08-07 speedup — a live run was tracking at ~28h to
  // finish serially; per-item time is dominated by network round-trips
  // (eBay search, image download, several DB writes), not CPU, so
  // overlapping several items in flight at once is a straightforward
  // multiplier. throttleRequest's own comments already anticipate
  // concurrent callers (soft race on the counter, not a hard boundary) — 8
  // balances real speedup against DIRECT_URL's session-mode connection,
  // which this repo's own prisma.ts notes is tuned for one long sequential
  // session, not a large connection-pool burst.
  const CONCURRENCY = 8;
  let quotaExhausted = false;

  async function processOne(target: Target): Promise<void> {
    try {
      await throttleRequest(sourceId, EBAY_DAILY_WINDOW, prisma, MAX_RATE_LIMIT_WAIT_MS);
      searches++;
      const { items } = await searchItems(target.query, { limit: 10 });
      const cleanItems = items.filter(
        (it) =>
          it.price?.currency === "USD" &&
          !isLikelyBulkListing(it.title) &&
          !isLikelyGraded(it.title) &&
          titleMatchesCard(it.title, target.cardName, target.cardNumber, target.setName) &&
          titleMatchesVariant(it.title, target)
      );

      if (items.length > 0 && cleanItems.length === 0) filteredOutTargets.push(target);

      const rawPrices = cleanItems.map((it) => Number(it.price!.value)).filter((v) => Number.isFinite(v) && v > 0);
      const cleanPrices = dropGrossOutliers(rawPrices).slice(0, MAX_OBSERVATIONS_PER_CARD);

      const now = new Date();
      const rows: Array<RawPriceObservation & { sourceId: string }> = cleanPrices.map((price, idx) => ({
        variantId: target.variantId,
        kind: "LISTING",
        price,
        currency: "USD",
        observedAt: now,
        sourceUrl: cleanItems[idx]?.itemWebUrl ?? undefined,
        externalRef: cleanItems[idx]?.itemId,
        sourceId,
      }));
      const written = await writePriceObservationsBatch(rows, prisma);
      if (written > 0) {
        await recomputeCurrentPricesForVariants([target.variantId], now, prisma);
        priced++;
      } else {
        noData++;
      }

      const bestImage = cleanItems.find((it) => it.imageUrl)?.imageUrl ?? null;
      if (bestImage) {
        const attached = await attachHotlinkImage({
          url: bestImage,
          entityType: "Card",
          entityId: target.cardId,
          usage: "EBAY_LISTING_PHOTO",
          sourceIdentifier: SOURCE_ID,
          sourceKind: "OFFICIAL_API",
          replaceExisting: true,
        });
        if (attached) {
          const result = await processMediaRow(attached.mediaId);
          if (result.status !== "failed") imagesAttached++;
          else imagesFailed++;
        }
      }

      processed++;
    } catch (e: unknown) {
      if (e instanceof RateLimitExceededError) {
        quotaExhausted = true;
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      console.log(`  FAILED: "${target.query}" — ${message}`);
      failedTargets.push(target);
    }
  }

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    if (Date.now() - t0 > timeBudgetMs) {
      stoppedReason = "time_budget";
      break;
    }
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processOne));

    if (quotaExhausted) {
      console.log(`Shared eBay daily quota exhausted after ${searches} search(es) this run — stopping cleanly.`);
      stoppedReason = "quota_exhausted";
      break;
    }

    console.log(
      `  [${Math.min(i + CONCURRENCY, targets.length)}/${targets.length}] priced=${priced} noData=${noData} images=${imagesAttached} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
    );
  }

  const elapsedS = (Date.now() - t0) / 1000;
  const remaining = targets.length - processed;

  console.log(`\n=== RECONCILIATION REPORT — Topps Holiday Basketball 2025-26 backfill ===`);
  console.log(`Stopped reason: ${stoppedReason}`);
  console.log(`Cards processed this run: ${processed}`);
  console.log(`Images downloaded (to Appwrite): ${imagesAttached}`);
  console.log(`Images failed: ${imagesFailed}`);
  console.log(`Variants priced: ${priced}`);
  console.log(`Variants with no market data: ${noData}`);
  console.log(`Total eBay searches used this run: ${searches}`);
  console.log(`Total runtime: ${elapsedS.toFixed(1)}s`);
  console.log(`Manual review candidates (listings found but none matched precisely): ${filteredOutTargets.length}`);
  if (filteredOutTargets.length > 0) {
    console.log("  " + filteredOutTargets.slice(0, 20).map((t) => `${t.cardNumber} (${t.tier})`).join(", ") + (filteredOutTargets.length > 20 ? ", …" : ""));
  }
  console.log(`Search failures (network/API errors, retry next run): ${failedTargets.length}`);
  if (failedTargets.length > 0) {
    console.log("  " + failedTargets.slice(0, 20).map((t) => `${t.cardNumber} (${t.tier})`).join(", ") + (failedTargets.length > 20 ? ", …" : ""));
  }
  console.log(`Remaining (not yet attempted this run): ${remaining}`);
  console.log(remaining > 0 ? "Rerun this script to continue — already-priced Variants are skipped automatically." : "Backfill complete for this set. Ongoing refreshes now fall to the normal cron.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../ingestion/engine/prisma");
    await prisma.$disconnect();
  });
