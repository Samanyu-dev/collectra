import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import type { SetValueEntry } from "@/lib/intelligence/feed/dashboard-data";

const VISIBLE_COUNT = 8;

export function SetValueBreakdownSection({ breakdown }: { breakdown: SetValueEntry[] }) {
  const visible = breakdown.slice(0, VISIBLE_COUNT);
  const maxValue = Math.max(...visible.map((s) => s.portfolioValue), 1);

  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <Wallet size={16} /> Collection Value by Set
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">Add cards to see each set's individual value.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((entry) => {
            const barWidth = (entry.portfolioValue / maxValue) * 100;
            return (
              <Link key={entry.setId} href={`/collections/${entry.setId}`} className="block group">
                <div className="px-3 py-2.5 rounded-xl hover:bg-foreground/5 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{entry.setName}</div>
                      <div className="text-xs text-foreground/40 truncate">{entry.franchiseName}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-mono text-foreground/50">
                        ${entry.portfolioValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                      <ArrowRight size={13} className="text-foreground/30 group-hover:text-foreground/60 transition-colors" />
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-foreground/8 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full bg-primary/60 group-hover:bg-primary transition-colors"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground/40">
                    {entry.cardCount} card{entry.cardCount === 1 ? "" : "s"} owned
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {breakdown.length > VISIBLE_COUNT && (
        <Link href="/collections" className="block mt-3 text-xs font-mono text-foreground/40 hover:text-foreground/70 transition-colors text-center">
          View all {breakdown.length} sets →
        </Link>
      )}
    </div>
  );
}
