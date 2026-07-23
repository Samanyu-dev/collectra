"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUserForAction } from "@/lib/auth/session";

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

  const instance = await prisma.instance.create({
    data: { userId: user.id, variantId, condition: "near-mint" },
  });
  await prisma.event.create({
    data: { userId: user.id, instanceId: instance.id, type: "CARD_ADDED", metadata: JSON.stringify({ variantId }) },
  });

  revalidateCollectionViews(context);
  return { quantity: await countOwnedVariant(user.id, variantId) };
}

export async function decrementVariantQuantity(variantId: string, context?: CollectionMutationContext) {
  const user = await requireUserForAction();

  const removable = await prisma.instance.findFirst({
    where: {
      userId: user.id,
      variantId,
      listings: { none: { status: { in: ["ACTIVE", "RESERVED"] } } },
    },
    orderBy: [{ isFavorite: "asc" }, { isVaulted: "asc" }, { createdAt: "desc" }],
  });

  if (!removable) {
    const anyOwned = await prisma.instance.findFirst({ where: { userId: user.id, variantId } });
    if (!anyOwned) return { quantity: 0 };
    throw new Error("Withdraw or finish the active listing before removing this copy.");
  }

  await prisma.instance.delete({ where: { id: removable.id } });
  await prisma.event.create({
    data: { userId: user.id, type: "CARD_REMOVED", metadata: JSON.stringify({ variantId }) },
  });

  revalidateCollectionViews(context);
  return { quantity: await countOwnedVariant(user.id, variantId) };
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
  if (variantIds.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) return [];
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, variantId: { in: variantIds } },
    select: { variantId: true },
  });
  return instances.map((i) => i.variantId);
}

export async function getOwnedVariantQuantities(variantIds: string[]): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};
  const user = await getCurrentUser();
  if (!user) return {};
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, variantId: { in: variantIds } },
    select: { variantId: true },
  });
  return instances.reduce<Record<string, number>>((acc, instance) => {
    acc[instance.variantId] = (acc[instance.variantId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getVaultedVariantIds(variantIds: string[]): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) return [];
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, variantId: { in: variantIds }, isVaulted: true },
    select: { variantId: true },
  });
  return instances.map((i) => i.variantId);
}

export async function getFavoritedVariantIds(variantIds: string[]): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const user = await getCurrentUser();
  if (!user) return [];
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, variantId: { in: variantIds }, isFavorite: true },
    select: { variantId: true },
  });
  return instances.map((i) => i.variantId);
}

export async function toggleFavorite(variantId: string) {
  const user = await requireUserForAction();
  const existing = await prisma.instance.findFirst({ where: { userId: user.id, variantId } });
  if (!existing) return; // must own it first
  await prisma.instance.update({ where: { id: existing.id }, data: { isFavorite: !existing.isFavorite } });
  await prisma.event.create({
    data: { userId: user.id, instanceId: existing.id, type: existing.isFavorite ? "UNFAVORITED" : "FAVORITED" },
  });
  revalidatePath("/vault");
  revalidatePath("/shelf");
}

export async function toggleVaulted(variantId: string) {
  const user = await requireUserForAction();
  const existing = await prisma.instance.findFirst({ where: { userId: user.id, variantId } });
  if (!existing) return; // must own it first
  await prisma.instance.update({ where: { id: existing.id }, data: { isVaulted: !existing.isVaulted } });
  await prisma.event.create({
    data: { userId: user.id, instanceId: existing.id, type: existing.isVaulted ? "UNVAULTED" : "VAULTED" },
  });
  revalidatePath("/vault");
}
