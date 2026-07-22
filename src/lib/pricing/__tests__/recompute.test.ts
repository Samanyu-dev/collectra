import { describe, it, expect } from "vitest";
import { computeAggregate } from "../recompute";

const NOW = new Date("2026-07-23T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => hoursAgo(d * 24);

function obs(overrides: Partial<Parameters<typeof computeAggregate>[0][number]> = {}) {
  return {
    id: overrides.id ?? Math.random().toString(36),
    variantId: "variant-1",
    kind: "LISTING",
    priceUsd: 40,
    observedAt: hoursAgo(1),
    isOutlier: false,
    sourceId: "source-a",
    source: { name: "Source A", identifier: "source-a", trustLevel: 100 },
    ...overrides,
  };
}

describe("computeAggregate — multi-source reconciliation", () => {
  it("reconciles agreeing observations from two different sources via the median, not last-write-wins", () => {
    const observations = [
      obs({ id: "1", priceUsd: 40, sourceId: "tcgplayer", source: { name: "TCGPlayer", identifier: "tcgplayer", trustLevel: 100 } }),
      obs({ id: "2", priceUsd: 45, sourceId: "cardmarket", source: { name: "Cardmarket", identifier: "cardmarket", trustLevel: 90 } }),
    ];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.marketPriceUsd).toBe(42.5); // median of [40, 45]
    expect(fields.contributingSources).toContain("TCGPlayer");
    expect(fields.contributingSources).toContain("Cardmarket");
  });

  it("excludes a statistical outlier from one source rather than averaging it in (the real $9999 TCGPlayer case)", () => {
    const observations = [
      obs({ id: "1", priceUsd: 40 }),
      obs({ id: "2", priceUsd: 42 }),
      obs({ id: "3", priceUsd: 41 }),
      obs({ id: "4", priceUsd: 39 }),
      obs({ id: "5", priceUsd: 9999 }),
    ];
    const { fields, flagChanges } = computeAggregate(observations, NOW);
    expect(flagChanges).toContainEqual({ id: "5", isOutlier: true });
    expect(fields.highestListingUsd).toBeLessThan(100); // the $9999 row is excluded from the aggregate
  });

  it("prefers SOLD observations over LISTING for the headline market price when both exist", () => {
    const observations = [
      obs({ id: "1", kind: "LISTING", priceUsd: 100 }),
      obs({ id: "2", kind: "SOLD", priceUsd: 60 }),
    ];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.marketPriceUsd).toBe(60);
    expect(fields.lowestListingUsd).toBe(100);
  });

  it("falls back to LISTING median when there are no SOLD observations at all", () => {
    const observations = [obs({ id: "1", kind: "LISTING", priceUsd: 20 }), obs({ id: "2", kind: "LISTING", priceUsd: 30 })];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.marketPriceUsd).toBe(25);
    expect(fields.soldAverageUsd).toBeNull();
    expect(fields.lastSoldPriceUsd).toBeNull();
  });

  it("computes soldAverageUsd as the mean, distinct from the median-based marketPriceUsd", () => {
    // A mild (not MAD-outlier-flagged) skew: 45 pulls the mean up without
    // being extreme enough to get statistically excluded like the $9999 case above.
    const observations = [
      obs({ id: "1", kind: "SOLD", priceUsd: 10 }),
      obs({ id: "2", kind: "SOLD", priceUsd: 20 }),
      obs({ id: "3", kind: "SOLD", priceUsd: 45 }),
    ];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.marketPriceUsd).toBe(20); // median
    expect(fields.soldAverageUsd).toBeCloseTo(25, 1); // mean
  });
});

describe("computeAggregate — graceful degradation / stale data", () => {
  it("reports NO_DATA confidence and a null price for zero observations", () => {
    const { fields } = computeAggregate([], NOW);
    expect(fields.confidenceLabel).toBe("NO_DATA");
    expect(fields.marketPriceUsd).toBeNull();
    expect(fields.observationCount).toBe(0);
  });

  it("still returns the last-known price for stale (month-old) data rather than nulling it out", () => {
    const observations = [obs({ id: "1", priceUsd: 55, observedAt: daysAgo(30) })];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.marketPriceUsd).toBe(55);
    expect(fields.latestObservationAt).toEqual(daysAgo(30));
  });

  it("gives stale data a lower confidence score than equally-corroborated fresh data", () => {
    const fresh = computeAggregate(
      [obs({ id: "1", priceUsd: 55, observedAt: hoursAgo(1) })],
      NOW
    );
    const stale = computeAggregate(
      [obs({ id: "1", priceUsd: 55, observedAt: daysAgo(30) })],
      NOW
    );
    expect(stale.fields.confidence).toBeLessThan(fresh.fields.confidence);
  });

  it("leaves trend fields null when there isn't enough historical spread yet", () => {
    const observations = [obs({ id: "1", priceUsd: 40, observedAt: hoursAgo(1) })];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.trend30dPercent).toBeNull();
    expect(fields.trend90dPercent).toBeNull();
  });

  it("computes a real trend when both a current and a prior window have data", () => {
    const observations = [
      obs({ id: "1", priceUsd: 100, observedAt: hoursAgo(1) }), // in the current 30d window
      obs({ id: "2", priceUsd: 50, observedAt: daysAgo(45) }), // in the prior 30-60d window
    ];
    const { fields } = computeAggregate(observations, NOW);
    expect(fields.trend30dPercent).toBe(100); // (100 - 50) / 50 * 100
  });
});
