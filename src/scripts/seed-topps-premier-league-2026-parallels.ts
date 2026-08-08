import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Adds the confirmed serial-numbered color-parallel ladders on top of the
 * existing Topps Premier League 2025/26 flagship checklist (base +
 * inserts), seeded separately by seed-topps-premier-league-2026.ts.
 *
 * Source: the full checklist the user pasted into this conversation
 * (2026-08-07), which explicitly lists a "PARALLEL: <subset> - <finish> -
 * <color> #/<run>" line for every applicable subset — re-transcribed here
 * tier-by-tier from that text, not inferred or guessed. Two real
 * discrepancies preserved rather than silently resolved:
 *  - Heat Vision & Perfect Storm: 3 of their 4 documented Rainbow Foil
 *    tiers are marked "**not issued**" in the source — only the 4th
 *    (FoilFractor 1/1) is modeled as a real Variant; the other 3 are
 *    listed in ANNOUNCED_NOT_ISSUED below for the report, not created.
 *  - Home Advantage: two checklist versions exist in the source (one
 *    flagged "INCORRECT", one "CORRECT — Thanks to Gary S."); only the
 *    corrected version's single FoilFractor 1/1 tier is used.
 * "Holo" is deliberately not modeled as its own ladder — the source states
 * Topps renamed it to Mini Diamond (same physical parallel).
 */
const SET_ID = "topps-premier-league-2026";

interface Tier {
  color: string;
  serialTo: number | null; // null = print run not disclosed by source (e.g. Chrome King's Emerald)
  notes?: string;
}

const t = (color: string, serialTo: number | null, notes?: string): Tier => ({ color, serialTo, notes });

// Full 12-tier ladder shared by Mini Diamond and Sparkles on the base set.
const FULL_12: Tier[] = [
  t("Agua", 499), t("Pink", 399), t("Yellow", 299), t("Purple", 199),
  t("Blue", 150), t("Green", 99), t("Black & White", 75), t("Gold", 50),
  t("Orange", 25), t("Black", 10), t("Red", 5), t("Platinum", 1),
];
// Reduced ladder (10 tiers, drops Agua/Pink) used by Breakthrough Baller,
// Full Force, Generation Now, Tekker, Pro Partnership, Retro Threads.
const REDUCED_10: Tier[] = FULL_12.filter((x) => !["Agua", "Pink"].includes(x.color));
// Reduced ladder (11 tiers, drops Agua only) — Sparkles for the same subsets.
const REDUCED_11: Tier[] = FULL_12.filter((x) => x.color !== "Agua");
// Further-reduced Mini Diamond (6 tiers, Black&White down) — Pro Precision, Beast Mode, Headlines.
const REDUCED_6: Tier[] = FULL_12.filter((x) => ["Black & White", "Gold", "Orange", "Black", "Red", "Platinum"].includes(x.color));

const RAINBOW_8: Tier[] = [
  t("Blue", 150), t("Green", 99), t("Black and White", 75), t("Gold", 50),
  t("Orange", 25), t("Black", 10), t("Red", 5), t("FoilFractor", 1),
];
const RAINBOW_4: Tier[] = RAINBOW_8.filter((x) => ["Orange", "Black", "Red", "FoilFractor"].includes(x.color));
const RAINBOW_ISSUED_1: Tier[] = [t("FoilFractor", 1)];
const RELIC_RAINBOW_9: Tier[] = [t("Purple", 199), ...RAINBOW_8];

const BE_RAINBOW_5: Tier[] = [t("Green", 99), t("Gold", 50), t("Orange", 25), t("Red", 5), t("Blackout", 1)];

const CK_REFRACTOR_9: Tier[] = [
  t("Emerald", null, "Odds: 1:15 Mega Tin; 1:10 Super Tin"),
  t("Gold", 50),
  t("Orange", 25),
  t("Diamond", 25, "Exclusive to Mega Tins & Super Tins"),
  t("Black", 10),
  t("Black Diamond", 25, "Exclusive to Mega Tins & Super Tins"),
  t("Red", 5),
  t("Ruby", 5, "Exclusive to Mega Tins & Super Tins"),
  t("SuperFractor", 1),
];
const CK_RAINBOW_5: Tier[] = [t("Gold", 50), t("Orange", 25), t("Black", 10), t("Red", 5), t("SuperFractor", 1)];

