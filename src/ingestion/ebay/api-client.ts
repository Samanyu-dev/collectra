// Thin wrapper around the eBay Browse API's item_summary/search method
// (developer.ebay.com/develop/api/buy/browse_api). Mirrors the shape of
// ../pokemon/api-client.ts (fetchWithRetry + sleep) for consistency.
import { getApplicationToken } from "./auth";

export const BROWSE_API_URL = "https://api.ebay.com/buy/browse/v1";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price: { value: string; currency: string } | null;
  imageUrl: string | null;
  itemWebUrl: string | null;
  condition: string | null;
  buyingOptions: string[];
}

export interface EbaySearchResult {
  total: number;
  items: EbayItemSummary[];
}

// Cheap keyword exclusion for the two contamination patterns the pilot found
// in real results: multi-card lots/bundles, and "pick your own card from this
// list" listings — both distort a single-card median if left in. Not a
// classifier, just a title-substring denylist; won't catch everything, but
// measurably cuts the noise the pilot documented.
//
// Extended after a real spot-check (get_item_by_legacy_id on 5 live "Shikamaru
// Nara #100" observations) caught "Topps NARUTO ANIMAX JET BLACK Limited
// Edition Card Full Set Of 15 CARDS" sailing straight through the original
// list — "full set of N cards" phrasing wasn't covered by "complete set"/
// "lot of". Added both the missing keyword and a regex fallback for numeric
// "set of N" / "N card lot" phrasing the keyword list can't enumerate.
const BULK_LISTING_KEYWORDS = [
  "lot of",
  " lot ",
  "you pick",
  "your choice",
  "u pick",
  "pick your card",
  "pick any",
  "pick 1",
  "pick one",
  "choose your card",
  "complete set",
  "complete your set",
  "full set",
  "wax box",
  "sealed box",
  "hobby box",
  "booster box",
  "case break",
  "bundle",
  "repack",
  "mystery pack",
  "grab bag",
];
const BULK_LISTING_PATTERNS = [/\bset of \d+\b/i, /\b\d+\s*card\s*lot\b/i, /\bcards?\s*#?\d+\s*-\s*#?\d+\b/i];

export function isLikelyBulkListing(title: string): boolean {
  const t = ` ${title.toLowerCase()} `;
  if (BULK_LISTING_KEYWORDS.some((kw) => t.includes(kw))) return true;
  return BULK_LISTING_PATTERNS.some((re) => re.test(title));
}

// Grading/population-report language means a graded slab, not a raw single
// card — mixing a $400 PSA slab into a $2 raw-base-card median is exactly
// the kind of contamination the coordinator's spot-check caught (a graded
// 2009 Bandai slab was one of the 4 wrong matches). Excluded from base-card
// price aggregation entirely; tracking graded prices separately would need
// its own explicit variant/field, not attempted here.
const GRADED_LISTING_KEYWORDS = ["psa ", "psa10", "psa 10", " bgs ", " sgc ", " cgc ", "beckett grad", "(pop ", "pop 1)", "graded "];

export function isLikelyGraded(title: string): boolean {
  const t = ` ${title.toLowerCase()} `;
  return GRADED_LISTING_KEYWORDS.some((kw) => t.includes(kw));
}

// The single strongest signal available for rejecting wrong-item matches —
// real evidence: spot-checking "Shikamaru Nara #100" found 3 of its 4 wrong
// observations had a DIFFERENT number (or no number) in their actual title
// ("NX-159", "#93", none) despite matching on character name + rough
// era/brand keywords in the loose keyword search. eBay's `q` search is
// relevance-ranked, not a strict boolean AND on exact substrings, so a
// query containing "#100" does NOT guarantee returned titles contain "100"
// — this has to be enforced client-side against the real returned title.
// Word-boundary match so "100" doesn't match inside "1000"/"42100".
//
// Internal whitespace in a compound insert number (e.g. our own catalog's
// "IN 6", "LE 03") is treated as optional (\s*), not literal — a real
// spot-check on owned-collection cards still missing a price after a full
// sweep lap found genuine, correctly-matching, non-bulk/non-graded eBay
// listings for e.g. "Jude Bellingham #IN 6" being silently rejected because
// the actual listing title read "#IN6" (no space). The card's own name/
// number formatting convention shouldn't have to match a seller's spacing
// for an otherwise-exact, unambiguous match.
function numberAppearsInTitle(title: string, cardNumber: string): boolean {
  const escaped = cardNumber
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s*");
  const re = new RegExp(`(?:#|no\\.?\\s*)?\\b0*${escaped}\\b`, "i");
  return re.test(title);
}

// Softer secondary signal: does the title contain enough of the card name's
// meaningful words? Guards against a different product that happens to
// reuse the same number (the number check alone isn't airtight either).
const STOPWORDS = new Set(["the", "of", "and", "a", "an"]);
function nameOverlapScore(title: string, cardName: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const titleWords = new Set(norm(title));
  const nameWords = norm(cardName);
  if (nameWords.length === 0) return 1; // nothing meaningful to check against — don't reject on this signal
  const matched = nameWords.filter((w) => titleWords.has(w)).length;
  return matched / nameWords.length;
}

// Cross-franchise re-verification (real get_item_by_legacy_id lookups, not
// assumed) found a SECOND, different contamination mode the number+name
// check above doesn't catch: "Gabriel Martinelli #CA-GM" correctly matched
// name AND number, but the real listing was "2025-26 Topps Chrome Sapphire
// UEFA - Gabriel Martinelli Black Auto /10 #CA-GM" — a separate premium
// Topps Chrome product line ("Chrome Sapphire") that happens to reuse the
// same card numbering as our catalogued mainline "Chrome UEFA Champions
// League" set. Same number, same name, wrong $945-vs-normal-price product.
// A small, best-effort denylist of known Topps Chrome sub-line qualifiers —
// NOT a full taxonomy, and deliberately NOT a blind global denylist: one of
// our own real catalogued sets is legitimately named "Ruby & Sapphire"
// (confirmed via a live DB check), so a qualifier is only disqualifying
// when the CARD'S OWN set name doesn't already contain it.
const CHROME_SUBLINE_QUALIFIERS = ["sapphire", "cosmic", "velocity", "bordeaux", "black finite"];

function isWrongSubline(title: string, setName: string | undefined): boolean {
  const t = title.toLowerCase();
  const set = (setName ?? "").toLowerCase();
  return CHROME_SUBLINE_QUALIFIERS.some((q) => t.includes(q) && !set.includes(q));
}

/**
 * The real fix for the coordinator's Naruto #100 finding: reject a search
 * result unless its actual title contains the card's number as a distinct
 * token AND at least half of the card name's meaningful words. A hard
 * filter, not a scoring nudge — per the explicit request that the number be
 * "a much stronger signal," and the real evidence that a loose keyword
 * search alone lets wrong-product/wrong-number/wrong-variant results
 * through eBay's own relevance ranking. This will reduce how many raw
 * search results survive per card (thin-market sets get thinner) — that's
 * the intended precision-over-recall tradeoff, not a bug.
 *
 * `setName` is optional (older call sites may not have it threaded through
 * yet) — when omitted, the sub-line check is skipped entirely rather than
 * guessing, so this stays additive, not a silent behavior change for
 * callers that haven't been updated.
 */
export function titleMatchesCard(title: string, cardName: string, cardNumber: string, setName?: string): boolean {
  if (!numberAppearsInTitle(title, cardNumber)) return false;
  if (setName !== undefined && isWrongSubline(title, setName)) return false;
  return nameOverlapScore(title, cardName) >= 0.5;
}

/**
 * NOTE on filtering: the docs describe a `buyingOptions` filter
 * (`filter=buyingOptions:{FIXED_PRICE}`), but per the same docs, search
 * already "returns only listings where FIXED_PRICE is a buying option" by
 * default — confirmed against a live query (first-page items all carried
 * FIXED_PRICE in their own buyingOptions array with no filter applied). The
 * explicit filter also 400'd with error 12002 in a manual curl test using
 * naive shell encoding — rather than chase exact percent-encoding for a
 * filter the default behavior already satisfies, this client relies on the
 * documented default instead.
 */
export async function searchItems(query: string, opts: { limit?: number } = {}): Promise<EbaySearchResult> {
  const limit = opts.limit ?? 10;
  const token = await getApplicationToken();
  const url = `${BROWSE_API_URL}/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}`;

  const res = await fetchWithRetry(url, token);
  const raw = res.itemSummaries ?? [];

  const items: EbayItemSummary[] = raw.map((it: any) => ({
    itemId: it.itemId,
    title: it.title,
    price: it.price ? { value: it.price.value, currency: it.price.currency } : null,
    imageUrl: it.image?.imageUrl ?? null,
    itemWebUrl: it.itemWebUrl ?? null,
    condition: it.condition ?? null,
    buyingOptions: it.buyingOptions ?? [],
  }));

  return { total: res.total ?? items.length, items };
}

async function fetchWithRetry(url: string, token: string, retries = 4): Promise<any> {
  for (let i = 0; i < retries; i++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e: any) {
      console.log(`  [ebay] network error (${e.message}), waiting ${(i + 1) * 3}s...`);
      await sleep((i + 1) * 3000);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      console.log(`  [ebay] HTTP ${res.status}, waiting ${(i + 1) * 5}s...`);
      await sleep((i + 1) * 5000);
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`eBay Browse API HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return await res.json();
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries.`);
}

export { sleep };
