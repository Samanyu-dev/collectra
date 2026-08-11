"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUserForAction } from "@/lib/auth/session";
import { assertCanAddToSet, checkRejectedScanAbuse } from "@/lib/billing/entitlements";

type CollectionMutationContext = {
  setId?: string;
  cardId?: string;
  path?: string;
};

function revalidateCollectionViews(context?: CollectionMutationContext) {
  revalidatePath("/shelf");
  revalidatePath("/statistics");
  revalidatePath("/wishlist");
  revalidatePath("/marketplace/new");
  if (context?.setId) revalidatePath(`/collections/${context.setId}`);
  if (context?.cardId) revalidatePath(`/cards/${context.cardId}`);
  if (context?.path) revalidatePath(context.path);
}

export async function incrementVariantQuantity(variantId: string, context?: CollectionMutationContext) {
  const user = await requireUserForAction();
  return incrementVariantQuantityForUser(user.id, variantId, context);
}

/**
 * userId-parameterized core, shared by the web Server Action above and the
 * `/api/v1` route handlers (which resolve userId from a Bearer token, not a
 * cookie session, so they can't call requireUserForAction() themselves) —
 * same Prisma/event logic either way, just given an already-authenticated
 * caller instead of deriving one from cookies.
 */
export async function incrementVariantQuantityForUser(userId: string, variantId: string, context?: CollectionMutationContext) {
  // Derived from the variant itself, not context.setId — that field is a
  // caller-supplied cache-revalidation hint (sometimes omitted), not
  // authoritative enough to gate the free-tier set limit on.
  const variant = await prisma.variant.findUniqueOrThrow({ where: { id: variantId }, select: { card: { select: { setId: true } } } });
  await assertCanAddToSet(userId, variant.card.setId);

  const instance = await prisma.instance.create({
    data: { userId, variantId, condition: "near-mint" },
  });
  await prisma.event.create({
    data: { userId, instanceId: instance.id, type: "CARD_ADDED", metadata: JSON.stringify({ variantId }) },
  });
  await checkRejectedScanAbuse(userId, variantId);

  revalidateCollectionViews(context);
  return { quantity: await countOwnedVariant(userId, variantId) };
}

export async function decrementVariantQuantity(variantId: string, context?: CollectionMutationContext) {
  const user = await requireUserForAction();
  return decrementVariantQuantityForUser(user.id, variantId, context);
}

/** userId-parameterized core — see incrementVariantQuantityForUser's doc comment. */
export async function decrementVariantQuantityForUser(userId: string, variantId: string, context?: CollectionMutationContext) {
  const removable = await prisma.instance.findFirst({
    where: {
      userId,
      variantId,
      listings: { none: { status: { in: ["ACTIVE", "RESERVED"] } } },
    },
    orderBy: [{ isFavorite: "asc" }, { isVaulted: "asc" }, { createdAt: "desc" }],
  });

  if (!removable) {
    const anyOwned = await prisma.instance.findFirst({ where: { userId, variantId } });
    if (!anyOwned) return { quantity: 0 };
    throw new Error("Withdraw or finish the active listing before removing this copy.");
  }

  await prisma.instance.delete({ where: { id: removable.id } });
  await prisma.event.create({
    data: { userId, type: "CARD_REMOVED", metadata: JSON.stringify({ variantId }) },
  });

  revalidateCollectionViews(context);
  return { quantity: await countOwnedVariant(userId, variantId) };
}

async function countOwnedVariant(userId: string, variantId: string) {
  return prisma.instance.count({ where: { userId, variantId } });
}

export async function toggleCardOwned(variantId: string, setId: string) {
  const user = await requireUserForAction();

  const existing = await prisma.instance.findFirst({
    where: { userId: user.id, variantId },
    select: { id: true },
  });

  if (existing) {
    return decrementVariantQuantity(variantId, { setId });
  }

  return incrementVariantQuantity(variantId, { setId });
}

// Read-only ownership lookups back public catalog pages (cards, collections,
// explore) that are browsable while signed out — they return "nothing owned"
// for an anonymous visitor rather than requiring auth, unlike the mutations below.

export async function getOwnedVariantIds(variantIds: string[]): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getOwnedVariantIdsForUser(user.id, variantIds);
}

// userId-parameterized cores — reused by /api/v1 routes (Bearer-token
// authenticated, no cookie session for getCurrentUser() to read), see
// incrementVariantQuantityForUser's doc comment above for why this split
// exists across the file.

export async function getOwnedVariantIdsForUser(userId: string, variantIds: string[]): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const instances = await prisma.instance.findMany({
    where: { userId, variantId: { in: variantIds } },
    select: { variantId: true },
  });
  return instances.map((i) => i.variantId);
}

