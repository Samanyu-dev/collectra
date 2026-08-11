import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds "2022 Topps Hero Attax Marvel (India)" — 260 cards.
 *
 * Source is a scraped/OCR'd checklist: card number + character name only, no
 * Section/Type columns like the football/cricket Attax checklists have.
 * Subset boundaries below are inferred from name-suffix codes and
 * contiguous number runs, not stated directly — flagged per-block where the
 * inference is uncertain rather than presented as fact:
 *
 *  - #1-162: base checklist (draws from Doctor Strange in the Multiverse of
 *    Madness, Eternals, Black Widow, Shang-Chi, Thor: Love and Thunder,
 *    Avengers: Infinity War, Spider-Man: Far From Home, Captain Marvel,
 *    Spider-Man: Into the Spider-Verse, a general Marvel roster, Loki,
 *    Moon Knight, WandaVision). No Insert.
 *  - #163-187 "Iron Man ILY3K" x25: modeled as 25 separate Cards (all named
 *    "Iron Man", Insert="ILY3K"), NOT as 25 Variants under one Card —
 *    deviates from the original task brief's suggestion, because this
 *    schema's Variant model has no per-copy "number" field (only Card.number
 *    does, see prisma/schema.prisma), so collapsing them into Variants would
 *    make #163 and #187 indistinguishable and break every existing
 *    number-based lookup convention this project's other seed scripts rely
 *    on. Kept consistent with how every other repeated-name block in this
 *    project (e.g. the many same-named driver rows across
 *    seed-topps-turbo-attax-2020.ts) is modeled: one row = one Card.
 *  - #188-200 "... BOOST": Insert = "BOOST" (literal code, expansion unknown).
 *  - #201-214 "... EE": row 201 itself reads "Endgame Heroes EE" in full —
 *    Insert = "Endgame Heroes" (fairly confident, it's spelled out once).
 *    #201 has no distinct character name in the source (it reads as a
 *    subset title/header card) so it's seeded with no Character link.
 *  - #215-225 "... SB": Insert = "SB" (literal code — expansion NOT
 *    confidently inferable, left as the literal abbreviation rather than
 *    guessing a full name).
 *  - #226-250 "... CC": Insert = "CC" (same caveat as SB).
 *  - #251-255 "... 100C": Insert = "100 Club" — reasonably confident, matches
 *    the identical "100 Club" insert name used verbatim in the Cricket Attax
 *    2022 checklist seeded alongside this one (a recurring Topps Attax
 *    convention across products).
 *  - #256-259: unsuffixed, seeded as base (no Insert) — same shape as #1-162.
 *  - #260 "Thor UNB": the "UNB" suffix is NOT extended backward to #256-259
 *    (a single labeled data point isn't enough evidence to claim a 5-card
 *    subset). Seeded as a base card named "Thor" with a Variant.notes flag
 *    recording the unexplained suffix for a future correction pass.
 *
 * One likely source typo NOT corrected here (no in-list duplicate to
 * cross-check against, so left as given rather than "corrected" from
 * outside knowledge): #123 "Doramammu" (almost certainly "Dormammu").
 * #124 "Zola & Arnim" also transcribed verbatim (likely "Arnim Zola").
 *
 * Franchise placement: reuses the existing "Marvel" Franchise (under the
 * "Non-Sports" Universe, same one seed-topps-chrome-marvel-2026.ts uses) —
 * not a new Franchise. Brand = new "Hero Attax" (product line) under
 * manufacturer Topps, matching the Match Attax / Turbo Attax / Cricket Attax
 * brand convention (one Brand per product line, one Series per year+market
 * under it). Uses the Character model (not Person) for every entry, since
 * these are fictional characters — matches seed-topps-chrome-marvel-2026.ts.
 *
 * No pricing data was supplied for this checklist — none seeded.
 */
const SET_ID = "topps-hero-attax-marvel-2022";
const SET_NAME = "Hero Attax Marvel 2022 (India)";

interface CardRow {
  number: string;
  name: string;
  insert?: string; // undefined = base, no Insert record
  noCharacter?: boolean; // subset title/header card (#201) — no Character link
  notes?: string; // Variant.notes flag for an unresolved source ambiguity
}

