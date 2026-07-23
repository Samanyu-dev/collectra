import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { MarketplaceBrowseClient } from "./marketplace-browse-client";

export const dynamic = "force-dynamic";

export default async function MarketplacePage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const shipsTo = typeof searchParams.shipsTo === "string" ? searchParams.shipsTo : "";
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) || 1 : 1;
  const limit = 24;

  const where = {
    status: "ACTIVE",
    ...(shipsTo ? { shipsTo } : {}),
    ...(q ? { instance: { variant: { card: { name: { contains: q } } } } } : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { instance: { include: { variant: { include: { card: { include: { set: true } } } } } } },
    }),
    prisma.listing.count({ where }),
  ]);

  const imagesByCard = await getImagesForEntities("Listing", listings.map((l) => l.id));
  const cardImages = await getImagesForEntities(
    "Card",
    listings.map((l) => l.instance.variant.card.id)
  );

  const items = listings.map((l) => {
    const listingPhotos = imagesByCard.get(l.id) ?? [];
    const fallback = cardImages.get(l.instance.variant.card.id) ?? [];
    const image = listingPhotos[0] ?? fallback.find((i) => i.type === "OFFICIAL_ARTWORK") ?? fallback[0];
    return {
      id: l.id,
      cardName: l.instance.variant.card.name,
      cardNumber: l.instance.variant.card.number,
      setName: l.instance.variant.card.set.name,
      condition: l.conditionSnapshot,
      grade: l.gradeSnapshot,
      price: l.price,
      currency: l.currency,
      shipsTo: l.shipsTo,
      imageUrl: image?.url ?? null,
    };
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <MarketplaceBrowseClient
      items={items}
      query={q}
      shipsTo={shipsTo}
      page={page}
      totalPages={totalPages}
      total={total}
    />
  );
}
