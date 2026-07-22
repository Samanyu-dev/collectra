import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Since auth/session.ts (docs/adr/002-authentication-architecture.md), User.id
// must equal a real Supabase auth.users id — rows are only ever created via the
// handle_new_user trigger at signup. This script seeds data onto an existing
// account rather than fabricating one, so it needs that account's id passed in:
//   npx tsx src/scripts/seed-collection.ts <userId>
async function run() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx tsx src/scripts/seed-collection.ts <userId>");
    console.error("Sign up through /signup first, then find your id via `select id, email from \"User\"`.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`No User row found for id "${userId}". Sign up through /signup first.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Seeding mock collection for ${user.name ?? user.email}...`);

  // 2. Fetch some existing variants in the database to add to the collection
  const variants = await prisma.variant.findMany({
    take: 20, // Let's give them 20 random cards
    include: {
      card: true,
      currentPrice: true
    }
  });

  if (variants.length === 0) {
    console.error("No variants found in the DB. Run an ingestion script first!");
    return;
  }

  // 3. Clear existing instances for this user to avoid duplicates on re-run
  await prisma.instance.deleteMany({
    where: { userId: user.id }
  });

  const conditions = ["Mint", "Near Mint", "Lightly Played", "Heavily Played"];
  const companies = ["PSA", "BGS", "CGC"];
  const grades = ["10", "9", "9.5", "8"];

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const isGraded = Math.random() > 0.5;
    
    // Determine a fake purchase price (simulate buying low or high)
    const marketPrice = variant.currentPrice?.marketPriceUsd ?? 10;
    const purchasePrice = marketPrice * (0.5 + Math.random()); // Bought between 50% and 150% of current market price

    // Purchase date within the last 2 years
    const purchaseDate = new Date(Date.now() - Math.random() * 2 * 365 * 24 * 60 * 60 * 1000);

    const instance = await prisma.instance.create({
      data: {
        userId: user.id,
        variantId: variant.id,
        condition: isGraded ? "Mint" : conditions[Math.floor(Math.random() * conditions.length)],
        isGraded,
        purchasePrice,
        purchaseDate,
        notes: Math.random() > 0.8 ? "Pulled this myself!" : undefined,
      }
    });

    if (isGraded) {
      await prisma.certification.create({
        data: {
          instanceId: instance.id,
          company: companies[Math.floor(Math.random() * companies.length)],
          grade: grades[Math.floor(Math.random() * grades.length)],
          certNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
        }
      });
    }

    // Add an event
    await prisma.event.create({
      data: {
        userId: user.id,
        instanceId: instance.id,
        type: "ADDED",
        timestamp: purchaseDate,
      }
    });

    console.log(`  -> Added: ${variant.card.name} (Graded: ${isGraded})`);
  }

  console.log(`\nSuccessfully seeded ${variants.length} instances for ${user.name}!`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
