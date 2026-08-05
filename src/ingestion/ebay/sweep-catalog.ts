// Full-catalog eBay price+image sweep — one representative price+image per
// Card (not per Variant/parallel; 32,107 Cards vs 91,560 Variants, confirmed
// via direct DB count), resumable across invocations via the same
// DataSource.syncCursor + resolveStartIndex mechanism ../pokemon/sync-prices.ts
// already uses. Reuses median/dropGrossOutliers from ./sync-prices.ts (the
// per-variant pilot module, still used standalone for ad-hoc/manual lookups)
// rather than duplicating that logic.
//
// COMPLIANCE NOTE — read src/ingestion/ebay/sync-prices.ts's own header first.
// The user has explicitly decided NOT to build eBay's technically-required
// listing-liveness recheck/delete job (License Agreement §8.1(b)(1)): they
// store price/image as a reference data point, not a live listing display,
// and accept that a stored reference may go stale once its source listing
// ends. This sweep's own resumable cursor naturally re-visits and refreshes
// every card roughly once per lap, which is the closest thing to a "refresh
// cadence" without building a separate recheck mechanism — see this file's
// own throughput numbers (in this fork's report) for how long a lap
// actually takes in practice.
//
// IMPORTANT — actual throughput vs. eBay's daily quota: eBay's Browse API
// quota (~5,000 calls/day per community reports, see sync-prices.ts) is NOT
// the bottleneck for a single serverless cron invocation. Vercel's function
// maxDuration (300s) is. At real observed latency (~1.5-2.5s/card including
// the rate-limiter's pacing), one 240s-budgeted invocation gets through
// roughly 100-150 cards, not anywhere near 4,800. A daily cron alone will
// take MONTHS to lap the full catalog, not the 6-7 days simple division
// suggests. Reaching that faster 6-7 day timeline requires running this
// module's CLI entry point as a long-lived process (unbounded time budget,
// maxWaitMsForRateLimit: Infinity so it blocks through the ~24h quota
// window and keeps going) rather than relying on the once-daily route alone.
// This is a real, load-bearing finding — surfaced in this fork's report, not
// silently glossed over.
import { prisma } from "../engine/prisma";
import { getOrCreateDataSource, attachHotlinkImage } from "../engine/media";
import { processMediaRow } from "../engine/process-media";
import { searchItems, isLikelyBulkListing, isLikelyGraded, titleMatchesCard } from "./api-client";
import { median, dropGrossOutliers } from "./sync-prices";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import { throttleRequest, type RateLimitWindow } from "@/lib/pricing/rate-limit";
import type { RawPriceObservation } from "@/lib/pricing/types";

const SOURCE_ID = "ebay_browse_api";
const MAX_OBSERVATIONS_PER_CARD = 8;

// See the file-header compliance/throughput note. 4,800 leaves a safety
// margin under the ~5,000/day figure found via corroborated community
// sources in the pilot (eBay's own limits page 403s automated fetches).
const EBAY_DAILY_WINDOW: RateLimitWindow[] = [{ windowSeconds: 86400, maxPerWindow: 4800 }];

// Buffer under the route's maxDuration (300s), same reasoning as the
// Pokemon sync's own DEFAULT_TIME_BUDGET_MS.
const DEFAULT_TIME_BUDGET_MS = 240_000;

interface CardTarget {
  id: string; // Card id — part of the cursor key (paired with tier, see formatCursor)
  variantId: string; // the representative (base) Variant this card's price/image is written against
  query: string;
  cardName: string; // structured, for titleMatchesCard() post-filtering — don't re-parse out of `query`
  cardNumber: string;
  setName: string;
  tier: number; // which priority tier this card came from — see PRIORITY_NAME_PATTERNS
}

