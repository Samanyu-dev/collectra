import { prisma } from "../engine/prisma";
import { builder } from "../engine/builder";
import { attachHotlinkImage } from "../engine/media";
import { fetchWithRetry, sleep, API_URL } from "./api-client";

const SOURCE_ID = "pokemontcg-api";

async function run() {
  console.log("Fetching Real Data: ALL Pokémon TCG Sets...");

  // 1. Build the Taxonomy hierarchy
  const universeId = await builder.getOrCreateUniverse("TCG");
  const manufacturerId = await builder.getOrCreateManufacturer("Nintendo");
  const franchiseId = await builder.getOrCreateFranchise("Pokémon", universeId);
  const brandId = await builder.getOrCreateBrand("Pokémon TCG", manufacturerId);

  // Default printings/parallels
  const basePrintingId = await builder.getOrCreatePrinting("Base");
  const holoParallelId = await builder.getOrCreateParallel("Holofoil");
  const reverseParallelId = await builder.getOrCreateParallel("Reverse Holofoil");

  console.log("Fetching all Pokémon sets...");
  const setsData = await fetchWithRetry(`${API_URL}/sets`);
  const sets = setsData.data;
  console.log(`Found ${sets.length} Pokémon sets.`);

  let totalCards = 0;
  const failedSets: string[] = [];

  for (let i = 0; i < sets.length; i++) {
    const setRaw = sets[i];
    try {
      await processSet(i, setRaw);
    } catch (e: any) {
      console.log(`  [${i + 1}/${sets.length}] ${setRaw.name} — FAILED (${e.message}), continuing to next set.`);
      failedSets.push(setRaw.id);
    }
  }

  if (failedSets.length > 0) {
    console.log(`\n${failedSets.length} sets failed and were skipped (re-run this script to retry them — it's idempotent): ${failedSets.join(", ")}`);
  }

  async function processSet(i: number, setRaw: any) {

    // Map series
    const seriesName = setRaw.series || "Base Series";
    const seriesId = await builder.getOrCreateSeries(seriesName, franchiseId, brandId);

    // Create the Set
    const set = await builder.getOrCreateSet({
      id: `pkmn-${setRaw.id}`,
      name: setRaw.name,
      seriesId,
      releaseDate: setRaw.releaseDate ? new Date(setRaw.releaseDate) : undefined,
      printedTotal: setRaw.printedTotal,
    });

    // Set logo/symbol art
    if (setRaw.images?.logo) {
      await attachHotlinkImage({
        url: setRaw.images.logo,
        entityType: "Set",
        entityId: set.id,
        usage: "OFFICIAL_ARTWORK",
        sourceIdentifier: SOURCE_ID,
      });
    }

    // Check if cards already exist (skip if so to save time)
    const existingCardsCount = await prisma.card.count({ where: { setId: set.id } });
    if (existingCardsCount > 0 && existingCardsCount >= (setRaw.printedTotal || 0)) {
      console.log(`  [${i + 1}/${sets.length}] ${set.name} — already has ${existingCardsCount} cards, skipping.`);
      totalCards += existingCardsCount;
      return;
    }

    // Fetch cards for this set
    const cardsData = await fetchWithRetry(`${API_URL}/cards?q=set.id:${setRaw.id}`);
    const cards = cardsData.data;
    console.log(`  [${i + 1}/${sets.length}] ${set.name} — ${cards.length} cards`);

    async function processCard(cardRaw: any) {
      const cardIdEarly = `pkmn-${cardRaw.id}`;
      // Variant creates below are plain .create() (not upsert) for historical
      // reasons — re-processing an already-fully-done card would duplicate
      // variants. Skip entirely if this card already has any, so restarting
      // mid-set (e.g. after an interruption) is always safe.
      const existingVariantCount = await prisma.variant.count({ where: { cardId: cardIdEarly } });
      if (existingVariantCount > 0) return;

      // Upsert Artists
      const artistIds: { id: string }[] = [];
      if (cardRaw.artist) {
        const aId = await builder.getOrCreateArtist(cardRaw.artist);
        artistIds.push({ id: aId });
      }

      // We could extract Characters from the name (e.g., "Charizard ex" -> "Charizard")
      // But for this initial run, we'll keep it simple.

      const cardId = `pkmn-${cardRaw.id}`;

      // Card upsert and image attachments have no FK dependency on each other
      // (MediaAttachment is polymorphic, not a real FK) — run them concurrently.
      const [card] = await Promise.all([
        prisma.card.upsert({
          where: { id: cardId },
          update: {}, // Assume immutable for now
          create: {
            id: cardId,
            name: cardRaw.name,
            number: cardRaw.number,
            setId: set.id,
            supertype: cardRaw.supertype,
            subtypes: cardRaw.subtypes ? cardRaw.subtypes.join(", ") : undefined,
            hp: cardRaw.hp,
            flavorText: cardRaw.flavorText,
            artists: { connect: artistIds }
          }
        }),
        attachHotlinkImage({
          url: cardRaw.images?.small,
          entityType: "Card",
          entityId: cardId,
          usage: "THUMBNAIL",
          sourceIdentifier: SOURCE_ID,
        }),
        attachHotlinkImage({
          url: cardRaw.images?.large,
          entityType: "Card",
          entityId: cardId,
          usage: "OFFICIAL_ARTWORK",
          sourceIdentifier: SOURCE_ID,
        }),
      ]);

      // Build Variants (Printings) — these DO have a real FK to Card, so they
      // must be created after the card upsert above resolves, but can run
      // concurrently with each other.
      // Pokemon API tells us if it has a holofoil, reverse holofoil, or normal printing via tcgplayer prices
      let hasNormal = true;
      let hasHolo = false;
      let hasReverse = false;

      if (cardRaw.tcgplayer?.prices) {
        if (cardRaw.tcgplayer.prices.normal) hasNormal = true;
        if (cardRaw.tcgplayer.prices.holofoil) {
           hasHolo = true;
           hasNormal = false; // Usually if it has holofoil, that's the base printing for Rares, but it varies. We'll add both.
        }
        if (cardRaw.tcgplayer.prices.reverseHolofoil) hasReverse = true;
      }

      const variantWrites: Promise<any>[] = [];
      if (hasNormal) {
        variantWrites.push(prisma.variant.create({
          data: { cardId: card.id, printingId: basePrintingId }
        }));
      }
      if (hasHolo) {
        variantWrites.push(prisma.variant.create({
          data: { cardId: card.id, printingId: basePrintingId, parallelId: holoParallelId, isFoil: true }
        }));
      }
      if (hasReverse) {
        variantWrites.push(prisma.variant.create({
          data: { cardId: card.id, printingId: basePrintingId, parallelId: reverseParallelId, isFoil: true }
        }));
      }
      await Promise.all(variantWrites);
    }

    // Process cards in concurrent batches — big win over one-at-a-time given
    // each card is ~4-8 sequential DB round trips; batching hides that latency.
    // Safe even though this exceeds Supabase's 15-connection session-mode cap:
    // DIRECT_URL sets connection_limit=10, so Prisma queues excess concurrent
    // queries internally rather than opening more physical connections.
    const BATCH_SIZE = 8;
    for (let b = 0; b < cards.length; b += BATCH_SIZE) {
      const batch = cards.slice(b, b + BATCH_SIZE);
      await Promise.all(batch.map(processCard));
      totalCards += batch.length;
    }

    // Rate limit gracefully (against the Pokemon TCG API, not the DB)
    await sleep(500);
  }

  console.log(`\nSuccessfully ingested ${totalCards} real Pokémon cards across ${sets.length} sets into the Universal Graph.`);
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
      console.log(`\nrun() failed (attempt ${attempt}/${maxAttempts}): ${e.message}. Already-ingested sets are skipped on resume, so retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

runWithRetry().catch(console.error).finally(() => prisma.$disconnect());
