import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";
import { getOrCreateDataSource } from "../ingestion/engine/media";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import type { RawPriceObservation } from "@/lib/pricing/types";

/**
 * Seeds the Topps Turbo Attax 2020 F1 trading card set — 197 cards total:
 * #1-181 base checklist + XL-1..XL-5 + 11 Limited Edition Gold/Silver/Bronze
 * rows, per the 2020-season checklist (Racing Point, Renault DP World,
 * AlphaTauri, Alfa Romeo Racing ORLEN confirm the season).
 *
 * Modeling decisions (confirmed with user before writing this):
 *  - Card.supertype = the checklist's "Type" column verbatim.
 *  - Insert = the checklist's "Section" column when present (e.g. "Brilliant
 *    Brits", "Team Card", "F1 Racer", "Speedster", "F1 Team Duo", "F2 Team
 *    Duo"); falls back to Type when Section is "-" (e.g. "Strategy Card",
 *    "Memorable Moments" each become their own Insert).
 *  - Team names are 2020-season-accurate (e.g. "BWT Racing Point F1 Team",
 *    "Scuderia AlphaTauri") as their own Team rows, not merged into the
 *    current-season Team entities the 2025/2026 scripts use — matches the
 *    precedent in seed-topps-turbo-attax-2023.ts (era-specific team names,
 *    no cross-season merging).
 *  - LE rows: the checklist's Type column embeds color ("Limited edition /
 *    Gold"), which is stripped here — Insert = "Limited Edition" for all 11
 *    rows, and Gold/Silver/Bronze becomes Parallel(finish="Limited Edition",
 *    color=...), per the schema's Parallel decomposition. LE1-LE5 become 5
 *    standalone Card rows (id ...-le1..-le5), each with 1-3 Variant rows
 *    carrying the parallel. Only the G/S/B combos actually given in the
 *    checklist are created (LE1 and LE5 only have Gold — a probable gap in
 *    the source checklist, not invented here).
 *  - Name normalization (per user instruction / to avoid duplicate Person
 *    rows already seeded by other scripts): "Daniel Riccardo" -> "Daniel
 *    Ricciardo", "George Russel" -> "George Russell", "Kimi Raikkonen" ->
 *    "Kimi Räikkönen" (matches the diacritic spelling already used in
 *    seed-topps-turbo-attax-2025.ts / -2026.ts), "Willams Racing Team" ->
 *    "Williams Racing Team".
 *  - Rows #70-181 (Live Action/Flashback/Memorable Moments/etc.) don't state
 *    a team in the checklist, so `team` is left unset rather than inferring
 *    the driver's 2020 team.
 *
 * Pricing: only the "Ungraded" column from the second pasted table is seeded
 * (per user instruction — Grade 9 / PSA 10 explicitly excluded this pass).
 * Written as PriceObservation rows (never directly to CurrentPrice, which is
 * a cache rebuilt by the recompute job — see schema.prisma's doc comment on
 * CurrentPrice), using the same writePriceObservationsBatch +
 * recomputeCurrentPricesForVariants helpers the eBay backfill scripts use.
 * Source: https://www.laststicker.com/cards/topps_formula-1_turbo_attax/ —
 * recorded as DataSource kind="COMMUNITY", PriceObservation kind="LISTING".
 * 14 of the 181 base cards and all 16 XL/LE cards have no ungraded price in
 * the source table — skipped, not invented. Note: the same source page also
 * lists Need/Offer/Hold counts and a Need/Offer ratio per card — these are
 * sticker-trading swap-demand stats (how many collectors need vs. are
 * offering this card), not monetary prices, and are deliberately NOT written
 * here (see conversation — flagged back to the user rather than written as
 * fake USD prices).
 *
 * seedPrices() is idempotent by (variantId, sourceId) rather than by an
 * external per-row id (this is a hand-transcribed table, not an API feed
 * with stable ids) — safe to re-run.
 */
const SET_ID = "topps-turbo-attax-2020";
const SET_NAME = "Turbo Attax 2020";
const PRICE_SOURCE_IDENTIFIER = "laststicker.com:topps_formula-1_turbo_attax";
const PRICE_SOURCE_URL = "https://www.laststicker.com/cards/topps_formula-1_turbo_attax/";

