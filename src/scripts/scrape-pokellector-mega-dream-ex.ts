/**
 * Scrapes the Pokellector checklist for MEGA Dream ex (Japanese-exclusive
 * Pokémon set, released 2025-11-28 — not in api.pokemontcg.io, which only
 * indexes English-language sets, so this is the only source for the
 * canonical checklist + original card scans).
 *
 * The checklist page itself (one request) already embeds every card's slug,
 * number, name, and thumbnail image URL — no need to walk 250 individual
 * card pages. The thumbnail URL trivially yields the full-resolution scan by
 * dropping the `.thumb` segment (verified: both URLs resolve for card #1).
 *
 * Output is keyed by `number` in the same zero-padded "NNN/193" format
 * getcollectr's API uses, so the seed script can join the two caches on a
 * stable, identical key instead of a bare integer that could collide across
 * differently-formatted sources (promos, "TG"-prefixed numbers, etc. in
 * future sets).
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CHECKLIST_URL = "https://jp.pokellector.com/MEGA-Dream-ex-Expansion/";
const OUT_PATH = join(__dirname, "data", "mega-dream-ex-pokellector.json");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface PokellectorCard {
  number: string; // "NNN/193" — zero-padded, matches getcollectr's card_number format
  name: string;
  imageUrl: string; // full-resolution scan
}

// e.g. Ethan's Pinsir - MEGA Dream ex #1  /  <img ... data-src="....thumb.png">
const CARD_RE =
  /<a href="\/MEGA-Dream-ex-Expansion\/[^"]+-Card-(\d+)" name="card\d+" title="([^"]+) - MEGA Dream ex #\d+">\s*<img class="card lazyload" data-src="([^"]+)\.thumb\.png">/g;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function padNumber(n: string): string {
  return `${n.padStart(3, "0")}/193`;
}

async function fetchChecklist(): Promise<string> {
  const res = await fetch(CHECKLIST_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching checklist`);
  return res.text();
}

function loadCache(): Record<string, PokellectorCard> {
  if (!existsSync(OUT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(OUT_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, PokellectorCard>) {
  writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2));
}

async function main() {
  const cache = loadCache();
  const alreadyHave = Object.keys(cache).length;
  if (alreadyHave >= 250) {
    console.log(`Cache already has ${alreadyHave} cards — nothing to do. Delete ${OUT_PATH} to force a re-scrape.`);
    return;
  }

  console.log("Fetching Pokellector checklist for MEGA Dream ex...");
  const html = await fetchChecklist();

  let match: RegExpExecArray | null;
  let found = 0;
  while ((match = CARD_RE.exec(html)) !== null) {
    const [, num, rawName, thumbBase] = match;
    const number = padNumber(num);
    const name = decodeEntities(rawName).trim();
    const imageUrl = `${thumbBase}.png`; // dropping ".thumb" yields the full-resolution scan
    cache[number] = { number, name, imageUrl };
    found++;
  }

  if (found === 0) {
    throw new Error("No cards matched — Pokellector's markup may have changed; inspect the checklist HTML.");
  }

  saveCache(cache);
  console.log(`Scraped ${found} cards (${Object.keys(cache).length} total in cache). Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