const BASE_NAMES: string[] = [
  "M'Baku", "Okoye", "Shuri", "Namora", "Attuma", "Namor", "Doctor Strange", "America Chavez", "Wong",
  "Sinister Strange", "Master Mordo", "Defender Strange", "Scarlet Witch", "Sprite", "Sersi", "Makkari", "Ajak",
  "Druig", "Gilgamesh", "Ikaris", "Kingo", "Phastos", "Black Widow", "Yelena", "Red Guardian", "Death Dealer",
  "Katy", "Morris", "Shang-Chi", "Wenwu", "Xialing", "Razor Fist", "King Valkyrie", "Korg", "Thor", "Mighty Thor",
  "Miek", "Warsong", "Ancient One", "Ant-Man", "Black Panther", "Black Widow", "Captain America", "Captain Marvel",
  "Chitauri", "Corvus Glaive", "Cull Obsidian", "Doctor Strange", "Drax", "Ebony Maw", "Falcon", "Gamora", "Groot",
  "Hawkeye", "Hulk", "Iron Man", "Iron Patriot", "Korg", "Mantis", "Miek", "Nebula", "Okoye", "Outriders",
  "Proxima Midnight", "Rescue", "Rocket Raccoon", "Ronin", "Scarlet Witch", "Shuri", "Spider-Man", "Star-Lord",
  "Thanos", "Thor", "Valkyrie", "War Machine", "Wasp", "Winter Soldier", "Wong", "Hydro Man", "Molten Man",
  "Mysterio", "Nick Fury", "Spider-Man", "Spider-Man", "Captain Marvel", "Goose", "Maria Rambeau", "Nick Fury",
  "Phil Coulson", "Starforce", "Talos", "Captain Marvel / Goose", "Miles Morales", "Miles Morales", "Spider-Man",
  "Ghost-Spider", "Green Goblin", "Kingpin", "Peni Parker", "Prowler", "SP//dr", "Spider-Ham", "Spider-Man Noir",
  "Black Panther", "Black Widow", "Quicksilver", "Thanos", "Scarlet Witch", "Spider-Man", "Wolverine", "Hela",
  "Valkyrie", "Ant-Man", "Wasp", "Ultron", "Rocket Raccoon", "Enchantress", "Venom", "M.O.D.O.K.", "Loki",
  "Baron Zemo", "Red Skull", "Doramammu", "Zola & Arnim", "Daredevil", "Iron Fist", "Doctor Strange", "Black Bolt",
  "Medusa", "Karnak", "Lockjaw", "Spider-Woman", "She-Hulk", "Iron Man", "Hulk", "Captain America", "Thor",
  "Doctor Octopus", "Green Goblin", "Luke Cage", "Ghost Rider", "Falcon", "Hawkeye", "Nova", "Falcon", "John Walker",
  "Winter Soldier", "Hawkeye", "Kate Bishop", "Lucky The Pizza Dog", "Yelena Belova", "Groot", "Loki",
  "Mobius M. Mobius", "Sylvie", "Mr. Knight", "Khonshu", "Ms. Marvel", "Red Dagger", "She-Hulk", "Wanda Maximoff",
  "Vision",
];
if (BASE_NAMES.length !== 162) throw new Error(`Expected 162 base names, got ${BASE_NAMES.length}`);

const BOOST_NAMES: string[] = [
  "America Chavez", "Attuma", "Yelena", "Makkari", "Korg", "Hydro Man", "Molten Man", "Mysterio", "Maria Rambeau",
  "Kingpin", "Katy", "Xialing", "She-Hulk",
];
if (BOOST_NAMES.length !== 13) throw new Error(`Expected 13 BOOST names, got ${BOOST_NAMES.length}`);

// #201 itself ("Endgame Heroes EE") has no distinct character — the empty
// string marker below is handled specially in the build step.
const EE_NAMES: string[] = [
  "", "War Machine", "Nebula", "Okoye", "Wong", "Rocket Raccoon", "Captain Marvel", "Ant-Man", "Hawkeye",
  "Bruce Banner", "Iron Man", "Black Widow", "Thor", "Captain America",
];
if (EE_NAMES.length !== 14) throw new Error(`Expected 14 EE rows, got ${EE_NAMES.length}`);

