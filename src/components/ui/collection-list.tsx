"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CollectionCard } from "./collection-card";
import type { CollectionItem } from "@/lib/collection/workspace";

const ROW_HEIGHT = 64;

/** List display mode — no list/table view of instances existed anywhere in the app before this. Fully virtualized: fixed row height, the mode where it matters most. */
export function CollectionList({ items }: { items: CollectionItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  if (items.length === 0) {
    return <div className="py-24 text-center text-foreground/40 font-mono text-sm">No cards match your filters.</div>;
  }

  return (
    <div ref={parentRef} className="h-[calc(100vh-320px)] min-h-[420px] overflow-y-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
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
              className="pb-2"
            >
              <CollectionCard variant="list" item={item} priority={virtualRow.index === 0} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
