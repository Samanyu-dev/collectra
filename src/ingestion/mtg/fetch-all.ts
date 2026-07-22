import { prisma } from "../engine/prisma";
import { builder } from "../engine/builder";
import { attachHotlinkImage } from "../engine/media";

const API_URL = "https://api.magicthegathering.io/v1";
const SOURCE_ID = "mtg-api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 6): Promise<any> {
  for (let i = 0; i < retries; i++) {
    let res: Response;
    try {
      // api.magicthegathering.io is known to occasionally accept a connection
      // and never respond — without an explicit timeout, a plain fetch() can
      // hang indefinitely, which no amount of retry-on-error logic catches
      // (there's no error to catch). AbortSignal.timeout turns that into a
      // real error the retry loop below can act on.
      res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch (e: any) {
      console.log(`  Network error (${e.message}), waiting ${(i + 1) * 5}s...`);
      await sleep((i + 1) * 5000);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      console.log(`  API Error ${res.status}, waiting ${(i + 1) * 5}s...`);
      await sleep((i + 1) * 5000);
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${url}`);
    }
    return await res.json();
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries.`);
}

async function run() {
  console.log("Fetching Real Data: ALL Magic: The Gathering Sets...");

  const universeId = await builder.getOrCreateUniverse("TCG");
  const manufacturerId = await builder.getOrCreateManufacturer("Wizards of the Coast");
  const franchiseId = await builder.getOrCreateFranchise("Magic: The Gathering", universeId);
  const brandId = await builder.getOrCreateBrand("MTG", manufacturerId);

  const basePrintingId = await builder.getOrCreatePrinting("Base");
  const foilParallelId = await builder.getOrCreateParallel("Foil");

  const setsData = await fetchWithRetry(`${API_URL}/sets`);
  const sets = setsData.sets;
  console.log(`Found ${sets.length} MTG sets.`);

  let totalCards = 0;
  const failedSets: string[] = [];

  for (let i = 0; i < sets.length; i++) {
    const setRaw = sets[i];
    try {
      await processSet(i, setRaw);
    } catch (e: any) {
      console.log(`  [${i + 1}/${sets.length}] ${setRaw.name} — FAILED (${e.message}), continuing to next set.`);
      failedSets.push(setRaw.code);
    }
  }

  if (failedSets.length > 0) {
    console.log(`\n${failedSets.length} sets failed and were skipped (re-run this script to retry them — it's idempotent): ${failedSets.join(", ")}`);
  }

  async function processSet(i: number, setRaw: any) {
    const seriesName = setRaw.block || "Core Sets";
    const seriesId = await builder.getOrCreateSeries(seriesName, franchiseId, brandId);

    const set = await builder.getOrCreateSet({
      id: `mtg-${setRaw.code}`,
      name: setRaw.name,
      seriesId,
      releaseDate: setRaw.releaseDate ? new Date(setRaw.releaseDate) : undefined,
    });

    // This API doesn't provide a reliable printed-total field up front, so we
    // can't use "existingCardsCount >= printedTotal" like the Pokemon fetcher
    // does on the first pass — that would (and did) falsely mark a
    // partially-ingested set as complete after only 1 card landed from an
    // interrupted run. Instead, self-heal: only trust `set.printedTotal` as a
    // skip threshold once we've recorded it ourselves from a real fetch.
    const existingCardsCount = await prisma.card.count({ where: { setId: set.id } });
    if (set.printedTotal != null && existingCardsCount >= set.printedTotal) {
      console.log(`  [${i + 1}/${sets.length}] ${set.name} — already has ${existingCardsCount} cards, skipping.`);
      totalCards += existingCardsCount;
      return;
    }

    const cardsData = await fetchWithRetry(`${API_URL}/cards?set=${setRaw.code}`);
    const cards = cardsData.cards;
    console.log(`  [${i + 1}/${sets.length}] ${set.name} — ${cards.length} cards`);

    if (set.printedTotal == null) {
      await prisma.set.update({ where: { id: set.id }, data: { printedTotal: cards.length } });
    }

    async function processCard(cardRaw: any) {
      const cardIdEarly = `mtg-${cardRaw.id}`;
      // Variant creates are plain .create() (not upsert), so re-processing an
      // already-fully-done card would duplicate variants. Skip if it already
      // has any, so restarting mid-set is always safe.
      const existingVariantCount = await prisma.variant.count({ where: { cardId: cardIdEarly } });
      if (existingVariantCount > 0) return;

      const artistIds: { id: string }[] = [];
      if (cardRaw.artist) {
        const aId = await builder.getOrCreateArtist(cardRaw.artist);
        artistIds.push({ id: aId });
      }

      const cardId = `mtg-${cardRaw.id}`;

      const [card] = await Promise.all([
        prisma.card.upsert({
          where: { id: cardId },
          update: {},
          create: {
            id: cardId,
            name: cardRaw.name,
            number: cardRaw.number || "",
            setId: set.id,
            supertype: cardRaw.types ? cardRaw.types.join(", ") : undefined,
            subtypes: cardRaw.subtypes ? cardRaw.subtypes.join(", ") : undefined,
            hp: cardRaw.toughness, // MTG uses power/toughness
            flavorText: cardRaw.flavor,
            artists: { connect: artistIds }
          }
        }),
        attachHotlinkImage({
          url: cardRaw.imageUrl,
          entityType: "Card",
          entityId: cardId,
          usage: "OFFICIAL_ARTWORK",
          sourceIdentifier: SOURCE_ID,
        }),
      ]);

      await Promise.all([
        prisma.variant.create({
          data: { cardId: card.id, printingId: basePrintingId }
        }),
        // MTG cards typically have a Foil version
        prisma.variant.create({
          data: { cardId: card.id, printingId: basePrintingId, parallelId: foilParallelId, isFoil: true }
        }),
      ]);
    }

    const BATCH_SIZE = 8;
    for (let b = 0; b < cards.length; b += BATCH_SIZE) {
      const batch = cards.slice(b, b + BATCH_SIZE);
      await Promise.all(batch.map(processCard));
      totalCards += batch.length;
    }

    await sleep(500);
  }

  console.log(`\nSuccessfully ingested ${totalCards} real MTG cards into the Universal Graph.`);
}

async function runWithRetry() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await run();
      return;
    } catch (e: any) {
      if (attempt === maxAttempts) throw e;
      const delay = Math.min(30000 * attempt, 120000);
      console.log(`\nrun() failed (attempt ${attempt}/${maxAttempts}): ${e.message}. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

runWithRetry().catch(console.error).finally(() => prisma.$disconnect());
