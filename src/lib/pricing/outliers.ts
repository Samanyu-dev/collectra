// Median-absolute-deviation outlier detection (ADR §11) — robust to the exact
// kind of single-bad-listing skew a naive stdev check would miss. Statistics-only,
// no ML model, no external service.

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const OUTLIER_THRESHOLD = 3.5; // modified z-score cutoff, the standard MAD default

/** Returns the set of indices in `values` flagged as outliers. */
export function flagOutlierIndices(values: number[]): Set<number> {
  const outliers = new Set<number>();
  if (values.length < 3) return outliers; // not enough points for MAD to mean anything

  const med = median(values);
  const mad = median(values.map((v) => Math.abs(v - med)));

  if (mad === 0) {
    // Every point is identical except (maybe) a few — flag only the ones that differ at all.
    values.forEach((v, i) => {
      if (v !== med) outliers.add(i);
    });
    return outliers;
  }

  values.forEach((v, i) => {
    const modifiedZScore = (0.6745 * (v - med)) / mad;
    if (Math.abs(modifiedZScore) > OUTLIER_THRESHOLD) outliers.add(i);
  });
  return outliers;
}
