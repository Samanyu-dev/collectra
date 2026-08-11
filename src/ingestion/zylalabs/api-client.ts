// Thin wrapper around Zylalabs' "Sports Card and Trading Card API"
// (zylalabs.com/api-marketplace/sports+&+gaming/sports+card+and+trading+card+api/2511).
// Two-step flow: Card Search resolves a fuzzy query to a card_id, then Get
// Card Prices returns real dated closing prices for that card_id at a given
// grade — a genuine historical time series, unlike SportsCardsPro's single
// current-value-per-tier snapshot (see ../sportscardspro/api-client.ts).
const BASE_URL = "https://zylalabs.com/api/2511/sports+card+and+trading+card+api";

function apiKey(): string {
  const key = process.env.ZYLALABS_API_KEY;
  if (!key) throw new Error("ZYLALABS_API_KEY is not set — see .env.local");
  return key;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string, attempt = 1): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey()}` } });
  if (res.status === 429 && attempt <= 3) {
    await sleep(1000 * attempt);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Zylalabs API HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  return res.json();
}

export interface ZylalabsCardSearchResult {
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  card_id: string;
  image: string | null;
  category: string;
  category_group: string;
  set_type: string;
}

/** GET .../card+search?search=<query> — fuzzy search by player/set/year/number. */
export async function cardSearch(search: string): Promise<ZylalabsCardSearchResult[]> {
  const url = `${BASE_URL}/2494/card+search?${new URLSearchParams({ search }).toString()}`;
  const data = await fetchJson(url);
  return Array.isArray(data) ? (data as ZylalabsCardSearchResult[]) : [];
}

export interface ZylalabsPricePoint {
  closing_date: string; // ISO datetime string
  Grade: string;
  card_id: string;
  price: string; // decimal string, e.g. "16150.00"
}

/** The grade labels Get Card Prices actually accepts, per its own docs. RAW = ungraded. */
export const ZYLALABS_GRADES = ["RAW", "PSA 10", "SGC 10", "BGS 10", "CGC 10", "CSG 10"] as const;
export type ZylalabsGrade = (typeof ZYLALABS_GRADES)[number];

/** GET .../get+card+prices?grade=&card_id=&days= — dated closing prices over the trailing `days`. */
export async function getCardPrices(cardId: string, grade: ZylalabsGrade, days: number): Promise<ZylalabsPricePoint[]> {
  const url = `${BASE_URL}/2495/get+card+prices?${new URLSearchParams({ grade, card_id: cardId, days: String(days) }).toString()}`;
  const data = await fetchJson(url);
  return Array.isArray(data) ? (data as ZylalabsPricePoint[]) : [];
}