export async function getOwnedVariantQuantities(variantIds: string[]): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!user) return {};
  return getOwnedVariantQuantitiesForUser(user.id, variantIds);
}

export async function getOwnedVariantQuantitiesForUser(userId: string, variantIds: string[]): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};
  const instances = await prisma.instance.findMany({
    where: { userId, variantId: { in: variantIds } },
    select: { variantId: true },
  });
  return instances.reduce<Record<string, number>>((acc, instance) => {
    acc[instance.variantId] = (acc[instance.variantId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getVaultedVariantIds(variantIds: string[]): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getVaultedVariantIdsForUser(user.id, variantIds);
}

export async function getVaultedVariantIdsForUser(userId: string, variantIds: string[]): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const instances = await prisma.instance.findMany({
    where: { userId, variantId: { in: variantIds }, isVaulted: true },
    select: { variantId: true },
  });
  return instances.map((i) => i.variantId);
}

export async function getFavoritedVariantIds(variantIds: string[]): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getFavoritedVariantIdsForUser(user.id, variantIds);
}

export async function getFavoritedVariantIdsForUser(userId: string, variantIds: string[]): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const instances = await prisma.instance.findMany({
    where: { userId, variantId: { in: variantIds }, isFavorite: true },
    select: { variantId: true },
  });
  return instances.map((i) => i.variantId);
}

/**
 * One representative owned Instance id per variant — needed by API callers
 * (Phase 5 iOS Card Detail) that must POST to
 * `/api/v1/instances/[instanceId]/{favorite,vault}` but only know a
 * variantId. `toggleFavoriteForUser`/`toggleVaultedForUser` resolve back to
 * `variantId` from whatever instanceId they're given (see their own doc
 * comments) and then operate on `prisma.instance.findFirst({ userId,
 * variantId })` regardless of which specific instanceId was passed — so any
 * owned instance id for that variant behaves identically. This just needs to
 * return one, not "the" canonical one.
 */
export async function getPrimaryOwnedInstanceIdsForUser(userId: string, variantIds: string[]): Promise<Record<string, string>> {
  if (variantIds.length === 0) return {};
  const instances = await prisma.instance.findMany({
    where: { userId, variantId: { in: variantIds } },
    select: { id: true, variantId: true },
    orderBy: { createdAt: "desc" },
  });
  const result: Record<string, string> = {};
  for (const instance of instances) {
    if (!result[instance.variantId]) result[instance.variantId] = instance.id;
  }
  return result;
}

export async function toggleFavorite(variantId: string) {
  const user = await requireUserForAction();
  return toggleFavoriteForUser(user.id, variantId);
}

/** userId-parameterized core — see incrementVariantQuantityForUser's doc comment. */
export async function toggleFavoriteForUser(userId: string, variantId: string) {
  const existing = await prisma.instance.findFirst({ where: { userId, variantId } });
  if (!existing) return null; // must own it first
  const updated = await prisma.instance.update({ where: { id: existing.id }, data: { isFavorite: !existing.isFavorite } });
  await prisma.event.create({
    data: { userId, instanceId: existing.id, type: existing.isFavorite ? "UNFAVORITED" : "FAVORITED" },
  });
  revalidatePath("/vault");
  revalidatePath("/shelf");
  return updated;
}

export async function toggleVaulted(variantId: string) {
  const user = await requireUserForAction();
  return toggleVaultedForUser(user.id, variantId);
}

/** userId-parameterized core — see incrementVariantQuantityForUser's doc comment. */
export async function toggleVaultedForUser(userId: string, variantId: string) {
  const existing = await prisma.instance.findFirst({ where: { userId, variantId } });
  if (!existing) return null; // must own it first
  const updated = await prisma.instance.update({ where: { id: existing.id }, data: { isVaulted: !existing.isVaulted } });
  await prisma.event.create({
    data: { userId, instanceId: existing.id, type: existing.isVaulted ? "UNVAULTED" : "VAULTED" },
  });
  revalidatePath("/vault");
  return updated;
}

// The number actually stamped on a specific physical copy (e.g. "63" on a
// card printed /99) — distinct from Variant.serialTo, the catalog-level
// print-run size. See Instance.serialNumber's doc comment in schema.prisma.
export async function updateInstanceSerialNumber(instanceId: string, serialNumber: string, context?: CollectionMutationContext) {
  const user = await requireUserForAction();
  const existing = await prisma.instance.findFirst({ where: { id: instanceId, userId: user.id } });
  if (!existing) throw new Error("Copy not found in your collection.");

  const trimmed = serialNumber.trim();
  await prisma.instance.update({
    where: { id: existing.id },
    data: { serialNumber: trimmed || null },
  });

  revalidateCollectionViews(context);
}