const SB_NAMES: string[] = [
  "Doctor Strange", "Shang-Chi", "Mighty Thor", "Captain Marvel", "Miles Morales", "Wanda Maximoff", "Falcon",
  "Ms. Marvel", "Captain America", "Wolverine", "Daredevil",
];
if (SB_NAMES.length !== 11) throw new Error(`Expected 11 SB names, got ${SB_NAMES.length}`);

const CC_NAMES: string[] = [
  "Iron Man", "Doctor Strange", "Captain Marvel", "Black Widow", "Thor", "Black Panther", "Kate Bishop",
  "Scarlet Witch", "Spider-Man", "Yelena", "Star-Lord", "Hulk", "Thanos", "Ms. Marvel", "Makkari", "Ajak",
  "Ikaris", "Groot", "Rocket Raccoon", "Miles Morales", "Nick Fury", "Ant-Man", "Loki", "Captain America",
  "Hawkeye",
];
if (CC_NAMES.length !== 25) throw new Error(`Expected 25 CC names, got ${CC_NAMES.length}`);

const HUNDRED_CLUB_NAMES: string[] = ["Okoye", "Thanos", "Spider-Man", "Hulk", "Captain America"];
if (HUNDRED_CLUB_NAMES.length !== 5) throw new Error(`Expected 5 100 Club names, got ${HUNDRED_CLUB_NAMES.length}`);

// #256-259 unsuffixed (base); #260 "Thor UNB" — base, with the unexplained
// suffix preserved as a Variant.notes flag rather than an invented Insert.
const TAIL: CardRow[] = [
  { number: "256", name: "Black Panther" },
  { number: "257", name: "Black Widow" },
  { number: "258", name: "Spider-Man" },
  { number: "259", name: "Iron Man" },
  { number: "260", name: "Thor", notes: "Source checklist row reads 'Thor UNB' — suffix meaning not determined; not extended to #256-259." },
];

function buildRows(): CardRow[] {
  const rows: CardRow[] = [];
  BASE_NAMES.forEach((name, i) => rows.push({ number: String(i + 1), name }));
  // #163-187: 25x "Iron Man ILY3K"
  for (let i = 0; i < 25; i++) rows.push({ number: String(163 + i), name: "Iron Man", insert: "ILY3K" });
  BOOST_NAMES.forEach((name, i) => rows.push({ number: String(188 + i), name, insert: "BOOST" }));
  EE_NAMES.forEach((name, i) => {
    const number = String(201 + i);
    if (i === 0) rows.push({ number, name: "Endgame Heroes", insert: "Endgame Heroes", noCharacter: true });
    else rows.push({ number, name, insert: "Endgame Heroes" });
  });
  SB_NAMES.forEach((name, i) => rows.push({ number: String(215 + i), name, insert: "SB" }));
  CC_NAMES.forEach((name, i) => rows.push({ number: String(226 + i), name, insert: "CC" }));
  HUNDRED_CLUB_NAMES.forEach((name, i) => rows.push({ number: String(251 + i), name, insert: "100 Club" }));
  rows.push(...TAIL);
  return rows;
}

const ROWS = buildRows();
if (ROWS.length !== 260) throw new Error(`Expected 260 total rows, got ${ROWS.length}`);

async function seedCards(setId: string, basePrintingId: string) {
  let created = 0;
  let skipped = 0;

  for (const [i, row] of ROWS.entries()) {
    const cardId = `${SET_ID}-${row.number}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const charId = row.noCharacter ? null : await builder.getOrCreateCharacter(row.name);
    const insertId = row.insert ? await builder.getOrCreateInsert(row.insert, setId) : undefined;

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId,
        supertype: row.insert ?? "Character",
        characters: charId ? { connect: { id: charId } } : undefined,
      },
    });

    await prisma.variant.create({
      data: { cardId, printingId: basePrintingId, insertId, notes: row.notes },
    });

    created++;
    if ((i + 1) % 50 === 0) console.log(`  [${i + 1}/${ROWS.length}] created=${created}`);
  }

  console.log(`Cards: created ${created}, skipped ${skipped}.`);
}

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ROWS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Non-Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Marvel", universeId);
  const brandId = await builder.getOrCreateBrand("Hero Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries(SET_NAME, franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: ROWS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const t0 = Date.now();
  await seedCards(set.id, basePrintingId);
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
