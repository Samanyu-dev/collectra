"use client";

import type { CollectionItem } from "@/lib/collection/workspace";

export type QuickFilterKey = "scanned" | "added" | "listed";

const FILTERS: { key: QuickFilterKey; label: string }[] = [
  { key: "scanned", label: "Recently Scanned" },
  { key: "added", label: "Recently Added" },
  { key: "listed", label: "Recently Listed" },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Client-side only — filters the already-fetched workspace payload, no new query, instant. */
export function applyQuickFilter(items: CollectionItem[], key: QuickFilterKey | null): CollectionItem[] {
  if (!key) return items;
  if (key === "scanned") return items.filter((i) => i.acquisitionSource === "Scanner");
  if (key === "listed") return items.filter((i) => i.activeListingId != null);
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return items.filter((i) => new Date(i.createdAt).getTime() >= cutoff);
}

export function QuickFilterPills({ active, onChange }: { active: QuickFilterKey | null; onChange: (key: QuickFilterKey | null) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(active === f.key ? null : f.key)}
          aria-pressed={active === f.key}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            active === f.key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-foreground/5 text-foreground/60 border-foreground/10 hover:bg-foreground/10"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
