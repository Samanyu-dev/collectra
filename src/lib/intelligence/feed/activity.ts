export interface GroupedActivity {
  type: string;
  setName: string | null;
  count: number;
  latestTimestamp: Date;
}

type ActivityEvent = {
  type: string;
  timestamp: Date;
  instance: { variant: { card: { set: { name: string } } } } | null;
};

/**
 * Folds consecutive same-type events for the same set on the same calendar
 * day into one entry — "Added 14 Match Attax cards" instead of 14 separate
 * "Added" rows. Requires events pre-sorted by timestamp descending (the
 * query that feeds this already orders that way); only ever merges adjacent
 * rows, never re-sorts, so the "latest" timestamp of a group is just the
 * first row seen for it.
 */
export function groupEvents(events: ActivityEvent[]): GroupedActivity[] {
  const groups: GroupedActivity[] = [];

  for (const e of events) {
    const setName = e.instance?.variant.card.set.name ?? null;
    const day = e.timestamp.toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    const lastDay = last ? last.latestTimestamp.toISOString().slice(0, 10) : null;

    if (last && last.type === e.type && last.setName === setName && lastDay === day) {
      last.count++;
    } else {
      groups.push({ type: e.type, setName, count: 1, latestTimestamp: e.timestamp });
    }
  }

  return groups;
}
