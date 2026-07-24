import { prisma } from "@/lib/prisma";
import { recalculateUserMetrics } from "../metrics/calculate";
import { generateInsights } from "../insights/generator";

/**
 * Lightweight metrics+insights entry point for pages that don't need the
 * full dashboard aggregation (statistics page, collection workspace) — see
 * feed/dashboard-data.ts's getDashboardData for the main dashboard's single
 * consolidated fetch, which this intentionally does NOT share (each caller
 * here only needs one instances query for itself, once per page load).
 */
export async function getIntelligenceFeed(userId: string) {
  // Ensure metrics/insights are current, computed synchronously here rather
  // than via a background job for now.
  const [instances, wishlist] = await Promise.all([
    prisma.instance.findMany({
      where: { userId },
      include: { variant: { include: { card: { select: { id: true } }, currentPrice: true } } },
    }),
    prisma.wishlist.findMany({ where: { userId }, include: { variant: { include: { currentPrice: true } }, card: { include: { variants: { include: { currentPrice: true } } } } } }),
  ]);
  const { metrics, healthFactors } = await recalculateUserMetrics(userId, instances, wishlist);
  await generateInsights(userId, instances, wishlist);

  const insights = await prisma.insight.findMany({
    where: { userId, status: "NEW", dismissedAt: null },
    orderBy: { score: "desc" },
    take: 5,
  });

  return { metrics, insights, healthFactors };
}
