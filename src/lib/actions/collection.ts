"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUserForAction } from "@/lib/auth/session";

export async function toggleCardOwned(variantId: string, setId: string) {
  const user = await requireUserForAction();

  const existing = await prisma.instance.findFirst({
    where: { userId: user.id, variantId },
  });

  if (existing) {
    await prisma.instance.delete({ where: { id: existing.id } });
    await prisma.event.create({
      data: { userId: user.id, type: "CARD_REMOVED", metadata: JSON.stringify({ variantId }) },
    });
  } else {
    const instance = await prisma.instance.create({
      data: { userId: user.id, variantId, condition: "near-mint" },
    });
    await prisma.event.create({
      data: { userId: user.id, instanceId: instance.id, type: "CARD_ADDED", metadata: JSON.stringify({ variantId }) },
    });
  }

  revalidatePath(`/collections/${setId}`);
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
