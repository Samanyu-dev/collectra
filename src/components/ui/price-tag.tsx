import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

export interface PriceTagData {
  valueUsd: number | null;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW" | "NO_DATA";
  observationCount: number;
  lastUpdated: string | Date | null; // ISO string once passed through a client boundary
  sources: string[];
  trend30dPercent?: number | null;
  lowUsd?: number | null;
  highUsd?: number | null;
  soldAverageUsd?: number | null;
}

// Shared by compact + full — a flat trend (within noise) reads as neutral,
// never a false "down". Anything else is a real move, colored by direction.
function TrendBadge({ percent, compact }: { percent: number; compact: boolean }) {
  const isFlat = Math.abs(percent) < 1;
  const isUp = percent > 0;
  const color = isFlat ? "text-foreground/40" : isUp ? "text-emerald-400" : "text-red-400";
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono ${compact ? "text-[10px]" : "text-xs"} ${color}`}>
      {!isFlat && <Icon size={compact ? 10 : 12} strokeWidth={2.5} />}
      {isFlat ? "flat" : `${isUp ? "+" : ""}${percent.toFixed(1)}%`}
    </span>
  );
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

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The market-range bar — low/median/high, with a marker at the estimate's
 * real position between them (not always centered: the median can sit
 * anywhere in the range depending on how the distribution actually looks).
 */
function RangeBar({ low, high, value }: { low: number; high: number; value: number }) {
  const span = high - low;
  const markerPercent = span > 0 ? Math.min(100, Math.max(0, ((value - low) / span) * 100)) : 50;

  return (
    <div>
      <p className="text-[11px] text-foreground/40 uppercase tracking-widest mb-2">Market Range</p>
      <div className="relative h-1.5 bg-foreground/10 rounded-full mb-2">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow"
          style={{ left: `${markerPercent}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="grid grid-cols-3 text-center">
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wide">Low</p>
          <p className="font-mono text-sm">${fmt(low)}</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wide">Median</p>
          <p className="font-mono text-sm text-foreground">${fmt(value)}</p>
        </div>
        <div>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wide">High</p>
          <p className="font-mono text-sm">${fmt(high)}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The one component every price renders through (ADR §8/§17) — value,
 * confidence, observation count, and recency together, never a bare number.
 * `compact` for grid/list contexts; the default (full) for detail views.
 * `compact` + `showRange` adds an inline "(low–high)" — opt-in, since most
 * compact contexts (Market Movers, Top Valuable Cards) are dense lists where
 * a full range reads as clutter.
 */
export function PriceTag({ data, compact = false, showRange = false }: { data: PriceTagData; compact?: boolean; showRange?: boolean }) {
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
  const hasRange = data.lowUsd != null && data.highUsd != null && data.highUsd > data.lowUsd;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[data.confidenceLabel]}`} aria-hidden="true" />
        <span className={`font-mono text-[10px] ${degraded ? "text-foreground/50" : "text-green-400"}`}>
          ${data.valueUsd.toFixed(2)}
        </span>
        {showRange && hasRange && (
          <span className="font-mono text-[10px] text-foreground/35">
            (${data.lowUsd!.toFixed(0)}–{data.highUsd!.toFixed(0)})
          </span>
        )}
        {data.trend30dPercent != null && <TrendBadge percent={data.trend30dPercent} compact />}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-foreground/40 uppercase tracking-widest mb-1">Current Estimate</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-3xl font-bold ${degraded ? "text-foreground/60" : "text-foreground"}`}>${fmt(data.valueUsd)}</p>
          {data.trend30dPercent != null && <TrendBadge percent={data.trend30dPercent} compact={false} />}
        </div>
      </div>

      {hasRange && <RangeBar low={data.lowUsd!} high={data.highUsd!} value={data.valueUsd} />}

      <div className="flex items-center justify-between text-xs text-foreground/50 pt-3 border-t border-foreground/10">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[data.confidenceLabel]}`} aria-hidden="true" />
          Confidence: {CONFIDENCE_LABEL[data.confidenceLabel]}
        </span>
        <span>
          Based on {data.observationCount} sale{data.observationCount === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-[11px] text-foreground/40 -mt-2">
        Updated {timeAgo(data.lastUpdated)}
        {data.sources.length > 0 ? ` · ${data.sources.join(", ")}` : ""}
      </p>
    </div>
  );
}
