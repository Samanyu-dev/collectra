import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { SellingClient } from "./selling-client";

export const dynamic = "force-dynamic";

export default async function SellingPage() {
  const user = await requireUser();

  const listings = await prisma.listing.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      instance: { include: { variant: { include: { card: { include: { set: true } } } } } },
      reservedBy: { select: { name: true, username: true } },
      inquiries: { include: { buyer: { select: { name: true, username: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  const images = await getImagesForEntities("Listing", listings.map((l) => l.id));

  const items = listings.map((l) => ({
    id: l.id,
    status: l.status,
    cardName: l.instance.variant.card.name,
    cardNumber: l.instance.variant.card.number,
    setName: l.instance.variant.card.set.name,
    price: l.price,
    currency: l.currency,
    imageUrl: images.get(l.id)?.[0]?.url ?? null,
    reservedByName: l.reservedBy ? l.reservedBy.name || l.reservedBy.username || "A buyer" : null,
    inquiries: l.inquiries.map((i) => ({
      id: i.id,
      buyerName: i.buyer.name || i.buyer.username || "A buyer",
      message: i.message,
      reply: i.reply,
      respondedAt: i.respondedAt,
    })),
  }));

  return <SellingClient listings={items} />;
}
