"use client";

import { TrendingUp, TrendingDown, Minus, Clock, BarChart3 } from "lucide-react";
import type { PriceHistoryResult } from "@/lib/pricing/history";

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const ms = Date.now() - date.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function MarketComparison({
  history,
  currentPrice,
}: {
  history: PriceHistoryResult;
  currentPrice: number | null | undefined;
}) {
  const hasData = history.observationCount > 0;

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-foreground/50" />
        <h4 className="text-sm font-semibold">Market Comparison</h4>
      </div>

      {!hasData ? (
        <p className="text-sm text-foreground/40 py-2">
          No market data available yet — prices appear once the pricing pipeline collects observations.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Current market price */}
          {currentPrice != null && (
            <div className="flex items-center justify-between py-2 border-b border-foreground/5">
              <span className="text-sm text-foreground/70">Current Market</span>
              <span className="text-lg font-display font-bold text-foreground">
                {formatPrice(currentPrice)}
              </span>
            </div>
          )}

          {/* Price stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Lowest</p>
              <p className="mt-1 text-base font-mono font-medium text-green-400">
                {formatPrice(history.lowestPrice)}
              </p>
            </div>
            <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Highest</p>
              <p className="mt-1 text-base font-mono font-medium text-red-400">
                {formatPrice(history.highestPrice)}
              </p>
            </div>
            <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Average</p>
              <p className="mt-1 text-base font-mono font-medium text-foreground">
                {formatPrice(history.averagePrice)}
              </p>
            </div>
            <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Observations</p>
              <p className="mt-1 text-base font-mono font-medium text-foreground">
                {history.observationCount}
              </p>
            </div>
          </div>

          {/* Trend indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-foreground/5">
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <Clock size={12} />
              <span>Updated {timeAgo(history.lastUpdated)}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-1 rounded-md ${
                history.trend === "up"
                  ? "bg-green-500/10 text-green-400"
                  : history.trend === "down"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-foreground/10 text-foreground/50"
              }`}
            >
              {history.trend === "up" ? (
                <TrendingUp size={12} />
              ) : history.trend === "down" ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {history.trendPercent != null
                ? `${history.trendPercent >= 0 ? "+" : ""}${history.trendPercent.toFixed(1)}%`
                : "Flat"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}