// Tier 0 — the current user's own owned collection (Instance rows), ahead of
// everything else per an explicit user request: their portfolio dashboard
// showed "$0.00 / 514 cards with no market price yet" and they asked to
// price their own collection before the franchise sweep below. Hardcoded to
// one real user id rather than a generic "prioritize all users' owned cards"
// mechanism — this is a targeted fix for one person's dashboard, not a
// general feature; revisit if/when this needs to serve multiple users.
const OWNED_COLLECTION_USER_ID = "f6fc71bf-d0d7-41dd-ad1f-787e2a199a4f"; // allipuramsamanyu@gmail.com
const OWNED_COLLECTION_TIER = 0;

// User-requested sweep ordering: these four franchise groups get processed
// after the owned-collection tier above, in this order, before the rest of
// the catalog (Pokemon, MTG, Yu-Gi-Oh, Basketball, Harry Potter, etc. — tier
// "REST", index === PRIORITY_NAME_PATTERNS.length + 1). Matched by real Set
// names queried from the live DB, not guessed — e.g. "Match Attax 2025/26"
// has no "Topps" prefix, and the UEFA Champions League set is literally
// named with "Chrome" ahead of "UEFA", both confirmed by a real query before
// writing these patterns. Tier number = array index + 1 (tier 0 is owned
// collection, above).
const PRIORITY_NAME_PATTERNS: Array<{ label: string; test: (name: string) => boolean }> = [
  { label: "Soccer/Football", test: (n) => /premier league|match ?attax|(chrome.*uefa|uefa.*champions league)/i.test(n) },
  { label: "F1", test: (n) => /turbo ?attax/i.test(n) },
  { label: "Naruto", test: (n) => /naruto/i.test(n) },
  { label: "Marvel", test: (n) => /marvel/i.test(n) },
];

interface PriorityPlan {
  ownedCardIds: Set<string>; // tier 0
  tierSetIds: string[][]; // index 0..3 = the four franchise tiers (real tier number = index + 1)
  allPrioritySetIds: Set<string>; // union of the franchise tiers' sets, for the REST tier's exclusion filter
}

async function resolvePriorityPlan(): Promise<PriorityPlan> {
  const ownedVariants = await prisma.instance.findMany({
    where: { userId: OWNED_COLLECTION_USER_ID },
    select: { variant: { select: { cardId: true } } },
    distinct: ["variantId"],
  });
  const ownedCardIds = new Set(ownedVariants.map((i) => i.variant.cardId));
  console.log(`  tier ${OWNED_COLLECTION_TIER} (Owned Collection): ${ownedCardIds.size} distinct card(s)`);

  const sets = await prisma.set.findMany({ select: { id: true, name: true } });
  const tierSetIds: string[][] = PRIORITY_NAME_PATTERNS.map(() => []);
  const allPrioritySetIds = new Set<string>();
  for (const set of sets) {
    for (let i = 0; i < PRIORITY_NAME_PATTERNS.length; i++) {
      if (PRIORITY_NAME_PATTERNS[i].test(set.name)) {
        tierSetIds[i].push(set.id);
        allPrioritySetIds.add(set.id);
        break; // first matching tier wins — a name can't count twice
      }
    }
  }
  for (let i = 0; i < PRIORITY_NAME_PATTERNS.length; i++) {
    console.log(`  priority tier ${i + 1} (${PRIORITY_NAME_PATTERNS[i].label}): ${tierSetIds[i].length} set(s) — ${tierSetIds[i].join(", ")}`);
  }
  return { ownedCardIds, tierSetIds, allPrioritySetIds };
}

// Cursor format: "{tier}:{cardId}". tier 0 = owned collection, tier 1-4 =
// the franchise priority groups above, tier === REST_TIER = "REST"
// (everything else). An unrecognized/legacy cursor (e.g. this file's
// earlier plain-card-id format, or a raw id like "mtg-00ee5577...")
// intentionally falls through to the default — restarting at tier 0 —
// rather than throwing, since that's exactly the desired behavior every
// time this prioritization has been extended: nothing already written
// (PriceObservation/CurrentPrice/MediaAttachment) is touched or lost, only
// the cursor's *pointer* is reinterpreted under the new order.
function parseCursor(cursor: string | null): { tier: number; cardId: string | null } {
  if (!cursor) return { tier: 0, cardId: null };
  const m = /^(\d+):(.*)$/.exec(cursor);
  if (!m) return { tier: 0, cardId: null };
  return { tier: Number(m[1]), cardId: m[2] || null };
}
function formatCursor(tier: number, cardId: string): string {
  return `${tier}:${cardId}`;
}

