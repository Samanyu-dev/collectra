import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import("../ingestion/engine/prisma");

  const sets = await prisma.set.findMany({
    where: { id: { contains: "turbo-attax" } },
    include: { series: { include: { franchise: { include: { universe: true } }, brand: true } } },
  });
  for (const s of sets) {
    console.log(s.id, "|", s.name, "| franchise:", s.series.franchise.name, "| universe:", s.series.franchise.universe.name, "| brand:", s.series.brand.name);
  }

  const cardCount = await prisma.card.count({ where: { setId: { in: sets.map((s) => s.id) } } });
  console.log("total cards across turbo-attax sets:", cardCount);

  // sample a few card names/teams to see what content is actually in there
  for (const s of sets) {
    const sample = await prisma.card.findMany({ where: { setId: s.id }, take: 5, select: { name: true, number: true, teams: { select: { name: true } } } });
    console.log(`\nSample from ${s.id}:`, sample);
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../ingestion/engine/prisma");
    await prisma.$disconnect();
  });
