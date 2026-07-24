"use client";

import { PieChart } from "lucide-react";
import type { FranchiseBreakdownEntry } from "@/lib/intelligence/feed/dashboard-data";

// Fixed categorical order (dataviz skill — never cycled/reassigned per
// request). A 9th+ entry folds into "Other" rather than generating a new hue.
const SLOT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)", "var(--cat-7)", "var(--cat-8)"];
const MAX_SLOTS = 7; // 7 named + "Other" = 8 total, matching the palette's 8 slots

interface Slice {
  label: string;
  value: number;
  color: string;
}

export function CollectionAllocation({ breakdown }: { breakdown: FranchiseBreakdownEntry[] }) {
  const total = breakdown.reduce((sum, b) => sum + b.portfolioValue, 0);

  const slices: Slice[] = (() => {
    if (breakdown.length === 0 || total <= 0) return [];
    const sorted = [...breakdown].sort((a, b) => b.portfolioValue - a.portfolioValue);
    const top = sorted.slice(0, MAX_SLOTS).map((b, i) => ({ label: b.franchiseName, value: b.portfolioValue, color: SLOT_COLORS[i] }));
    const rest = sorted.slice(MAX_SLOTS);
    if (rest.length > 0) {
      const restValue = rest.reduce((sum, b) => sum + b.portfolioValue, 0);
      top.push({ label: "Other", value: restValue, color: SLOT_COLORS[MAX_SLOTS] });
    }
    return top;
  })();

  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <PieChart size={16} /> Collection Allocation
      </div>

      {slices.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">No priced holdings yet — allocation fills in once cards have a market value.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex w-full h-3 rounded-full overflow-hidden gap-[2px]" role="img" aria-label="Portfolio value allocation by franchise">
            {slices.map((s) => (
              <div
                key={s.label}
                style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                title={`${s.label}: ${((s.value / total) * 100).toFixed(0)}%`}
              />
            ))}
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {slices.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-xs min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="truncate text-foreground/70">{s.label}</span>
                <span className="ml-auto font-mono text-foreground/40 shrink-0">{((s.value / total) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
