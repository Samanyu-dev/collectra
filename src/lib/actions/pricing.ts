"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";
import { getOrCreateDataSource } from "@/ingestion/engine/media";
import { fetchWithRetry, API_URL } from "@/ingestion/pokemon/api-client";
import { builder } from "@/ingestion/engine/builder";
import { writePriceObservation } from "@/lib/pricing/write-observation";
import { recomputeCurrentPriceForVariant } from "@/lib/pricing/recompute";
import { throttleRequest, POKEMON_TCG_API_WINDOWS, RateLimitExceededError } from "@/lib/pricing/rate-limit";

const PRICE_STATS: Array<"low" | "market" | "high"> = ["low", "market", "high"];

// A user is actively waiting on this request — fail fast with a clear error
// rather than block for up to a full day if the daily window is exhausted.
const REFRESH_NOW_MAX_WAIT_MS = 5000;

/**
 * "Refresh Now" (ADR §9) — a bounded, single-variant, on-demand refresh, run
 * synchronously in the action rather than via the SyncJob queue: the user is
 * actively waiting for a result, unlike the daily background sweep. Shares
 * the same adapter/aggregation functions as price-sync-pokemon, just a
 * different caller.
 */
export async function refreshVariantPrice(variantId: string): Promise<{ refreshed: boolean; rateLimited?: boolean }> {
  await requireUserForAction();

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    include: { card: true, parallel: true },
  });
  if (!variant) throw new Error("Variant not found");

  // Only the Pokémon Tier 0 source is wired today — variants from other
  // franchises correctly no-op rather than pretending to refresh.
  if (!variant.card.id.startsWith("pkmn-")) {
    return { refreshed: false };
  }

  const sourceId = await getOrCreateDataSource("pokemontcg-api", "OFFICIAL_API");

  try {
    await throttleRequest(sourceId, POKEMON_TCG_API_WINDOWS, prisma, REFRESH_NOW_MAX_WAIT_MS);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { refreshed: false, rateLimited: true };
    throw e;
  }

  const externalCardId = variant.card.id.replace(/^pkmn-/, "");
  const cardData = await fetchWithRetry(`${API_URL}/cards/${externalCardId}`);
  const cardRaw = cardData.data;
  const prices = cardRaw.tcgplayer?.prices;
  if (!prices) return { refreshed: false };

  const holoParallelId = await builder.getOrCreateParallel("Holofoil");
  const reverseParallelId = await builder.getOrCreateParallel("Reverse Holofoil");

  const priceType = !variant.parallelId
    ? "normal"
    : variant.parallelId === holoParallelId
      ? "holofoil"
      : variant.parallelId === reverseParallelId
        ? "reverseHolofoil"
        : null;
  if (!priceType || !prices[priceType]) return { refreshed: false };

  const observedAt = cardRaw.tcgplayer.updatedAt ? new Date(cardRaw.tcgplayer.updatedAt.replace(/\//g, "-")) : new Date();
  const priceBlock = prices[priceType];

  let wroteAny = false;
  for (const stat of PRICE_STATS) {
    const value = priceBlock?.[stat];
    if (typeof value !== "number" || value <= 0) continue;
    const wrote = await writePriceObservation({
      variantId,
      kind: "LISTING",
      price: value,
      currency: "USD",
      observedAt,
      sourceUrl: cardRaw.tcgplayer.url,
      externalRef: `${externalCardId}-${priceType}-${stat}`,
      sourceId,
    });
    wroteAny = wroteAny || wrote;
  }

  if (wroteAny) await recomputeCurrentPriceForVariant(variantId);

  revalidatePath(`/cards/${variant.card.id}`);
  return { refreshed: wroteAny };
}