// A generous window — far more cards than one invocation can actually price
// (see the file-header throughput note), but cheap to fetch: a windowed
// query only touches this many Card + related Variant rows, not the entire
// catalog. A first version of this function loaded ALL 32,107 cards + all
// 91,560 variants via full pagination on every single invocation before any
// pricing work started — confirmed via a real timed run that this alone
// consumed ~55-60s (most of a 60s test budget, and a meaningful chunk of the
// production 240s budget too). Rewritten to fetch only a bounded window
// starting just after the resume cursor.
const WINDOW_SIZE = 1000;

function rank(v: { parallelId: string | null; isAuto: boolean; isPatch: boolean; isRelic: boolean; serialTo: number | null }): number {
  return v.parallelId || v.isAuto || v.isPatch || v.isRelic || v.serialTo ? 1 : 0; // 0 = plain base, preferred
}

async function loadSetNames(): Promise<Map<string, string>> {
  const setNameById = new Map<string, string>();
  for (const set of await prisma.set.findMany({ select: { id: true, name: true } })) {
    setNameById.set(set.id, set.name);
  }
  return setNameById;
}

const REST_TIER = PRIORITY_NAME_PATTERNS.length + 1; // 5 — "everything not in owned-collection or a franchise priority group"

/**
 * Fetches up to WINDOW_SIZE cards starting from the given (tier, cardId)
 * cursor position, walking id-ascending within the current tier's set-id
 * filter. If the current tier runs out before the window fills, tops up
 * from the NEXT tier(s) in the same call rather than returning a
 * short/empty window at a tier boundary — a real invocation gets a full
 * window even when it lands right at the seam between, say, F1 and Naruto.
 * Wraps back to tier 0 (and reports `wrapped: true`) once REST is exhausted
 * too — i.e. a full prioritized lap just finished and the next one starts
 * over with soccer/F1/Naruto/Marvel again.
 */
async function fetchNextWindow(
  cursorRaw: string | null,
  setNameById: Map<string, string>,
  plan: PriorityPlan
): Promise<{ targets: CardTarget[]; wrapped: boolean }> {
  let { tier, cardId } = parseCursor(cursorRaw);
  const targets: CardTarget[] = [];
  let wrapped = false;
  const maxHops = REST_TIER + 2; // at most one full pass over all tiers, plus a small safety margin

  for (let hops = 0; targets.length < WINDOW_SIZE && hops <= maxHops; hops++) {
    const requestedTake = WINDOW_SIZE - targets.length;
    const isRestTier = tier >= REST_TIER;
    const isOwnedTier = tier === OWNED_COLLECTION_TIER;
    const where = isOwnedTier
      ? { id: { in: [...plan.ownedCardIds] } }
      : isRestTier
        ? { setId: { notIn: [...plan.allPrioritySetIds] } }
        : { setId: { in: plan.tierSetIds[tier - 1] } };

    const page = await prisma.card.findMany({
      where,
      orderBy: { id: "asc" },
      take: requestedTake,
      ...(cardId ? { cursor: { id: cardId }, skip: 1 } : {}),
      select: { id: true, setId: true, name: true, number: true },
    });

    if (page.length > 0) {
      const cardIds = page.map((c) => c.id);
      const variants = await prisma.variant.findMany({
        where: { cardId: { in: cardIds } },
        select: { id: true, cardId: true, parallelId: true, isAuto: true, isPatch: true, isRelic: true, serialTo: true },
      });
      const bestVariantByCard = new Map<string, { id: string; rank: number }>();
      for (const v of variants) {
        const r = rank(v);
        const existing = bestVariantByCard.get(v.cardId);
        if (!existing || r < existing.rank) bestVariantByCard.set(v.cardId, { id: v.id, rank: r });
      }
      for (const card of page) {
        const best = bestVariantByCard.get(card.id);
        if (!best) continue; // shouldn't happen (every seed script creates >=1 variant/card), skip defensively
        targets.push({
          id: card.id,
          variantId: best.id,
          query: `${setNameById.get(card.setId) ?? ""} ${card.name} #${card.number}`.trim(),
          cardName: card.name,
          cardNumber: card.number,
          setName: setNameById.get(card.setId) ?? "",
          tier: Math.min(tier, REST_TIER),
        });
      }
      cardId = page[page.length - 1].id;
    }

    if (page.length < requestedTake) {
      // This tier is exhausted — advance. Past REST means a full lap
      // finished; wrap back to the priority groups.
      tier += 1;
      cardId = null;
      if (tier > REST_TIER) {
        tier = 0;
        wrapped = true;
      }
    }
  }

  return { targets, wrapped };
}

