import { prisma } from "../engine/prisma";
import { builder } from "../engine/builder";
import { attachHotlinkImage } from "../engine/media";

const API_URL = "https://db.ygoprodeck.com/api/v7";
const SOURCE_ID = "ygoprodeck-api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 6): Promise<any> {
  for (let i = 0; i < retries; i++) {
    let res: Response;
    try {
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
  console.log("Fetching Real Data: ALL Yu-Gi-Oh! Sets...");

  const universeId = await builder.getOrCreateUniverse("TCG");
  const manufacturerId = await builder.getOrCreateManufacturer("Konami");
  const franchiseId = await builder.getOrCreateFranchise("Yu-Gi-Oh!", universeId);
  const brandId = await builder.getOrCreateBrand("Yu-Gi-Oh! TCG", manufacturerId);

  const basePrintingId = await builder.getOrCreatePrinting("Base");
  const firstEditionId = await builder.getOrCreatePrinting("1st Edition");

  const setsData = await fetchWithRetry(`${API_URL}/cardsets.php`);
  const sets = setsData;
  console.log(`Found ${sets.length} Yu-Gi-Oh! sets.`);

  let totalCards = 0;
  const failedSets: string[] = [];

  for (let i = 0; i < sets.length; i++) {
    const setRaw = sets[i];
    if (!setRaw.set_code) continue;
    try {
      await processSet(i, setRaw);
    } catch (e: any) {
      console.log(`  [${i + 1}/${sets.length}] ${setRaw.set_name} — FAILED (${e.message}), continuing to next set.`);
      failedSets.push(setRaw.set_code);
    }
  }

  if (failedSets.length > 0) {
    console.log(`\n${failedSets.length} sets failed and were skipped (re-run this script to retry them — it's idempotent): ${failedSets.join(", ")}`);
  }

  async function processSet(i: number, setRaw: any) {
    const seriesName = "Core Boosters"; // YGO API doesn't give clean series, use a default
    const seriesId = await builder.getOrCreateSeries(seriesName, franchiseId, brandId);

    const set = await builder.getOrCreateSet({
      id: `ygo-${setRaw.set_code}`,
      name: setRaw.set_name,
      seriesId,
      releaseDate: setRaw.tcg_date ? new Date(setRaw.tcg_date) : undefined,
      printedTotal: setRaw.num_of_cards,
    });

    const existingCardsCount = await prisma.card.count({ where: { setId: set.id } });
    if (existingCardsCount > 0 && existingCardsCount >= (setRaw.num_of_cards || 0)) {
      console.log(`  [${i + 1}/${sets.length}] ${set.name} — already has ${existingCardsCount} cards, skipping.`);
      totalCards += existingCardsCount;
      return;
    }

    const cardsData = await fetchWithRetry(`${API_URL}/cardinfo.php?cardset=${encodeURIComponent(setRaw.set_name)}`);
    const cards = cardsData.data;
    if (!cards) return;

    console.log(`  [${i + 1}/${sets.length}] ${set.name} — ${cards.length} cards`);

    async function processCard(cardRaw: any) {
      const cardId = `ygo-${cardRaw.id}`;

      // Variant creates are plain .create() (not upsert), so re-processing an
      // already-fully-done card would duplicate variants. Skip if it already
      // has any, so restarting mid-set is always safe.
      const existingVariantCount = await prisma.variant.count({ where: { cardId } });
      if (existingVariantCount > 0) return;

      const setCardInfo = cardRaw.card_sets?.find((cs: any) => cs.set_code.startsWith(setRaw.set_code));

      const [card] = await Promise.all([
        prisma.card.upsert({
          where: { id: cardId },
          update: {},
          create: {
            id: cardId,
            name: cardRaw.name,
            number: setCardInfo ? setCardInfo.set_code : "",
            setId: set.id,
            supertype: cardRaw.type,
            subtypes: cardRaw.race,
            hp: cardRaw.atk ? cardRaw.atk.toString() : undefined,
            flavorText: cardRaw.desc,
          }
        }),
        cardRaw.card_images?.[0]
          ? attachHotlinkImage({
              url: cardRaw.card_images[0].image_url_small,
              entityType: "Card",
              entityId: cardId,
              usage: "THUMBNAIL",
              sourceIdentifier: SOURCE_ID,
            })
          : Promise.resolve(),
        cardRaw.card_images?.[0]
          ? attachHotlinkImage({
              url: cardRaw.card_images[0].image_url,
              entityType: "Card",
              entityId: cardId,
              usage: "OFFICIAL_ARTWORK",
              sourceIdentifier: SOURCE_ID,
            })
          : Promise.resolve(),
      ]);

      const rarity = setCardInfo ? setCardInfo.set_rarity : "Common";
      const parallelId = await builder.getOrCreateParallel(rarity);
      const isFoil = rarity.toLowerCase().includes("rare") || rarity.toLowerCase().includes("foil");

      // YGO typically has 1st Edition and Unlimited
      await Promise.all([
        prisma.variant.create({
          data: { cardId: card.id, printingId: firstEditionId, parallelId, isFoil }
        }),
        prisma.variant.create({
          data: { cardId: card.id, printingId: basePrintingId, parallelId, isFoil }
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

  console.log(`\nSuccessfully ingested ${totalCards} real Yu-Gi-Oh! cards into the Universal Graph.`);
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
