import { prisma } from "@/lib/prisma";

export interface SellerTrustFacts {
  memberSince: Date;
  collectionSize: number;
  verifiedScans: number;
  completedSales: number;
  /** null means "not enough data yet" — never a fabricated rate (ADR 005 §5). */
  responseRate: number | null;
}

/**
 * Objective, hard-to-fake facts about a seller (ADR 005 §5) — deliberately
 * never a computed reputation score. Every field here is either an existing
 * column or a trivial count; nothing invented to "feel like" trust.
 */
export async function getSellerTrustFacts(userId: string): Promise<SellerTrustFacts> {
  const [user, collectionSize, verifiedScans, completedSales, inquiries] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } }),
    prisma.instance.count({ where: { userId } }),
    prisma.instance.count({ where: { userId, scanMediaId: { not: null } } }),
    prisma.listing.count({ where: { sellerId: userId, status: "SOLD" } }),
    prisma.listingInquiry.findMany({
      where: { listing: { sellerId: userId } },
      select: { respondedAt: true },
    }),
  ]);

  const responseRate = inquiries.length === 0 ? null : inquiries.filter((i) => i.respondedAt != null).length / inquiries.length;

  return {
    memberSince: user.createdAt,
    collectionSize,
    verifiedScans,
    completedSales,
    responseRate,
  };
}

export type ListingSummary = Awaited<ReturnType<typeof getMyListings>>[number];

/** A seller's own listings across every lifecycle state — the "My Listings" dashboard. */
export async function getMyListings(userId: string) {
  const listings = await prisma.listing.findMany({
    where: { sellerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      instance: { include: { variant: { include: { card: { include: { set: true } } } } } },
      inquiries: { select: { id: true, respondedAt: true } },
    },
  });
  return listings.map((l) => ({
    id: l.id,
    status: l.status,
    price: l.price,
    currency: l.currency,
    conditionSnapshot: l.conditionSnapshot,
    cardName: l.instance.variant.card.name,
    cardNumber: l.instance.variant.card.number,
    setName: l.instance.variant.card.set.name,
    createdAt: l.createdAt,
    expiresAt: l.expiresAt,
    pendingInquiries: l.inquiries.filter((i) => i.respondedAt == null).length,
    totalInquiries: l.inquiries.length,
  }));
}
