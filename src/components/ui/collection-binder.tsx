"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CollectionCard } from "./collection-card";
import type { CollectionItem } from "@/lib/collection/workspace";

const SLOTS_PER_PAGE = 12;

/**
 * Binder display mode — V1 stays simple per review: fixed slots per page,
 * pagination, page-turn animation only. No drag-and-drop or manual card
 * positioning. Paginated, so no virtualization is needed here.
 */
export function CollectionBinder({ items }: { items: CollectionItem[] }) {
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const chunks: CollectionItem[][] = [];
    for (let i = 0; i < items.length; i += SLOTS_PER_PAGE) chunks.push(items.slice(i, i + SLOTS_PER_PAGE));
    return chunks;
  }, [items]);

  const totalPages = Math.max(pages.length, 1);
  const safePage = Math.min(page, totalPages - 1);
  const currentSlots = pages[safePage] ?? [];

  if (items.length === 0) {
    return <div className="py-24 text-center text-foreground/40 font-mono text-sm">No cards match your filters.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative min-h-[420px] rounded-2xl border border-foreground/10 bg-foreground/5 p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={safePage}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-3 sm:grid-cols-4 gap-4"
          >
            {currentSlots.map((item) => (
              <CollectionCard key={item.variantId} variant="binder" item={item} />
            ))}
            {Array.from({ length: Math.max(SLOTS_PER_PAGE - currentSlots.length, 0) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-[63/88] rounded-lg border border-dashed border-foreground/10" />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={safePage === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-foreground/5 hover:bg-foreground/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="text-xs font-mono text-foreground/40">
          Page {safePage + 1} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
          disabled={safePage >= totalPages - 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-foreground/5 hover:bg-foreground/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
