import { prisma as appPrisma } from "@/lib/prisma";
import { normalizeToUsd } from "./currency";
import type { RawPriceObservation } from "./types";
import type { PricingPrismaClient } from "./db";

/**
 * Writes one PriceObservation, normalizing currency at write time (ADR §7).
 * Returns false (and writes nothing) if the currency can't be normalized yet —
 * never writes a guessed priceUsd.
 */
export async function writePriceObservation(
  raw: RawPriceObservation & { sourceId: string; confidence?: number },
  client: PricingPrismaClient = appPrisma
): Promise<boolean> {
  const priceUsd = await normalizeToUsd(raw.price, raw.currency, raw.observedAt, client);
  if (priceUsd == null) return false;

  await client.priceObservation.create({
    data: {
      variantId: raw.variantId,
      productId: raw.productId,
      kind: raw.kind,
      price: raw.price,
      currency: raw.currency,
      priceUsd,
      sourceId: raw.sourceId,
      sourceUrl: raw.sourceUrl,
      externalRef: raw.externalRef,
      confidence: raw.confidence ?? 1.0,
      observedAt: raw.observedAt,
    },
  });
  return true;
}

/**
 * Bulk write path for scheduled syncs (performance pass) — one createMany
 * instead of N sequential creates, and at most one ExchangeRate lookup per
 * distinct (currency, day) pair instead of one per row. Callers running as a
 * long-lived batch script should pass the ingestion engine's direct-connection
 * client (src/ingestion/engine/prisma.ts), not the app's pooled one — see db.ts.
 */
export async function writePriceObservationsBatch(
  rows: Array<RawPriceObservation & { sourceId: string; confidence?: number }>,
  client: PricingPrismaClient = appPrisma
): Promise<number> {
  if (rows.length === 0) return 0;

  const rateCache = new Map<string, number | null>();
  async function rateFor(currency: string, asOf: Date): Promise<number | null> {
    if (currency === "USD") return 1;
    const key = `${currency}:${asOf.toDateString()}`;
    if (rateCache.has(key)) return rateCache.get(key)!;
    const rate = await normalizeToUsd(1, currency, asOf, client); // price=1 → the rate itself
    rateCache.set(key, rate);
    return rate;
  }

  const toInsert: Array<{
    variantId?: string;
    productId?: string;
    kind: string;
    price: number;
    currency: string;
    priceUsd: number;
    sourceId: string;
    sourceUrl?: string;
    externalRef?: string;
    confidence: number;
    observedAt: Date;
  }> = [];

  for (const r of rows) {
    const rate = await rateFor(r.currency, r.observedAt);
    if (rate == null) continue; // never write a guessed priceUsd
    toInsert.push({
      variantId: r.variantId,
      productId: r.productId,
      kind: r.kind,
      price: r.price,
      currency: r.currency,
      priceUsd: r.price * rate,
      sourceId: r.sourceId,
      sourceUrl: r.sourceUrl,
      externalRef: r.externalRef,
      confidence: r.confidence ?? 1.0,
      observedAt: r.observedAt,
    });
  }

  if (toInsert.length === 0) return 0;
  const result = await client.priceObservation.createMany({ data: toInsert });
  return result.count;
}
