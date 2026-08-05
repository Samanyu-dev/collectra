import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import type { VolatileEntry } from "@/lib/intelligence/feed/dashboard-data";

function volatilityLabel(pct: number): { label: string; color: string } {
  if (pct >= 100) return { label: "High volatility", color: "text-red-400" };
  if (pct >= 40) return { label: "Moderate volatility", color: "text-yellow-500" };
  return { label: "Low volatility", color: "text-foreground/40" };
}

export function MostVolatileSection({ entries }: { entries: VolatileEntry[] }) {
  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <Zap size={16} /> Most Volatile
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">Owned cards need a real low/high listing range before volatility can be measured.</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const { label, color } = volatilityLabel(entry.volatilityPercent);
            return (
              <Link
                key={entry.cardId}
                href={`/cards/${entry.cardId}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-foreground/5 transition-colors group"
              >
                <div className="w-9 h-12 rounded-md overflow-hidden bg-foreground/10 shrink-0 relative">
                  {entry.imageUrl && <Image src={entry.imageUrl} alt={entry.cardName} fill className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{entry.cardName}</p>
                  <p className="text-[11px] font-mono text-foreground/40 truncate">
                    {entry.setName} · ${entry.lowUsd.toFixed(0)}–{entry.highUsd.toFixed(0)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono tabular-nums">${entry.valueUsd.toFixed(2)}</p>
                  <p className={`text-[10px] font-mono ${color}`}>{label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
