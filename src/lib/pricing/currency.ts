import { prisma as appPrisma } from "@/lib/prisma";
import type { PricingPrismaClient } from "./db";

/**
 * Normalizes a price to USD at write time (ADR §7) — every downstream aggregate
 * and gain/loss calc is then a plain sum over already-comparable numbers.
 * Returns null (never a guessed 1:1 rate) if USD and no ExchangeRate row covers
 * `asOf` for that currency yet — callers must skip writing that observation
 * rather than write a wrong priceUsd.
 */
export async function normalizeToUsd(
  price: number,
  currency: string,
  asOf: Date,
  client: PricingPrismaClient = appPrisma
): Promise<number | null> {
  if (currency === "USD") return price;

  const rate = await client.exchangeRate.findFirst({
    where: { currency, asOf: { lte: asOf } },
    orderBy: { asOf: "desc" },
  });
  if (!rate) return null;

  return price * rate.usdRate;
}
