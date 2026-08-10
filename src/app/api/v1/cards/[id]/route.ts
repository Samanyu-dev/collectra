import { prisma } from "@/lib/prisma";
import { getImagesForEntity } from "@/lib/media/resolve";
import {
  getOwnedVariantQuantitiesForUser,
  getVaultedVariantIdsForUser,
  getFavoritedVariantIdsForUser,
  getPrimaryOwnedInstanceIdsForUser,
} from "@/lib/actions/collection";
import { getWishlistedCardIdsForUser } from "@/lib/actions/wishlist";
import { getApiUser } from "@/lib/auth/api";
import { getPriceHistoryForVariants } from "@/lib/pricing/history";
import { getCachedGradedPriceHistory } from "@/lib/pricing/graded-history";
import { toPriceDisplay } from "@/lib/pricing/display";
import { apiSuccess, apiError, withApiErrorHandling, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/cards/[id] — public card detail (variants, pricing, price
 * history, media), same data the web `/cards/[id]` page shows. Auth is
 * OPTIONAL here, unlike most other /api/v1 routes: an anonymous caller still
 * gets the full public catalog payload, just without the `viewer` block.
 * When a valid Bearer token IS supplied, `viewer` carries that user's
 * ownership/favorite/vault/wishlist state for this card — never another
 * user's, since it's always derived from the token, never a client param.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const { id: cardId } = await params;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        set: { include: { series: { include: { franchise: true } } } },
        variants: { include: { currentPrice: true, printing: true, parallel: true, insert: true } },
      },
    });
    if (!card) return apiError(ApiErrorCodes.NOT_FOUND, "Card not found.", 404);

    const variantIds = card.variants.map((v) => v.id);
    const apiUser = await getApiUser(req);

    const [images, priceHistoryMap, gradedHistoryEntries, viewer] = await Promise.all([
      getImagesForEntity("Card", card.id),
      getPriceHistoryForVariants(variantIds, "90d"),
      Promise.all(variantIds.map(async (id) => [id, await getCachedGradedPriceHistory(id, "90d")] as const)),
      apiUser
        ? Promise.all([
            getOwnedVariantQuantitiesForUser(apiUser.id, variantIds),
            getVaultedVariantIdsForUser(apiUser.id, variantIds),
            getFavoritedVariantIdsForUser(apiUser.id, variantIds),
            getWishlistedCardIdsForUser(apiUser.id, [card.id]),
            getPrimaryOwnedInstanceIdsForUser(apiUser.id, variantIds),
          ])
        : null,
    ]);

    const emptyViewer: [Record<string, number>, string[], string[], string[], Record<string, string>] = [{}, [], [], [], {}];
    const [ownedQuantities, vaultedIds, favoritedIds, wishlistedCardIds, primaryInstanceIds] = viewer ?? emptyViewer;
    const vaultedSet = new Set(vaultedIds);
    const favoritedSet = new Set(favoritedIds);

    const variants = card.variants.map((v) => ({
      id: v.id,
      printing: v.printing ? { id: v.printing.id, name: v.printing.name } : null,
      parallel: v.parallel ? { id: v.parallel.id, name: v.parallel.name } : null,
      insert: v.insert ? { id: v.insert.id, name: v.insert.name } : null,
      isFoil: v.isFoil,
      isAuto: v.isAuto,
      isPatch: v.isPatch,
      isRelic: v.isRelic,
      serialTo: v.serialTo,
      price: toPriceDisplay(v.currentPrice),
      priceHistory: priceHistoryMap.get(v.id) ?? null,
      gradedPriceHistory: gradedHistoryEntries.find(([id]) => id === v.id)?.[1] ?? null,
      ownedQuantity: (ownedQuantities as Record<string, number>)[v.id] ?? 0,
      // A representative owned Instance id for this variant — null when
      // unowned. The only id iOS Card Detail may use for
      // /api/v1/instances/[instanceId]/{favorite,vault}; it must never
      // manufacture one (see getPrimaryOwnedInstanceIdsForUser's doc comment).
      instanceId: (primaryInstanceIds as Record<string, string>)[v.id] ?? null,
      vaulted: vaultedSet.has(v.id),
      favorited: favoritedSet.has(v.id),
    }));

    return apiSuccess({
      id: card.id,
      name: card.name,
      number: card.number,
      supertype: card.supertype,
      subtypes: card.subtypes,
      hp: card.hp,
      rules: card.rules,
      flavorText: card.flavorText,
      set: {
        id: card.set.id,
        name: card.set.name,
        franchiseName: card.set.series.franchise.name,
      },
      images,
      variants,
      viewer: apiUser ? { isWishlisted: wishlistedCardIds.includes(card.id) } : null,
    });
  });
}
