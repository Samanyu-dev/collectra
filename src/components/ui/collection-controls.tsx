"use client";

import { LayoutGrid, BookOpen, List as ListIcon, type LucideIcon } from "lucide-react";

export type DisplayMode = "grid" | "binder" | "list";

const MODES: { key: DisplayMode; label: string; icon: LucideIcon }[] = [
  { key: "grid", label: "Grid", icon: LayoutGrid },
  { key: "binder", label: "Binder", icon: BookOpen },
  { key: "list", label: "List", icon: ListIcon },
];

export function CollectionControls({
  search,
  onSearchChange,
  mode,
  onModeChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  mode: DisplayMode;
  onModeChange: (m: DisplayMode) => void;
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
      <div className="flex items-center gap-1 bg-foreground/5 border border-foreground/10 rounded-full p-1 self-start sm:self-auto">
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
  );
}
