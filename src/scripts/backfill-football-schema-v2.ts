import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * One-time backfill for the football database foundation (schema v2):
 * corrects the Match Attax 2025/26 Set's stale printedTotal, retrofits its
 * 216 insert cards from the overloaded Parallel model onto the new Insert
 * model, and backfills Person entities for its Player cards. Idempotent —
 * safe to re-run (every write is a check-then-create or a plain update to
 * the correct value).
 */
const SET_ID = "topps-matchattax-2025-26";

async function main() {
  const cards = await prisma.card.findMany({
    where: { setId: SET_ID },
    include: { variants: true },
  });
  console.log(`Loaded ${cards.length} cards for Set ${SET_ID}.`);

  // 1. Correct printedTotal to the real, verified total card count.
  const set = await prisma.set.update({
    where: { id: SET_ID },
    data: { printedTotal: cards.length },
  });
  console.log(`Set.printedTotal corrected to ${set.printedTotal} (was stale at 315, base-only).`);

  // 2. Retrofit insert/subset cards: Card.subtypes (e.g. "Man of the Match
  // Wildcard") becomes a real Insert row; Variant.parallelId (e.g. "Rainbow
  // Foil") is left untouched — it's already correctly a true parallel.
  let insertsLinked = 0;
  for (const card of cards) {
    if (!card.subtypes) continue; // base cards have no subtype — nothing to retrofit
    const insertId = await builder.getOrCreateInsert(card.subtypes, SET_ID);
    for (const variant of card.variants) {
      if (variant.insertId === insertId) continue; // already correct, re-run safe
      await prisma.variant.update({ where: { id: variant.id }, data: { insertId } });
      insertsLinked++;
    }
  }
  console.log(`Linked ${insertsLinked} variants to their Insert category.`);

  // 3. Backfill Person entities for Player cards (Team Badge cards have no
  // individual player and are correctly skipped).
  let personsLinked = 0;
  for (const card of cards) {
    if (card.supertype !== "Player") continue;
    const personId = await builder.getOrCreatePerson(card.name);
    const already = await prisma.card.findFirst({
      where: { id: card.id, persons: { some: { id: personId } } },
      select: { id: true },
    });
    if (already) continue;
    await prisma.card.update({ where: { id: card.id }, data: { persons: { connect: { id: personId } } } });
    personsLinked++;
  }
  console.log(`Linked ${personsLinked} cards to a Person entity.`);

  const insertCount = await prisma.insert.count({ where: { setId: SET_ID } });
  const personCount = await prisma.person.count();
  console.log(`Done. Insert categories now on record: ${insertCount}. Total Person rows: ${personCount}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
