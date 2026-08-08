import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export interface GradedPricePoint {
  date: string; // ISO date string
  priceUsd: number;
}

export interface GradedSeries {
  company: string;
  grade: string;
  label: string; // e.g. "PSA 10"
  points: GradedPricePoint[];
  latestPriceUsd: number | null;
}

export interface GradedPriceHistoryResult {
  companies: string[]; // distinct companies present, for the filter chips — data-driven, never hardcoded
  series: GradedSeries[];
  observationCount: number;
  lastUpdated: Date | null;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const EMPTY: GradedPriceHistoryResult = {
  companies: [],
  series: [],
  observationCount: 0,
  lastUpdated: null,
};

/**
 * Groups a variant's GradedPriceObservation rows into one series per
 * (company, grade) — the data behind the "Graded Price History" chart, whose
 * company filter chips are built from `companies` rather than a hardcoded
 * PSA/BGS/CGC list, so a source that reports TAG/ACE/ARS/AGS grades (all
 * already present in getcollectr's own grading-scales table) renders exactly
 * the same way with zero code changes.
 *
 * Uncached at this layer — wrapped by getCachedGradedPriceHistory below. Kept
 * separate so a caller that genuinely needs a fresh read (e.g. right after a
 * write) isn't stuck behind the cache.
 */
export async function getGradedPriceHistory(
  variantId: string,
  range: TimeRange = "90d"
): Promise<GradedPriceHistoryResult> {
  const cutoff = range === "all" ? undefined : new Date(Date.now() - RANGE_MS[range]);

  const observations = await prisma.gradedPriceObservation.findMany({
    where: {
      variantId,
      ...(cutoff ? { observedAt: { gte: cutoff } } : {}),
    },
    orderBy: { observedAt: "asc" },
  });

  if (observations.length === 0) return EMPTY;

  const byKey = new Map<string, { company: string; grade: string; points: GradedPricePoint[] }>();
  for (const o of observations) {
    const key = `${o.company}::${o.grade}`;
    const bucket = byKey.get(key) ?? { company: o.company, grade: o.grade, points: [] };
    bucket.points.push({ date: o.observedAt.toISOString(), priceUsd: o.priceUsd });
    byKey.set(key, bucket);
  }

  const series: GradedSeries[] = Array.from(byKey.values())
    .map((s) => ({
      company: s.company,
      grade: s.grade,
      label: `${s.company} ${s.grade}`,
      points: s.points,
      latestPriceUsd: s.points.length > 0 ? s.points[s.points.length - 1].priceUsd : null,
    }))
    // Highest current price first — matches how the reference UI orders its legend (PSA 10 above PSA 9, etc.)
    .sort((a, b) => (b.latestPriceUsd ?? 0) - (a.latestPriceUsd ?? 0));

  const companies = Array.from(new Set(series.map((s) => s.company)));
  const lastUpdated = observations[observations.length - 1]?.observedAt ?? null;

  return { companies, series, observationCount: observations.length, lastUpdated };
}

/**
 * Cached read path for the card detail page — a popular card can have
 * thousands of GradedPriceObservation rows across 20+ grades, and this data
 * changes at most once a day (it's a backfilled/synced series, not a live
 * feed), so re-grouping it on every request is pure waste. No existing
 * caching convention in this lib to follow (checked history.ts and friends —
 * none use unstable_cache), so this introduces one deliberately, scoped to
 * this helper only.
 */
export const getCachedGradedPriceHistory = unstable_cache(
  async (variantId: string, range: TimeRange = "90d") => getGradedPriceHistory(variantId, range),
  ["graded-price-history"],
  { revalidate: 600 } // 10 minutes
);
