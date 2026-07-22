import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const LEGACY_USER_ID = "user_1";

/**
 * One-time legacy data migration, run lazily and idempotently on every call to
 * getCurrentUser() — see docs/adr/002-authentication-architecture.md §10.
 *
 * No separate "migration complete" flag: the guard condition (a row with id
 * LEGACY_USER_ID and this user's email still existing) is naturally false
 * forever after the first successful run, so this is a cheap no-op for every
 * account except the one legacy account, and safe to retry if interrupted —
 * nothing commits until the whole reassignment succeeds.
 */
async function migrateLegacyDataIfNeeded(realUserId: string, email: string) {
  const legacy = await prisma.user.findFirst({
    where: { id: LEGACY_USER_ID, email },
  });
  if (!legacy) return;

  await prisma.$transaction([
    prisma.instance.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.event.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.location.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.project.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.migrationSession.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.wishlist.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.insight.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.media.updateMany({ where: { uploadedByUserId: LEGACY_USER_ID }, data: { uploadedByUserId: realUserId } }),
    prisma.contribution.updateMany({ where: { submittedByUserId: LEGACY_USER_ID }, data: { submittedByUserId: realUserId } }),
    prisma.contribution.updateMany({ where: { reviewedByUserId: LEGACY_USER_ID }, data: { reviewedByUserId: realUserId } }),
    // UserMetrics is 1:1 on userId (@unique) — the real user may already have an
    // (empty) row created by other code paths before migration runs, so delete
    // any pre-existing empty one first rather than colliding on the unique constraint.
    prisma.userMetrics.deleteMany({ where: { userId: realUserId } }),
    prisma.userMetrics.updateMany({ where: { userId: LEGACY_USER_ID }, data: { userId: realUserId } }),
    prisma.user.delete({ where: { id: LEGACY_USER_ID } }),
  ]);
}

/**
 * The current authenticated user's app-domain profile row, or null if not
 * signed in. This is the single source of truth every Server Action and
 * server data-fetch should scope queries to — see docs/adr/002 §4.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) return null;

  await migrateLegacyDataIfNeeded(authUser.id, authUser.email);

  // The handle_new_user trigger creates this row atomically at signup; if it's
  // somehow missing (trigger not yet applied to an existing auth user, e.g. a
  // manually-created test account), create it here rather than erroring.
  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: { id: authUser.id, email: authUser.email },
  });

  return user;
}

/** For Server Components/pages: redirects to /login if not authenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For Server Actions: throws rather than redirecting — the caller decides how to surface it. */
export async function requireUserForAction(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
