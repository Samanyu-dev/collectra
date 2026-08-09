import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getOwnedVariantQuantities } from "@/lib/actions/collection";
import { toPriceDisplay } from "@/lib/pricing/display";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";

export const dynamic = "force-dynamic";

const contains = (term: string) => ({ contains: term, mode: "insensitive" as const });

/**
 * GET /api/v1/cards?query=&setId=&page=&pageSize= — public catalog browse,
 * same search shape as the web `/cards` page (src/app/cards/page.tsx), just
 * as JSON. Ownership quantities are included when the caller is
 * authenticated (via getOwnedVariantQuantities, which already returns
 * "nothing owned" for an anonymous caller — no separate auth branch needed).
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const setId = searchParams.get("setId") ?? undefined;
    const pagination = parsePagination(searchParams);

    const terms = query.split(/\s+/).filter(Boolean);
    const where = {
      ...(setId ? { setId } : {}),
      ...(terms.length
        ? {
            AND: terms.map((term) => ({
              OR: [
                { name: contains(term) },
                { number: contains(term) },
                { supertype: contains(term) },
                { set: { name: contains(term) } },
                { set: { series: { name: contains(term) } } },
                { set: { series: { franchise: { name: contains(term) } } } },
                { set: { series: { brand: { name: contains(term) } } } },
                { set: { series: { brand: { manufacturer: { name: contains(term) } } } } },
                { teams: { some: { name: contains(term) } } },
                { persons: { some: { name: contains(term) } } },
              ],
            })),
          }
        : {}),
    };

    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          set: { include: { series: { include: { franchise: true } } } },
          variants: { include: { currentPrice: true, insert: true, parallel: true } },
        },
      }),
      prisma.card.count({ where }),
    ]);

    const [imagesByCard, ownedVariantQuantities] = await Promise.all([
      getImagesForEntities("Card", cards.map((c) => c.id)),
      getOwnedVariantQuantities(cards.flatMap((c) => c.variants.map((v) => v.id))),
    ]);

    const items = cards.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      setId: c.set.id,
      setName: c.set.name,
      franchiseName: c.set.series.franchise.name,
      images: imagesByCard.get(c.id) ?? [],
      price: toPriceDisplay(
        c.variants
          .filter((v) => v.currentPrice?.marketPriceUsd != null)
          .sort((a, b) => b.currentPrice!.marketPriceUsd! - a.currentPrice!.marketPriceUsd!)[0]?.currentPrice ?? null
      ),
      ownedQuantity: c.variants.reduce((sum, v) => sum + (ownedVariantQuantities[v.id] ?? 0), 0),
    }));

    return apiSuccess({ items, pagination: paginationMeta(pagination, total) });
  });
}
