import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// User.id must equal a real Supabase auth.users id (see docs/adr/002-authentication-architecture.md)
// — rows are only ever created via the handle_new_user trigger at signup, so this
// script seeds onto an existing account rather than fabricating one:
//   npx tsx src/scripts/seed-workspace.ts <userId>
async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npx tsx src/scripts/seed-workspace.ts <userId>');
    console.error('Sign up through /signup first, then find your id via `select id, email from "User"`.');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`No User row found for id "${userId}". Sign up through /signup first.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Seeding workspace data for ${user.name ?? user.email}...`);

  // Pick a random Set to build a project around
  const targetSet = await prisma.set.findFirst({
    where: { cards: { some: {} } },
    include: { cards: { include: { variants: true } } }
  });

  if (!targetSet) {
    console.log('No eligible set found to seed a project. Ensure you have ingested data.');
    return;
  }

  // Create the project
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: targetSet.name,
      type: 'SET_COMPLETION',
      status: 'ACTIVE',
      targetSetId: targetSet.id,
    }
  });

  // Create targets
  // Grab the first 25 cards
  const targetCards = targetSet.cards.slice(0, 25);
  let metCount = 0;

  for (const card of targetCards) {
    if (card.variants.length > 0) {
      const isMet = Math.random() > 0.4; // 60% chance they own it
      if (isMet) metCount++;
      
      await prisma.projectTarget.create({
        data: {
          projectId: project.id,
          variantId: card.variants[0].id,
          isMet
        }
      });
    }
  }

  console.log(`Successfully seeded Workspace project for ${targetSet.name}. Target: ${targetCards.length}, Met: ${metCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
