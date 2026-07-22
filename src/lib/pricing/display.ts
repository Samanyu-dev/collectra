import type { PriceDisplay } from "./types";

type CurrentPriceRow = {
  marketPriceUsd: number | null;
  confidenceLabel: string;
  observationCount: number;
  latestObservationAt: Date | null;
  contributingSources: string | null;
} | null | undefined;

/**
 * The one place a CurrentPrice row becomes a PriceDisplay (ADR §8) — every
 * page maps through this instead of hand-picking fields, so "show confidence,
 * last updated, and source consistently" is structural, not a per-page habit.
 */
export function toPriceDisplay(currentPrice: CurrentPriceRow): PriceDisplay {
  if (!currentPrice) {
    return { valueUsd: null, confidenceLabel: "NO_DATA", observationCount: 0, lastUpdated: null, sources: [] };
  }
  let sources: string[] = [];
  try {
    sources = currentPrice.contributingSources ? JSON.parse(currentPrice.contributingSources) : [];
  } catch {
    sources = [];
  }
  return {
    valueUsd: currentPrice.marketPriceUsd,
    confidenceLabel: currentPrice.confidenceLabel as PriceDisplay["confidenceLabel"],
    observationCount: currentPrice.observationCount,
    lastUpdated: currentPrice.latestObservationAt,
    sources,
  };
}
