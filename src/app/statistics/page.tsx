import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { getIntelligenceFeed } from "@/lib/intelligence/feed/service";
import { StatisticsClient } from "./statistics-client";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const user = await requireUser();
  const { metrics, insights } = await getIntelligenceFeed(user.id);

  const instances = await prisma.instance.findMany({
    where: { userId: user.id },
    include: {
      variant: {
        include: {
          card: { include: { set: { include: { series: { include: { franchise: true } } } } } },
          currentPrice: true,
        },
      },
    },
  });

  const totalCards = instances.length;
  const uniqueVariants = new Set(instances.map((i) => i.variantId)).size;

  // Real acquisition-value timeline — cumulative sum of (current market price, falling
  // back to purchase price) for every dated instance, ordered by when it was acquired.
  // Only instances with a real purchaseDate can be placed on this timeline; if too few
  // are dated, the client shows an honest empty state instead of a sparse/misleading chart.
  const datedInstances = instances
    .filter((i) => i.purchaseDate != null)
    .sort((a, b) => a.purchaseDate!.getTime() - b.purchaseDate!.getTime());

  let running = 0;
  const portfolioHistory = datedInstances.map((i) => {
    const value = i.variant.currentPrice?.marketPriceUsd ?? i.purchasePrice ?? 0;
    running += value;
    return { date: i.purchaseDate!.toISOString().split('T')[0], value: Math.round(running * 100) / 100 };
  });

  // Taste profile — real breakdown by franchise
  const franchiseCounts = new Map<string, { name: string; count: number }>();
  for (const inst of instances) {
    const franchise = inst.variant.card.set.series.franchise;
    const existing = franchiseCounts.get(franchise.id);
    franchiseCounts.set(franchise.id, { name: franchise.name, count: (existing?.count ?? 0) + 1 });
  }
  const dna = Array.from(franchiseCounts.values())
    .map((f) => ({ ...f, percentage: totalCards > 0 ? Math.round((f.count / totalCards) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <StatisticsClient
      totalCards={totalCards}
      uniqueCards={uniqueVariants}
      portfolioValue={metrics.portfolioValue}
      costBasis={metrics.costBasis}
      healthScore={metrics.healthScore}
      completionScore={metrics.completionScore}
      liquidityScore={metrics.liquidityScore}
      duplicateCount={metrics.duplicateCount}
      dna={dna}
      portfolioHistory={portfolioHistory}
      insights={insights.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        payload: JSON.parse(i.payload),
      }))}
    />
  );
}
