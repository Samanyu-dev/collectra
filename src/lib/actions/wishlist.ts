"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUserForAction } from "@/lib/auth/session";

export async function toggleWishlist(cardId: string, priceAlert?: number) {
  const user = await requireUserForAction();
  return toggleWishlistForUser(user.id, cardId, priceAlert);
}

/**
 * userId-parameterized core, shared by the web Server Action above and the
 * `/api/v1` route handlers — see collection.ts's incrementVariantQuantityForUser
 * doc comment for why this split exists. Returns the resulting wishlisted
 * state so API callers don't need a second round-trip to know the outcome.
 */
export async function toggleWishlistForUser(userId: string, cardId: string, priceAlert?: number): Promise<{ wishlisted: boolean }> {
  const existing = await prisma.wishlist.findFirst({ where: { userId, cardId } });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    await prisma.event.create({
      data: { userId, type: "WISHLIST_REMOVED", metadata: JSON.stringify({ cardId }) },
    });
  } else {
    await prisma.wishlist.create({
      data: { userId, cardId, priceAlert, priority: "medium" },
    });
    await prisma.event.create({
      data: { userId, type: "WISHLIST_ADDED", metadata: JSON.stringify({ cardId }) },
    });
  }

  revalidatePath("/wishlist");
  return { wishlisted: !existing };
}

// Read-only lookup backs public card/collection pages that are browsable while
// signed out — returns "nothing wishlisted" for an anonymous visitor, matching
// getOwnedVariantIds/getVaultedVariantIds in actions/collection.ts.
export async function getWishlistedCardIds(cardIds: string[]): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getWishlistedCardIdsForUser(user.id, cardIds);
}

/** userId-parameterized core — see toggleWishlistForUser's doc comment. */
export async function getWishlistedCardIdsForUser(userId: string, cardIds: string[]): Promise<string[]> {
  if (cardIds.length === 0) return [];
  const entries = await prisma.wishlist.findMany({
    where: { userId, cardId: { in: cardIds } },
    select: { cardId: true },
  });
  return entries.flatMap((e) => (e.cardId ? [e.cardId] : []));
}
