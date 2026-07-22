import { describe, it, expect } from "vitest";
import { flagOutlierIndices } from "../outliers";

describe("flagOutlierIndices", () => {
  it("flags nothing with fewer than 3 points regardless of spread", () => {
    expect(flagOutlierIndices([10, 9999])).toEqual(new Set());
  });

  it("flags a single wildly-off value among tightly clustered ones (the real TCGPlayer $9999 case)", () => {
    const outliers = flagOutlierIndices([40, 42, 41, 39, 9999]);
    expect(outliers).toEqual(new Set([4]));
  });

  it("flags nothing when all values are close together", () => {
    const outliers = flagOutlierIndices([40, 41, 39, 42, 40.5]);
    expect(outliers.size).toBe(0);
  });

  it("flags only the values that differ when the median-absolute-deviation is zero", () => {
    const outliers = flagOutlierIndices([50, 50, 50, 50, 5]);
    expect(outliers).toEqual(new Set([4]));
  });

  it("does not flag anything when every value is identical", () => {
    expect(flagOutlierIndices([50, 50, 50, 50]).size).toBe(0);
  });
});
