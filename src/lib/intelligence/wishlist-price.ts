export type WishlistPriceRow = {
  priceAlert?: number | null;
  variant?: { currentPrice: { marketPriceUsd: number | null } | null } | null;
  card?: { variants: { currentPrice: { marketPriceUsd: number | null } | null }[] } | null;
};

/**
 * The market price a Wishlist row should be judged against. Wishlist entries
 * can point at either a specific Variant OR a Card (schema allows both,
 * nullable) — the real wishlist page (src/app/wishlist/page.tsx) uses the
 * card path and compares against the *cheapest* priced variant of that card,
 * since "can I get this for my target price" means any variant will do.
 * Shared here so the health-factor coverage calc and the WISHLIST_WATCH
 * insight rule agree with what the wishlist page itself shows.
 */
export function getWishlistMarketPrice(row: WishlistPriceRow): number | null {
  if (row.variant?.currentPrice?.marketPriceUsd != null) return row.variant.currentPrice.marketPriceUsd;
  const cheapest = (row.card?.variants ?? [])
    .map((v) => v.currentPrice?.marketPriceUsd)
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b)[0];
  return cheapest ?? null;
}
