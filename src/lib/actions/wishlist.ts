"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUserForAction } from "@/lib/auth/session";

export async function toggleWishlist(cardId: string, priceAlert?: number) {
  const user = await requireUserForAction();
  const existing = await prisma.wishlist.findFirst({ where: { userId: user.id, cardId } });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    await prisma.event.create({
      data: { userId: user.id, type: "WISHLIST_REMOVED", metadata: JSON.stringify({ cardId }) },
    });
  } else {
    await prisma.wishlist.create({
      data: { userId: user.id, cardId, priceAlert, priority: "medium" },
    });
    await prisma.event.create({
      data: { userId: user.id, type: "WISHLIST_ADDED", metadata: JSON.stringify({ cardId }) },
    });
  }

  revalidatePath("/wishlist");
}

// Read-only lookup backs public card/collection pages that are browsable while
// signed out — returns "nothing wishlisted" for an anonymous visitor, matching
// getOwnedVariantIds/getVaultedVariantIds in actions/collection.ts.
export async function getWishlistedCardIds(cardIds: string[]): Promise<string[]> {
  if (cardIds.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) return [];
  const entries = await prisma.wishlist.findMany({
    where: { userId: user.id, cardId: { in: cardIds } },
    select: { cardId: true },
  });
  return entries.flatMap((e) => (e.cardId ? [e.cardId] : []));
}
