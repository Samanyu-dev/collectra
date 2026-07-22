import { AlertCircle } from "lucide-react";

export interface PriceTagData {
  valueUsd: number | null;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW" | "NO_DATA";
  observationCount: number;
  lastUpdated: string | Date | null; // ISO string once passed through a client boundary
  sources: string[];
}

const CONFIDENCE_LABEL: Record<PriceTagData["confidenceLabel"], string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  NO_DATA: "No data",
};

const CONFIDENCE_DOT: Record<PriceTagData["confidenceLabel"], string> = {
  HIGH: "bg-green-400",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-orange-500",
  NO_DATA: "bg-foreground/20",
};

function timeAgo(date: string | Date | null): string {
  if (!date) return "never";
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - d.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The one component every price renders through (ADR §8/§17) — value,
 * confidence, observation count, and recency together, never a bare number.
 * `compact` for grid/list contexts; the default (full) for detail views.
 */
export function PriceTag({ data, compact = false }: { data: PriceTagData; compact?: boolean }) {
  if (data.valueUsd == null) {
    return compact ? (
      <span className="text-[10px] text-foreground/30 italic">No data</span>
    ) : (
      <div className="flex items-center gap-1.5 text-foreground/40 text-sm">
        <AlertCircle size={14} /> Price not yet available
      </div>
    );
  }

  const degraded = data.confidenceLabel === "LOW";

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[data.confidenceLabel]}`} aria-hidden="true" />
        <span className={`font-mono text-[10px] ${degraded ? "text-foreground/50" : "text-green-400"}`}>
          ${data.valueUsd.toFixed(2)}
        </span>
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <p className={`text-2xl font-bold ${degraded ? "text-foreground/60" : "text-foreground"}`}>${data.valueUsd.toFixed(2)}</p>
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[data.confidenceLabel]}`} aria-hidden="true" />
        <span>Confidence: {CONFIDENCE_LABEL[data.confidenceLabel]}</span>
        <span>·</span>
        <span>
          {data.observationCount} observation{data.observationCount === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-[11px] text-foreground/40">
        Updated {timeAgo(data.lastUpdated)}
        {data.sources.length > 0 ? ` · ${data.sources.join(", ")}` : ""}
      </p>
    </div>
  );
}
