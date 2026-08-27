import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { getSubscriptionTier, getSetLimitForTier, getOwnedSetIds, FREE_SCAN_LIMIT_PER_WEEK } from "@/lib/billing/entitlements";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await requireUser();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [user, instanceCount, wishlistCount, activeProjectCount, migrationCount, tier, ownedSetIds, scansUsedThisWeek, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: currentUser.id } }),
    prisma.instance.count({ where: { userId: currentUser.id } }),
    prisma.wishlist.count({ where: { userId: currentUser.id } }),
    prisma.project.count({ where: { userId: currentUser.id, status: "ACTIVE" } }),
    prisma.migrationSession.count({ where: { userId: currentUser.id } }),
    getSubscriptionTier(currentUser),
    getOwnedSetIds(currentUser.id),
    prisma.scanAttempt.count({ where: { userId: currentUser.id, status: "CONFIRMED", createdAt: { gte: sevenDaysAgo } } }),
    prisma.subscription.findUnique({ where: { userId: currentUser.id } }),
  ]);

  return (
    <SettingsClient
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              username: user.username,
              bio: user.bio,
              avatarUrl: user.avatarUrl,
              isPublic: user.isPublic,
              showValuePublicly: user.showValuePublicly,
            }
          : null
      }
      stats={{ instanceCount, wishlistCount, activeProjectCount, migrationCount }}
      billing={{
        tier,
        setsUsed: ownedSetIds.size,
        setLimit: getSetLimitForTier(tier),
        scansUsedThisWeek,
        scanLimitPerWeek: FREE_SCAN_LIMIT_PER_WEEK,
        subscription: subscription
          ? {
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
      }}
    />
  );
}
