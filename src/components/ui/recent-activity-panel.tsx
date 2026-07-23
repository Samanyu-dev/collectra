import { Camera, Plus, Upload, Tag, CheckCircle2, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import type { ActivityEntry } from "@/lib/collection/workspace";

const ICONS: Record<Exclude<ActivityEntry["kind"], "price_move">, LucideIcon> = {
  added: Plus,
  scanned: Camera,
  imported: Upload,
  listed: Tag,
  sold: CheckCircle2,
};

function daysAgo(date: Date): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDate = new Date(date);
  startOfDate.setHours(0, 0, 0, 0);
  return Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);
}

function timeGroupLabel(date: Date): string {
  const d = daysAgo(date);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return date.toLocaleDateString();
}

/**
 * Batched feed of newly added/scanned/imported/listed cards and real price
 * moves. Copy always says "Added"/"Imported", never "Collected" — a bulk CSV
 * import can create hundreds of rows in one burst, which isn't "collecting"
 * (see workspace.ts's batching logic, which is what keeps this list from
 * rendering hundreds of individual identical lines).
 */
export function RecentActivityPanel({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-foreground/40">No recent activity yet.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {entries.map((entry) => {
        const timestamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
        const isDown = entry.kind === "price_move" && entry.label.startsWith("-");
        const Icon = entry.kind === "price_move" ? (isDown ? TrendingDown : TrendingUp) : ICONS[entry.kind];
        const iconTone =
          entry.kind === "price_move"
            ? isDown
              ? "bg-red-500/10 text-red-400"
              : "bg-green-500/10 text-green-400"
            : "bg-foreground/10 text-foreground/60";

        return (
          <li key={entry.id} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${iconTone}`}>
              <Icon size={11} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-foreground/90">{entry.label}</span>
              {entry.cardName && (entry.kind === "listed" || entry.kind === "sold" || entry.kind === "price_move") && (
                <span className="text-foreground/50"> · {entry.cardName}</span>
              )}
              <span className="block text-[10px] text-foreground/35 font-mono">{timeGroupLabel(timestamp)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
