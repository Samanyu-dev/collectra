import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getOwnedVariantQuantities } from "@/lib/actions/collection";
import { getWishlistedCardIds } from "@/lib/actions/wishlist";
import { getCurrentUser } from "@/lib/auth/session";
import { toPriceDisplay } from "@/lib/pricing/display";
import { CardsBrowseClient } from "./cards-browse-client";

export const dynamic = "force-dynamic";

export default async function CardsPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  // TEMP PROFILING (2026-08-06 /cards Phase-1.5 investigation) — remove after gathering data.
  const __t0 = performance.now();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) || 1 : 1;
  const franchiseId = typeof searchParams.franchise === "string" ? searchParams.franchise : "";
  const sort = typeof searchParams.sort === "string" && searchParams.sort === "name-desc" ? "name-desc" : "name-asc";
  const minPriceNum = typeof searchParams.minPrice === "string" ? Number(searchParams.minPrice) : NaN;
  const maxPriceNum = typeof searchParams.maxPrice === "string" ? Number(searchParams.maxPrice) : NaN;
  const minPrice = Number.isFinite(minPriceNum) ? minPriceNum : null;
  const maxPrice = Number.isFinite(maxPriceNum) ? maxPriceNum : null;
  const limit = 60;

  // Ownership/watchlist filters only make sense for a signed-in visitor —
  // this page itself is public/auth-optional, so a signed-out request silently
  // falls back to "all" rather than filtering against data that doesn't exist.
  const currentUser = await getCurrentUser();
  const ownershipRaw = typeof searchParams.ownership === "string" ? searchParams.ownership : "all";
  const ownership: "all" | "owned" | "not-owned" =
    currentUser && (ownershipRaw === "owned" || ownershipRaw === "not-owned") ? ownershipRaw : "all";
  const watchlistOnly = Boolean(currentUser) && searchParams.watchlist === "1";

  const terms = q.trim().split(/\s+/).filter(Boolean);
  const contains = (term: string) => ({ contains: term, mode: "insensitive" as const });

  const __tBeforeCards = performance.now();

  const [franchises, ownedVariantIdsForFilter, watchlistedCardIdsForFilter] = await Promise.all([
    prisma.franchise.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ownership !== "all" && currentUser
      ? prisma.instance
          .findMany({ where: { userId: currentUser.id }, select: { variantId: true }, distinct: ["variantId"] })
          .then((rows) => rows.map((r) => r.variantId))
      : Promise.resolve<string[]>([]),
    watchlistOnly && currentUser
      ? prisma.wishlist
          .findMany({ where: { userId: currentUser.id, cardId: { not: null } }, select: { cardId: true } })
          .then((rows) => rows.map((r) => r.cardId as string))
      : Promise.resolve<string[]>([]),
  ]);

  const where = {
    AND: [
      ...(terms.length
        ? [
            {
              AND: terms.map((term) => ({
                OR: [
                  { name: contains(term) },
                  { number: contains(term) },
                  { supertype: contains(term) },
                  { subtypes: contains(term) },
                  { set: { name: contains(term) } },
                  { set: { series: { name: contains(term) } } },
                  { set: { series: { franchise: { name: contains(term) } } } },
                  { set: { series: { brand: { name: contains(term) } } } },
                  { set: { series: { brand: { manufacturer: { name: contains(term) } } } } },
                  { set: { competition: { is: { name: contains(term) } } } },
                  { set: { season: { is: { label: contains(term) } } } },
                  { teams: { some: { name: contains(term) } } },
                  { persons: { some: { name: contains(term) } } },
                  { variants: { some: { insert: { is: { name: contains(term) } } } } },
                  { variants: { some: { parallel: { is: { name: contains(term) } } } } },
                ],
              })),
            },
          ]
        : []),
      ...(franchiseId ? [{ set: { series: { franchiseId } } }] : []),
      ...(minPrice != null || maxPrice != null
        ? [
            {
              variants: {
                some: {
                  currentPrice: {
                    marketPriceUsd: {
                      ...(minPrice != null ? { gte: minPrice } : {}),
                      ...(maxPrice != null ? { lte: maxPrice } : {}),
                    },
                  },
                },
              },
            },
          ]
        : []),
      ...(ownership === "owned" ? [{ variants: { some: { id: { in: ownedVariantIdsForFilter } } } }] : []),
      ...(ownership === "not-owned" ? [{ variants: { none: { id: { in: ownedVariantIdsForFilter } } } }] : []),
      ...(watchlistOnly ? [{ id: { in: watchlistedCardIdsForFilter } }] : []),
    ],
  };

  const orderBy = sort === "name-desc" ? { name: "desc" as const } : { name: "asc" as const };

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        set: {
          include: {
            competition: true,
            season: true,
            series: { include: { franchise: true, brand: { include: { manufacturer: true } } } },
          },
        },
        teams: true,
        persons: true,
        variants: { include: { currentPrice: true, insert: true, parallel: true } },
      },
    }),
    prisma.card.count({ where }),
  ]);
  const __tAfterCards = performance.now();

  const [imagesByCard, ownedVariantQuantities, wishlistedCardIds] = await Promise.all([
    getImagesForEntities("Card", cards.map((c) => c.id)),
    getOwnedVariantQuantities(cards.flatMap((c) => c.variants.map((v) => v.id))),
    getWishlistedCardIds(cards.map((c) => c.id)),
  ]);
  const __tAfterImages = performance.now();

  const items = cards.map((c) => {
    const pricedVariant = c.variants
      .filter((v) => v.currentPrice?.marketPriceUsd != null)
      .sort((a, b) => b.currentPrice!.marketPriceUsd! - a.currentPrice!.marketPriceUsd!)[0];

    return {
      id: c.id,
      name: c.name,
      number: c.number,
      setName: c.set.name,
      franchiseName: c.set.series.franchise.name,
      images: imagesByCard.get(c.id) ?? [],
      price: toPriceDisplay(pricedVariant?.currentPrice ?? null),
      ownedQuantity: c.variants.reduce((sum, v) => sum + (ownedVariantQuantities[v.id] ?? 0), 0),
      variantId: pricedVariant?.id ?? c.variants[0]?.id ?? null,
      wishlisted: wishlistedCardIds.includes(c.id),
    };
  });

  const totalPages = Math.ceil(total / limit);

  const __tEnd = performance.now();
  console.log(
    `[PROFILE /cards] searchParams=${(__tBeforeCards - __t0).toFixed(1)}ms ` +
    `cardsQuery=${(__tAfterCards - __tBeforeCards).toFixed(1)}ms ` +
    `imagesAndOwned=${(__tAfterImages - __tAfterCards).toFixed(1)}ms ` +
    `mapping=${(__tEnd - __tAfterImages).toFixed(1)}ms ` +
    `serverComponentTotal=${(__tEnd - __t0).toFixed(1)}ms`
  );

  return (
    <CardsBrowseClient
      items={items}
      query={q}
      page={page}
      totalPages={totalPages}
      total={total}
      franchises={franchises}
      franchiseId={franchiseId}
      sort={sort}
      minPrice={minPrice}
      maxPrice={maxPrice}
      ownership={ownership}
      watchlistOnly={watchlistOnly}
      isLoggedIn={Boolean(currentUser)}
    />
  );
}
