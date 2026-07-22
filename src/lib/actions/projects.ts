"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/session";

export async function createSetCompletionProject(setId: string) {
  const user = await requireUserForAction();

  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: { cards: { include: { variants: true } } },
  });
  if (!set) throw new Error("Set not found");

  const existing = await prisma.project.findFirst({
    where: { userId: user.id, targetSetId: setId, type: "SET_COMPLETION" },
  });
  if (existing) return existing.id;

  const ownedVariantIds = new Set(
    (
      await prisma.instance.findMany({
        where: { userId: user.id, variant: { cardId: { in: set.cards.map((c) => c.id) } } },
        select: { variantId: true },
      })
    ).map((i) => i.variantId)
  );

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: `Complete ${set.name}`,
      type: "SET_COMPLETION",
      status: "ACTIVE",
      targetSetId: setId,
      targets: {
        create: set.cards.flatMap((card) =>
          card.variants.map((v) => ({
            variantId: v.id,
            isMet: ownedVariantIds.has(v.id),
          }))
        ),
      },
    },
  });

  revalidatePath("/projects");
  return project.id;
}

export async function deleteProject(projectId: string) {
  const user = await requireUserForAction();
  // Scoped delete — a projectId belonging to another user matches zero rows here,
  // rather than throwing, which is the correct "not yours" behavior for a delete.
  await prisma.project.deleteMany({ where: { id: projectId, userId: user.id } });
  revalidatePath("/projects");
}
