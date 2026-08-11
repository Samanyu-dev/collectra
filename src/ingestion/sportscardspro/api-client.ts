// Thin wrapper around the SportsCardsPro Prices API
// (https://www.sportscardspro.com/api-documentation) — a sister site of
// PriceCharting, so its API is a relabeled video-game-pricing API: field
// names like "loose-price"/"cib-price"/"new-price" are video-game condition
// terms repurposed for card grading tiers (see PRICE_FIELD_MEANING below).
// Mirrors ../ebay/api-client.ts's shape (fetchWithRetry + sleep) for
// consistency with the other ingestion source in this codebase.
const BASE_URL = "https://www.sportscardspro.com";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function apiKey(): string {
  const key = process.env.SPORTSCARDSPRO_API_KEY;
  if (!key) throw new Error("SPORTSCARDSPRO_API_KEY is not set — see .env.local");
  return key;
}

export interface SportsCardsProProduct {
  status: "success" | "error";
  "error-message"?: string;
  id?: string;
  "product-name"?: string;
  "console-name"?: string;
  "release-date"?: string;
  genre?: string;
  // All price fields are integer pennies (e.g. 1732 === $17.32), or absent/0
  // when the source has no data for that tier — never treat 0 as a real price.
  "loose-price"?: number;
  "cib-price"?: number;
  "new-price"?: number;
  "graded-price"?: number;
  "box-only-price"?: number;
  "manual-only-price"?: number;
  "bgs-10-price"?: number;
  "condition-17-price"?: number;
  "condition-18-price"?: number;
}

export interface SportsCardsProSearchResult {
  status: "success" | "error";
  "error-message"?: string;
  products?: SportsCardsProProduct[];
}

/**
 * What each price-guide field actually means for a card (per the API's own
 * "Description of Keys" table) — the field names themselves are video-game
 * condition terms (loose/CIB/new = a cartridge's condition) inherited from
 * PriceCharting's original product, not written for cards. Getting this
 * mapping wrong silently mislabels every graded price in the catalog, so
 * it's centralized here rather than inlined at each call site.
 */
export const PRICE_FIELD_MEANING = {
  "loose-price": { ungraded: true },
  "cib-price": { company: "Generic", grade: "7-7.5" },
  "new-price": { company: "Generic", grade: "8-8.5" },
  "graded-price": { company: "Generic", grade: "9" },
  "box-only-price": { company: "Generic", grade: "9.5" },
  "manual-only-price": { company: "PSA", grade: "10" },
  "bgs-10-price": { company: "BGS", grade: "10" },
  "condition-17-price": { company: "CGC", grade: "10" },
  "condition-18-price": { company: "SGC", grade: "10" },
} as const;

async function fetchWithRetry(url: string, attempt = 1): Promise<unknown> {
  const res = await fetch(url);
  if (res.status === 429 && attempt <= 3) {
    await sleep(1000 * attempt);
    return fetchWithRetry(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`SportsCardsPro API HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  return res.json();
}

/** GET /api/product — a single product by id or best-match full-text search. */
export async function getProduct(params: { id?: string; q?: string }): Promise<SportsCardsProProduct> {
  const query = new URLSearchParams({ t: apiKey() });
  if (params.id) query.set("id", params.id);
  if (params.q) query.set("q", params.q);
  const data = (await fetchWithRetry(`${BASE_URL}/api/product?${query.toString()}`)) as SportsCardsProProduct;
  if (data.status === "error") throw new Error(`SportsCardsPro API error: ${data["error-message"] ?? "unknown"}`);
  return data;
}

/** GET /api/products — up to 20 best-matching products for a full-text search. */
export async function searchProducts(q: string): Promise<SportsCardsProProduct[]> {
  const query = new URLSearchParams({ t: apiKey(), q });
  const data = (await fetchWithRetry(`${BASE_URL}/api/products?${query.toString()}`)) as SportsCardsProSearchResult;
  if (data.status === "error") throw new Error(`SportsCardsPro API error: ${data["error-message"] ?? "unknown"}`);
  return data.products ?? [];
}

/** Pennies (integer) -> dollars, treating 0/undefined as "no data," never a real $0.00 price. */
export function penniesToUsd(pennies: number | undefined): number | null {
  if (!pennies || pennies <= 0) return null;
  return pennies / 100;
}
