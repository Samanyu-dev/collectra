// Shared types for the price engine (docs/adr/003-price-engine-architecture.md).

export interface RawPriceObservation {
  variantId?: string;
  productId?: string;
  kind: "LISTING" | "SOLD";
  price: number; // original currency, unmodified
  currency: string; // ISO 4217
  observedAt: Date;
  sourceUrl?: string;
  externalRef?: string;
}

// The shared render contract every price display reads from (ADR §8) — a
// mechanical rendering of one CurrentPrice row, not hand-assembled per page.
export interface PriceDisplay {
  valueUsd: number | null;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW" | "NO_DATA";
  observationCount: number;
  lastUpdated: Date | null;
  sources: string[];
  // 30-day trend, when CurrentPrice has enough history to compute one (ADR §8
  // note: null until 60+ days of real observations exist) — optional so every
  // existing caller of toPriceDisplay/PriceTag keeps working unchanged.
  trend30dPercent?: number | null;
  // Market range — the low/high of trailing-30-day LISTING observations
  // (recompute.ts). Distinct from valueUsd, which is the SOLD-price median
  // (falling back to listing median) — the "estimate", not the range.
  lowUsd?: number | null;
  highUsd?: number | null;
  // Mean of trailing-30-day SOLD prices — a second read on central tendency
  // alongside the median-based valueUsd, shown as a secondary figure, never
  // the headline (median is more outlier-resistant, ADR §6).
  soldAverageUsd?: number | null;
}
