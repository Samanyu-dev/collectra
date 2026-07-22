import { prisma } from "../ingestion/engine/prisma";

async function main() {
  console.log("Verifying Database Counts...\n");

  const cardCount = await prisma.card.count();
  const variantCount = await prisma.variant.count();
  const setCount = await prisma.set.count();
  const franchiseCount = await prisma.franchise.count();
  const universeCount = await prisma.universe.count();

  console.log(`Cards: ${cardCount}`);
  console.log(`Variants: ${variantCount}`);
  console.log(`Sets: ${setCount}`);
  console.log(`Franchises: ${franchiseCount}`);
  console.log(`Universes: ${universeCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
