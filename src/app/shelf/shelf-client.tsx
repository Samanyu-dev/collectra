"use client";

import { useMemo, useState } from "react";
import { CollectionOverview } from "@/components/ui/collection-overview";
import { QuickFilterPills, applyQuickFilter, type QuickFilterKey } from "@/components/ui/quick-filter-pills";
import { CollectionControls, type DisplayMode, type SortKey } from "@/components/ui/collection-controls";
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
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    let items = applyQuickFilter(workspace.collection, quickFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (i) => i.cardName.toLowerCase().includes(q) || i.cardNumber.toLowerCase().includes(q) || i.setName.toLowerCase().includes(q)
      );
    }

    if (sort === "name-asc") {
      items = [...items].sort((a, b) => a.cardName.localeCompare(b.cardName));
    } else if (sort === "price-desc" || sort === "price-asc") {
      // Unpriced cards always sink to the bottom regardless of direction —
      // "no data" at the top of a price sort reads as broken, not neutral.
      const dir = sort === "price-desc" ? -1 : 1;
      items = [...items].sort((a, b) => {
        const av = a.price.valueUsd;
        const bv = b.price.valueUsd;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (av - bv) * dir;
      });
    }

    return items;
  }, [workspace.collection, quickFilter, search, sort]);

  return (
    <div className="space-y-8">
      <CollectionOverview overview={workspace.overview} />
      <QuickFilterPills active={quickFilter} onChange={setQuickFilter} />
      <CollectionControls search={search} onSearchChange={setSearch} mode={mode} onModeChange={setMode} sort={sort} onSortChange={setSort} />

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
