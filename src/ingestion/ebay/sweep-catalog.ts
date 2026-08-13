// Full-catalog eBay price+image sweep, in strict three-priority order
// (2026-08-07 correction — explicitly NOT rarity-driven; rarity only gets
// whatever quota is left over after the first two priorities are satisfied
// this lap):
//  - Priority 1 / Tier 0 (Owned Variants): one search per distinct Variant
//    any user actually owns (Instance rows, across ALL users — generalized
//    from an earlier single-hardcoded-user version per explicit request:
//    "only do variants when i or some user owns them"), including
//    parallels/numbered prints. Always runs first.
//  - Priority 2 / Tiers 1..REST: one representative price+image per Card,
//    catalog-wide (base-preferred variant only; 32,107 Cards vs 91,560
//    Variants, confirmed via direct DB count) — "continues exactly as it
//    works today," franchise-ordered same as before. Runs after Priority 1.
//  - Priority 3 / Tier UNOWNED_VARIANTS_TIER: catalog parallels/numbered/
//    autos/relics/inserts that NOBODY owns yet — enrichment only, spent
//    strictly last, only on whatever quota remains once every owned variant
//    and every catalog card already has a price this lap. Never runs ahead
//    of Priority 1 or 2, regardless of how rare a variant is.
// Resumable across invocations via the same DataSource.syncCursor +
// resolveStartIndex mechanism ../pokemon/sync-prices.ts already uses. Reuses
// median/dropGrossOutliers from ./sync-prices.ts (the per-variant pilot
// module, still used standalone for ad-hoc/manual lookups) rather than
// duplicating that logic.
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
import { median, dropGrossOutlierPairs } from "./sync-prices";
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
  id: string; // Card id — part of the cursor key for tiers >=1 (see formatCursor); for tier 0 this is still the owning Card, but the cursor key is variantId instead
  variantId: string; // the Variant this price/image is written against — the representative (base) Variant for tiers >=1, or the exact owned Variant for tier 0
  query: string;
  cardName: string; // structured, for titleMatchesCard() post-filtering — don't re-parse out of `query`
  cardNumber: string;
  setName: string;
  tier: number; // which priority tier this card came from — see PRIORITY_NAME_PATTERNS
  serialTo?: number | null; // tier 0 only — the owned Variant's print-run size, for the stricter numbered-parallel match check below
  variantKeywords?: string[]; // tier 0 only, when the owned Variant has a parallel/insert — see variantMatchKeywords()
  excludeKeywords?: string[]; // set when this target IS the base variant and the card has sibling parallels/inserts — see titleMatchesVariant()
}

// Tier 0 — every distinct Variant any user actually owns (Instance rows),
// ahead of everything else. Originally hardcoded to one user (their
// portfolio dashboard showed "$0.00 / 514 cards with no market price yet"
// and they asked to price their own collection first); generalized
// 2026-08-07 to all users per explicit request, since real ownership across
// the whole app is a better demand signal than one account. Also widened
// from "one price per owned CARD" to "one price per owned VARIANT" in the
// same change — see fetchNextWindow's tier-0 branch — so an owned parallel
// gets its own price instead of borrowing its card's base-variant price.
const OWNED_VARIANTS_TIER = 0;

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
  ownedVariantIds: string[]; // tier 0 — every distinct Variant any user owns, sorted ascending for stable window pagination
  tierSetIds: string[][]; // index 0..3 = the four franchise tiers (real tier number = index + 1)
  allPrioritySetIds: Set<string>; // union of the franchise tiers' sets, for the REST tier's exclusion filter
}

async function resolvePriorityPlan(): Promise<PriorityPlan> {
  const ownedRows = await prisma.instance.findMany({
    select: { variantId: true },
    distinct: ["variantId"],
  });
  const ownedVariantIds = [...new Set(ownedRows.map((i) => i.variantId))].sort();
  console.log(`  tier ${OWNED_VARIANTS_TIER} (Owned Variants, all users): ${ownedVariantIds.length} distinct variant(s)`);

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
  return { ownedVariantIds, tierSetIds, allPrioritySetIds };
}

