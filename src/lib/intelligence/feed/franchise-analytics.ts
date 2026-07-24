import { prisma } from "@/lib/prisma";
import { getPortfolioHistory, type PortfolioHistoryPoint } from "./portfolio-history";
import { getCatalogTotals } from "../market/catalog-widgets";

export interface FranchiseAnalytics {
  franchiseName: string;
  ownedUniqueCount: number;
  totalCount: number | null;
  completionPercent: number | null;
  marketValue: number;
  averageCardPrice: number | null;
  duplicateCount: number;
  missingCount: number | null;
  growthHistory: PortfolioHistoryPoint[];
}

/**
 * Per-franchise drill-down for a logged-in user — the "Collection Analytics"
 * header on /collections?franchise=X. A single franchise-scoped Instance
 * query (separate from the main dashboard's consolidated fetch — this is a
 * different page, loaded independently), reusing getPortfolioHistory
 * (Phase 2) with a filtered input rather than any new pricing logic.
 */
export async function getFranchiseAnalytics(userId: string, franchiseId: string): Promise<FranchiseAnalytics> {
  const [franchise, { franchiseTotals }, instances] = await Promise.all([
    prisma.franchise.findUnique({ where: { id: franchiseId } }),
    getCatalogTotals(),
    prisma.instance.findMany({
      where: { userId, variant: { card: { set: { series: { franchiseId } } } } },
      include: { variant: { include: { card: true, currentPrice: true } } },
    }),
  ]);

  const totalCount = franchiseTotals[franchiseId] ?? null;
  const uniqueCardIds = new Set(instances.map((i) => i.variant.card.id));

  const variantCounts = new Map<string, number>();
  for (const i of instances) variantCounts.set(i.variantId, (variantCounts.get(i.variantId) ?? 0) + 1);
  const duplicateCount = [...variantCounts.values()].filter((c) => c > 1).reduce((sum, c) => sum + (c - 1), 0);

  let marketValue = 0;
  let pricedCount = 0;
  for (const i of instances) {
    const price = i.variant.currentPrice?.marketPriceUsd;
    if (price != null) {
      marketValue += price;
      pricedCount++;
    }
  }

  const growthHistory = await getPortfolioHistory(
    instances.map((i) => ({ variantId: i.variantId, purchaseDate: i.purchaseDate, purchasePrice: i.purchasePrice }))
  );

  return {
    franchiseName: franchise?.name ?? "",
    ownedUniqueCount: uniqueCardIds.size,
    totalCount,
    completionPercent: totalCount ? (uniqueCardIds.size / totalCount) * 100 : null,
    marketValue,
    averageCardPrice: pricedCount > 0 ? marketValue / pricedCount : null,
    duplicateCount,
    missingCount: totalCount != null ? totalCount - uniqueCardIds.size : null,
    growthHistory,
  };
}