interface CardRow {
  number: string;
  name: string;
  type: string;
  section?: string;
  team?: string;
  persons?: string[];
}

// 2020-season team names (era-accurate; intentionally distinct Team rows
// from the current-season names used by the 2025/2026 scripts).
const MERCEDES = "Mercedes-AMG Petronas F1 Team";
const FERRARI = "Scuderia Ferrari";
const REDBULL = "Aston Martin Red Bull Racing";
const MCLAREN = "McLaren F1 Team";
const RENAULT = "Renault DP World F1 Team";
const ALPHATAURI = "Scuderia AlphaTauri";
const RACINGPOINT = "BWT Racing Point F1 Team";
const ALFAROMEO = "Alfa Romeo Racing ORLEN";
const HAAS = "Haas F1 Team";
const WILLIAMS = "Williams Racing";

/** One F1 Base card block: Team Card, 2x Racer, 2x Speedster, Team Duo (6 rows, matches the checklist's per-team pattern exactly). */
function f1TeamBlock(
  startNum: number,
  teamCardTitle: string,
  team: string,
  driver1: string,
  driver2: string
): CardRow[] {
  const n = startNum;
  return [
    { number: String(n), name: teamCardTitle, section: "Team Card", type: "F1 Base card", team },
    { number: String(n + 1), name: driver1, section: "F1 Racer", type: "F1 Base card", team, persons: [driver1] },
    { number: String(n + 2), name: driver2, section: "F1 Racer", type: "F1 Base card", team, persons: [driver2] },
    { number: String(n + 3), name: driver1, section: "Speedster", type: "F1 Base card", team, persons: [driver1] },
    { number: String(n + 4), name: driver2, section: "Speedster", type: "F1 Base card", team, persons: [driver2] },
    {
      number: String(n + 5),
      name: `${driver1} & ${driver2}`,
      section: "F1 Team Duo",
      type: "F1 Base card",
      team,
      persons: [driver1, driver2],
    },
  ];
}

