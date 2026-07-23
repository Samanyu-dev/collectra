// Tier 0 price sources (docs/adr/003-price-engine-architecture.md §2/§3): the
// Pokémon TCG API's card payload already includes real TCGPlayer (USD) and
// Cardmarket (EUR) prices — fetch-all.ts fetches this same payload today and
// only reads the tcgplayer half to infer which variants exist, then discards
// both. This wires both into PriceObservation, at zero new cost/credentials.
//
// Phase 5.1 — incremental/resumable sync: a single invocation cannot finish
// all ~174 sets within Vercel's function duration limit (confirmed in
// production — a real run got through 14/174 before the platform stopped
// making progress). Rather than chase more throughput, each invocation now
// processes as many sets as fit in a time budget, persists a resume cursor
// after every set that actually completes, and picks up where the last
// invocation left off next time — wrapping back to the start once a full
// lap finishes. See docs/adr/003 for the full record.
import { prisma } from "../engine/prisma";
import { builder } from "../engine/builder";
import { getOrCreateDataSource } from "../engine/media";
import { fetchWithRetry, sleep, API_URL } from "./api-client";
import { writePriceObservationsBatch } from "@/lib/pricing/write-observation";
import { recomputeCurrentPricesForVariants } from "@/lib/pricing/recompute";
import { throttleRequest, POKEMON_TCG_API_WINDOWS } from "@/lib/pricing/rate-limit";
import { resolveStartIndex } from "@/lib/pricing/resume-cursor";
import type { RawPriceObservation } from "@/lib/pricing/types";

const TCGPLAYER_SOURCE = "pokemontcg-api";
// Cardmarket is a distinct real marketplace surfaced through the same API
// response, not the same provider as TCGPlayer — gets its own DataSource so
// its trust level and provenance are tracked separately.
const CARDMARKET_SOURCE = "cardmarket-via-pokemontcg-api";

// Leaves real buffer under the route's maxDuration (300s) for the in-flight
// set to finish, the cursor write, and response serialization — sets have
// taken over 30s each under real upstream API flakiness, so the buffer needs
// to survive one slow set starting right at the boundary, not just an instant.
const DEFAULT_TIME_BUDGET_MS = 240_000;

// The three variant shapes fetch-all.ts actually creates Variant rows for.
const PRICE_TYPE_TO_SHAPE: Record<string, "normal" | "holofoil" | "reverseHolofoil"> = {
  normal: "normal",
  holofoil: "holofoil",
  reverseHolofoil: "reverseHolofoil",
};

const TCGPLAYER_STATS: Array<"low" | "market" | "high"> = ["low", "market", "high"];

// Cardmarket field → (stat kind) mapping. "averageSellPrice" reads as a real
// realized-sale statistic by name — an interpretation of the field name, not
// independently verified against Cardmarket's own API docs; flagged here
// rather than presented as a confirmed contract (ADR's "verify, don't assume").
const CARDMARKET_STATS: Array<{ field: string; kind: "LISTING" | "SOLD" }> = [
  { field: "lowPrice", kind: "LISTING" },
  { field: "trendPrice", kind: "LISTING" },
  { field: "averageSellPrice", kind: "SOLD" },
];
const CARDMARKET_REVERSE_STATS: Array<{ field: string; kind: "LISTING" | "SOLD" }> = [
  { field: "reverseHoloLow", kind: "LISTING" },
  { field: "reverseHoloTrend", kind: "LISTING" },
  { field: "reverseHoloSell", kind: "SOLD" },
];

