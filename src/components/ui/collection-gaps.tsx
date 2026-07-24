import Link from "next/link";
import { Target } from "lucide-react";
import type { CollectionGapEntry } from "@/lib/intelligence/feed/dashboard-data";

export function CollectionGapsSection({ gaps }: { gaps: CollectionGapEntry[] }) {
  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <Target size={16} /> Closest to Complete
      </div>

      {gaps.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">Start a set to see how close you are to finishing it.</p>
      ) : (
        <div className="space-y-4">
          {gaps.map((g) => (
            <Link key={g.setId} href={`/collections/${g.setId}`} className="block group">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{g.setName}</span>
                <span className="text-sm font-mono text-foreground/50 shrink-0 ml-2">{g.completionPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-foreground/8 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-primary/60 group-hover:bg-primary transition-colors"
                  style={{ width: `${g.completionPercent}%` }}
                />
              </div>
              <p className="text-xs text-foreground/40">
                {g.remaining} card{g.remaining === 1 ? "" : "s"} remaining
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
