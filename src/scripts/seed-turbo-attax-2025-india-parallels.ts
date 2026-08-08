import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Adds the confirmed India-exclusive parallel set to Topps Turbo Attax 2025
 * (F1), on top of the existing checklist (already correctly Formula-1
 * categorized, already contains India-specific insert categories like
 * Diamond Pull/Black Edge/Signature Style/Mega Tin Exclusive).
 *
 * Source: user-compiled list (2026-08-07, cross-checked against my own
 * search results) plus one real physical card the user described directly:
 * #328 Lewis Hamilton (Podium Power) = Aquamarine border + Rainbow Foil
 * finish, serial 45/79 — this is the ground truth the finish/color/serialTo
 * decomposition below is built from, not an assumption.
 *
 * Confidence notes (see final report for the full breakdown):
 *  - Mirror Foil, Rainbow Foil, Pink Mirror, Pink Rainbow (unnumbered): user-confirmed.
 *  - Aquamarine /79 on Rainbow Foil: confirmed by the real card above.
 *  - Cranberry /99 and Diamond Grey /49 modeled as Rainbow Foil colors BY
 *    ANALOGY to the confirmed Aquamarine card (same "<Color> Foil /<run>"
 *    naming convention in every source) — not independently verified
 *    per-color. Flagged, not silently treated as equally certain.
 *  - Bright Yellow Foil (1/1): kept as its own standalone finish, NOT
 *    folded into the Rainbow Foil ladder — unlike the other three numbered
 *    colors, nothing confirms which ladder (Mirror vs Rainbow vs neither)
 *    it belongs to, and its 1/1 run breaks the "/N" pattern the other three
 *    share. Left ambiguous rather than guessed.
 *  - Which specific cards/supertypes these parallels apply to: applied
 *    uniformly to every "regular" card supertype (team cards, race-weekend
 *    inserts, Podium Power, etc.) and deliberately excluded from supertypes
 *    that are themselves already a distinct chase/exclusive tier (Diamond
 *    Pull, Black Edge, Limited Edition, the 3 Mega Tin Exclusive tiers,
 *    Monster Box Exclusive, the two single-card specials) — this scope
 *    decision is an extrapolation from the one confirmed example card, not
 *    independently checked against all 430 cards individually.
 */
const SET_ID = "topps-turbo-attax-2025";

const EXCLUDED_SUPERTYPES = new Set([
  "Diamond Pull",
  "Black Edge",
  "Limited Edition",
  "Mega Tin Exclusive – Lightning Lids",
  "Mega Tin Exclusive – Shake Down",
  "Mega Tin Exclusive – Diamond Edition",
  "Monster Box Exclusive",
  "F2 Logo",
  "F1 75 Years",
]);

interface Tier {
  name: string;
  finish: string;
  color?: string;
  serialTo: number | null;
}

const TIERS: Tier[] = [
  { name: "Mirror Foil", finish: "Mirror Foil", serialTo: null },
  { name: "Rainbow Foil", finish: "Rainbow Foil", serialTo: null },
  { name: "Pink Mirror Parallel", finish: "Mirror Foil", color: "Pink", serialTo: null },
  { name: "Pink Rainbow Parallel", finish: "Rainbow Foil", color: "Pink", serialTo: null },
  { name: "Rainbow Foil - Aquamarine", finish: "Rainbow Foil", color: "Aquamarine", serialTo: 79 },
  { name: "Rainbow Foil - Cranberry", finish: "Rainbow Foil", color: "Cranberry", serialTo: 99 },
  { name: "Rainbow Foil - Diamond Grey", finish: "Rainbow Foil", color: "Diamond Grey", serialTo: 49 },
  { name: "Bright Yellow Foil", finish: "Bright Yellow Foil", serialTo: 1 },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  const basePrintingId = await builder.getOrCreatePrinting("Base");

  // Tag this set's exclusivity at the Release level (see plan) — India-only,
  // never released as a standalone worldwide product under this checklist.
  const existingRelease = await prisma.release.findFirst({ where: { setId: SET_ID, country: "India" } });
  if (!existingRelease && !dryRun) {
    await prisma.release.create({ data: { setId: SET_ID, country: "India" } });
    console.log("Created Release row: country=India");
  }

  const cards = await prisma.card.findMany({
    where: { setId: SET_ID },
    select: { id: true, number: true, supertype: true },
  });
  console.log(`Loaded ${cards.length} cards for ${SET_ID}.`);

  const parallelIdByName = new Map<string, string>();
  for (const tier of TIERS) {
    const id = await builder.getOrCreateParallel(tier.name, { finish: tier.finish, color: tier.color });
    parallelIdByName.set(tier.name, id);
  }
  console.log(`Prepared ${parallelIdByName.size} parallel rows.`);

  const existing = await prisma.variant.findMany({
    where: { cardId: { in: cards.map((c) => c.id) }, parallelId: { not: null } },
    select: { cardId: true, parallelId: true },
  });
  const existingKeys = new Set(existing.map((v) => `${v.cardId}::${v.parallelId}`));
  console.log(`${existingKeys.size} card-parallel pairs already exist (will be skipped).`);

  type Row = { cardId: string; printingId: string; parallelId: string; serialTo: number | null };
  const rows: Row[] = [];
  let includedCards = 0;
  for (const c of cards) {
    if (!c.supertype || EXCLUDED_SUPERTYPES.has(c.supertype)) continue;
    includedCards++;
    for (const tier of TIERS) {
      const parallelId = parallelIdByName.get(tier.name)!;
      const key = `${c.id}::${parallelId}`;
      if (existingKeys.has(key)) continue;
      rows.push({ cardId: c.id, printingId: basePrintingId, parallelId, serialTo: tier.serialTo });
    }
  }
  console.log(`Cards receiving the ladder: ${includedCards}. Rows to insert: ${rows.length}`);

  if (dryRun) {
    console.log("Dry run — not writing.");
    return;
  }

  const BATCH = 500;
  const t0 = Date.now();
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await prisma.variant.createMany({ data: batch });
    inserted += batch.length;
    console.log(`  [${inserted}/${rows.length}] elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  console.log(`Done. Inserted ${inserted} variant rows in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
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