function parseApiDate(raw: string | undefined): Date {
  return raw ? new Date(raw.replace(/\//g, "-")) : new Date();
}

export async function syncPokemonPrices(opts: { limitSets?: number; timeBudgetMs?: number } = {}) {
  const t0 = Date.now();
  const timeBudgetMs = opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const tcgplayerSourceId = await getOrCreateDataSource(TCGPLAYER_SOURCE, "OFFICIAL_API");
  const cardmarketSourceId = await getOrCreateDataSource(CARDMARKET_SOURCE, "OFFICIAL_API");
  // getOrCreateDataSource only sets lastSyncedAt on first-ever creation — mark
  // this invocation's start explicitly so "last sync" on the admin page
  // reflects reality even though each run only covers a subset of sets.
  await prisma.dataSource.update({ where: { id: tcgplayerSourceId }, data: { lastSyncedAt: new Date() } });

  const holoParallelId = await builder.getOrCreateParallel("Holofoil");
  const reverseParallelId = await builder.getOrCreateParallel("Reverse Holofoil");

  console.log("Syncing Pokémon TCG prices (Tier 0: tcgplayer + cardmarket prices from the existing ingestion payload)...");
  // TCGPlayer and Cardmarket prices both come from the SAME api.pokemontcg.io
  // HTTP endpoint — one request yields both, so the real rate-limited resource
  // is the endpoint itself. Keyed on tcgplayerSourceId since that DataSource
  // row represents the API endpoint, not "TCGPlayer data specifically."
  await throttleRequest(tcgplayerSourceId, POKEMON_TCG_API_WINDOWS, prisma);
  const setsData = await fetchWithRetry(`${API_URL}/sets`);
  const allSets = setsData.data;

  let sets: any[];
  let usingCursor = false;
  if (opts.limitSets) {
    // Test/CLI-only path — a fixed prefix, deliberately not cursor-aware so
    // local verification runs are reproducible.
    sets = allSets.slice(0, opts.limitSets);
  } else {
    usingCursor = true;
    const source = await prisma.dataSource.findUnique({ where: { id: tcgplayerSourceId }, select: { syncCursor: true } });
    const startIndex = resolveStartIndex(allSets, source?.syncCursor ?? null);
    sets = allSets.slice(startIndex);
    console.log(`Resuming from index ${startIndex}/${allSets.length} (cursor: ${source?.syncCursor ?? "none — starting a fresh lap"}).`);
  }
  console.log(`Considering ${sets.length} set(s) this invocation, time budget ${timeBudgetMs}ms.`);

  let totalObservationsWritten = 0;
  let totalVariantsTouched = 0;
  let setsProcessed = 0;
  let stoppedOnTimeBudget = false;
  // Once a set fails, the cursor stops advancing for the rest of THIS run —
  // even if later sets in the same run succeed. Without this, a failure
  // followed by any later success would let the cursor jump past the failed
  // set (its id gets overwritten by the next success), and the failed set
  // wouldn't be retried again until a full lap of the whole catalog wrapped
  // back around to it — a real gap found via a live production cross-check,
  // not a hypothetical. The cursor is a watermark: "everything up to here is
  // confirmed done," never "the most recent thing that happened to succeed."
  let cursorCanAdvance = true;
  const failedSets: string[] = [];

  for (let i = 0; i < sets.length; i++) {
    if (usingCursor && Date.now() - t0 > timeBudgetMs) {
      stoppedOnTimeBudget = true;
      console.log(`Time budget reached after ${setsProcessed} set(s) — stopping; the next invocation resumes from here.`);
      break;
    }

    const setRaw = sets[i];
    const tSet0 = Date.now();
    try {
      await throttleRequest(tcgplayerSourceId, POKEMON_TCG_API_WINDOWS, prisma);
      const cardsData = await fetchWithRetry(`${API_URL}/cards?q=set.id:${setRaw.id}`);
      const cards = cardsData.data;

      // One bulk variant lookup for the whole set instead of one findFirst per
      // card per price type — the real fix for the sequential-write bottleneck
      // found by timing the first (unbatched) sync run.
      const cardIds = cards.map((c: any) => `pkmn-${c.id}`);
      const variants = await prisma.variant.findMany({
        where: { cardId: { in: cardIds } },
        select: { id: true, cardId: true, parallelId: true },
      });
      const variantIndex = new Map<string, string>(); // `${cardId}|${shape}` -> variantId
      for (const v of variants) {
        const shape = !v.parallelId ? "normal" : v.parallelId === holoParallelId ? "holofoil" : v.parallelId === reverseParallelId ? "reverseHolofoil" : null;
        if (shape) variantIndex.set(`${v.cardId}|${shape}`, v.id);
      }

      const rows: Array<RawPriceObservation & { sourceId: string }> = [];
      const touchedVariantIds = new Set<string>();

      for (const cardRaw of cards) {
        const cardId = `pkmn-${cardRaw.id}`;
        const tcgPrices = cardRaw.tcgplayer?.prices;
        const cardmarketPrices = cardRaw.cardmarket?.prices;
        if (!tcgPrices && !cardmarketPrices) continue;

        // TCGPlayer (USD) — one observation per {variant shape} x {low, market, high}.
        if (tcgPrices) {
          const observedAt = parseApiDate(cardRaw.tcgplayer.updatedAt);
          for (const priceType of Object.keys(tcgPrices)) {
            const shape = PRICE_TYPE_TO_SHAPE[priceType];
            if (!shape) continue;
            const variantId = variantIndex.get(`${cardId}|${shape}`);
            if (!variantId) continue;

            const priceBlock = tcgPrices[priceType];
            for (const stat of TCGPLAYER_STATS) {
              const value = priceBlock?.[stat];
              if (typeof value !== "number" || value <= 0) continue;
              rows.push({
                variantId,
                kind: "LISTING",
                price: value,
                currency: "USD",
                observedAt,
                sourceUrl: cardRaw.tcgplayer.url,
                externalRef: `${cardRaw.id}-${priceType}-${stat}`,
                sourceId: tcgplayerSourceId,
              });
            }
            touchedVariantIds.add(variantId);
          }
        }

        // Cardmarket (EUR) — base fields apply to whichever shape is this
        // card's primary printing (holofoil if it has one, else normal);
        // reverseHolo* fields apply to the reverse holo parallel specifically.
        if (cardmarketPrices) {
          const observedAt = parseApiDate(cardRaw.cardmarket.updatedAt);
          const primaryShape = tcgPrices?.holofoil ? "holofoil" : "normal";
          const primaryVariantId = variantIndex.get(`${cardId}|${primaryShape}`);
          if (primaryVariantId) {
            for (const stat of CARDMARKET_STATS) {
              const value = cardmarketPrices[stat.field];
              if (typeof value !== "number" || value <= 0) continue;
              rows.push({
                variantId: primaryVariantId,
                kind: stat.kind,
                price: value,
                currency: "EUR",
                observedAt,
                sourceUrl: cardRaw.cardmarket.url,
                externalRef: `${cardRaw.id}-cardmarket-${stat.field}`,
                sourceId: cardmarketSourceId,
              });
              touchedVariantIds.add(primaryVariantId);
            }
          }

          const reverseVariantId = variantIndex.get(`${cardId}|reverseHolofoil`);
          if (reverseVariantId) {
            for (const stat of CARDMARKET_REVERSE_STATS) {
              const value = cardmarketPrices[stat.field];
              if (typeof value !== "number" || value <= 0) continue;
              rows.push({
                variantId: reverseVariantId,
                kind: stat.kind,
                price: value,
                currency: "EUR",
                observedAt,
                sourceUrl: cardRaw.cardmarket.url,
                externalRef: `${cardRaw.id}-cardmarket-${stat.field}`,
                sourceId: cardmarketSourceId,
              });
              touchedVariantIds.add(reverseVariantId);
            }
          }
        }
      }

      const written = await writePriceObservationsBatch(rows, prisma);
      await recomputeCurrentPricesForVariants([...touchedVariantIds], new Date(), prisma);

      totalObservationsWritten += written;
      totalVariantsTouched += touchedVariantIds.size;
      setsProcessed++;

      // Persist the resume cursor only after this set's writes have fully
      // landed, and only if nothing has failed yet this run (see
      // cursorCanAdvance above) — if the process dies mid-set, the cursor
      // stays on the previous set and next run safely reprocesses this one
      // (append-only writes make that idempotent enough: a few duplicate
      // observations, never a wrong price).
      if (usingCursor && cursorCanAdvance) {
        await prisma.dataSource.update({ where: { id: tcgplayerSourceId }, data: { syncCursor: setRaw.id } });
      }

      console.log(
        `  [${i + 1}/${sets.length}] ${setRaw.name} — ${touchedVariantIds.size} variant(s), ${written} observation(s), ${Date.now() - tSet0}ms`
      );
      await sleep(500); // rate limit gracefully against the Pokémon TCG API
    } catch (e: any) {
      console.log(`  [${i + 1}/${sets.length}] ${setRaw.name} — FAILED (${e.message}), continuing to next set.`);
      failedSets.push(setRaw.id);
      cursorCanAdvance = false; // this set must succeed before the cursor moves past it
    }
  }

  const elapsedMs = Date.now() - t0;
  const lapComplete = usingCursor && !stoppedOnTimeBudget && setsProcessed + failedSets.length >= sets.length;
  console.log(
    `\nWrote ${totalObservationsWritten} price observations across ${totalVariantsTouched} variants in ${elapsedMs}ms (${(elapsedMs / Math.max(1, totalVariantsTouched)).toFixed(0)}ms/variant).`
  );
  if (usingCursor) {
    console.log(lapComplete ? "Completed a full lap of the catalog — next invocation starts over from the beginning." : "Did not finish this lap — next invocation resumes from the cursor.");
  }
  if (failedSets.length > 0) {
    console.log(`${failedSets.length} set(s) failed and were skipped: ${failedSets.join(", ")}`);
  }
  return {
    observationsWritten: totalObservationsWritten,
    variantsTouched: totalVariantsTouched,
    failedSets,
    elapsedMs,
    setsProcessed,
    stoppedOnTimeBudget,
    lapComplete,
  };
}

// CLI entry point: `npx tsx src/ingestion/pokemon/sync-prices.ts [limitSets]`
if (require.main === module) {
  const limitSets = process.argv[2] ? Number(process.argv[2]) : undefined;
  syncPokemonPrices({ limitSets })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
