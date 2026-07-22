import { prisma as appPrisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { flagOutlierIndices } from "./outliers";
import { computeConfidence, type ConfidenceLabel } from "./confidence";
import type { PricingPrismaClient } from "./db";

const PRIMARY_WINDOW_DAYS = 30; // "trailing 30 days" per ADR §6

type Obs = {
  id: string;
  variantId: string | null;
  kind: string;
  priceUsd: number;
  observedAt: Date;
  isOutlier: boolean;
  sourceId: string;
  source: { name: string | null; identifier: string; trustLevel: number };
};

type AggregateFields = {
  marketPriceUsd: number | null;
  lastSoldPriceUsd: number | null;
  soldAverageUsd: number | null;
  lowestListingUsd: number | null;
  highestListingUsd: number | null;
  trend30dPercent: number | null;
  trend90dPercent: number | null;
  observationCount: number;
  contributingSources: string;
  latestObservationAt: Date | null;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function daysAgo(n: number, from: Date): Date {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

/** Sold-median-falling-back-to-listing-median for an arbitrary date range — the same logic marketPriceUsd uses, reused for trend windows. */
function windowMarketPrice(obs: Obs[], from: Date, to: Date): number | null {
  const inWindow = obs.filter((o) => !o.isOutlier && o.observedAt >= from && o.observedAt < to);
  const sold = inWindow.filter((o) => o.kind === "SOLD").map((o) => o.priceUsd);
  if (sold.length > 0) return median(sold);
  const listing = inWindow.filter((o) => o.kind === "LISTING").map((o) => o.priceUsd);
  return listing.length > 0 ? median(listing) : null;
}

function trendPercent(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

/**
 * Pure aggregation over one variant's observations — no DB I/O, shared by both
 * the single-variant ("Refresh Now") and bulk (scheduled sync) persistence
 * paths so the math exists in exactly one place. Returns the CurrentPrice
 * field set plus any isOutlier flags that changed and need persisting.
 */
export function computeAggregate(
  observations: Obs[],
  now: Date = new Date()
): { fields: AggregateFields; flagChanges: Array<{ id: string; isOutlier: boolean }> } {
  const byKind: Record<string, Obs[]> = { LISTING: [], SOLD: [] };
  for (const o of observations) (byKind[o.kind] ??= []).push(o);

  const updatedIsOutlier = new Map<string, boolean>();
  for (const kind of Object.keys(byKind)) {
    const group = byKind[kind];
    const outlierIdx = flagOutlierIndices(group.map((o) => o.priceUsd));
    group.forEach((o, i) => updatedIsOutlier.set(o.id, outlierIdx.has(i)));
  }

  const flagChanges = observations
    .filter((o) => updatedIsOutlier.get(o.id) !== o.isOutlier)
    .map((o) => ({ id: o.id, isOutlier: updatedIsOutlier.get(o.id)! }));

  const withFreshFlags: Obs[] = observations.map((o) => ({ ...o, isOutlier: updatedIsOutlier.get(o.id)! }));
  const nonOutlier = withFreshFlags.filter((o) => !o.isOutlier);

  const windowStart = daysAgo(PRIMARY_WINDOW_DAYS, now);
  const soldInWindow = nonOutlier.filter((o) => o.kind === "SOLD" && o.observedAt >= windowStart);
  const listingInWindow = nonOutlier.filter((o) => o.kind === "LISTING" && o.observedAt >= windowStart);
  const allSold = nonOutlier.filter((o) => o.kind === "SOLD");

  const soldPricesInWindow = soldInWindow.map((o) => o.priceUsd);
  const listingPricesInWindow = listingInWindow.map((o) => o.priceUsd);

  const marketPriceUsd = soldPricesInWindow.length > 0 ? median(soldPricesInWindow) : median(listingPricesInWindow);
  const soldAverageUsd = mean(soldPricesInWindow);
  const lowestListingUsd = listingPricesInWindow.length > 0 ? Math.min(...listingPricesInWindow) : null;
  const highestListingUsd = listingPricesInWindow.length > 0 ? Math.max(...listingPricesInWindow) : null;
  const lastSoldPriceUsd = allSold.length > 0 ? allSold[0].priceUsd : null; // already sorted desc by observedAt

  const current30 = windowMarketPrice(withFreshFlags, daysAgo(30, now), now);
  const prior30 = windowMarketPrice(withFreshFlags, daysAgo(60, now), daysAgo(30, now));
  const current90 = windowMarketPrice(withFreshFlags, daysAgo(90, now), now);
  const prior90 = windowMarketPrice(withFreshFlags, daysAgo(180, now), daysAgo(90, now));

  const trend30dPercent = trendPercent(current30, prior30);
  const trend90dPercent = trendPercent(current90, prior90);

  const consideredCount = nonOutlier.filter((o) => o.observedAt >= windowStart).length || nonOutlier.length;
  const outlierRatio = withFreshFlags.length > 0 ? withFreshFlags.filter((o) => o.isOutlier).length / withFreshFlags.length : 0;
  const avgSourceTrustLevel =
    nonOutlier.length > 0 ? nonOutlier.reduce((sum, o) => sum + o.source.trustLevel, 0) / nonOutlier.length : 0;
  const latestObservationAt = nonOutlier.length > 0 ? nonOutlier[0].observedAt : null;

  const { score, label } = computeConfidence({
    observationCount: consideredCount,
    latestObservationAt,
    avgSourceTrustLevel,
    outlierRatio,
    now,
  });

  const contributingSources = JSON.stringify(
    Array.from(new Set(nonOutlier.map((o) => o.source.name ?? o.source.identifier)))
  );

  return {
    fields: {
      marketPriceUsd,
      lastSoldPriceUsd,
      soldAverageUsd,
      lowestListingUsd,
      highestListingUsd,
      trend30dPercent,
      trend90dPercent,
      observationCount: consideredCount,
      contributingSources,
      latestObservationAt,
      confidence: score,
      confidenceLabel: label,
    },
    flagChanges,
  };
}

const SOURCE_SELECT = { source: { select: { name: true, identifier: true, trustLevel: true } } } as const;

/**
 * Persists every outlier-flag change as ONE SQL statement, regardless of how
 * many rows changed — the real fix for a retry storm found by timing the
 * first sync run: firing N individual concurrent update() calls (even via
 * Promise.all) was enough to exhaust the pooled connection and trigger
 * dozens of transient-error retries per set.
 */
async function bulkUpdateOutlierFlags(
  changes: Array<{ id: string; isOutlier: boolean }>,
  client: PricingPrismaClient
): Promise<void> {
  if (changes.length === 0) return;
  const cases = Prisma.join(
    changes.map((c) => Prisma.sql`WHEN ${c.id} THEN ${c.isOutlier}`),
    " "
  );
  const ids = Prisma.join(changes.map((c) => c.id));
  await client.$executeRaw`UPDATE "PriceObservation" SET "isOutlier" = CASE id ${cases} END WHERE id IN (${ids})`;
}

/**
 * Single-variant path — used by "Refresh Now" (ADR §9), where the caller is
 * actively waiting on one result. Never clears CurrentPrice on failure
 * (ADR §17): only ever overwrites on a successful compute.
 */
export async function recomputeCurrentPriceForVariant(
  variantId: string,
  now: Date = new Date(),
  client: PricingPrismaClient = appPrisma
): Promise<void> {
  const observations = await client.priceObservation.findMany({
    where: { variantId },
    include: SOURCE_SELECT,
    orderBy: { observedAt: "desc" },
  });
  if (observations.length === 0) return;

  const { fields, flagChanges } = computeAggregate(observations as Obs[], now);

  await bulkUpdateOutlierFlags(flagChanges, client);
  await client.currentPrice.upsert({ where: { variantId }, update: fields, create: { variantId, ...fields } });
}

/**
 * Bulk path — used by the scheduled sync (ADR §9 performance pass). One
 * findMany for every touched variant instead of N, one bulk SQL statement for
 * every outlier-flag change instead of N update() calls, one $transaction of
 * upserts instead of N sequential round trips.
 */
export async function recomputeCurrentPricesForVariants(
  variantIds: string[],
  now: Date = new Date(),
  client: PricingPrismaClient = appPrisma
): Promise<void> {
  if (variantIds.length === 0) return;

  const observations = await client.priceObservation.findMany({
    where: { variantId: { in: variantIds } },
    include: SOURCE_SELECT,
    orderBy: { observedAt: "desc" },
  });

  const byVariant = new Map<string, Obs[]>();
  for (const o of observations as Obs[]) {
    const list = byVariant.get(o.variantId!) ?? [];
    list.push(o);
    byVariant.set(o.variantId!, list);
  }

  const allFlagChanges: Array<{ id: string; isOutlier: boolean }> = [];
  const upserts: ReturnType<PricingPrismaClient["currentPrice"]["upsert"]>[] = [];

  for (const variantId of variantIds) {
    const obsForVariant = byVariant.get(variantId);
    if (!obsForVariant || obsForVariant.length === 0) continue;

    const { fields, flagChanges } = computeAggregate(obsForVariant, now);
    allFlagChanges.push(...flagChanges);
    upserts.push(client.currentPrice.upsert({ where: { variantId }, update: fields, create: { variantId, ...fields } }));
  }

  await bulkUpdateOutlierFlags(allFlagChanges, client);
  if (upserts.length > 0) await client.$transaction(upserts);
}