export interface SweepResult {
  totalCardsInCatalog: number;
  windowSize: number;
  wrappedToStart: boolean;
  processed: number;
  observationsWritten: number;
  imagesAttached: number;
  failedCardIds: string[];
  elapsedMs: number;
  stoppedOnTimeBudget: boolean;
  windowComplete: boolean; // finished processing everything fetched into THIS window — not a full-catalog-lap claim, see file header
}

export async function sweepEbayCatalog(
  opts: { timeBudgetMs?: number; maxWaitMsForRateLimit?: number } = {}
): Promise<SweepResult> {
  const t0 = Date.now();
  const timeBudgetMs = opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const maxWaitMsForRateLimit = opts.maxWaitMsForRateLimit ?? Infinity;

  const sourceId = await getOrCreateDataSource(SOURCE_ID, "OFFICIAL_API");
  await prisma.dataSource.update({ where: { id: sourceId }, data: { lastSyncedAt: new Date() } });

  const totalCardsInCatalog = await prisma.card.count();
  const setNameById = await loadSetNames();
  const plan = await resolvePriorityPlan();
  const source = await prisma.dataSource.findUnique({ where: { id: sourceId }, select: { syncCursor: true } });
  const { targets, wrapped } = await fetchNextWindow(source?.syncCursor ?? null, setNameById, plan);
  const { tier: cursorTier } = parseCursor(source?.syncCursor ?? null);
  console.log(
    `Loaded a window of ${targets.length} card(s) (cursor: ${source?.syncCursor ?? "none — starting fresh at tier 0 (priority)"}${wrapped ? ", wrapped to start of a new priority lap" : ""}), starting tier ${cursorTier}, ${totalCardsInCatalog} total cards in catalog, time budget ${timeBudgetMs}ms.`
  );

  let processed = 0;
  let observationsWritten = 0;
  let imagesAttached = 0;
  let stoppedOnTimeBudget = false;
  const failedCardIds: string[] = [];
  // Same reasoning as Pokemon's sync: once something fails, the cursor stops
  // advancing for the rest of THIS invocation, so a failed card gets retried
  // next time rather than getting silently skipped by a later success
  // overwriting the cursor past it.
  let cursorCanAdvance = true;

  for (let i = 0; i < targets.length; i++) {
    if (Date.now() - t0 > timeBudgetMs) {
      stoppedOnTimeBudget = true;
      console.log(`Time budget reached after ${processed} card(s) — next invocation resumes from here.`);
      break;
    }

    const target = targets[i];
    try {
      await throttleRequest(sourceId, EBAY_DAILY_WINDOW, prisma, maxWaitMsForRateLimit);
      const { items } = await searchItems(target.query, { limit: 10 });
      const cleanItems = items.filter(
        (it) =>
          it.price?.currency === "USD" &&
          !isLikelyBulkListing(it.title) &&
          !isLikelyGraded(it.title) &&
          titleMatchesCard(it.title, target.cardName, target.cardNumber, target.setName)
      );
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
      observationsWritten += written;

      // Downloaded and re-hosted in Supabase Storage, not left as a bare eBay
      // hotlink — user decision, since eBay listings expire far faster than
      // the official-artwork hotlinks every other ingestion source uses.
      const bestImage = cleanItems.find((it) => it.imageUrl)?.imageUrl ?? null;
      if (bestImage) {
        const attached = await attachHotlinkImage({
          url: bestImage,
          entityType: "Card",
          entityId: target.id,
          usage: "EBAY_LISTING_PHOTO",
          sourceIdentifier: SOURCE_ID,
          sourceKind: "OFFICIAL_API",
          replaceExisting: true, // a re-run's better-matched image must replace a stale/wrong one, not sit alongside it
        });
        if (attached) {
          const processed = await processMediaRow(attached.mediaId);
          if (processed.status !== "failed") imagesAttached++;
        }
      }

      if (written > 0) {
        await recomputeCurrentPricesForVariants([target.variantId], now, prisma);
      }

      processed++;
      if (cursorCanAdvance) {
        await prisma.dataSource.update({ where: { id: sourceId }, data: { syncCursor: formatCursor(target.tier, target.id) } });
      }
      console.log(
        `  [${i + 1}/${targets.length}] "${target.query}" — ${cleanPrices.length} clean price(s), median $${median(cleanPrices)?.toFixed(2) ?? "n/a"}, image=${!!bestImage}`
      );
    } catch (e: any) {
      console.log(`  [${i + 1}/${targets.length}] "${target.query}" — FAILED (${e.message})`);
      failedCardIds.push(target.id);
      cursorCanAdvance = false;
    }
  }

  const elapsedMs = Date.now() - t0;
  const windowComplete = !stoppedOnTimeBudget && processed + failedCardIds.length >= targets.length;
  console.log(
    `\nProcessed ${processed} card(s), wrote ${observationsWritten} observation(s), attached ${imagesAttached} image(s) in ${elapsedMs}ms (${processed > 0 ? (elapsedMs / processed).toFixed(0) : "n/a"}ms/card).`
  );
  console.log(
    windowComplete
      ? "Finished everything fetched into this window."
      : "Did not finish this window — next invocation resumes from the cursor."
  );
  if (failedCardIds.length > 0) {
    console.log(`${failedCardIds.length} card(s) failed and were skipped this run: ${failedCardIds.slice(0, 10).join(", ")}${failedCardIds.length > 10 ? "…" : ""}`);
  }

  return {
    totalCardsInCatalog,
    windowSize: targets.length,
    wrappedToStart: wrapped,
    processed,
    observationsWritten,
    imagesAttached,
    failedCardIds,
    elapsedMs,
    stoppedOnTimeBudget,
    windowComplete,
  };
}

// CLI entry point:
//   npx tsx src/ingestion/ebay/sweep-catalog.ts [timeBudgetMs] [--unbounded]
// --unbounded runs with no time budget and lets the rate limiter block
// through eBay's ~24h quota window (maxWaitMsForRateLimit: Infinity) — the
// way to actually grind through the full catalog over a handful of days
// from a long-lived local/background process, rather than relying solely on
// the once-daily 300s-capped Vercel cron (see file-header note).
if (require.main === module) {
  const args = process.argv.slice(2);
  const unbounded = args.includes("--unbounded");
  const timeBudgetArg = args.find((a) => a !== "--unbounded");
  const timeBudgetMs = unbounded ? Number.MAX_SAFE_INTEGER : timeBudgetArg ? Number(timeBudgetArg) : undefined;

  sweepEbayCatalog({ timeBudgetMs, maxWaitMsForRateLimit: Infinity })
    .then((r) => console.log("\n" + JSON.stringify(r, null, 2)))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
