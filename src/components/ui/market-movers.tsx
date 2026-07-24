"use client";

import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MarketMover } from "@/lib/intelligence/feed/dashboard-extended";

function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function MarketMoversSection({ movers }: { movers: MarketMover[] }) {
  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <TrendingUp size={16} /> Market Movers
      </div>

      {movers.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">
          Not enough price history yet — movers appear once we have two data points per card.
        </p>
      ) : (
        <div className="space-y-2">
          {movers.map((mover) => (
            <Link
              key={mover.variantId}
              href={`/cards/${mover.cardId}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-foreground/5 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {mover.cardName}
                </p>
                <p className="text-[11px] font-mono text-foreground/40 truncate">
                  {mover.setName} • #{mover.cardNumber}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-mono tabular-nums">
                  ${mover.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums px-1.5 py-0.5 rounded-md ${
                    mover.changeDirection === "up"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {mover.changeDirection === "up" ? (
                    <TrendingUp size={10} />
                  ) : (
                    <TrendingDown size={10} />
                  )}
                  {formatChange(mover.changePercent)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}