import { prisma } from "@/lib/prisma";
import { getOwnedTopValuable } from "@/lib/intelligence/market/catalog-widgets";
import { getPortfolioHistory, getPortfolioChangeToday } from "@/lib/intelligence/feed/portfolio-history";
import { groupEvents } from "@/lib/intelligence/feed/activity";
import { requireApiUser } from "@/lib/auth/api";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dashboard — a deliberately lean mobile subset of the web
 * dashboard (src/lib/intelligence/feed/dashboard-data.ts's `getDashboardData`),
 * not that full payload. That function also computes metrics/insights/
 * franchiseBreakdown/collectionGaps/setValueBreakdown/mostVolatile, none of
 * which the iOS Home tab renders yet — calling it wholesale here would mean
 * extra queries (and recalculateUserMetrics/generateInsights side effects)
 * for data nothing uses. Reuses the same building blocks that function does
 * (getOwnedTopValuable, getPortfolioHistory/getPortfolioChangeToday,
 * groupEvents) rather than re-deriving any of them.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    const [instances, rawEvents, wishlistCount] = await Promise.all([
      prisma.instance.findMany({
        where: { userId: user.id },
        select: { variantId: true, purchaseDate: true, purchasePrice: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: "desc" },
        take: 40,
        include: { instance: { include: { variant: { include: { card: { include: { set: true } } } } } } },
      }),
      prisma.wishlist.count({ where: { userId: user.id } }),
    ]);

    const recentActivity = groupEvents(rawEvents).slice(0, 5);

    if (instances.length === 0) {
      return apiSuccess({
        portfolioValueUsd: 0,
        changeToday: null,
        topOwnedValuable: [],
        recentActivity,
        wishlistCount,
      });
    }

    const ownedVariantIds = [...new Set(instances.map((i) => i.variantId))];
    const [topOwnedValuable, portfolioHistory] = await Promise.all([
      getOwnedTopValuable(ownedVariantIds, 5),
      getPortfolioHistory(instances),
    ]);
    const changeToday = getPortfolioChangeToday(portfolioHistory);

    return apiSuccess({
      portfolioValueUsd: portfolioHistory[portfolioHistory.length - 1]?.value ?? 0,
      changeToday,
      topOwnedValuable,
      recentActivity,
      wishlistCount,
    });
  });
}