const DIAMOND_ROOKIE_4: Tier[] = [t("Emerald", null), t("Diamond", 25), t("Black Diamond", 10), t("Ruby", 5)];

const AUTO_8: Tier[] = [
  t("Blue", 150), t("Green", 99), t("Black & White", 75), t("Gold", 50),
  t("Orange", 25), t("Black", 10), t("Red", 5), t("Platinum", 1),
];
const SUPERFRACTOR_4: Tier[] = [t("Orange", 25), t("Black", 10), t("Red", 5), t("SuperFractor", 1)];
const BEA_TIERS: Tier[] = [t("(base)", 99), t("Orange", 25), t("Red", 5), t("Blackout", 1)];

/** One ladder = a (finish name, tier list) pair applied uniformly to every card in a subset. */
interface LadderAssignment {
  supertype: string;
  ladders: Array<{ finish: string; tiers: Tier[] }>;
}

const ASSIGNMENTS: LadderAssignment[] = [
  { supertype: "Player", ladders: [{ finish: "Mini Diamond", tiers: FULL_12 }, { finish: "Sparkles", tiers: FULL_12 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Team Badge", ladders: [{ finish: "Mini Diamond", tiers: FULL_12 }, { finish: "Sparkles", tiers: FULL_12 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Breakthrough Baller", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_10 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Full Force", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_10 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Generation Now", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_10 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Tekker", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_10 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Pro Partnership", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_10 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Retro Threads", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_10 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Pro Precision", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_6 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_4 }] },
  { supertype: "Beast Mode", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_6 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_4 }] },
  { supertype: "Headlines", ladders: [{ finish: "Mini Diamond", tiers: REDUCED_6 }, { finish: "Sparkles", tiers: REDUCED_11 }, { finish: "Rainbow Foil", tiers: RAINBOW_4 }] },
  { supertype: "Black Edge Edition", ladders: [{ finish: "Rainbow Foil", tiers: BE_RAINBOW_5 }] },
  { supertype: "Chrome King", ladders: [{ finish: "Chrome King Refractor", tiers: CK_REFRACTOR_9 }, { finish: "Rainbow Foil", tiers: CK_RAINBOW_5 }] },
  { supertype: "Diamond Rookie", ladders: [{ finish: "Diamond Rookie", tiers: DIAMOND_ROOKIE_4 }] },
  { supertype: "Heat Vision", ladders: [{ finish: "Rainbow Foil", tiers: RAINBOW_ISSUED_1 }] },
  { supertype: "Home Advantage", ladders: [{ finish: "Rainbow Foil", tiers: RAINBOW_ISSUED_1 }] },
  { supertype: "Perfect Storm", ladders: [{ finish: "Rainbow Foil", tiers: RAINBOW_ISSUED_1 }] },
  { supertype: "Premier Relic", ladders: [{ finish: "Rainbow Foil", tiers: RELIC_RAINBOW_9 }] },
  { supertype: "Topps Premier League 2026 Autograph", ladders: [{ finish: "Mini Diamond", tiers: AUTO_8 }, { finish: "Sparkles", tiers: AUTO_8 }, { finish: "Rainbow Foil", tiers: RAINBOW_8 }] },
  { supertype: "Beast Mode Autograph", ladders: [{ finish: "Rainbow Foil", tiers: SUPERFRACTOR_4 }] },
  { supertype: "Black Edge Edition Autograph", ladders: [{ finish: "Black Edge Edition Autograph", tiers: BEA_TIERS }] },
  { supertype: "Chrome King Autograph", ladders: [{ finish: "Rainbow Foil", tiers: SUPERFRACTOR_4 }] },
  // Confirmed no documented parallels in the source: Rookie, Festive Freeze,
  // Gold Lion, Classic Limited Edition, Goal Machine/Globaller/Big Game
  // Baller/Golden Boot Limited Edition, Hall of Fame (all 3 groups),
  // Premier Pull Ultra Limited Edition — omitted deliberately, not missed.
];

