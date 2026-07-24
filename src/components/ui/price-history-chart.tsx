"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PriceHistoryPoint, PriceHistoryResult } from "@/lib/pricing/history";

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGE_TABS: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "All" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PriceHistoryChart({
  data,
  onRangeChange,
  activeRange,
}: {
  data: PriceHistoryPoint[];
  onRangeChange: (range: TimeRange) => void;
  activeRange: TimeRange;
}) {
  const hasData = data.length > 0;

  // Determine trend from first to last point in the visible window
  let trend: PriceHistoryResult["trend"] = "flat";
  let trendPercent: number | null = null;
  if (hasData && data.length >= 2) {
    const first = data[0].priceUsd;
    const last = data[data.length - 1].priceUsd;
    const raw = first > 0 ? ((last - first) / first) * 100 : 0;
    trendPercent = raw;
    if (raw > 1) trend = "up";
    else if (raw < -1) trend = "down";
  }

  // Min/max for Y domain
  const prices = data.map((p) => p.priceUsd);
  const minVal = prices.length > 0 ? Math.min(...prices) * 0.95 : 0;
  const maxVal = prices.length > 0 ? Math.max(...prices) * 1.05 : 100;

  const trendColor = trend === "up" ? "#34d399" : trend === "down" ? "#f87171" : "#9ca3af";

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5 space-y-4">
      {/* Header with trend indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Price History</h4>
          {hasData && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-medium px-1.5 py-0.5 rounded-md ${
                trend === "up"
                  ? "bg-green-500/10 text-green-400"
                  : trend === "down"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-foreground/10 text-foreground/50"
              }`}
            >
              {trend === "up" ? (
                <TrendingUp size={12} />
              ) : trend === "down" ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {trendPercent != null && `${trendPercent >= 0 ? "+" : ""}${trendPercent.toFixed(1)}%`}
            </span>
          )}
        </div>

        {/* Time range tabs */}
        <div className="flex gap-1 bg-foreground/5 rounded-lg p-0.5">
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onRangeChange(tab.key)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                activeRange === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-foreground/40 text-sm">
          No price history available for this time range.
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={[minVal, maxVal]}
                tickFormatter={(v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as PriceHistoryPoint;
                    return (
                      <div className="bg-background/90 backdrop-blur border border-foreground/10 px-3 py-2 rounded-lg shadow-2xl text-xs space-y-1">
                        <p className="text-foreground/60">{formatDate(point.date)}</p>
                        <p className="text-base font-mono font-bold text-foreground">
                          {formatPrice(point.priceUsd)}
                        </p>
                        <p className="text-foreground/40">
                          {point.kind === "SOLD" ? "Sold" : "Listing"} · {point.source}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Line
                type="monotone"
                dataKey="priceUsd"
                stroke={trendColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: trendColor, stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats grid */}
      {hasData && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-foreground/5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Lowest</p>
            <p className="mt-0.5 text-sm font-mono text-foreground">
              {formatPrice(Math.min(...prices))}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Average</p>
            <p className="mt-0.5 text-sm font-mono text-foreground">
              {formatPrice(prices.reduce((a, b) => a + b, 0) / prices.length)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/35">Highest</p>
            <p className="mt-0.5 text-sm font-mono text-foreground">
              {formatPrice(Math.max(...prices))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}