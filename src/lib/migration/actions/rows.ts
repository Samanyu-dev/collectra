"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/session";

// A MigrationRow has no userId of its own — ownership is via its parent
// MigrationSession, so every mutation here must join through the session and
// verify it belongs to the caller before touching the row.
async function requireOwnedRow(rowId: string) {
  const user = await requireUserForAction();
  const row = await prisma.migrationRow.findUnique({
    where: { id: rowId },
    include: { session: { select: { userId: true } } },
  });
  if (!row || row.session.userId !== user.id) {
    throw new Error("Unauthorized or row not found");
  }
  return row;
}

export async function resolveMigrationRow(rowId: string, variantId: string) {
  const owned = await requireOwnedRow(rowId);
  const row = await prisma.migrationRow.update({
    where: { id: owned.id },
    data: { resolvedVariantId: variantId, status: "STAGED_MATCH" },
  });
  revalidatePath(`/migration/${row.sessionId}/review`);
}

export async function ignoreMigrationRow(rowId: string) {
  const owned = await requireOwnedRow(rowId);
  const row = await prisma.migrationRow.update({
    where: { id: owned.id },
    data: { status: "IGNORED" },
  });
  revalidatePath(`/migration/${row.sessionId}/review`);
}
