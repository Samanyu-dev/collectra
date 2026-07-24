'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface PortfolioPoint {
  date: string;
  value: number;
  cardCount?: number;
}

type RangeKey = '7d' | '30d' | '90d' | '1y' | 'all';

const RANGE_TABS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'All', days: null },
];

export function PortfolioChart({ data }: { data: PortfolioPoint[] }) {
  const [range, setRange] = useState<RangeKey>('30d');
  // Lazy initializer runs exactly once (on mount), not on every render —
  // the idiomatic way to capture an impure "now" without calling Date.now()
  // during the render/memo body itself (react-hooks/purity).
  const [now] = useState(() => Date.now());

  // Day-over-day change computed once against the full series — so even the
  // very first point visible in a filtered range still shows a real change
  // (against the day before it, whether or not that day is on-screen).
  const withChange = useMemo(
    () =>
      data.map((d, i) => {
        const prev = i > 0 ? data[i - 1] : null;
        const changeAbs = prev ? d.value - prev.value : null;
        const changePercent = prev && prev.value > 0 ? ((d.value - prev.value) / prev.value) * 100 : null;
        return { ...d, changeAbs, changePercent };
      }),
    [data]
  );

  const filtered = useMemo(() => {
    const tab = RANGE_TABS.find((t) => t.key === range)!;
    if (tab.days == null) return withChange;
    const cutoff = now - tab.days * 24 * 60 * 60 * 1000;
    return withChange.filter((d) => new Date(d.date).getTime() >= cutoff);
  }, [withChange, range, now]);

  const minVal = Math.min(...filtered.map((d) => d.value)) * 0.95;
  const maxVal = Math.max(...filtered.map((d) => d.value)) * 1.05;

  const start = filtered[0]?.value || 0;
  const end = filtered[filtered.length - 1]?.value || 0;
  const isUp = end >= start;
  const color = isUp ? '#34d399' : '#f87171'; // emerald-400 or red-400

  return (
    <div className="w-full h-full flex flex-col gap-3">
      <div className="flex justify-end gap-1">
        {RANGE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRange(tab.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
              range === tab.key ? 'bg-foreground/15 text-foreground' : 'text-foreground/40 hover:text-foreground/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 group">
        <div
          className="absolute inset-0 blur-3xl opacity-20 pointer-events-none transition-opacity duration-1000"
          style={{ background: color }}
        />

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered}>
            <XAxis dataKey="date" hide />
            <YAxis domain={[minVal, maxVal]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload as (typeof filtered)[number];
                  return (
                    <div className="bg-background/80 backdrop-blur border border-foreground/10 px-4 py-2 rounded-xl shadow-2xl space-y-1">
                      <p className="text-foreground/60 text-xs font-mono">{p.date}</p>
                      <p className="text-xl font-mono text-foreground">
                        ${p.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      {p.changeAbs != null && (
                        <p className={`text-xs font-mono ${p.changeAbs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {p.changeAbs >= 0 ? '+' : ''}
                          ${p.changeAbs.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          {p.changePercent != null && ` (${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(1)}%)`}
                        </p>
                      )}
                      {p.cardCount != null && (
                        <p className="text-[11px] text-foreground/40">{p.cardCount} priced card{p.cardCount === 1 ? '' : 's'}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: color, stroke: 'var(--background)', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
