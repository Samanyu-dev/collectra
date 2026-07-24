import { prisma } from "@/lib/prisma";
import { computeHealthFactors, healthScoreFromFactors, type HealthFactors } from "./health-factors";
import type { WishlistPriceRow } from "../wishlist-price";

type MetricsInstance = {
  variantId: string;
  purchasePrice: number | null;
  variant: { card: { id: string }; currentPrice: { marketPriceUsd: number | null } | null };
};

/**
 * Level 1: Deterministic Metrics Calculation
 * Runs purely on facts (events, instances, real market listings) and updates
 * the UserMetrics cache. No fabricated numbers — anything we can't compute
 * from real data is left at a neutral default (0), not a guessed constant.
 *
 * Takes the caller's already-fetched instances (dashboard-data.ts is the one
 * shared fetch — see ADR-style note there) instead of re-querying; this used
 * to run its own prisma.instance.findMany, which was one of three
 * near-identical full-collection queries fired per dashboard load.
 */
export async function recalculateUserMetrics(userId: string, instances: MetricsInstance[], wishlist: WishlistPriceRow[] = []) {
  let portfolioValue = 0;
  let costBasis = 0;
  let pricedInstanceCount = 0;
  let unrealizedGain = 0;
  let gainEligibleCostBasis = 0; // cost basis of instances that have both a purchase price and a current market price
  const variantCounts: Record<string, number> = {};

  for (const inst of instances) {
    const marketPrice = inst.variant.currentPrice?.marketPriceUsd ?? null;
    if (marketPrice != null) {
      portfolioValue += marketPrice;
      pricedInstanceCount++;
      if (inst.purchasePrice) {
        unrealizedGain += marketPrice - inst.purchasePrice;
        gainEligibleCostBasis += inst.purchasePrice;
      }
    } else if (inst.purchasePrice) {
      // Fall back to what was actually paid — real, just not current market
      portfolioValue += inst.purchasePrice;
    }
    costBasis += inst.purchasePrice || 0;

    variantCounts[inst.variantId] = (variantCounts[inst.variantId] || 0) + 1;
  }

  // Unrealized gain/loss (ADR §12) — only meaningful, never fabricated, when
  // at least one instance has both a real purchase price and a real current
  // price to compare against.
  const unrealizedGainPercent = gainEligibleCostBasis > 0 ? (unrealizedGain / gainEligibleCostBasis) * 100 : null;

  const duplicateCount = Object.values(variantCounts)
    .filter((c) => c > 1)
    .reduce((sum, c) => sum + (c - 1), 0);

  // Liquidity proxy: fraction of owned instances that have any real market
  // listing at all (a rough, honest stand-in for "trackable/sellable" until
  // real trade-volume data exists).
  const liquidityScore = instances.length > 0 ? pricedInstanceCount / instances.length : 0;

  // Completion score: average completion % across the user's active projects
  // (real ProjectTarget data) — 0 if they have none yet, not a placeholder.
  const activeProjects = await prisma.project.findMany({
    where: { userId, status: "ACTIVE" },
    include: { targets: true },
  });
  const completionScore =
    activeProjects.length > 0
      ? Math.round(
          (activeProjects.reduce((sum, p) => {
            const pct = p.targets.length > 0 ? p.targets.filter((t) => t.isMet).length / p.targets.length : 0;
            return sum + pct;
          }, 0) /
            activeProjects.length) *
            100
        )
      : 0;

  // Health score: the average of 5 real factors (pricing coverage, metadata
  // quality, images, duplicate ratio, wishlist coverage) — see health-factors.ts.
  const healthFactors: HealthFactors = await computeHealthFactors(instances, wishlist);
  const healthScore = healthScoreFromFactors(healthFactors);

  const metrics = await prisma.userMetrics.upsert({
    where: { userId },
    update: { portfolioValue, costBasis, healthScore, duplicateCount, completionScore, liquidityScore, unrealizedGain, unrealizedGainPercent },
    create: { userId, portfolioValue, costBasis, healthScore, duplicateCount, completionScore, liquidityScore, unrealizedGain, unrealizedGainPercent },
  });

  return { metrics, healthFactors };
}
