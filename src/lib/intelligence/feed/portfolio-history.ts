import { prisma } from "@/lib/prisma";

export interface PortfolioHistoryPoint {
  date: string; // YYYY-MM-DD
  value: number;
  cardCount: number; // how many owned instances contributed a real price to this day's value
}

type HistoryInstance = {
  variantId: string;
  purchaseDate: Date | null;
  purchasePrice: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Real day-by-day portfolio valuation — for each day, sums each owned
 * instance's price *as of that day* (the latest real PriceObservation on or
 * before it, falling back to purchasePrice, never fabricated/interpolated).
 * Replaces the old "cumulative purchase price at purchase date" chart, which
 * tracked when cards were added, not how their value actually moved.
 *
 * An instance with no purchaseDate (we don't know when it entered the
 * collection) is treated as owned for the whole window — the least-wrong
 * assumption we can make honestly, since we know it's owned *now* but not
 * since when. A day is only plotted if at least one instance had a real
 * price on it; days with zero contributing instances are omitted rather
 * than plotted as a fake zero.
 *
 * Always computes the full "all-time" series (cheap: bounded by real data,
 * not a fixed lookback) — the client-side range toggle slices this one
 * fetch rather than re-querying per range, matching the pattern already
 * used by price-history-chart.tsx / getPriceHistoryForVariants.
 */
export async function getPortfolioHistory(instances: HistoryInstance[]): Promise<PortfolioHistoryPoint[]> {
  if (instances.length === 0) return [];

  const variantIds = [...new Set(instances.map((i) => i.variantId))];
  const observations = await prisma.priceObservation.findMany({
    where: { variantId: { in: variantIds }, isOutlier: false },
    orderBy: { observedAt: "asc" },
    select: { variantId: true, priceUsd: true, observedAt: true },
  });

  const obsByVariant = new Map<string, { date: number; price: number }[]>();
  for (const o of observations) {
    if (!o.variantId) continue;
    const arr = obsByVariant.get(o.variantId) ?? [];
    arr.push({ date: o.observedAt.getTime(), price: o.priceUsd });
    obsByVariant.set(o.variantId, arr);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const purchaseDates = instances.filter((i) => i.purchaseDate).map((i) => i.purchaseDate!.getTime());
  const obsDates = observations.map((o) => o.observedAt.getTime());
  const earliest = Math.min(todayMs, ...(purchaseDates.length ? purchaseDates : [todayMs]), ...(obsDates.length ? obsDates : [todayMs]));
  const startMs = new Date(earliest).setHours(0, 0, 0, 0);

  const pointer = new Map<string, number>();
  const knownPrice = new Map<string, number>();
  const points: PortfolioHistoryPoint[] = [];

  for (let day = startMs; day <= todayMs; day += DAY_MS) {
    for (const [variantId, arr] of obsByVariant) {
      let idx = pointer.get(variantId) ?? 0;
      while (idx < arr.length && arr[idx].date <= day) {
        knownPrice.set(variantId, arr[idx].price);
        idx++;
      }
      pointer.set(variantId, idx);
    }

    let value = 0;
    let cardCount = 0;
    for (const inst of instances) {
      if (inst.purchaseDate && inst.purchaseDate.getTime() > day) continue; // not yet owned

      const price = knownPrice.get(inst.variantId) ?? inst.purchasePrice ?? null;
      if (price == null) continue; // no real number for this day — never fabricate one

      value += price;
      cardCount++;
    }

    if (cardCount > 0) {
      points.push({ date: new Date(day).toISOString().slice(0, 10), value, cardCount });
    }
  }

  return points;
}

export interface PortfolioChangeToday {
  valueUsd: number;
  changeAbs: number;
  changePercent: number | null;
  pricedCardCount: number;
}

/** Today vs. the previous plotted day — null if there's no prior point to compare against. */
export function getPortfolioChangeToday(history: PortfolioHistoryPoint[]): PortfolioChangeToday | null {
  if (history.length < 2) return null;
  const today = history[history.length - 1];
  const prev = history[history.length - 2];
  const changeAbs = today.value - prev.value;
  return {
    valueUsd: today.value,
    changeAbs,
    changePercent: prev.value > 0 ? (changeAbs / prev.value) * 100 : null,
    pricedCardCount: today.cardCount,
  };
}
