import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getOwnedVariantQuantities } from "@/lib/actions/collection";
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
  const limit = 60;

  const terms = q.trim().split(/\s+/).filter(Boolean);
  const contains = (term: string) => ({ contains: term, mode: "insensitive" as const });
  const where = terms.length
    ? {
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
      }
    : {};

  const __tBeforeCards = performance.now();
  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { name: "asc" },
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

  const [imagesByCard, ownedVariantIds] = await Promise.all([
    getImagesForEntities("Card", cards.map((c) => c.id)),
    getOwnedVariantQuantities(cards.flatMap((c) => c.variants.map((v) => v.id))),
  ]);
  const __tAfterImages = performance.now();

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
    ownedQuantity: c.variants.reduce((sum, v) => sum + (ownedVariantIds[v.id] ?? 0), 0),
  }));

  const totalPages = Math.ceil(total / limit);

  const __tEnd = performance.now();
  console.log(
    `[PROFILE /cards] searchParams=${(__tBeforeCards - __t0).toFixed(1)}ms ` +
    `cardsQuery=${(__tAfterCards - __tBeforeCards).toFixed(1)}ms ` +
    `imagesAndOwned=${(__tAfterImages - __tAfterCards).toFixed(1)}ms ` +
    `mapping=${(__tEnd - __tAfterImages).toFixed(1)}ms ` +
    `serverComponentTotal=${(__tEnd - __t0).toFixed(1)}ms`
  );

  return <CardsBrowseClient items={items} query={q} page={page} totalPages={totalPages} total={total} />;
}