const BASE_CARDS: CardRow[] = [
  // ---- International Superstars (1-9) ----
  { number: "1", name: "Lewis Hamilton", section: "Brilliant Brits", type: "International Superstars", persons: ["Lewis Hamilton"] },
  { number: "2", name: "Lando Norris", section: "Brilliant Brits", type: "International Superstars", persons: ["Lando Norris"] },
  { number: "3", name: "George Russell", section: "Brilliant Brits", type: "International Superstars", persons: ["George Russell"] },
  { number: "4", name: "Valtteri Bottas", section: "Flying Finns", type: "International Superstars", persons: ["Valtteri Bottas"] },
  { number: "5", name: "Kimi Räikkönen", section: "Flying Finns", type: "International Superstars", persons: ["Kimi Räikkönen"] },
  { number: "6", name: "Lance Stroll", section: "Cool Canadians", type: "International Superstars", persons: ["Lance Stroll"] },
  { number: "7", name: "Nicholas Latifi", section: "Cool Canadians", type: "International Superstars", persons: ["Nicholas Latifi"] },
  { number: "8", name: "Esteban Ocon", section: "Finest French", type: "International Superstars", persons: ["Esteban Ocon"] },
  { number: "9", name: "Pierre Gasly", section: "Finest French", type: "International Superstars", persons: ["Pierre Gasly"] },

  // ---- F1 Base cards (10-69): 10 teams x 6 cards ----
  ...f1TeamBlock(10, "Mercedes-AMG Petronas F1 Team", MERCEDES, "Lewis Hamilton", "Valtteri Bottas"),
  ...f1TeamBlock(16, "Scuderia Ferrari Team", FERRARI, "Charles Leclerc", "Sebastian Vettel"),
  ...f1TeamBlock(22, "Aston Martin Red Bull Racing Team", REDBULL, "Max Verstappen", "Alex Albon"),
  ...f1TeamBlock(28, "McLaren F1 Team", MCLAREN, "Carlos Sainz", "Lando Norris"),
  ...f1TeamBlock(34, "Renault DP World F1 Team", RENAULT, "Daniel Ricciardo", "Esteban Ocon"),
  ...f1TeamBlock(40, "Scuderia AlphaTauri Team", ALPHATAURI, "Pierre Gasly", "Daniil Kvyat"),
  ...f1TeamBlock(46, "BWT Racing Point F1 Team", RACINGPOINT, "Sergio Perez", "Lance Stroll"),
  ...f1TeamBlock(52, "Alfa Romeo Racing ORLEN Team", ALFAROMEO, "Kimi Räikkönen", "Antonio Giovinazzi"),
  ...f1TeamBlock(58, "Haas F1 Team", HAAS, "Kevin Magnussen", "Romain Grosjean"),
  ...f1TeamBlock(64, "Williams Racing Team", WILLIAMS, "George Russell", "Nicholas Latifi"),

  // ---- Live Action Card (70-93) ----
  { number: "70", name: "Charles Leclerc", type: "Live Action Card", persons: ["Charles Leclerc"] },
  { number: "71", name: "Lewis Hamilton", type: "Live Action Card", persons: ["Lewis Hamilton"] },
  { number: "72", name: "Lando Norris", type: "Live Action Card", persons: ["Lando Norris"] },
  { number: "73", name: "Lewis Hamilton", type: "Live Action Card", persons: ["Lewis Hamilton"] },
  { number: "74", name: "Valtteri Bottas", type: "Live Action Card", persons: ["Valtteri Bottas"] },
  { number: "75", name: "Sebastian Vettel", type: "Live Action Card", persons: ["Sebastian Vettel"] },
  { number: "76", name: "Kimi Räikkönen", type: "Live Action Card", persons: ["Kimi Räikkönen"] },
  { number: "77", name: "Max Verstappen", type: "Live Action Card", persons: ["Max Verstappen"] },
  { number: "78", name: "Valtteri Bottas", type: "Live Action Card", persons: ["Valtteri Bottas"] },
  { number: "79", name: "Charles Leclerc", type: "Live Action Card", persons: ["Charles Leclerc"] },
  { number: "80", name: "Lewis Hamilton", type: "Live Action Card", persons: ["Lewis Hamilton"] },
  { number: "81", name: "Max Verstappen", type: "Live Action Card", persons: ["Max Verstappen"] },
  { number: "82", name: "Daniil Kvyat", type: "Live Action Card", persons: ["Daniil Kvyat"] },
  { number: "83", name: "Lance Stroll", type: "Live Action Card", persons: ["Lance Stroll"] },
  { number: "84", name: "Max Verstappen", type: "Live Action Card", persons: ["Max Verstappen"] },
  { number: "85", name: "Lewis Hamilton", type: "Live Action Card", persons: ["Lewis Hamilton"] },
  { number: "86", name: "Alex Albon", type: "Live Action Card", persons: ["Alex Albon"] },
  { number: "87", name: "Charles Leclerc", type: "Live Action Card", persons: ["Charles Leclerc"] },
  { number: "88", name: "Daniel Ricciardo", type: "Live Action Card", persons: ["Daniel Ricciardo"] },
  { number: "89", name: "Valtteri Bottas", type: "Live Action Card", persons: ["Valtteri Bottas"] },
  { number: "90", name: "Lewis Hamilton", type: "Live Action Card", persons: ["Lewis Hamilton"] },
  { number: "91", name: "Max Verstappen", type: "Live Action Card", persons: ["Max Verstappen"] },
  { number: "92", name: "Antonio Giovinazzi", type: "Live Action Card", persons: ["Antonio Giovinazzi"] },
  { number: "93", name: "Lewis Hamilton", type: "Live Action Card", persons: ["Lewis Hamilton"] },

  // ---- Flashback Card (94-107) ----
  { number: "94", name: "Kimi Räikkönen", type: "Flashback Card", persons: ["Kimi Räikkönen"] },
  { number: "95", name: "Lewis Hamilton", type: "Flashback Card", persons: ["Lewis Hamilton"] },
  { number: "96", name: "Sebastian Vettel", type: "Flashback Card", persons: ["Sebastian Vettel"] },
  { number: "97", name: "Romain Grosjean", type: "Flashback Card", persons: ["Romain Grosjean"] },
  { number: "98", name: "Sergio Perez", type: "Flashback Card", persons: ["Sergio Perez"] },
  { number: "99", name: "Daniel Ricciardo", type: "Flashback Card", persons: ["Daniel Ricciardo"] },
  { number: "100", name: "Valtteri Bottas", type: "Flashback Card", persons: ["Valtteri Bottas"] },
  { number: "101", name: "Kevin Magnussen", type: "Flashback Card", persons: ["Kevin Magnussen"] },
  { number: "102", name: "Daniil Kvyat", type: "Flashback Card", persons: ["Daniil Kvyat"] },
  { number: "103", name: "Max Verstappen", type: "Flashback Card", persons: ["Max Verstappen"] },
  { number: "104", name: "Carlos Sainz", type: "Flashback Card", persons: ["Carlos Sainz"] },
  { number: "105", name: "Esteban Ocon", type: "Flashback Card", persons: ["Esteban Ocon"] },
  { number: "106", name: "Lance Stroll", type: "Flashback Card", persons: ["Lance Stroll"] },
  { number: "107", name: "Charles Leclerc", type: "Flashback Card", persons: ["Charles Leclerc"] },

  // ---- F2 Team Duo (108-118) ----
  { number: "108", name: "Sean Gelael & Dan Ticktum", section: "F2 Team Duo", type: "F2 Card", persons: ["Sean Gelael", "Dan Ticktum"] },
  { number: "109", name: "Guanyu Zhou & Callum Ilott", section: "F2 Team Duo", type: "F2 Card", persons: ["Guanyu Zhou", "Callum Ilott"] },
  { number: "110", name: "Marcus Armstrong & Christian Ludgaard", section: "F2 Team Duo", type: "F2 Card", persons: ["Marcus Armstrong", "Christian Ludgaard"] },
  { number: "111", name: "Yuki Tsunoda & Jehan Daruvala", section: "F2 Team Duo", type: "F2 Card", persons: ["Yuki Tsunoda", "Jehan Daruvala"] },
  { number: "112", name: "Jack Aitken & Guilherme Samaia", section: "F2 Team Duo", type: "F2 Card", persons: ["Jack Aitken", "Guilherme Samaia"] },
  { number: "113", name: "Louis Deletraz & Pedro Piquet", section: "F2 Team Duo", type: "F2 Card", persons: ["Louis Deletraz", "Pedro Piquet"] },
  { number: "114", name: "Nobuharu Matsushita & Felipe Drugovich", section: "F2 Team Duo", type: "F2 Card", persons: ["Nobuharu Matsushita", "Felipe Drugovich"] },
  { number: "115", name: "Artem Markelov & Giuliano Alesi", section: "F2 Team Duo", type: "F2 Card", persons: ["Artem Markelov", "Giuliano Alesi"] },
  { number: "116", name: "Mick Schumacher & Robert Shwartzman", section: "F2 Team Duo", type: "F2 Card", persons: ["Mick Schumacher", "Robert Shwartzman"] },
  { number: "117", name: "Roy Nissany & Marino Sato", section: "F2 Team Duo", type: "F2 Card", persons: ["Roy Nissany", "Marino Sato"] },
  { number: "118", name: "Nikita Mazepin & Luca Ghiotto", section: "F2 Team Duo", type: "F2 Card", persons: ["Nikita Mazepin", "Luca Ghiotto"] },

  // ---- Strategy Card (119-141) ----
  { number: "119", name: "Rainmaster", type: "Strategy Card" },
  { number: "120", name: "Hard Tyre", type: "Strategy Card" },
  { number: "121", name: "Medium Tyre", type: "Strategy Card" },
  { number: "122", name: "Soft Tyre", type: "Strategy Card" },
  { number: "123", name: "Start Lights", type: "Strategy Card" },
  { number: "124", name: "Fast Pitstop", type: "Strategy Card" },
  { number: "125", name: "DRS", type: "Strategy Card" },
  { number: "126", name: "Engine Boost", type: "Strategy Card" },
  { number: "127", name: "Overtake", type: "Strategy Card" },
  { number: "128", name: "Chequered Flag", type: "Strategy Card" },
  { number: "129", name: "Podium", type: "Strategy Card" },
  { number: "130", name: "World Championship Winning Trophy", type: "Strategy Card" },
  { number: "131", name: "Steering Wheel", type: "Strategy Card" },
  { number: "132", name: "Safety Car", type: "Strategy Card" },
  { number: "133", name: "Team Orders", type: "Strategy Card" },
  { number: "134", name: "Slow Pitstop", type: "Strategy Card" },
  { number: "135", name: "Loose Wheel", type: "Strategy Card" },
  { number: "136", name: "Oil Flag", type: "Strategy Card" },
  { number: "137", name: "Blue Flag", type: "Strategy Card" },
  { number: "138", name: "Yellow Flag", type: "Strategy Card" },
  { number: "139", name: "Spin", type: "Strategy Card" },
  { number: "140", name: "Blown Engine", type: "Strategy Card" },
  { number: "141", name: "Race Collision", type: "Strategy Card" },

  // ---- Memorable Moments (142-148) ----
  { number: "142", name: "Lewis Hamilton", type: "Memorable Moments", persons: ["Lewis Hamilton"] },
  { number: "143", name: "Sergio Perez", type: "Memorable Moments", persons: ["Sergio Perez"] },
  { number: "144", name: "Max Verstappen", type: "Memorable Moments", persons: ["Max Verstappen"] },
  { number: "145", name: "Valtteri Bottas", type: "Memorable Moments", persons: ["Valtteri Bottas"] },
  { number: "146", name: "Sebastian Vettel", type: "Memorable Moments", persons: ["Sebastian Vettel"] },
  { number: "147", name: "Charles Leclerc", type: "Memorable Moments", persons: ["Charles Leclerc"] },
  { number: "148", name: "Carlos Sainz", type: "Memorable Moments", persons: ["Carlos Sainz"] },

  // ---- Future Star Card (149-153) ----
  { number: "149", name: "Alex Albon", type: "Future Star Card", persons: ["Alex Albon"] },
  { number: "150", name: "Lando Norris", type: "Future Star Card", persons: ["Lando Norris"] },
  { number: "151", name: "Esteban Ocon", type: "Future Star Card", persons: ["Esteban Ocon"] },
  { number: "152", name: "Antonio Giovinazzi", type: "Future Star Card", persons: ["Antonio Giovinazzi"] },
  { number: "153", name: "George Russell", type: "Future Star Card", persons: ["George Russell"] },

  // ---- Race Superstar Card (154-173) ----
  { number: "154", name: "Lewis Hamilton", type: "Race Superstar Card", persons: ["Lewis Hamilton"] },
  { number: "155", name: "Valtteri Bottas", type: "Race Superstar Card", persons: ["Valtteri Bottas"] },
  { number: "156", name: "Charles Leclerc", type: "Race Superstar Card", persons: ["Charles Leclerc"] },
  { number: "157", name: "Sebastian Vettel", type: "Race Superstar Card", persons: ["Sebastian Vettel"] },
  { number: "158", name: "Max Verstappen", type: "Race Superstar Card", persons: ["Max Verstappen"] },
  { number: "159", name: "Alex Albon", type: "Race Superstar Card", persons: ["Alex Albon"] },
  { number: "160", name: "Carlos Sainz", type: "Race Superstar Card", persons: ["Carlos Sainz"] },
  { number: "161", name: "Lando Norris", type: "Race Superstar Card", persons: ["Lando Norris"] },
  { number: "162", name: "Daniel Ricciardo", type: "Race Superstar Card", persons: ["Daniel Ricciardo"] },
  { number: "163", name: "Esteban Ocon", type: "Race Superstar Card", persons: ["Esteban Ocon"] },
  { number: "164", name: "Pierre Gasly", type: "Race Superstar Card", persons: ["Pierre Gasly"] },
  { number: "165", name: "Daniil Kvyat", type: "Race Superstar Card", persons: ["Daniil Kvyat"] },
  { number: "166", name: "Sergio Perez", type: "Race Superstar Card", persons: ["Sergio Perez"] },
  { number: "167", name: "Lance Stroll", type: "Race Superstar Card", persons: ["Lance Stroll"] },
  { number: "168", name: "Kimi Räikkönen", type: "Race Superstar Card", persons: ["Kimi Räikkönen"] },
  { number: "169", name: "Antonio Giovinazzi", type: "Race Superstar Card", persons: ["Antonio Giovinazzi"] },
  { number: "170", name: "Kevin Magnussen", type: "Race Superstar Card", persons: ["Kevin Magnussen"] },
  { number: "171", name: "Romain Grosjean", type: "Race Superstar Card", persons: ["Romain Grosjean"] },
  { number: "172", name: "George Russell", type: "Race Superstar Card", persons: ["George Russell"] },
  { number: "173", name: "Nicholas Latifi", type: "Race Superstar Card", persons: ["Nicholas Latifi"] },

  // ---- Gold Race Winner Card (174-180) ----
  { number: "174", name: "Lewis Hamilton", type: "Gold Race Winner Card", persons: ["Lewis Hamilton"] },
  { number: "175", name: "Sebastian Vettel", type: "Gold Race Winner Card", persons: ["Sebastian Vettel"] },
  { number: "176", name: "Kimi Räikkönen", type: "Gold Race Winner Card", persons: ["Kimi Räikkönen"] },
  { number: "177", name: "Max Verstappen", type: "Gold Race Winner Card", persons: ["Max Verstappen"] },
  { number: "178", name: "Valtteri Bottas", type: "Gold Race Winner Card", persons: ["Valtteri Bottas"] },
  { number: "179", name: "Daniel Ricciardo", type: "Gold Race Winner Card", persons: ["Daniel Ricciardo"] },
  { number: "180", name: "Charles Leclerc", type: "Gold Race Winner Card", persons: ["Charles Leclerc"] },

  // ---- Gold Best-Ever Finish Card (181) ----
  { number: "181", name: "Pierre Gasly", type: "Gold Best-Ever Finish Card", persons: ["Pierre Gasly"] },

  // ---- XL Card (XL-1..XL-5) ----
  { number: "XL-1", name: "Lewis Hamilton", type: "XL Card", persons: ["Lewis Hamilton"] },
  { number: "XL-2", name: "Lando Norris", type: "XL Card", persons: ["Lando Norris"] },
  { number: "XL-3", name: "Charles Leclerc & Sebastian Vettel", type: "XL Card", persons: ["Charles Leclerc", "Sebastian Vettel"] },
  { number: "XL-4", name: "Sergio Perez", type: "XL Card", persons: ["Sergio Perez"] },
  { number: "XL-5", name: "Valtteri Bottas", type: "XL Card", persons: ["Valtteri Bottas"] },
];

