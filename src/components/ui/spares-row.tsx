"use client";

import { useMemo, useState } from "react";
import { CollectionCard } from "./collection-card";
import type { SpareGroup, CollectionItem } from "@/lib/collection/workspace";

type SortKey = "value" | "count" | "newest" | "alpha";

const SORTERS: Record<SortKey, (a: SpareGroup, b: SpareGroup) => number> = {
  value: (a, b) => b.estimatedSpareValue - a.estimatedSpareValue,
  count: (a, b) => b.spareCount - a.spareCount,
  newest: (a, b) => new Date(b.latestAddedAt).getTime() - new Date(a.latestAddedAt).getTime(),
  alpha: (a, b) => a.cardName.localeCompare(b.cardName),
};

/** Adapts a SpareGroup into CollectionCard's shared item shape — per-unit spare value, quantity = spare count. */
function toCollectionItem(spare: SpareGroup): CollectionItem {
  return {
    variantId: spare.variantId,
    cardId: spare.cardId,
    cardName: spare.cardName,
    cardNumber: spare.cardNumber,
    setName: spare.setName,
    franchiseName: spare.franchiseName,
    printingName: spare.printingName,
    parallelName: spare.parallelName,
    isFoil: spare.isFoil,
    images: spare.images,
    variantImages: spare.variantImages,
    scanMediaUrl: null,
    quantity: spare.spareCount,
    primaryInstanceId: spare.instanceIds[0],
    createdAt: spare.latestAddedAt,
    condition: "",
    isGraded: false,
    isFavorite: false,
    price: { valueUsd: spare.estimatedUnitValue, confidenceLabel: "MEDIUM", observationCount: 0, lastUpdated: null, sources: [] },
    purchasePrice: null,
    acquisitionSource: "Unknown",
    activeListingId: spare.activeListingId,
    isWishlisted: false,
  };
}

/** Full-width horizontal-scroll section below the main grid — variants with quantity > 1 only, by definition, so no separate "hide zero spares" toggle is needed. */
export function SparesRow({ spares }: { spares: SpareGroup[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const sorted = useMemo(() => [...spares].sort(SORTERS[sortKey]), [spares, sortKey]);

  if (spares.length === 0) return null;

  const totalCount = spares.reduce((n, s) => n + s.spareCount, 0);
  const totalValue = spares.reduce((sum, s) => sum + s.estimatedSpareValue, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-display font-bold">Spares</h2>
          <p className="text-xs text-foreground/50">
            {totalCount} spare card{totalCount === 1 ? "" : "s"} · Est. ${totalValue.toFixed(0)}
          </p>
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort spares by"
          className="bg-foreground/5 border border-foreground/10 rounded-full px-3 py-1.5 text-xs focus:outline-none"
        >
          <option value="value">Most valuable</option>
          <option value="count">Most duplicated</option>
          <option value="newest">Newest</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {sorted.map((spare) => (
          <div key={spare.variantId} className="w-32 shrink-0">
            <CollectionCard variant="spare" item={toCollectionItem(spare)} />
          </div>
        ))}
      </div>
    </section>
  );
}
