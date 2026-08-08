"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Award } from "lucide-react";
import type { GradedPriceHistoryResult, GradedSeries } from "@/lib/pricing/graded-history";

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGE_TABS: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "All" },
];

// Cycled per visible series — deliberately not tied to any one grading
// company's brand color, since which companies/grades show up is data-driven.
const LINE_COLORS = ["#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#2dd4bf", "#fb923c"];

// A card with graded data for every grade a company issues would otherwise
// render a dozen+ overlapping lines under "All" — cap it and say so.
const MAX_VISIBLE_SERIES = 6;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Recharts wants one array of {date, [seriesKey]: price} rows, not N separate arrays.
function toChartRows(series: GradedSeries[]): Record<string, number | string>[] {
  const dateSet = new Set<string>();
  for (const s of series) for (const p of s.points) dateSet.add(p.date);
  const dates = Array.from(dateSet).sort();

  return dates.map((date) => {
    const row: Record<string, number | string> = { date };
    for (const s of series) {
      const key = `${s.company}::${s.grade}`;
      const point = s.points.find((p) => p.date === date);
      if (point) row[key] = point.priceUsd;
    }
    return row;
  });
}

export function GradedPriceHistoryChart({
  data,
  onRangeChange,
  activeRange,
}: {
  data: GradedPriceHistoryResult;
  onRangeChange: (range: TimeRange) => void;
  activeRange: TimeRange;
}) {
  const [selectedCompany, setSelectedCompany] = useState<string | "all">("all");

  const visibleSeries = useMemo(() => {
    const filtered = selectedCompany === "all" ? data.series : data.series.filter((s) => s.company === selectedCompany);
    return filtered.slice(0, MAX_VISIBLE_SERIES);
  }, [data.series, selectedCompany]);

  const truncated = (selectedCompany === "all" ? data.series.length : data.series.filter((s) => s.company === selectedCompany).length) > MAX_VISIBLE_SERIES;

  const rows = useMemo(() => toChartRows(visibleSeries), [visibleSeries]);
  const hasData = data.series.length > 0;

  const allPrices = visibleSeries.flatMap((s) => s.points.map((p) => p.priceUsd));
  const minVal = allPrices.length > 0 ? Math.min(...allPrices) * 0.95 : 0;
  const maxVal = allPrices.length > 0 ? Math.max(...allPrices) * 1.05 : 100;

  if (!hasData) return null; // no graded observations for this variant — card-client-experience skips rendering this section entirely for these cases anyway, but guard here too since this component could be reused elsewhere

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-foreground/50" />
          <h4 className="text-sm font-semibold">Graded Price History</h4>
        </div>

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

      {/* Company filter chips — built from whatever companies this variant actually has data for */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedCompany("all")}
          className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
            selectedCompany === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-foreground/15 text-foreground/60 hover:text-foreground"
          }`}
        >
          All
        </button>
        {data.companies.map((company) => (
          <button
            key={company}
            type="button"
            onClick={() => setSelectedCompany(company)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              selectedCompany === company
                ? "bg-primary text-primary-foreground border-primary"
                : "border-foreground/15 text-foreground/60 hover:text-foreground"
            }`}
          >
            {company}
          </button>
        ))}
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
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
              tickFormatter={(v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              labelFormatter={(label: any) => formatDate(label)}
              formatter={(value: any, name: any) => [formatPrice(value as number), (name as string).split("::").join(" ")]}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            {visibleSeries.map((s, i) => (
              <Line
                key={`${s.company}::${s.grade}`}
                type="monotone"
                dataKey={`${s.company}::${s.grade}`}
                name={`${s.company}::${s.grade}`}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 4 }}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with current price per grade, matching the reference UI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 pt-2 border-t border-foreground/5">
        {visibleSeries.map((s, i) => (
          <div key={`${s.company}::${s.grade}`} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-foreground/60">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              {s.company} {s.grade}
            </span>
            <span className="font-mono text-foreground/80">
              {s.latestPriceUsd != null ? formatPrice(s.latestPriceUsd) : "—"}
            </span>
          </div>
        ))}
      </div>
      {truncated && (
        <p className="text-[10px] text-foreground/35 font-mono">
          Showing top {MAX_VISIBLE_SERIES} grades by price — use the filter chips above to see the rest.
        </p>
      )}
    </div>
  );
}
