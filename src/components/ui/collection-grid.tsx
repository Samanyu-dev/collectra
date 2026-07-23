"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CollectionCard } from "./collection-card";
import type { CollectionItem } from "@/lib/collection/workspace";

// Mirrors the Tailwind breakpoints used by the grid className below — must
// stay in sync so JS row-chunking matches what CSS actually renders.
function useColumnCount(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      if (w >= 1280) setColumns(6);
      else if (w >= 1024) setColumns(5);
      else if (w >= 768) setColumns(4);
      else if (w >= 640) setColumns(3);
      else setColumns(2);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  return columns;
}

/**
 * Grid display mode — replaces DisplayCase's role for /shelf going forward.
 * `display-case.tsx` itself is untouched (kept as a rollback reference), just
 * no longer imported here. First real consumer of @tanstack/react-virtual in
 * this app: virtualizes by row since the library has no native masonry mode.
 */
export function CollectionGrid({ items }: { items: CollectionItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = useColumnCount(parentRef);

  const rows = useMemo(() => {
    const chunks: CollectionItem[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      chunks.push(items.slice(i, i + columns));
    }
    return chunks;
  }, [items, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 340,
    overscan: 3,
  });

  if (items.length === 0) {
    return <div className="py-24 text-center text-foreground/40 font-mono text-sm">No cards match your filters.</div>;
  }

  return (
    <div ref={parentRef} className="h-[calc(100vh-320px)] min-h-[420px] overflow-y-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-6"
            >
              {row.map((item, idx) => (
                <CollectionCard key={item.variantId} variant="collection" item={item} priority={virtualRow.index === 0 && idx < 2} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
