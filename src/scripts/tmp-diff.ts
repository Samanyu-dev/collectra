import { prisma } from "../ingestion/engine/prisma";

async function main() {
  const cards = await prisma.card.findMany({
    where: { setId: "topps-matchattax-2025-26" },
    include: { persons: true, teams: true },
    orderBy: { number: "asc" },
  });
  console.log(`Total DB cards: ${cards.length}`);
  for (const c of cards) {
    console.log(`${c.number}\t${c.name}\t${c.teams.map(t=>t.name).join("/")}\t${c.subtypes ?? ""}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