// Cursor format: "{tier}:{key}". tier 0 = owned variants (key = a variantId),
// tier 1-4 = the franchise priority groups above (key = a cardId), tier ===
// REST_TIER = "REST" (key = a cardId). An unrecognized/legacy cursor (e.g.
// this file's earlier plain-card-id format, or a raw id like
// "mtg-00ee5577...") intentionally falls through to the default —
// restarting at tier 0 — rather than throwing, since that's exactly the
// desired behavior every time this prioritization has been extended:
// nothing already written (PriceObservation/CurrentPrice/MediaAttachment) is
// touched or lost, only the cursor's *pointer* is reinterpreted under the
// new order.
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

// Generic words that show up in almost every parallel/insert name and would
// let an unrelated (e.g. plain base) listing satisfy a "does the title
// mention the parallel" check for free — excluded from the match-keyword
// list below so that list only contains words actually distinctive to THIS
// variant (a color, a named insert like "Podium Power", etc.).
const VARIANT_MATCH_STOPWORDS = new Set(["the", "of", "and", "a", "an", "base", "parallel", "card", "edition"]);

/** Builds the "{Insert} {Parallel} /{serialTo}" suffix appended to a tier-0 query so the eBay search itself is steered toward the owned variant, not just the base card. */
export function describeVariantForQuery(v: { parallel: { name: string } | null; insert: { name: string } | null; serialTo: number | null }): string {
  const parts: string[] = [];
  if (v.insert?.name) parts.push(v.insert.name);
  if (v.parallel?.name) parts.push(v.parallel.name);
  if (v.serialTo) parts.push(`/${v.serialTo}`);
  return parts.join(" ");
}

/**
 * Distinctive words (parallel name tokens, color, insert name tokens) a
 * listing's title should contain at least one of, for a numbered/parallel
 * tier-0 target to be trusted as actually describing that specific print —
 * see titleMatchesVariant() below. Returns [] when there's nothing
 * distinctive to require (falls back to the plain card-level match).
 */
