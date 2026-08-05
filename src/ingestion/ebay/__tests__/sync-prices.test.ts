import { describe, it, expect } from "vitest";
import { median, dropGrossOutliers } from "../sync-prices";

describe("median", () => {
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value for an odd-length array", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values for an even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("dropGrossOutliers", () => {
  it("passes prices through unchanged when the median is 0 or null (nothing to compare against)", () => {
    expect(dropGrossOutliers([])).toEqual([]);
    expect(dropGrossOutliers([0, 0])).toEqual([0, 0]);
  });

  it("drops a wrong-item match wildly off from the rest (e.g. a $400 slab among $4 base cards)", () => {
    expect(dropGrossOutliers([4, 5, 4.5, 400])).toEqual([4, 5, 4.5]);
  });

  it("drops a listing far below the rest too (e.g. a broken/junk listing), not just above", () => {
    expect(dropGrossOutliers([50, 48, 52, 0.5])).toEqual([50, 48, 52]);
  });

  it("keeps normal price spread that doesn't cross the 3x threshold", () => {
    const prices = [10, 12, 15, 20];
    expect(dropGrossOutliers(prices)).toEqual(prices);
  });
});
