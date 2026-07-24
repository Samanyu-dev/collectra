"use client";

import { Layers, ArrowRight, CircleDollarSign, Sparkles } from "lucide-react";
import Link from "next/link";
import type { FranchiseBreakdownEntry } from "@/lib/intelligence/feed/dashboard-extended";

const UNIVERSE_COLORS: Record<string, string> = {
  TCG: "text-blue-400",
  Sports: "text-green-400",
  Comics: "text-purple-400",
  Entertainment: "text-yellow-400",
};

const UNIVERSE_BG_COLORS: Record<string, string> = {
  TCG: "bg-blue-500/10",
  Sports: "bg-green-500/10",
  Comics: "bg-purple-500/10",
  Entertainment: "bg-yellow-500/10",
};

export function FranchiseBreakdownSection({ breakdown }: { breakdown: FranchiseBreakdownEntry[] }) {
  const maxValue = Math.max(...breakdown.map((b) => b.portfolioValue), 1);

  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <Layers size={16} /> Franchise Breakdown
      </div>

      {breakdown.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">
          No collection data yet — add cards to see your franchise distribution.
        </p>
      ) : (
        <div className="space-y-3">
          {breakdown.map((entry) => {
            const universeColor = UNIVERSE_COLORS[entry.universeName] ?? "text-foreground/50";
            const universeBg = UNIVERSE_BG_COLORS[entry.universeName] ?? "bg-foreground/5";
            const barWidth = (entry.portfolioValue / maxValue) * 100;

            return (
              <Link
                key={entry.franchiseId}
                href={`/collections?franchise=${entry.franchiseId}`}
                className="block group"
              >
                <div className="px-3 py-2.5 rounded-xl hover:bg-foreground/5 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${universeBg} ${universeColor}`}>
                        {entry.universeName}
                      </span>
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {entry.franchiseName}
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-foreground/30 group-hover:text-foreground/60 transition-colors shrink-0 ml-2" />
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-foreground/8 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full bg-primary/60 group-hover:bg-primary transition-colors"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-foreground/40">
                    <span className="flex items-center gap-1">
                      <CircleDollarSign size={11} />
                      ${entry.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span>{entry.cardCount} card{entry.cardCount === 1 ? "" : "s"}</span>
                    <span>{entry.uniqueCardCount} unique</span>
                    {entry.estimatedSpareValue > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500/60">
                        <Sparkles size={11} />
                        ${entry.estimatedSpareValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in spares
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}