// ---- Limited Edition (11 rows: LE1G, LE2G/S/B, LE3G/S/B, LE4G/S/B, LE5G) ----
// Each G/S/B combo is its own independent Card (id "...-le2g", "...-le2s",
// etc.), not a Parallel ladder under one shared "LE2" card — per user
// correction, and matching the precedent already set by
// seed-topps-turbo-attax-2025.ts's own LE1-LE27 cards (color embedded in the
// Card name, e.g. "Lewis Hamilton (Ruby)", no Parallel decomposition). Only
// the G/S/B combos actually present in the source checklist are seeded — LE1
// and LE5 have no Silver/Bronze given, a probable gap flagged to the user
// rather than invented.
interface LeCard {
  number: string; // e.g. "LE1G", "LE2S" — the checklist's own row identifier
  driver: string;
  color: "Gold" | "Silver" | "Bronze";
}
const LE_CARDS: LeCard[] = [
  { number: "LE1G", driver: "Lewis Hamilton", color: "Gold" },
  { number: "LE2G", driver: "Max Verstappen", color: "Gold" },
  { number: "LE2S", driver: "Max Verstappen", color: "Silver" },
  { number: "LE2B", driver: "Max Verstappen", color: "Bronze" },
  { number: "LE3G", driver: "Charles Leclerc", color: "Gold" },
  { number: "LE3S", driver: "Charles Leclerc", color: "Silver" },
  { number: "LE3B", driver: "Charles Leclerc", color: "Bronze" },
  { number: "LE4G", driver: "Daniel Ricciardo", color: "Gold" },
  { number: "LE4S", driver: "Daniel Ricciardo", color: "Silver" },
  { number: "LE4B", driver: "Daniel Ricciardo", color: "Bronze" },
  { number: "LE5G", driver: "Kimi Räikkönen", color: "Gold" },
];

