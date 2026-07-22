import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getOwnedVariantIds } from "@/lib/actions/collection";
import { toPriceDisplay } from "@/lib/pricing/display";
import { CardsBrowseClient } from "./cards-browse-client";

export const dynamic = "force-dynamic";

export default async function CardsPage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) || 1 : 1;
  const limit = 60;

  const where = q ? { name: { contains: q } } : {};

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        set: { include: { series: { include: { franchise: true } } } },
        variants: { include: { currentPrice: true } },
      },
    }),
    prisma.card.count({ where }),
  ]);

  const [imagesByCard, ownedVariantIds] = await Promise.all([
    getImagesForEntities("Card", cards.map((c) => c.id)),
    getOwnedVariantIds(cards.flatMap((c) => c.variants.map((v) => v.id))),
  ]);
  const ownedVariantSet = new Set(ownedVariantIds);

  const items = cards.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    setName: c.set.name,
    franchiseName: c.set.series.franchise.name,
    images: imagesByCard.get(c.id) ?? [],
    price: toPriceDisplay(
      c.variants
        .filter((v) => v.currentPrice?.marketPriceUsd != null)
        .sort((a, b) => b.currentPrice!.marketPriceUsd! - a.currentPrice!.marketPriceUsd!)[0]?.currentPrice ?? null
    ),
    owned: c.variants.some((v) => ownedVariantSet.has(v.id)),
  }));

  const totalPages = Math.ceil(total / limit);

  return <CardsBrowseClient items={items} query={q} page={page} totalPages={totalPages} total={total} />;
}
