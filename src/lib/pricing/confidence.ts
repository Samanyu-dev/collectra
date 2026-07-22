// The four-factor confidence formula (ADR §8) — transparent and inspectable,
// not tuned-and-forgotten. Each term is independently meaningful.

const DEFAULT_REFRESH_INTERVAL_HOURS = Number(process.env.PRICE_REFRESH_INTERVAL_HOURS) || 24;
const RECENCY_DECAY_DAYS = 14; // recencyFactor reaches 0 this many days past the refresh cadence

export type ConfidenceLabel = "HIGH" | "MEDIUM" | "LOW" | "NO_DATA";

export function labelForScore(score: number, observationCount: number): ConfidenceLabel {
  if (observationCount === 0) return "NO_DATA";
  if (score >= 0.7) return "HIGH";
  if (score >= 0.35) return "MEDIUM";
  return "LOW";
}

export function computeConfidence(params: {
  observationCount: number;
  latestObservationAt: Date | null;
  avgSourceTrustLevel: number; // 0-100 scale, matches DataSource.trustLevel
  outlierRatio: number; // 0-1
  now?: Date;
}): { score: number; label: ConfidenceLabel } {
  const { observationCount, latestObservationAt, avgSourceTrustLevel, outlierRatio } = params;
  const now = params.now ?? new Date();

  if (observationCount === 0 || !latestObservationAt) {
    return { score: 0, label: "NO_DATA" };
  }

  const countFactor = Math.min(1, observationCount / 5);

  const staleAfterMs = DEFAULT_REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
  const decayWindowMs = RECENCY_DECAY_DAYS * 24 * 60 * 60 * 1000;
  const ageMs = now.getTime() - latestObservationAt.getTime();
  const overdueMs = Math.max(0, ageMs - staleAfterMs);
  const recencyFactor = Math.max(0, 1 - overdueMs / decayWindowMs);

  const trustFactor = Math.max(0, Math.min(1, avgSourceTrustLevel / 100));
  const outlierFactor = Math.max(0, 1 - outlierRatio);

  const score = clamp(0, 1, 0.4 * countFactor + 0.3 * recencyFactor + 0.2 * trustFactor + 0.1 * outlierFactor);

  return { score, label: labelForScore(score, observationCount) };
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