// ---- Ungraded prices, keyed by card number "1".."181" (from section 1b) ----
// 14 entries are `null` — no ungraded price given in the source table for
// that card, skipped rather than invented. XL/LE cards have no prices at all
// in the source table (not included here).
const UNGRADED_PRICES: Record<string, number | null> = {
  "1": 1.0, "2": 6.26, "3": 3.99, "4": 4.84, "5": 2.07, "6": 1.69, "7": 2.01, "8": 0.25, "9": 11.75,
  "10": 1.39, "11": 2.61, "12": 2.02, "13": 1.35, "14": 1.7, "15": 1.0, "16": 1.47, "17": 2.63, "18": 0.25,
  "19": 2.84, "20": 2.65, "21": 6.25, "22": 0.25, "23": 5.25, "24": null, "25": 1.69, "26": 2.0, "27": 2.0,
  "28": 0.25, "29": 2.45, "30": 4.94, "31": 4.49, "32": 2.62, "33": 10.25, "34": 1.44, "35": 2.35, "36": 2.11,
  "37": 1.44, "38": 1.46, "39": 2.47, "40": 0.25, "41": 0.25, "42": 1.73, "43": 2.11, "44": 0.25, "45": 1.42,
  "46": 0.25, "47": 1.98, "48": 0.25, "49": null, "50": 0.25, "51": 0.25, "52": 3.7, "53": 1.75, "54": 2.02,
  "55": 2.11, "56": 0.25, "57": 2.11, "58": 1.82, "59": 2.54, "60": 1.4, "61": 1.98, "62": 2.0, "63": null,
  "64": 7.44, "65": 2.05, "66": 2.02, "67": 4.06, "68": 0.25, "69": 1.84, "70": 3.54, "71": 5.99, "72": 3.49,
  "73": 3.78, "74": 2.0, "75": 2.11, "76": 2.0, "77": 1.64, "78": 2.44, "79": 4.68, "80": 2.02, "81": 1.34,
  "82": 2.05, "83": 0.25, "84": 1.38, "85": 2.73, "86": 0.25, "87": 2.25, "88": 1.44, "89": 2.0, "90": 1.39,
  "91": 0.25, "92": 0.25, "93": 4.99, "94": 1.96, "95": 2.71, "96": 0.99, "97": 1.23, "98": 6.13, "99": 1.44,
  "100": 1.44, "101": 5.06, "102": 1.68, "103": 3.69, "104": 2.27, "105": 1.31, "106": 3.33, "107": 2.99,
  "108": 1.46, "109": 1.42, "110": 1.46, "111": 1.9, "112": 1.46, "113": 1.45, "114": 1.58, "115": null,
  "116": 1.46, "117": 1.46, "118": 1.46, "119": 4.84, "120": null, "121": null, "122": null, "123": null,
  "124": 1.65, "125": null, "126": 1.46, "127": null, "128": 1.94, "129": null, "130": 1.47, "131": null,
  "132": null, "133": 1.46, "134": 4.84, "135": 1.75, "136": 0.25, "137": 2.02, "138": 1.85, "139": 2.0,
  "140": null, "141": 1.9, "142": 1.2, "143": 2.0, "144": 7.97, "145": 0.25, "146": 0.25, "147": 2.42,
  "148": 0.99, "149": 0.25, "150": 2.49, "151": 0.64, "152": 2.0, "153": 2.02, "154": 4.24, "155": 4.99,
  "156": 2.41, "157": 3.97, "158": 5.47, "159": 2.0, "160": 0.99, "161": 1.44, "162": 0.99, "163": 0.99,
  "164": 2.11, "165": 1.75, "166": 2.99, "167": 2.27, "168": 2.15, "169": 0.25, "170": 1.94, "171": 1.99,
  "172": 5.37, "173": 2.03, "174": 13.07, "175": 2.1, "176": 1.99, "177": 25.87, "178": 2.99, "179": 5.99,
  "180": 4.01, "181": 1.99,
};

