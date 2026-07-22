"use server";

import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";

/** Real export of everything this user owns — used by the Settings "Download my data" action. */
export async function exportUserData() {
  const currentUser = await requireUserForAction();

  const [user, instances, wishlist, projects, migrationSessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUser.id } }),
    prisma.instance.findMany({
      where: { userId: currentUser.id },
      include: {
        variant: { include: { card: { select: { id: true, name: true, number: true } } } },
        certification: true,
        location: true,
      },
    }),
    prisma.wishlist.findMany({
      where: { userId: currentUser.id },
      include: { card: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { userId: currentUser.id },
      include: { targets: true },
    }),
    prisma.migrationSession.findMany({ where: { userId: currentUser.id } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: user ? { name: user.name, email: user.email } : null,
    instances: instances.map((i) => ({
      id: i.id,
      cardName: i.variant.card.name,
      cardNumber: i.variant.card.number,
      condition: i.condition,
      isGraded: i.isGraded,
      certification: i.certification ? { company: i.certification.company, grade: i.certification.grade } : null,
      purchasePrice: i.purchasePrice,
      purchaseDate: i.purchaseDate,
      isVaulted: i.isVaulted,
      isFavorite: i.isFavorite,
      location: i.location?.name ?? null,
      notes: i.notes,
    })),
    wishlist: wishlist.map((w) => ({ cardName: w.card?.name ?? null, priority: w.priority, priceAlert: w.priceAlert, addedAt: w.addedAt })),
    projects: projects.map((p) => ({
      name: p.name,
      status: p.status,
      targetCount: p.targets.length,
      metCount: p.targets.filter((t) => t.isMet).length,
    })),
    migrationSessions: migrationSessions.map((m) => ({
      sourceAdapter: m.sourceAdapter,
      status: m.status,
      totalRows: m.totalRows,
      matchedRows: m.matchedRows,
      createdAt: m.createdAt,
    })),
  };
}
