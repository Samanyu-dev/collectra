import { prisma as appPrisma } from "@/lib/prisma";
import { normalizeToUsd } from "./currency";
import type { PricingPrismaClient } from "./db";

export interface RawGradedPriceObservation {
  variantId: string;
  company: string;
  grade: string;
  price: number; // original currency, unmodified
  currency: string; // ISO 4217
  observedAt: Date;
  sourceUrl?: string;
  externalRef?: string;
}

/**
 * Bulk write path for GradedPriceObservation — mirrors
 * writePriceObservationsBatch in write-observation.ts (same currency
 * normalization, same createMany-not-N-creates shape), kept as a separate
 * function rather than a generic "which table" parameter since the two
 * tables have different columns (kind vs company/grade) and this is only
 * ever called from catalog-level graded-price backfills, not the hot
 * per-request path.
 */
export async function writeGradedPriceObservationsBatch(
  rows: RawGradedPriceObservation[],
  sourceId: string,
  client: PricingPrismaClient = appPrisma
): Promise<number> {
  if (rows.length === 0) return 0;

  const rateCache = new Map<string, number | null>();
  async function rateFor(currency: string, asOf: Date): Promise<number | null> {
    if (currency === "USD") return 1;
    const key = `${currency}:${asOf.toDateString()}`;
    if (rateCache.has(key)) return rateCache.get(key)!;
    const rate = await normalizeToUsd(1, currency, asOf, client);
    rateCache.set(key, rate);
    return rate;
  }

  const toInsert: Array<{
    variantId: string;
    company: string;
    grade: string;
    price: number;
    currency: string;
    priceUsd: number;
    sourceId: string;
    sourceUrl?: string;
    externalRef?: string;
    observedAt: Date;
  }> = [];

  for (const r of rows) {
    const rate = await rateFor(r.currency, r.observedAt);
    if (rate == null) continue; // never write a guessed priceUsd
    toInsert.push({
      variantId: r.variantId,
      company: r.company,
      grade: r.grade,
      price: r.price,
      currency: r.currency,
      priceUsd: r.price * rate,
      sourceId,
      sourceUrl: r.sourceUrl,
      externalRef: r.externalRef,
      observedAt: r.observedAt,
    });
  }

  if (toInsert.length === 0) return 0;
  const result = await client.gradedPriceObservation.createMany({ data: toInsert });
  return result.count;
}
