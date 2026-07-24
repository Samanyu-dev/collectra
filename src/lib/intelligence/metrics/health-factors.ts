import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getWishlistMarketPrice, type WishlistPriceRow } from "../wishlist-price";

export interface HealthFactors {
  pricingCoverage: number; // % of owned unique cards with a real market price
  metadataQuality: number; // % of owned unique cards linked to a real Person/Team/Character
  imagesCoverage: number; // % of owned unique cards with at least one attached image
  duplicateHealth: number; // 100 - duplicate ratio — higher is healthier, unlike the raw ratio
  wishlistCoverage: number; // % of wishlist entries that currently have a priced variant
}

type FactorInstance = {
  variantId: string;
  variant: { card: { id: string }; currentPrice: { marketPriceUsd: number | null } | null };
};

/**
 * The 5 real, computable factors behind the single Collection Health score —
 * every one derived from data that already exists (no invented sub-scores).
 * Takes the caller's already-fetched instances/wishlist (same discipline as
 * recalculateUserMetrics/generateInsights) plus two small, cheap targeted
 * queries for the two factors that need data instances don't carry
 * (Person/Team/Character links, attached Images) — both scoped to the
 * distinct owned card IDs, not per-instance.
 */
export async function computeHealthFactors(instances: FactorInstance[], wishlist: WishlistPriceRow[]): Promise<HealthFactors> {
  if (instances.length === 0) {
    return { pricingCoverage: 0, metadataQuality: 0, imagesCoverage: 0, duplicateHealth: 100, wishlistCoverage: 0 };
  }

  const cardIds = [...new Set(instances.map((i) => i.variant.card.id))];
  const variantIds = [...new Set(instances.map((i) => i.variantId))];

  const [linkedCardCount, imagesByCard] = await Promise.all([
    prisma.card.count({
      where: { id: { in: cardIds }, OR: [{ persons: { some: {} } }, { teams: { some: {} } }, { characters: { some: {} } }] },
    }),
    getImagesForEntities("Card", cardIds),
  ]);

  const pricedCards = new Set(
    instances.filter((i) => i.variant.currentPrice?.marketPriceUsd != null).map((i) => i.variant.card.id)
  );

  const variantCounts = new Map<string, number>();
  for (const id of variantIds) variantCounts.set(id, 0);
  for (const i of instances) variantCounts.set(i.variantId, (variantCounts.get(i.variantId) ?? 0) + 1);
  const duplicateCount = [...variantCounts.values()].filter((c) => c > 1).reduce((sum, c) => sum + (c - 1), 0);
  const duplicateRatio = duplicateCount / instances.length;

  const pricingCoverage = (pricedCards.size / cardIds.length) * 100;
  const metadataQuality = (linkedCardCount / cardIds.length) * 100;
  const imagesCoverage = (cardIds.filter((id) => (imagesByCard.get(id)?.length ?? 0) > 0).length / cardIds.length) * 100;
  const duplicateHealth = Math.max(0, 100 - duplicateRatio * 100);
  const wishlistCoverage =
    wishlist.length > 0
      ? (wishlist.filter((w) => getWishlistMarketPrice(w) != null).length / wishlist.length) * 100
      : 0;

  return { pricingCoverage, metadataQuality, imagesCoverage, duplicateHealth, wishlistCoverage };
}

/** The single top-tile number — the average of the 5 factors, rounded. */
export function healthScoreFromFactors(factors: HealthFactors): number {
  const avg = (factors.pricingCoverage + factors.metadataQuality + factors.imagesCoverage + factors.duplicateHealth + factors.wishlistCoverage) / 5;
  return Math.round(Math.max(0, Math.min(100, avg)));
}
