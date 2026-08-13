"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Breakdown } from "@/lib/collection/workspace";

/**
 * Horizontal-bar wrapper for Top Teams/Sets/Players and Set Insights'
 * Value by Rarity / Data Confidence — recharts primitives, same library
 * `PortfolioChart` already uses. `Breakdown.count` is the bar's raw number;
 * `formatValue` only controls how that number is displayed in the tooltip
 * (e.g. "$1,234" for a dollar breakdown vs. the plain "12" default for a
 * card-count breakdown) — the chart itself doesn't care what unit it's in.
 */
export function BarBreakdownChart({
  data,
  color = "#FACC15",
  formatValue = (v: number) => String(v),
}: {
  data: Breakdown[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <p className="text-xs text-foreground/40 py-4 text-center">Not enough data yet.</p>;
  }

  return (
    <div style={{ height: Math.max(data.length * 28, 80) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--elevated)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background/90 backdrop-blur border border-foreground/10 px-3 py-1.5 rounded-lg text-xs">
                    {payload[0].payload.name}: <span className="font-mono">{formatValue(Number(payload[0].value))}</span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