async function seedCards(setId: string, basePrintingId: string) {
  let created = 0;
  let skipped = 0;

  for (const [i, row] of BASE_CARDS.entries()) {
    const cardId = `${SET_ID}-${row.number.toLowerCase()}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const personIds: string[] = [];
    if (row.persons) {
      for (const name of row.persons) personIds.push(await builder.getOrCreatePerson(name));
    }

    const teamId = row.team ? await builder.getOrCreateTeam(row.team) : undefined;
    const insertName = row.section ?? row.type;
    const insertId = await builder.getOrCreateInsert(insertName, setId);

    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId,
        supertype: row.type,
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
        teams: teamId ? { connect: { id: teamId } } : undefined,
      },
    });

    await prisma.variant.create({ data: { cardId: card.id, printingId: basePrintingId, insertId } });

    created++;
    if ((i + 1) % 50 === 0) console.log(`  [base ${i + 1}/${BASE_CARDS.length}] created=${created}`);
  }

  const leInsertId = await builder.getOrCreateInsert("Limited Edition", setId);
  let leCreated = 0;
  let leSkipped = 0;

  for (const le of LE_CARDS) {
    const cardId = `${SET_ID}-${le.number.toLowerCase()}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      leSkipped++;
      continue;
    }

    const personId = await builder.getOrCreatePerson(le.driver);
    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: `${le.driver} (${le.color})`,
        number: le.number,
        setId,
        supertype: "Limited Edition",
        persons: { connect: [{ id: personId }] },
      },
    });

    await prisma.variant.create({ data: { cardId: card.id, printingId: basePrintingId, insertId: leInsertId } });
    leCreated++;
  }

  console.log(`Base cards: created ${created}, skipped ${skipped}.`);
  console.log(`LE cards: created ${leCreated}, skipped ${leSkipped}.`);
}

