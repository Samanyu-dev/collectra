import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Adds a standalone "Pink" parallel to Topps Turbo Attax 2025 (India) — user
 * correction (2026-08-07): the existing "Pink Mirror Parallel" and "Pink
 * Rainbow Parallel" rows (see seed-turbo-attax-2025-india-parallels.ts) are
 * Pink *combined* with a Mirror or Rainbow foil finish; this is a third,
 * separate tier — plain Pink, no Mirror/Rainbow overlay. Same unnumbered,
 * same card population (base + non-exclusive inserts) as the other four
 * unnumbered tiers.
 *
 * Also per the same correction: confirmed there is no "Silver Foil" parallel
 * for card #276 (F2 Logo) or anywhere in this set — nothing to remove (none
 * ever existed in the DB), recorded here so it's never guessed into this or
 * any future seed script for this set.
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

const PARALLEL_NAME = "Pink Parallel";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const cards = await prisma.card.findMany({
    where: { setId: SET_ID },
    select: { id: true, number: true, supertype: true },
  });
  console.log(`Loaded ${cards.length} cards for ${SET_ID}.`);

  const parallelId = await builder.getOrCreateParallel(PARALLEL_NAME, { finish: undefined, color: "Pink" });
  console.log(`Parallel "${PARALLEL_NAME}" id: ${parallelId}`);

  const existing = await prisma.variant.findMany({
    where: { cardId: { in: cards.map((c) => c.id) }, parallelId },
    select: { cardId: true },
  });
  const existingCardIds = new Set(existing.map((v) => v.cardId));
  console.log(`${existingCardIds.size} cards already have this parallel (will be skipped).`);

  type Row = { cardId: string; printingId: string; parallelId: string; serialTo: number | null };
  const rows: Row[] = [];
  let includedCards = 0;
  for (const c of cards) {
    if (!c.supertype || EXCLUDED_SUPERTYPES.has(c.supertype)) continue;
    includedCards++;
    if (existingCardIds.has(c.id)) continue;
    rows.push({ cardId: c.id, printingId: basePrintingId, parallelId, serialTo: null });
  }
  console.log(`Cards receiving this parallel: ${includedCards}. Rows to insert: ${rows.length}`);

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
