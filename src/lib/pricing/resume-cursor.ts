// Phase 5.1 — incremental catalog sync. Pure resume logic, no DB/network I/O,
// so it's testable without mocking anything.

/**
 * Given the full, current list of items (in whatever order the upstream API
 * returns them) and the last-completed item's own stable id, returns the
 * index to resume from.
 *
 * Deliberately keyed on the item's own id, not an array position — an array
 * index would silently skip or reprocess items if the upstream ever reorders
 * or inserts. Wraps to 0 once the cursor was the last item (a full lap just
 * finished) or points at an item that no longer exists (upstream changed
 * under us) — both cases are safe to just restart from the beginning.
 */
export function resolveStartIndex(items: Array<{ id: string }>, cursor: string | null): number {
  if (!cursor || items.length === 0) return 0;
  const idx = items.findIndex((i) => i.id === cursor);
  if (idx === -1) return 0;
  const next = idx + 1;
  return next >= items.length ? 0 : next;
}
