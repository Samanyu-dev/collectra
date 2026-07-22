import { prisma } from "@/lib/prisma";
import { recalculateUserMetrics } from "../metrics/calculate";
import { generateInsights } from "../insights/generator";

export async function getIntelligenceFeed(userId: string) {
  // Ensure metrics/insights are current, computed synchronously here rather
  // than via a background job for now.
  const metrics = await recalculateUserMetrics(userId);
  await generateInsights(userId);

  const insights = await prisma.insight.findMany({
    where: { userId, status: "NEW", dismissedAt: null },
    orderBy: { score: "desc" },
    take: 5,
  });

  return { metrics, insights };
}
