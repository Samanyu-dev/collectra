import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardClientExperience } from "@/components/ui/card-client-experience";
import { getImagesForEntity, getImagesForEntities } from "@/lib/media/resolve";
import { getOwnedVariantIds, getVaultedVariantIds, getFavoritedVariantIds } from "@/lib/actions/collection";
import { getWishlistedCardIds } from "@/lib/actions/wishlist";

export const dynamic = "force-dynamic";

export default async function CardDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id: cardId } = await props.params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      set: {
        include: {
          series: {
            include: {
              franchise: true,
              brand: true
            }
          }
        }
      },
      variants: {
        include: {
          currentPrice: true,
          printing: true,
          parallel: true,
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

  const productIds = new Set<string>();
  for (const v of card.variants) {
    for (const p of v.possibleIn) if (p.pack) for (const c of p.pack.components) if (c.product) productIds.add(c.product.id);
    for (const g of v.guaranteedIn) if (g.product) productIds.add(g.product.id);
  }

  const [cardImages, productImagesMap, ownedVariantIds, vaultedVariantIds, favoritedVariantIds, wishlistedCardIds, relatedCardsRaw] = await Promise.all([
    getImagesForEntity("Card", card.id),
    getImagesForEntities("Product", Array.from(productIds)),
    getOwnedVariantIds(card.variants.map((v) => v.id)),
    getVaultedVariantIds(card.variants.map((v) => v.id)),
    getFavoritedVariantIds(card.variants.map((v) => v.id)),
    getWishlistedCardIds([card.id]),
    prisma.card.findMany({
      where: { setId: card.setId, id: { not: card.id } },
      orderBy: { number: "asc" },
      take: 12,
    }),
  ]);

  const relatedCardImages = await getImagesForEntities("Card", relatedCardsRaw.map((c) => c.id));
  const relatedCards = relatedCardsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    images: relatedCardImages.get(c.id) ?? [],
  }));
  const ownedVariantSet = new Set(ownedVariantIds);
  const vaultedVariantSet = new Set(vaultedVariantIds);
  const favoritedVariantSet = new Set(favoritedVariantIds);

  const cardWithImages = {
    ...card,
    images: cardImages,
    isWishlisted: wishlistedCardIds.includes(card.id),
    variants: card.variants.map((v) => ({
      ...v,
      owned: ownedVariantSet.has(v.id),
      vaulted: vaultedVariantSet.has(v.id),
      favorited: favoritedVariantSet.has(v.id),
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

  return <CardClientExperience card={cardWithImages} topVariantId={topVariant?.id || card.variants[0]?.id} relatedCards={relatedCards} />;
}
