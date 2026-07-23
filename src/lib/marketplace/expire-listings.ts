import { prisma } from "@/lib/prisma";

/**
 * ADR 005 §4 — a listing auto-expires after its `expiresAt` date rather than
 * staying ACTIVE forever. Runs via Vercel Cron (see
 * src/app/api/cron/marketplace-expire/route.ts), the same direct
 * cron-route-to-function pattern price-sync actually uses in production —
 * not the SyncJob/worker polling loop, which was never wired into any
 * running process in this deployment (confirmed: `startWorker()` is only
 * called from standalone scripts, not `package.json`, not `next build`, not
 * any Vercel Cron entry).
 */
export async function expireStaleListings(now: Date = new Date()): Promise<{ expiredCount: number }> {
  const expired = await prisma.listing.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: now } },
    select: { id: true, instanceId: true, sellerId: true },
  });
  if (expired.length === 0) return { expiredCount: 0 };

  await prisma.listing.updateMany({
    where: { id: { in: expired.map((l) => l.id) } },
    data: { status: "EXPIRED" },
  });

  await prisma.event.createMany({
    data: expired.map((l) => ({
      userId: l.sellerId,
      instanceId: l.instanceId,
      type: "LISTING_EXPIRED",
      metadata: JSON.stringify({ listingId: l.id }),
    })),
  });

  return { expiredCount: expired.length };
}
