import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Correction (2026-08-07): the /79, /99, /49 print runs for Aquamarine,
 * Cranberry, and Diamond Grey apply to the color regardless of finish (Base,
 * Mirror Foil, Rainbow Foil all share one print run per color) — not just
 * to the Rainbow Foil tier as originally modeled. Updates the Base and
 * Mirror Foil Variant rows (previously serialTo=null) to match.
 *
 * Instance.serialNumber (already in schema, see its doc comment) is the
 * per-physical-card placeholder for "my copy is 63/99" — no schema change
 * needed for that; this script only fixes the catalog-level serialTo.
 */
const SET_ID = "topps-turbo-attax-2025";

const COLOR_SERIAL_TO: Record<string, number> = {
  Aquamarine: 79,
  Cranberry: 99,
  "Diamond Grey": 49,
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const { prisma } = await import("../ingestion/engine/prisma");

  for (const [color, serialTo] of Object.entries(COLOR_SERIAL_TO)) {
    const variants = await prisma.variant.findMany({
      where: {
        card: { setId: SET_ID },
        parallel: { color },
        serialTo: null,
      },
      select: { id: true, parallel: { select: { name: true } } },
    });
    console.log(`${color}: ${variants.length} variant rows currently serialTo=null (will become /${serialTo}).`);
    const byParallel = new Map<string, number>();
    for (const v of variants) {
      const name = v.parallel?.name ?? "?";
      byParallel.set(name, (byParallel.get(name) ?? 0) + 1);
    }
    for (const [name, n] of byParallel) console.log(`  ${name}: ${n}`);

    if (dryRun) continue;

    const result = await prisma.variant.updateMany({
      where: { id: { in: variants.map((v) => v.id) } },
      data: { serialTo },
    });
    console.log(`  -> updated ${result.count} rows.`);
  }

  if (dryRun) console.log("\nDry run — not writing.");
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
