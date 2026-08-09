import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { getImagesForEntities } from "@/lib/media/resolve";
import { toPriceDisplay } from "@/lib/pricing/display";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/wishlist — same query/shaping as the web `/wishlist` page
 * (src/app/wishlist/page.tsx), scoped to `{ userId: user.id }` from the
 * Bearer-token-resolved user, never a client-suppliable id.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    const entries = await prisma.wishlist.findMany({
      where: { userId: user.id, cardId: { not: null } },
      orderBy: { addedAt: "desc" },
      include: { card: { include: { set: true, variants: { include: { currentPrice: true } } } } },
    });

    const cardIds = entries.flatMap((e) => (e.card ? [e.card.id] : []));
    const imagesByCard = await getImagesForEntities("Card", cardIds);

    const items = entries
      .filter((e) => e.card)
      .map((e) => {
        // The cheapest variant is the one a price alert compares against —
        // same rule the web wishlist page uses.
        const priced =
          e
            .card!.variants.map((v) => v.currentPrice)
            .filter((p): p is NonNullable<typeof p> => p?.marketPriceUsd != null)
            .sort((a, b) => a.marketPriceUsd! - b.marketPriceUsd!)[0] ?? null;

        const alertTriggered = e.priceAlert != null && priced?.marketPriceUsd != null && priced.marketPriceUsd <= e.priceAlert;

        return {
          id: e.id,
          cardId: e.card!.id,
          name: e.card!.name,
          number: e.card!.number,
          setName: e.card!.set.name,
          priceAlert: e.priceAlert,
          addedAt: e.addedAt.toISOString(),
          images: imagesByCard.get(e.card!.id) ?? [],
          price: { ...toPriceDisplay(priced), lastUpdated: priced?.latestObservationAt?.toISOString() ?? null },
          alertTriggered,
        };
      });

    return apiSuccess({ items });
  });
}
