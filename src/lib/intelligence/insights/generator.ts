import { prisma } from "@/lib/prisma";

/**
 * Level 2: Recommendation Generation
 * Applies configured rules against Facts/Metrics to generate Insights.
 * Every estimate here is derived from real CurrentPrice data — if there's
 * no real pricing to work from, the estimate field is simply omitted rather
 * than filled with a guessed constant.
 */
export async function generateInsights(userId: string) {
  // Clear old volatile insights (Optional, could just rely on expiresAt)
  await prisma.insight.deleteMany({
    where: { userId, status: "NEW", sourceEngine: "recommendation-engine-v1" },
  });

  const insights: Array<{
    userId: string;
    type: string;
    category: string;
    severity: string;
    score: number;
    payload: string;
    status: string;
    sourceEngine: string;
  }> = [];

  // Rule 1: Duplicate Selling — if the user has real duplicates, estimate
  // recovery value from the actual market price of those specific variants.
  const instances = await prisma.instance.findMany({
    where: { userId },
    include: { variant: { include: { currentPrice: true } } },
  });
  const byVariant = new Map<string, typeof instances>();
  for (const inst of instances) {
    byVariant.set(inst.variantId, [...(byVariant.get(inst.variantId) ?? []), inst]);
  }
  const duplicateGroups = Array.from(byVariant.values()).filter((group) => group.length > 1);

  if (duplicateGroups.length > 0) {
    const duplicateCount = duplicateGroups.reduce((sum, g) => sum + (g.length - 1), 0);
    const pricedDuplicates = duplicateGroups.filter((g) => g[0].variant.currentPrice?.marketPriceUsd != null);
    const estimatedRecoveryValue =
      pricedDuplicates.length > 0
        ? pricedDuplicates.reduce((sum, g) => {
            const price = g[0].variant.currentPrice!.marketPriceUsd!;
            return sum + price * (g.length - 1);
          }, 0)
        : null;

    insights.push({
      userId,
      type: "SELL_DUPLICATE",
      category: "HEALTH",
      severity: "WARNING",
      score: 85,
      payload: JSON.stringify({
        duplicateCount,
        ...(estimatedRecoveryValue != null ? { estimatedRecoveryValue } : {}),
      }),
      status: "NEW",
      sourceEngine: "recommendation-engine-v1",
    });
  }

  // Rule 2: Project Completion — recommend finishing a project that's close,
  // estimating cost from the real market price of the specific missing variants.
  const activeProjects = await prisma.project.findMany({
    where: { userId, status: "ACTIVE" },
    include: { targets: { include: { variant: { include: { currentPrice: true } } } }, targetSet: true },
  });

  if (activeProjects.length > 0) {
    const proj = activeProjects[0];
    const unmetTargets = proj.targets.filter((t) => !t.isMet);

    if (unmetTargets.length > 0 && unmetTargets.length < 10) {
      const pricedUnmet = unmetTargets.filter((t) => t.variant.currentPrice?.marketPriceUsd != null);
      const estimatedCost =
        pricedUnmet.length > 0
          ? pricedUnmet.reduce((sum, t) => sum + t.variant.currentPrice!.marketPriceUsd!, 0)
          : null;

      insights.push({
        userId,
        type: "SET_COMPLETION",
        category: "PORTFOLIO",
        severity: "INFO",
        score: 95, // High priority if they are close
        payload: JSON.stringify({
          projectId: proj.id,
          projectName: proj.name,
          cardsRemaining: unmetTargets.length,
          ...(estimatedCost != null ? { estimatedCost } : {}),
        }),
        status: "NEW",
        sourceEngine: "recommendation-engine-v1",
      });
    }
  }

  // Insert all generated insights
  if (insights.length > 0) {
    await prisma.insight.createMany({ data: insights });
  }
}