// `setName`/`cardName` are optional only for callers that genuinely have
// nothing better (kept backward-compatible), but every real call site below
// passes both — omitting either re-opens the exact bug these parameters
// exist to close.
export function variantMatchKeywords(
  v: { parallel: { name: string; color: string | null } | null; insert: { name: string } | null },
  setName?: string,
  cardName?: string
): string[] {
  const raw = `${v.parallel?.name ?? ""} ${v.insert?.name ?? ""}`
    .split(/[\s/-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !VARIANT_MATCH_STOPWORDS.has(w.toLowerCase()));
  if (v.parallel?.color) raw.push(v.parallel.color);
  // A word that's also part of the SET's own name (e.g. "Topps", "Chrome",
  // "Basketball" in "Topps Chrome Basketball 2024-25") appears in every
  // listing title for this set regardless of variant — real bug found
  // 2026-08-12 running this against a live Chrome set: "Basketball" leaked
  // out of a parallel literally named "Blue Basketball Refractors" and into
  // every card's excludeKeywords, and since titleMatchesVariant rejects on
  // ANY exclude-keyword hit, that one generic word silently zeroed out every
  // base-card price in the set (every real eBay title mentions "Basketball"
  // — it's the sport). A word that never varies between a card's own
  // variants can't be used to tell them apart, in either direction
  // (positive variantKeywords or negative excludeKeywords) — filtered here
  // once, at the source, rather than at each of the 5 call sites.
  //
  // Same failure mode, different source: a word that's part of THIS CARD's
  // own name — real bug found 2026-08-14 auditing Topps Chrome Marvel Comics
  // 2026's own base Spider-Man cards (#163/#164/#165) showing zero clean
  // prices despite plenty of real matching listings. A set-wide themed
  // parallel on this set is literally named "Spider-Web ... Refractor" (it
  // appears on many cards, not just Spider-Man ones), so "Spider" leaked
  // into every Spider-Man/Spider-Man-2099/Spider-Man-Noir base card's
  // excludeKeywords via that sibling parallel — and every real listing for
  // those base cards obviously says "Spider-Man" too, so 100% of otherwise
  // valid base listings got silently rejected. A sibling parallel's name can
  // coincidentally echo a card's own name even when neither name mentions
  // the set — filtered here for the same reason as setWords above.
  const stripWords = new Set(
    `${setName ?? ""} ${cardName ?? ""}`
      .toLowerCase()
      .split(/[\s/-]+/)
      .filter(Boolean)
  );
  return [...new Set(raw)].filter((w) => !stripWords.has(w.toLowerCase()));
}

// Any "/N" print-run fraction (e.g. "/99", "/25") in a title is a strong,
// catalog-independent signal that a listing is a numbered parallel — a base
// (non-numbered) target should never accept one of these, confirmed as a
// real gap (2026-08-12): base-variant searches had zero numbered-parallel
// exclusion, only numbered-parallel searches had a *positive* requirement.
// Doesn't match the card's own "#316" style numbering (no leading slash).
const SERIAL_FRACTION_PATTERN = /\/\s*\d+\b/;

/**
 * Extra precision gate on top of the existing titleMatchesCard() number+name
 * check everyone gets. Two directions, both real, both confirmed live
 * (2026-08-12 — a user report of base/parallel prices swapped led back to
 * this):
 *
 * 1. Numbered/parallel targets (target.variantKeywords/serialTo set): the
 *    listing must actually contain the serial fraction and/or a distinctive
 *    keyword — guards against eBay's relevance-ranked search returning a
 *    plain base-card listing for a query aimed at a rare numbered parallel,
 *    which would otherwise get silently written as that parallel's price,
 *    understating a genuinely rare card.
 * 2. Base targets (no variantKeywords/serialTo — the majority of searches):
 *    the listing must NOT look like a numbered parallel, and must not
 *    contain any of the card's own sibling variants' distinctive keywords
 *    (target.excludeKeywords, built from this exact card's real catalog
 *    parallels/inserts) — guards against the opposite failure, a rare
 *    parallel's listing getting silently written as the base card's price.
 *    Without this, a base-variant search had no protection at all in this
 *    direction.
 */
export function titleMatchesVariant(title: string, target: { serialTo?: number | null; variantKeywords?: string[]; excludeKeywords?: string[] }): boolean {
  const t = title.toLowerCase();

  if (target.serialTo) {
    if (!new RegExp(`/\\s*0*${target.serialTo}\\b`).test(t)) return false;
  } else {
    // A base/unnumbered target must not match a *different* card's serial fraction.
    if (SERIAL_FRACTION_PATTERN.test(t)) return false;
  }

  if (target.variantKeywords && target.variantKeywords.length > 0) {
    return target.variantKeywords.some((kw) => t.includes(kw.toLowerCase()));
  }

  if (target.excludeKeywords && target.excludeKeywords.length > 0) {
    if (target.excludeKeywords.some((kw) => t.includes(kw.toLowerCase()))) return false;
  }

  return true;
}

async function loadSetNames(): Promise<Map<string, string>> {
  const setNameById = new Map<string, string>();
  for (const set of await prisma.set.findMany({ select: { id: true, name: true } })) {
    setNameById.set(set.id, set.name);
  }
  return setNameById;
}

const REST_TIER = PRIORITY_NAME_PATTERNS.length + 1; // 5 — "everything not in owned-collection or a franchise priority group"

// Priority 3 (2026-08-07 correction — explicitly NOT rarity-driven; runs
// dead last, only once every owned variant AND every catalog card already
// has a price this lap): catalog parallels/numbered/autos/relics/inserts
// that nobody owns yet. "Unowned" is deliberately cheap to define — any
// Variant that (a) isn't a plain base print (has a parallel, insert, auto,
// patch, relic, or serial run) and (b) has zero Instance rows — rather than
// precomputing which exact Variant tier 1..REST picked as each card's
// representative, which would mean loading the whole ~91,560-row Variant
// table into memory every invocation (the file's own history already found
// that costs ~55-60s and rewrote the card sweep specifically to avoid it).
// The one edge case this misses: a card with NO plain base variant at all,
// where tier 1..REST's rank() falls back to an arbitrary non-base variant —
// that variant could get searched twice (once there, once here). Accepted
// as a small, documented inefficiency rather than the full-table cost of
// closing it.
const UNOWNED_VARIANTS_TIER = REST_TIER + 1; // 6 — lowest priority, catalog-wide, no franchise ordering
const MAX_TIER = UNOWNED_VARIANTS_TIER;

/**
 * Fetches up to WINDOW_SIZE targets starting from the given (tier, key)
 * cursor position, in strict priority order — Priority 1 (owned, tier 0),
 * then Priority 2 (one representative price per catalog card, tier 1..REST,
 * franchise-ordered same as before), then Priority 3 (unowned catalog
 * rarities, tier UNOWNED_VARIANTS_TIER) — never rarity-first, always in this
 * order. Tier 0 and the unowned-rarities tier both walk Variants directly
 * (key = a variantId) — one target per distinct Variant, not collapsed to a
 * card. Tiers 1..REST walk Cards id-ascending within the current tier's
 * set-id filter (key = a cardId) and still collapse to one representative
 * (base-preferred) Variant per Card. If the current tier runs out before
 * the window fills, tops up from the NEXT tier(s) in the same call rather
 * than returning a short/empty window at a tier boundary — a real
 * invocation gets a full window even when it lands right at a seam. Wraps
 * back to tier 0 (and reports `wrapped: true`) once the unowned-rarities
 * tier is exhausted too — i.e. a full three-priority lap just finished.
 */
async function fetchNextWindow(
  cursorRaw: string | null,
  setNameById: Map<string, string>,
  plan: PriorityPlan
): Promise<{ targets: CardTarget[]; wrapped: boolean }> {
  let { tier, cardId: cursorKey } = parseCursor(cursorRaw);
  const targets: CardTarget[] = [];
  let wrapped = false;
  const maxHops = MAX_TIER + 2; // at most one full pass over all tiers, plus a small safety margin

  for (let hops = 0; targets.length < WINDOW_SIZE && hops <= maxHops; hops++) {
    const requestedTake = WINDOW_SIZE - targets.length;

    if (tier === OWNED_VARIANTS_TIER) {
      const startIdx = cursorKey ? plan.ownedVariantIds.indexOf(cursorKey) + 1 : 0;
      const slice = plan.ownedVariantIds.slice(startIdx, startIdx + requestedTake);

      if (slice.length > 0) {
        const variants = await prisma.variant.findMany({
          where: { id: { in: slice } },
          include: { card: true, parallel: true, insert: true },
        });
        const byId = new Map(variants.map((v) => [v.id, v]));

        // Base-variant targets need to know their OWN card's sibling
        // parallels/inserts, so titleMatchesVariant can reject a listing
        // that's actually describing one of those siblings rather than the
        // base card itself — see titleMatchesVariant's doc comment (real bug
        // found 2026-08-12: base-variant searches had no protection against
        // silently absorbing a sibling parallel's price). One batched query
        // for the whole window rather than one per base variant.
        const baseCardIds = variants.filter((v) => !v.parallelId && !v.insertId).map((v) => v.card.id);
        const setIdByCardId = new Map(variants.map((v) => [v.card.id, v.card.setId]));
        const cardNameByCardId = new Map(variants.map((v) => [v.card.id, v.card.name]));
        const siblingKeywordsByCard = new Map<string, string[]>();
        if (baseCardIds.length > 0) {
          const siblings = await prisma.variant.findMany({
            where: { cardId: { in: baseCardIds }, OR: [{ parallelId: { not: null } }, { insertId: { not: null } }] },
            include: { parallel: true, insert: true },
          });
          for (const s of siblings) {
            const siblingSetName = setNameById.get(setIdByCardId.get(s.cardId) ?? "") ?? "";
            const siblingCardName = cardNameByCardId.get(s.cardId) ?? "";
            const kws = variantMatchKeywords(s, siblingSetName, siblingCardName);
            siblingKeywordsByCard.set(s.cardId, [...new Set([...(siblingKeywordsByCard.get(s.cardId) ?? []), ...kws])]);
          }
        }

        for (const vid of slice) {
          const v = byId.get(vid);
          if (!v) continue; // owned Variant no longer exists (deleted after the plan was resolved) — skip defensively
          const setName = setNameById.get(v.card.setId) ?? "";
          const isBase = !v.parallelId && !v.insertId;
          // Deliberately NOT appending describeVariantForQuery() (insert/parallel
          // name) into the eBay search string itself — confirmed live (2026-08-12)
          // that doing so systematically returns zero results for insert/parallel
          // variants (eBay's search needs most/all query words to appear in a
          // listing title, and real sellers phrase parallels very differently
          // from our catalog names — e.g. "Incommon Holo" vs "Rainbow Foil
          // Wildcard"). The general set+name+number query finds real listings;
          // titleMatchesVariant() below (via variantKeywords/serialTo) is what
          // actually verifies a result is the right parallel, not the query string.
          targets.push({
            id: v.card.id,
            variantId: v.id,
            query: `${setName} ${v.card.name} #${v.card.number}`.trim(),
            cardName: v.card.name,
            cardNumber: v.card.number,
            setName,
            tier: OWNED_VARIANTS_TIER,
            serialTo: v.serialTo,
            variantKeywords: v.parallelId || v.insertId ? variantMatchKeywords(v, setName, v.card.name) : undefined,
            excludeKeywords: isBase ? siblingKeywordsByCard.get(v.card.id) : undefined,
          });
        }
        cursorKey = slice[slice.length - 1];
      }

      if (slice.length < requestedTake) {
        tier += 1;
        cursorKey = null;
        if (tier > MAX_TIER) {
          tier = 0;
          wrapped = true;
        }
      }
      continue;
    }

    if (tier === UNOWNED_VARIANTS_TIER) {
      // Priority 3 — catalog-wide, no franchise ordering: any non-base
      // Variant (parallel/insert/auto/patch/relic/serial-numbered) with zero
      // owners, id-ascending. Only ever reached after every owned variant
      // (Priority 1) and every catalog card's base price (Priority 2) is
      // already done this lap.
      const page = await prisma.variant.findMany({
        where: {
          id: { notIn: plan.ownedVariantIds },
          OR: [{ parallelId: { not: null } }, { insertId: { not: null } }, { isAuto: true }, { isPatch: true }, { isRelic: true }, { serialTo: { not: null } }],
        },
        orderBy: { id: "asc" },
        take: requestedTake,
        ...(cursorKey ? { cursor: { id: cursorKey }, skip: 1 } : {}),
        include: { card: true, parallel: true, insert: true },
      });

      for (const v of page) {
        const setName = setNameById.get(v.card.setId) ?? "";
        // See the identical note on the tier-0 branch above — the insert/
        // parallel name is deliberately left out of the search query itself.
        targets.push({
          id: v.card.id,
          variantId: v.id,
          query: `${setName} ${v.card.name} #${v.card.number}`.trim(),
          cardName: v.card.name,
          cardNumber: v.card.number,
          setName,
          tier: UNOWNED_VARIANTS_TIER,
          serialTo: v.serialTo,
          variantKeywords: variantMatchKeywords(v, setName, v.card.name),
        });
      }
      if (page.length > 0) cursorKey = page[page.length - 1].id;

      if (page.length < requestedTake) {
        // Unowned-rarities tier exhausted — a full three-priority lap just
        // finished. Wrap back to Priority 1.
        tier = 0;
        cursorKey = null;
        wrapped = true;
      }
      continue;
    }

    const isRestTier = tier >= REST_TIER;
    const where = isRestTier ? { setId: { notIn: [...plan.allPrioritySetIds] } } : { setId: { in: plan.tierSetIds[tier - 1] } };

    const page = await prisma.card.findMany({
      where,
      orderBy: { id: "asc" },
      take: requestedTake,
      ...(cursorKey ? { cursor: { id: cursorKey }, skip: 1 } : {}),
      select: { id: true, setId: true, name: true, number: true },
    });

    if (page.length > 0) {
      const cardIds = page.map((c) => c.id);
      const variants = await prisma.variant.findMany({
        where: { cardId: { in: cardIds } },
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
      const bestVariantByCard = new Map<string, { id: string; rank: number }>();
      for (const v of variants) {
        const r = rank(v);
        const existing = bestVariantByCard.get(v.cardId);
        if (!existing || r < existing.rank) bestVariantByCard.set(v.cardId, { id: v.id, rank: r });
      }
      for (const card of page) {
        const best = bestVariantByCard.get(card.id);
        if (!best) continue; // shouldn't happen (every seed script creates >=1 variant/card), skip defensively
        const bestVariant = variants.find((v) => v.id === best.id);
        const isBase = !bestVariant?.parallelId && !bestVariant?.insertId;
        const cardSetName = setNameById.get(card.setId) ?? "";
        // Same protection as the tier-0 branch above — the representative
        // "best" variant for a card is usually its base print, but this
        // batch already has every sibling variant loaded, so no extra query
        // is needed to gather their keywords for exclusion.
        const excludeKeywords = isBase
          ? [...new Set(variants.filter((v) => v.cardId === card.id && v.id !== best.id).flatMap((v) => variantMatchKeywords(v, cardSetName, card.name)))]
          : undefined;
        targets.push({
          id: card.id,
          variantId: best.id,
          query: `${cardSetName} ${card.name} #${card.number}`.trim(),
          cardName: card.name,
          cardNumber: card.number,
          setName: cardSetName,
          tier,
          serialTo: bestVariant?.serialTo,
          variantKeywords: isBase ? undefined : bestVariant ? variantMatchKeywords(bestVariant, cardSetName, card.name) : undefined,
          excludeKeywords: excludeKeywords && excludeKeywords.length > 0 ? excludeKeywords : undefined,
        });
      }
      cursorKey = page[page.length - 1].id;
    }

    if (page.length < requestedTake) {
      // This tier is exhausted — advance. Past REST, the next stop is the
      // unowned-rarities tier (Priority 3), not a wrap — see MAX_TIER.
      tier += 1;
      cursorKey = null;
      if (tier > MAX_TIER) {
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
      // 50, not 10 — real bug found 2026-08-12 pricing a heavily-paralleled
      // Chrome set: eBay's relevance ranking surfaces refractor/parallel
      // listings ahead of plain base singles for a base-card query (sellers
      // list parallels far more, and/or they rank as more relevant), so a
      // base target's genuine matching listing is very often past position
      // 10. Confirmed live: Topps Chrome Basketball 2024-25 #10 Joel Embiid
      // had 0 valid base listings in the top 10 (all refractors) but several
      // by position ~20-45 of 344 total. Same request, same quota cost —
      // `limit` doesn't cost extra against the daily cap, just returns more
      // of what eBay already searched.
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