async function seedPrices() {
  const sourceId = await getOrCreateDataSource(PRICE_SOURCE_IDENTIFIER, "COMMUNITY");
  const now = new Date();

  const rows: Array<RawPriceObservation & { sourceId: string }> = [];
  const variantIds: string[] = [];
  let missing = 0;
  let noVariant = 0;
  let alreadyPriced = 0;

  for (const [number, price] of Object.entries(UNGRADED_PRICES)) {
    if (price == null) {
      missing++;
      continue;
    }
    const cardId = `${SET_ID}-${number}`;
    const variant = await prisma.variant.findFirst({ where: { cardId } });
    if (!variant) {
      noVariant++;
      console.warn(`  No Variant found for card ${cardId}, skipping price.`);
      continue;
    }
    // Idempotency: this script has no per-row external id to dedup on (hand-
    // transcribed table, not an API feed), so guard on "this source already
    // has an observation for this variant" instead — safe to re-run.
    const existingObs = await prisma.priceObservation.findFirst({ where: { variantId: variant.id, sourceId } });
    if (existingObs) {
      alreadyPriced++;
      continue;
    }
    rows.push({
      variantId: variant.id,
      kind: "LISTING",
      price,
      currency: "USD",
      observedAt: now,
      sourceUrl: PRICE_SOURCE_URL,
      sourceId,
    });
    variantIds.push(variant.id);
  }

  const written = await writePriceObservationsBatch(rows, prisma);
  console.log(
    `Prices: wrote ${written} PriceObservation row(s); ${missing} skipped (no price in source), ${noVariant} skipped (no Variant found), ${alreadyPriced} skipped (already priced from this source).`
  );

  if (variantIds.length > 0) {
    await recomputeCurrentPricesForVariants(variantIds, now, prisma);
    console.log(`Recomputed CurrentPrice for ${variantIds.length} variant(s).`);
  }
}

async function main() {
  console.log(`Seeding: ${SET_NAME} (${BASE_CARDS.length + LE_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Formula 1", universeId);
  const brandId = await builder.getOrCreateBrand("Turbo Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Turbo Attax 2020", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: 197,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const t0 = Date.now();
  await seedCards(set.id, basePrintingId);
  await seedPrices();
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
