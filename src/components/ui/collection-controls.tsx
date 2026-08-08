"use client";

import { LayoutGrid, BookOpen, List as ListIcon, ArrowUpDown, type LucideIcon } from "lucide-react";

export type DisplayMode = "grid" | "binder" | "list";
export type SortKey = "recent" | "price-desc" | "price-asc" | "name-asc";

const MODES: { key: DisplayMode; label: string; icon: LucideIcon }[] = [
  { key: "grid", label: "Grid", icon: LayoutGrid },
  { key: "binder", label: "Binder", icon: BookOpen },
  { key: "list", label: "List", icon: ListIcon },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently Added" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "name-asc", label: "Name: A to Z" },
];

export function CollectionControls({
  search,
  onSearchChange,
  mode,
  onModeChange,
  sort,
  onSortChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  mode: DisplayMode;
  onModeChange: (m: DisplayMode) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search your collection..."
        aria-label="Search your collection"
        className="w-full sm:w-64 bg-foreground/5 border border-foreground/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="relative">
          <ArrowUpDown size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort your collection"
            className="appearance-none bg-foreground/5 border border-foreground/10 rounded-full pl-8 pr-8 py-2 text-xs font-medium text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            {SORTS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-foreground/5 border border-foreground/10 rounded-full p-1">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onModeChange(key)}
              aria-pressed={mode === key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === key ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
