import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities, getImagesForEntity } from "@/lib/media/resolve";
import { getCurrentUser } from "@/lib/auth/session";
import { getSellerTrustFacts } from "@/lib/marketplace/queries";
import { toPriceDisplay } from "@/lib/pricing/display";
import { ListingDetailClient } from "./listing-detail-client";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true, username: true } },
      instance: { include: { variant: { include: { card: { include: { set: true } }, currentPrice: true } } } },
      inquiries: currentUser ? { where: { buyerId: currentUser.id } } : false,
    },
  });
  if (!listing) notFound();

  const [listingPhotos, cardFallback, trustFacts] = await Promise.all([
    getImagesForEntity("Listing", listing.id),
    getImagesForEntities("Card", [listing.instance.variant.card.id]),
    getSellerTrustFacts(listing.sellerId),
  ]);

  const photos = listingPhotos.length > 0 ? listingPhotos : cardFallback.get(listing.instance.variant.card.id) ?? [];

  return (
    <ListingDetailClient
      listing={{
        id: listing.id,
        status: listing.status,
        cardName: listing.instance.variant.card.name,
        cardNumber: listing.instance.variant.card.number,
        setName: listing.instance.variant.card.set.name,
        condition: listing.conditionSnapshot,
        grade: listing.gradeSnapshot,
        description: listing.description,
        price: listing.price,
        currency: listing.currency,
        shipsTo: listing.shipsTo,
        photos: photos.map((p) => p.url),
        seller: listing.seller,
        isOwnListing: currentUser?.id === listing.sellerId,
        isSignedIn: !!currentUser,
        priceAnchor: toPriceDisplay(listing.instance.variant.currentPrice),
        myInquiry: listing.inquiries?.[0] ? { message: listing.inquiries[0].message, reply: listing.inquiries[0].reply } : null,
      }}
      trustFacts={trustFacts}
    />
  );
}
