import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardClientExperience } from "@/components/ui/card-client-experience";
import { getImagesForEntity, getImagesForEntities } from "@/lib/media/resolve";
import { getFavoritedVariantIds, getOwnedVariantQuantities, getVaultedVariantIds } from "@/lib/actions/collection";
import { getWishlistedCardIds } from "@/lib/actions/wishlist";
import { getCurrentUser } from "@/lib/auth/session";
import { getPriceHistoryForVariants } from "@/lib/pricing/history";

export const dynamic = "force-dynamic";

export default async function CardDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id: cardId } = await props.params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      set: {
        include: {
          competition: true,
          season: true,
          _count: { select: { cards: true } },
          series: {
            include: {
              franchise: true,
              brand: { include: { manufacturer: true } }
            }
          }
        }
      },
      variants: {
        include: {
          currentPrice: true,
          printing: true,
          parallel: true,
          insert: true,
          possibleIn: {
            include: {
              pack: {
                include: { components: { include: { product: true } } }
              }
            }
          },
          guaranteedIn: {
            include: { product: true }
          }
        }
      },
      artists: true,
      characters: true,
      persons: true,
      teams: true
    }
  });

  if (!card) notFound();
  const currentUser = await getCurrentUser();

  const productIds = new Set<string>();
  for (const v of card.variants) {
    for (const p of v.possibleIn) if (p.pack) for (const c of p.pack.components) if (c.product) productIds.add(c.product.id);
    for (const g of v.guaranteedIn) if (g.product) productIds.add(g.product.id);
  }

  const variantIds = card.variants.map((v) => v.id);

  const [
    cardImages,
    productImagesMap,
    ownedQuantities,
    vaultedVariantIds,
    favoritedVariantIds,
    wishlistedCardIds,
    relatedCardsRaw,
    userInstances,
    ownedSetRows,
    marketplaceListings,
    priceHistoryMap,
  ] = await Promise.all([
    getImagesForEntity("Card", card.id),
    getImagesForEntities("Product", Array.from(productIds)),
    getOwnedVariantQuantities(variantIds),
    getVaultedVariantIds(variantIds),
    getFavoritedVariantIds(variantIds),
    getWishlistedCardIds([card.id]),
    prisma.card.findMany({
      where: { setId: card.setId, id: { not: card.id } },
      orderBy: { number: "asc" },
      take: 12,
    }),
    currentUser
      ? prisma.instance.findMany({
          where: { userId: currentUser.id, variantId: { in: variantIds } },
          include: {
            listings: {
              where: { status: { in: ["ACTIVE", "RESERVED"] } },
              select: { id: true, status: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    currentUser
      ? prisma.instance.findMany({
          where: { userId: currentUser.id, variant: { card: { setId: card.setId } } },
          select: { variant: { select: { cardId: true } } },
        })
      : Promise.resolve([]),
    prisma.listing.findMany({
      where: { status: "ACTIVE", instance: { variant: { cardId: card.id } } },
      orderBy: { price: "asc" },
      take: 5,
      select: {
        id: true,
        price: true,
        currency: true,
        conditionSnapshot: true,
        gradeSnapshot: true,
        shipsTo: true,
        seller: { select: { username: true, name: true } },
      },
    }),
    // Fetch price history for all variants (default 90d range)
    getPriceHistoryForVariants(variantIds, "90d"),
  ]);

  const relatedCardImages = await getImagesForEntities("Card", relatedCardsRaw.map((c) => c.id));
  const relatedCards = relatedCardsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    images: relatedCardImages.get(c.id) ?? [],
  }));
  const vaultedVariantSet = new Set(vaultedVariantIds);
  const favoritedVariantSet = new Set(favoritedVariantIds);
  const userInstancesByVariant = new Map<string, typeof userInstances>();
  for (const instance of userInstances) {
    const list = userInstancesByVariant.get(instance.variantId) ?? [];
    list.push(instance);
    userInstancesByVariant.set(instance.variantId, list);
  }
  const ownedSetCardIds = new Set(ownedSetRows.map((row) => row.variant.cardId));
  const setProgressTotal = card.set.printedTotal && card.set.printedTotal > 0 ? card.set.printedTotal : card.set._count.cards;
  const setProgressOwned = ownedSetCardIds.size;

  const cardWithImages = {
    ...card,
    images: cardImages,
    isWishlisted: wishlistedCardIds.includes(card.id),
    setProgress: {
      owned: setProgressOwned,
      total: setProgressTotal,
      percent: setProgressTotal > 0 ? Math.round((setProgressOwned / setProgressTotal) * 100) : 0,
      missing: Math.max(setProgressTotal - setProgressOwned, 0),
    },
    marketplaceListings,
    variants: card.variants.map((v) => ({
      ...v,
      ownedQuantity: ownedQuantities[v.id] ?? 0,
      owned: (ownedQuantities[v.id] ?? 0) > 0,
      vaulted: vaultedVariantSet.has(v.id),
      favorited: favoritedVariantSet.has(v.id),
      scannerHistory: (userInstancesByVariant.get(v.id) ?? [])
        .filter((instance) => instance.scanMediaId)
        .map((instance) => ({ instanceId: instance.id, addedAt: instance.createdAt, condition: instance.condition })),
      activeListings: (userInstancesByVariant.get(v.id) ?? []).flatMap((instance) =>
        instance.listings.map((listing) => ({ id: listing.id, status: listing.status }))
      ),
      possibleIn: v.possibleIn.map((p) => ({
        ...p,
        pack: p.pack && {
          ...p.pack,
          components: p.pack.components.map((c) => ({
            ...c,
            product: c.product && { ...c.product, images: productImagesMap.get(c.product.id) ?? [] },
          })),
        },
      })),
      guaranteedIn: v.guaranteedIn.map((g) => ({
        ...g,
        product: g.product && { ...g.product, images: productImagesMap.get(g.product.id) ?? [] },
      })),
    })),
  };

  // Find the top variant by price or just default to the first one
  const topVariant = card.variants
    .map(v => ({ id: v.id, price: v.currentPrice?.marketPriceUsd ?? 0 }))
    .sort((a, b) => b.price - a.price)[0];

  // Serialize price history map to JSON for client component (Map doesn't serialize)
  const priceHistoryJson = Object.fromEntries(
    [...priceHistoryMap.entries()].map(([id, result]) => [
      id,
      { ...result, lastUpdated: result.lastUpdated?.toISOString() ?? null },
    ])
  );

  return <CardClientExperience card={cardWithImages} topVariantId={topVariant?.id || card.variants[0]?.id} relatedCards={relatedCards} priceHistoryByVariant={priceHistoryJson} />;
}
