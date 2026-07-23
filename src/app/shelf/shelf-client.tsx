"use client";

import { useMemo, useState } from "react";
import { CollectionOverview } from "@/components/ui/collection-overview";
import { QuickFilterPills, applyQuickFilter, type QuickFilterKey } from "@/components/ui/quick-filter-pills";
import { CollectionControls, type DisplayMode } from "@/components/ui/collection-controls";
import { CollectionGrid } from "@/components/ui/collection-grid";
import { CollectionList } from "@/components/ui/collection-list";
import { CollectionBinder } from "@/components/ui/collection-binder";
import { CollectionSidebar } from "@/components/ui/collection-sidebar";
import { SparesRow } from "@/components/ui/spares-row";
import type { CollectionWorkspace } from "@/lib/collection/workspace";

/**
 * Owns all page-level UI state (search, quick filter, display mode). Data
 * itself is entirely pre-shaped by getCollectionWorkspace() server-side —
 * this component never talks to Prisma.
 */
export function ShelfClient({ workspace }: { workspace: CollectionWorkspace }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<DisplayMode>("grid");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey | null>(null);

  const filtered = useMemo(() => {
    let items = applyQuickFilter(workspace.collection, quickFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (i) => i.cardName.toLowerCase().includes(q) || i.cardNumber.toLowerCase().includes(q) || i.setName.toLowerCase().includes(q)
      );
    }
    return items;
  }, [workspace.collection, quickFilter, search]);

  return (
    <div className="space-y-8">
      <CollectionOverview overview={workspace.overview} />
      <QuickFilterPills active={quickFilter} onChange={setQuickFilter} />
      <CollectionControls search={search} onSearchChange={setSearch} mode={mode} onModeChange={setMode} />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {mode === "grid" && <CollectionGrid items={filtered} />}
          {mode === "list" && <CollectionList items={filtered} />}
          {mode === "binder" && <CollectionBinder items={filtered} />}
        </div>
        <CollectionSidebar overview={workspace.overview} sidebar={workspace.sidebar} />
      </div>

      <SparesRow spares={workspace.spares} />
    </div>
  );
}
