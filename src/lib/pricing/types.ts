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
}
