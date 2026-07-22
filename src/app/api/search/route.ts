import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "../../../lib/media/resolve";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ sets: [], cards: [] });
  }

  try {
    const [sets, cards, products] = await Promise.all([
      prisma.set.findMany({
        where: { name: { contains: query } },
        take: 5,
        include: {
          series: {
            include: { franchise: true }
          }
        },
      }),
      prisma.card.findMany({
        where: { name: { contains: query } },
        take: 10,
        include: {
          set: {
            include: {
              series: {
                include: { franchise: true }
              }
            }
          }
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
