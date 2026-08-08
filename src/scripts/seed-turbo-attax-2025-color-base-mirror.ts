import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Adds Base and Mirror Foil tiers for Aquamarine, Cranberry, and Diamond
 * Grey to Topps Turbo Attax 2025 (India) — user correction (2026-08-07).
 * Each of these three colors already has a confirmed numbered Rainbow Foil
 * version (Aquamarine /79, Cranberry /99, Diamond Grey /49 — see
 * seed-turbo-attax-2025-india-parallels.ts). This adds the two unnumbered
 * siblings per color, mirroring how Pink already has three unnumbered tiers
 * (Pink Parallel / Pink Mirror Parallel / Pink Rainbow Parallel) — same
 * shape, applied to the same 342-card population, all unnumbered since no
 * print run was given for these two new tiers.
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

const COLORS = ["Aquamarine", "Cranberry", "Diamond Grey"];

interface Tier {
  name: string;
  finish?: string;
  color: string;
}

const TIERS: Tier[] = COLORS.flatMap((color) => [
  { name: `${color} - Base`, color },
  { name: `${color} - Mirror Foil`, finish: "Mirror Foil", color },
]);

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

  const parallelIdByName = new Map<string, string>();
  for (const tier of TIERS) {
    const id = await builder.getOrCreateParallel(tier.name, { finish: tier.finish, color: tier.color });
    parallelIdByName.set(tier.name, id);
  }
  console.log(`Prepared ${parallelIdByName.size} parallel rows:`, [...parallelIdByName.keys()].join(", "));

  const existing = await prisma.variant.findMany({
    where: { cardId: { in: cards.map((c) => c.id) }, parallelId: { in: [...parallelIdByName.values()] } },
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
      rows.push({ cardId: c.id, printingId: basePrintingId, parallelId, serialTo: null });
    }
  }
  console.log(`Cards receiving these tiers: ${includedCards}. Rows to insert: ${rows.length}`);

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
