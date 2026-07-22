import { describe, it, expect } from "vitest";
import { computeConfidence } from "../confidence";

const NOW = new Date("2026-07-22T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

describe("computeConfidence", () => {
  it("returns NO_DATA when there are zero observations", () => {
    const result = computeConfidence({
      observationCount: 0,
      latestObservationAt: null,
      avgSourceTrustLevel: 100,
      outlierRatio: 0,
      now: NOW,
    });
    expect(result).toEqual({ score: 0, label: "NO_DATA" });
  });

  it("scores HIGH for many recent, trusted, agreeing observations", () => {
    const result = computeConfidence({
      observationCount: 10,
      latestObservationAt: hoursAgo(1),
      avgSourceTrustLevel: 100,
      outlierRatio: 0,
      now: NOW,
    });
    expect(result.label).toBe("HIGH");
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it("scores LOW for a single stale, low-trust, mostly-outlier observation set", () => {
    const result = computeConfidence({
      observationCount: 1,
      latestObservationAt: hoursAgo(24 * 20), // 20 days stale
      avgSourceTrustLevel: 10,
      outlierRatio: 0.5,
      now: NOW,
    });
    expect(result.label).toBe("LOW");
  });

  it("decays recency toward 0 as data gets older than the refresh cadence, lowering the score", () => {
    const fresh = computeConfidence({
      observationCount: 5,
      latestObservationAt: hoursAgo(1),
      avgSourceTrustLevel: 100,
      outlierRatio: 0,
      now: NOW,
    });
    const stale = computeConfidence({
      observationCount: 5,
      latestObservationAt: hoursAgo(24 * 30), // 30 days stale
      avgSourceTrustLevel: 100,
      outlierRatio: 0,
      now: NOW,
    });
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("never produces a score outside [0, 1]", () => {
    const result = computeConfidence({
      observationCount: 1000,
      latestObservationAt: hoursAgo(0),
      avgSourceTrustLevel: 500, // deliberately out-of-range input
      outlierRatio: -1, // deliberately out-of-range input
      now: NOW,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