const ANNOUNCED_NOT_ISSUED = [
  "Heat Vision - Rainbow Foil - Orange #/25",
  "Heat Vision - Rainbow Foil - Black #/10",
  "Heat Vision - Rainbow Foil - Red #/5",
  "Perfect Storm - Rainbow Foil - Orange #/25",
  "Perfect Storm - Rainbow Foil - Black #/10",
  "Perfect Storm - Rainbow Foil - Red #/5",
  "Home Advantage - Rainbow Foil - Orange #/25 (present in the flagged-INCORRECT source checklist only)",
  "Home Advantage - Rainbow Foil - Black #/10 (present in the flagged-INCORRECT source checklist only)",
  "Home Advantage - Rainbow Foil - Red #/5 (present in the flagged-INCORRECT source checklist only)",
];

function parallelName(finish: string, color: string): string {
  return color === "(base)" ? finish : `${finish} - ${color}`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;

  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const cards = await prisma.card.findMany({
    where: { setId: SET_ID },
    select: { id: true, number: true, supertype: true },
    orderBy: { number: "asc" },
  });
  console.log(`Loaded ${cards.length} cards for ${SET_ID}.`);

  const byAssignment = new Map(ASSIGNMENTS.map((a) => [a.supertype, a]));
  const unmatchedSupertypes = new Set<string>();
  for (const c of cards) {
    if (c.supertype && !byAssignment.has(c.supertype)) unmatchedSupertypes.add(c.supertype);
  }
  console.log("Supertypes with no ladder assignment (expected to be the 'no documented parallels' ones):", [...unmatchedSupertypes]);

  // Pre-create every unique Parallel row up front (small: ~50-60 total).
  const parallelIdByName = new Map<string, string>();
  for (const a of ASSIGNMENTS) {
    for (const ladder of a.ladders) {
      for (const tier of ladder.tiers) {
        const name = parallelName(ladder.finish, tier.color);
        if (parallelIdByName.has(name)) continue;
        const id = await builder.getOrCreateParallel(name, {
          finish: ladder.finish,
          color: tier.color === "(base)" ? undefined : tier.color,
        });
        parallelIdByName.set(name, id);
      }
    }
  }
  console.log(`Prepared ${parallelIdByName.size} unique Parallel rows.`);

  // Existing (cardId, parallelId) pairs already in the DB — for idempotent resume.
  const existing = await prisma.variant.findMany({
    where: { cardId: { in: cards.map((c) => c.id) }, parallelId: { not: null } },
    select: { cardId: true, parallelId: true },
  });
  const existingKeys = new Set(existing.map((v) => `${v.cardId}::${v.parallelId}`));
  console.log(`${existingKeys.size} card-parallel pairs already exist (will be skipped).`);

  type Row = { cardId: string; printingId: string; parallelId: string; serialTo: number | null; notes: string | null };
  const rows: Row[] = [];
  let targetCards = cards;
  if (limit) targetCards = targetCards.slice(0, limit);

  for (const c of targetCards) {
    if (!c.supertype) continue;
    const assignment = byAssignment.get(c.supertype);
    if (!assignment) continue;
    for (const ladder of assignment.ladders) {
      for (const tier of ladder.tiers) {
        const name = parallelName(ladder.finish, tier.color);
        const parallelId = parallelIdByName.get(name)!;
        const key = `${c.id}::${parallelId}`;
        if (existingKeys.has(key)) continue;
        rows.push({
          cardId: c.id,
          printingId: basePrintingId,
          parallelId,
          serialTo: tier.serialTo,
          notes: tier.notes ?? null,
        });
      }
    }
  }

  console.log(`Rows to insert: ${rows.length}`);
  if (dryRun) {
    console.log("Dry run — not writing. Sample rows:", rows.slice(0, 5));
    return;
  }

  const BATCH = 500;
  const t0 = Date.now();
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await prisma.variant.createMany({ data: batch });
    inserted += batch.length;
    const elapsed = (Date.now() - t0) / 1000;
    console.log(`  [${inserted}/${rows.length}] elapsed=${elapsed.toFixed(1)}s rate=${(inserted / elapsed).toFixed(1)}/s`);
  }

  console.log(`Done. Inserted ${inserted} variant rows in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log("Announced-but-not-issued tiers (not created, for the report):", ANNOUNCED_NOT_ISSUED);
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
