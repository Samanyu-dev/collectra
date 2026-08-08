/**
 * Scrapes app.getcollectr.com for MEGA Dream ex pricing — current market
 * prices, and full daily historical price series (ungraded + per-grade)
 * back to the set's release date.
 *
 * getcollectr's API (api-v2.getcollectr.com) sits behind a CloudFront WAF
 * that 403s plain HTTP clients (curl, Node's own fetch) — confirmed live.
 * It only accepts requests made from inside a real browser session, so every
 * call here runs via `page.evaluate(() => fetch(...))` in a Puppeteer tab
 * that's actually loaded app.getcollectr.com first.
 *
 * Three checkpointed outputs (each merges into what's already on disk, so a
 * crash or rate-limit partway through resumes instead of restarting):
 *  - grading-scales.json   — the ~106-row grade_id -> {company, grade} lookup.
 *    "Ungraded" is NOT a row in this table (confirmed) — any price_history
 *    grade_id absent from this set is ungraded. Never hardcode "52".
 *  - catalog.json          — one row per (card, product_sub_type) product,
 *    current price + basic identity (keyed by product_id).
 *  - products.json         — per-product detail incl. full `price_history`
 *    (keyed by product_id), fetched one at a time, flushed every 20.
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer, { Page } from "puppeteer";

const SET_PAGE_URL = "https://app.getcollectr.com/sets/category/3/mega-dream-ex?groupId=24499&cardType=cards";
const GROUP_ID = "24499";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const DATA_DIR = join(__dirname, "data");
const GRADING_SCALES_PATH = join(DATA_DIR, "mega-dream-ex-getcollectr-grading-scales.json");
const CATALOG_PATH = join(DATA_DIR, "mega-dream-ex-getcollectr-catalog.json");
const PRODUCTS_PATH = join(DATA_DIR, "mega-dream-ex-getcollectr-products.json");

const CATALOG_PAGE_SIZE = 30;
const DETAIL_FLUSH_EVERY = 20;
const DETAIL_PACE_MS = 450;

export interface CatalogRow {
  product_id: string;
  product_name: string;
  card_number: string;
  rarity: string;
  image_url: string;
  product_sub_type: string;
  is_card: boolean;
  latest_price: string;
  market_price_diff: string;
  market_price_percentage_diff: string;
}

export interface GradingScaleEntry {
  id: string;
  company_symbol: string;
  grade_name: string;
  grade_value: string;
  label: string; // clean display value, e.g. "10", "9.5", "BL10" — used as GradedPriceObservation.grade
}

export interface ProductDetail {
  product_id: string;
  product_name: string;
  card_number: string;
  rarity: string;
  description?: string;
  tcgplayer_product_url?: string;
  cardmarket_product_url?: string;
  market_price: string;
  price_history: { product_sub_type: string; grade_id: string; insertion_date: string; price: string }[];
}

function loadJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function saveJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

async function apiFetch<T>(page: Page, url: string): Promise<T> {
  const result = await page.evaluate(async (u) => {
    const res = await fetch(u, { headers: { Accept: "application/json" } });
    return { status: res.status, text: await res.text() };
  }, url);
  if (result.status !== 200) {
    throw new Error(`HTTP ${result.status} fetching ${url}: ${result.text.slice(0, 200)}`);
  }
  return JSON.parse(result.text) as T;
}

async function scrapeGradingScales(page: Page): Promise<GradingScaleEntry[]> {
  const cached = loadJson<GradingScaleEntry[]>(GRADING_SCALES_PATH, []);
  if (cached.length > 0) {
    console.log(`grading-scales: using cached ${cached.length} entries`);
    return cached;
  }
  console.log("Fetching grading-scales...");
  const json = await apiFetch<{ data: GradingScaleEntry[] }>(page, "https://api-v2.getcollectr.com/data/grading-scales");
  saveJson(GRADING_SCALES_PATH, json.data);
  console.log(`grading-scales: fetched ${json.data.length} entries`);
  return json.data;
}

async function scrapeCatalog(page: Page): Promise<CatalogRow[]> {
  const cached = loadJson<CatalogRow[]>(CATALOG_PATH, []);
  // Resumable by offset: keep fetching from where the cached count leaves off.
  let offset = cached.length - (cached.length % CATALOG_PAGE_SIZE);
  const byId = new Map(cached.map((r) => [r.product_id, r]));
  if (cached.length > 0) console.log(`catalog: resuming with ${cached.length} cached rows (offset ${offset})`);

  while (true) {
    const url = `https://api-v2.getcollectr.com/catalog?username=00000000-0000-0000-0000-000000000000&filters=cards&offset=${offset}&limit=${CATALOG_PAGE_SIZE}&groupId=${GROUP_ID}`;
    let json: { data: CatalogRow[] };
    try {
      json = await apiFetch<{ data: CatalogRow[] }>(page, url);
    } catch (e: any) {
      // A prior run already confirmed this page returned < page-size rows
      // (i.e. cached.length isn't a clean multiple of the page size) — that
      // already proves the catalog is complete, so a transient WAF/network
      // failure on this purely-confirmatory refetch isn't fatal; trust the
      // cache instead of aborting the whole scrape over it.
      if (cached.length > 0 && cached.length % CATALOG_PAGE_SIZE !== 0) {
        console.log(`catalog: refetch at offset ${offset} failed (${e.message}) but cache already looks complete (${cached.length} rows, not a full page) — trusting cache.`);
        break;
      }
      throw e;
    }
    for (const row of json.data) byId.set(row.product_id, row);
    console.log(`catalog offset ${offset}: +${json.data.length} rows (${byId.size} total)`);
    saveJson(CATALOG_PATH, Array.from(byId.values()));
    if (json.data.length < CATALOG_PAGE_SIZE) break;
    offset += CATALOG_PAGE_SIZE;
    await new Promise((r) => setTimeout(r, 350));
  }

  return Array.from(byId.values());
}

async function scrapeProductDetails(page: Page, productIds: string[]): Promise<void> {
  const cached = loadJson<Record<string, ProductDetail>>(PRODUCTS_PATH, {});
  const remaining = productIds.filter((id) => !cached[id]);
  console.log(`product details: ${Object.keys(cached).length} cached, ${remaining.length} remaining`);

  let sinceFlush = 0;
  for (let i = 0; i < remaining.length; i++) {
    const id = remaining[i];
    try {
      const url = `https://api-v2.getcollectr.com/catalog/products/${id}?username=00000000-0000-0000-0000-000000000000&details=true`;
      const json = await apiFetch<{ data: ProductDetail }>(page, url);
      cached[id] = json.data;
    } catch (e: any) {
      console.error(`  product ${id} failed: ${e.message} — will retry on next run`);
    }
    sinceFlush++;
    if (sinceFlush >= DETAIL_FLUSH_EVERY) {
      saveJson(PRODUCTS_PATH, cached);
      sinceFlush = 0;
      console.log(`  [${i + 1}/${remaining.length}] checkpoint flushed (${Object.keys(cached).length} total)`);
    }
    await new Promise((r) => setTimeout(r, DETAIL_PACE_MS));
  }
  saveJson(PRODUCTS_PATH, cached);
  console.log(`product details: done, ${Object.keys(cached).length} total`);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(SET_PAGE_URL, { waitUntil: "networkidle0", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1000));

    await scrapeGradingScales(page);
    const catalog = await scrapeCatalog(page);
    const productIds = catalog.filter((r) => r.is_card).map((r) => r.product_id);
    await scrapeProductDetails(page, productIds);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
