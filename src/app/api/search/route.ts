import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "../../../lib/media/resolve";

const contains = (term: string) => ({ contains: term, mode: "insensitive" as const });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ sets: [], cards: [], products: [] });
  }

  try {
    const terms = query.trim().split(/\s+/).filter(Boolean);

    const [sets, cards, products] = await Promise.all([
      prisma.set.findMany({
        where: { name: { contains: query } },
        take: 5,
        include: {
          series: {
            include: { franchise: true, brand: true }
          }
        },
      }),
      prisma.card.findMany({
        where: terms.length
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
                  { set: { competition: { is: { name: contains(term) } } } },
                  { set: { season: { is: { label: contains(term) } } } },
                  { teams: { some: { name: contains(term) } } },
                  { persons: { some: { name: contains(term) } } },
                  { variants: { some: { insert: { is: { name: contains(term) } } } } },
                  { variants: { some: { parallel: { is: { name: contains(term) } } } } },
                ],
              })),
            }
          : {},
        take: 10,
        include: {
          set: {
            include: {
              competition: true,
              season: true,
              series: {
                include: { franchise: true, brand: { include: { manufacturer: true } } }
              }
            }
          },
          teams: true,
          persons: true,
          variants: { include: { insert: true, parallel: true, currentPrice: true } },
        },
      }),
      prisma.product.findMany({
        where: { name: { contains: query } },
        take: 5,
        include: { currentPrice: true },
      }),
    ]);

    const [imagesByCard, imagesByProduct] = await Promise.all([
      getImagesForEntities("Card", cards.map((c) => c.id)),
      getImagesForEntities("Product", products.map((p) => p.id)),
    ]);
    const cardsWithImages = cards.map((c) => ({ ...c, images: imagesByCard.get(c.id) ?? [] }));
    const productsWithImages = products.map((p) => ({ ...p, images: imagesByProduct.get(p.id) ?? [] }));

    return NextResponse.json({ sets, cards: cardsWithImages, products: productsWithImages });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
