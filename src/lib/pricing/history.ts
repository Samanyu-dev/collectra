import { prisma } from "@/lib/prisma";

export interface PriceHistoryPoint {
  date: string; // ISO date string
  priceUsd: number;
  source: string;
  kind: "LISTING" | "SOLD";
}

export interface PriceHistoryResult {
  points: PriceHistoryPoint[];
  trend: "up" | "down" | "flat";
  trendPercent: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  averagePrice: number | null;
  lastUpdated: Date | null;
  observationCount: number;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

/**
 * Fetch price observation history for a variant, filtered by time range.
 * Returns raw time-series data plus derived stats — the client chart component
 * decides how to render it. Never fabricates values; returns empty arrays
 * when no data exists.
 */
export async function getPriceHistory(
  variantId: string,
  range: TimeRange = "90d"
): Promise<PriceHistoryResult> {
  const cutoff = range === "all" ? undefined : new Date(Date.now() - RANGE_MS[range]);

  const observations = await prisma.priceObservation.findMany({
    where: {
      variantId,
      isOutlier: false,
      ...(cutoff ? { observedAt: { gte: cutoff } } : {}),
    },
    orderBy: { observedAt: "asc" },
    include: { source: { select: { name: true, identifier: true } } },
  });

  if (observations.length === 0) {
    return {
      points: [],
      trend: "flat",
      trendPercent: null,
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
      lastUpdated: null,
      observationCount: 0,
    };
  }

  const points: PriceHistoryPoint[] = observations.map((o) => ({
    date: o.observedAt.toISOString(),
    priceUsd: o.priceUsd,
    source: o.source.name ?? o.source.identifier ?? "Unknown",
    kind: o.kind as "LISTING" | "SOLD",
  }));

  const prices = observations.map((o) => o.priceUsd);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const lastUpdated = observations[observations.length - 1]?.observedAt ?? null;

  // Trend: compare first vs last observation in the window
  const firstPrice = observations[0].priceUsd;
  const lastPrice = observations[observations.length - 1].priceUsd;
  const rawPercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  let trend: PriceHistoryResult["trend"] = "flat";
  if (rawPercent > 1) trend = "up";
  else if (rawPercent < -1) trend = "down";

  return {
    points,
    trend,
    trendPercent: firstPrice > 0 ? rawPercent : null,
    lowestPrice,
    highestPrice,
    averagePrice,
    lastUpdated,
    observationCount: observations.length,
  };
}

/**
 * Fetch price history for multiple variants at once (for the card detail page
 * where we need data for the active variant). Returns a map keyed by variantId.
 *
 * One query per variant via Promise.all — fine for a handful of variants on
 * one card's detail page. Do NOT use this for a whole grid's worth of
 * variants (hundreds); that fans out into hundreds of concurrent queries
 * against a pooled connection. Use getSparklinesForVariants below instead.
 */
export async function getPriceHistoryForVariants(
  variantIds: string[],
  range: TimeRange = "90d"
): Promise<Map<string, PriceHistoryResult>> {
  const results = new Map<string, PriceHistoryResult>();
  await Promise.all(
    variantIds.map(async (id) => {
      results.set(id, await getPriceHistory(id, range));
    })
  );
  return results;
}

/**
 * Lightweight sparkline source for a card-grid page — one query for every
 * variant in view, not one per variant. Real catalog-wide coverage is thin
 * (a handful of observations per variant on average), so this returns
 * whatever raw points exist, downsampled, rather than requiring a minimum
 * history depth; callers should still guard on `points.length < 2`.
 */
export async function getSparklinesForVariants(variantIds: string[], maxPoints = 10): Promise<Record<string, number[]>> {
  if (variantIds.length === 0) return {};

  const observations = await prisma.priceObservation.findMany({
    where: { variantId: { in: variantIds }, isOutlier: false },
    orderBy: { observedAt: "asc" },
    select: { variantId: true, priceUsd: true },
  });

  const byVariant = new Map<string, number[]>();
  for (const obs of observations) {
    if (!obs.variantId) continue;
    const arr = byVariant.get(obs.variantId) ?? [];
    arr.push(obs.priceUsd);
    byVariant.set(obs.variantId, arr);
  }

  const result: Record<string, number[]> = {};
  for (const [variantId, prices] of byVariant) {
    if (prices.length < 2) continue;
    result[variantId] = prices.length <= maxPoints ? prices : downsample(prices, maxPoints);
  }
  return result;
}

function downsample(points: number[], maxPoints: number): number[] {
  const step = (points.length - 1) / (maxPoints - 1);
  const sampled: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(points[Math.round(i * step)]);
  }
  return sampled;
}