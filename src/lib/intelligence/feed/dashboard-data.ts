import { prisma } from "@/lib/prisma";
import { recalculateUserMetrics } from "../metrics/calculate";
import type { HealthFactors } from "../metrics/health-factors";
import { generateInsights } from "../insights/generator";
import { getPortfolioHistory, getPortfolioChangeToday, type PortfolioHistoryPoint, type PortfolioChangeToday } from "./portfolio-history";
import { getCatalogTotals } from "../market/catalog-widgets";
import { groupEvents, type GroupedActivity } from "./activity";
import { getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";

export type { GroupedActivity };

export type { PortfolioHistoryPoint, PortfolioChangeToday, HealthFactors };

export interface FranchiseBreakdownEntry {
  franchiseId: string;
  franchiseName: string;
  universeName: string;
  cardCount: number;
  uniqueCardCount: number;
  portfolioValue: number;
  estimatedSpareValue: number;
  totalCardCount: number | null; // null when the franchise's total isn't known (shouldn't happen in practice)
  completionPercent: number | null;
}

export interface CollectionGapEntry {
  setId: string;
  setName: string;
  franchiseName: string;
  ownedCount: number;
  totalCount: number;
  completionPercent: number;
  remaining: number;
}

// Per-Set $ value, across every franchise (F1, football, Pokémon, ...) — the
// franchiseBreakdown above already sums by franchise; this is the same
// portfolioValue math one level more granular (e.g. "Turbo Attax 2020"
// vs. "Turbo Attax 2025" individually, not just "Formula 1" combined).
export interface SetValueEntry {
  setId: string;
  setName: string;
  franchiseName: string;
  cardCount: number;
  portfolioValue: number;
}

export interface VolatileEntry {
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  imageUrl: string | null;
  valueUsd: number;
  lowUsd: number;
  highUsd: number;
  volatilityPercent: number; // (high - low) / value, as a %
}

export interface DashboardData {
  metrics: Awaited<ReturnType<typeof recalculateUserMetrics>>["metrics"];
  healthFactors: HealthFactors;
  insights: Awaited<ReturnType<typeof prisma.insight.findMany>>;
  portfolioHistory: PortfolioHistoryPoint[];
  portfolioChange7dPercent: number | null;
  portfolioChangeToday: PortfolioChangeToday | null;
  franchiseBreakdown: FranchiseBreakdownEntry[];
  collectionGaps: CollectionGapEntry[];
  setValueBreakdown: SetValueEntry[];
  mostVolatile: VolatileEntry[];
  groupedActivity: GroupedActivity[];
  wishlistCount: number;
}

const INSTANCE_INCLUDE = {
  variant: {
    include: {
      card: {
        include: {
          set: { include: { series: { include: { franchise: { include: { universe: true } } } } } },
        },
      },
      currentPrice: true,
    },
  },
} as const;

/**
 * The single consolidated fetch for the whole dashboard. Before this, a
 * dashboard load fired three near-identical `prisma.instance.findMany({
 * where: { userId } })` calls independently (recalculateUserMetrics,
 * generateInsights, getDashboardExtended) plus a fourth ad-hoc query for
 * recent events — the exact N+1-flavored pattern that gets worse as a
 * collection grows. This fetches the owned instances once and derives
 * everything owned-collection-related from that same array in memory.
 *
 * Catalog-wide widgets (market movers, top valuable cards, recently priced)
 * intentionally do NOT go through here — they don't touch Instance/userId at
 * all, and live in intelligence/market/catalog-widgets.ts instead.
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [instances, rawEvents, wishlist] = await Promise.all([
    prisma.instance.findMany({
      where: { userId },
      include: INSTANCE_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 40, // raw rows to group, not the display count — grouping can fold many into one entry
      include: { instance: { include: { variant: { include: { card: { include: { set: true } } } } } } },
    }),
    prisma.wishlist.findMany({ where: { userId }, include: { variant: { include: { currentPrice: true } }, card: { include: { variants: { include: { currentPrice: true } } } } } }),
  ]);
  const wishlistCount = wishlist.length;
  const groupedActivity = groupEvents(rawEvents).slice(0, 6);

  const [{ metrics, healthFactors }, insights] = await Promise.all([
    recalculateUserMetrics(userId, instances, wishlist),
    generateInsights(userId, instances, wishlist).then(() =>
      prisma.insight.findMany({
        where: { userId, status: "NEW", dismissedAt: null },
        orderBy: { score: "desc" },
        take: 5,
      })
    ),
  ]);

  if (instances.length === 0) {
    return {
      metrics,
      healthFactors,
      insights,
      portfolioHistory: [],
      portfolioChange7dPercent: null,
      portfolioChangeToday: null,
      franchiseBreakdown: [],
      collectionGaps: [],
      setValueBreakdown: [],
      mostVolatile: [],
      groupedActivity,
      wishlistCount,
    };
  }

  // ─── Portfolio History (real day-by-day mark-to-market valuation) ───
  const portfolioHistory = await getPortfolioHistory(
    instances.map((i) => ({ variantId: i.variantId, purchaseDate: i.purchaseDate, purchasePrice: i.purchasePrice }))
  );
  const portfolioChangeToday = getPortfolioChangeToday(portfolioHistory);

  let portfolioChange7dPercent: number | null = null;
  if (portfolioHistory.length >= 2) {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const baseline = [...portfolioHistory].reverse().find((p) => new Date(p.date).getTime() <= sevenDaysAgoMs);
    if (baseline && baseline.value > 0) {
      const latest = portfolioHistory[portfolioHistory.length - 1].value;
      portfolioChange7dPercent = ((latest - baseline.value) / baseline.value) * 100;
    }
  }

  // ─── Franchise Breakdown ────────────────────────────────────────────
  const franchiseMap = new Map<
    string,
    {
      franchiseName: string;
      universeName: string;
      cardCount: number;
      uniqueCardIds: Set<string>;
      portfolioValue: number;
      spareValue: number;
    }
  >();

  const variantCounts = new Map<string, number>();
  for (const inst of instances) {
    variantCounts.set(inst.variantId, (variantCounts.get(inst.variantId) ?? 0) + 1);
  }

  const setValueMap = new Map<string, { setName: string; franchiseName: string; cardCount: number; portfolioValue: number }>();

  for (const inst of instances) {
    const franchise = inst.variant.card.set.series.franchise;
    const entry = franchiseMap.get(franchise.id) ?? {
      franchiseName: franchise.name,
      universeName: franchise.universe?.name ?? "Unknown",
      cardCount: 0,
      uniqueCardIds: new Set<string>(),
      portfolioValue: 0,
      spareValue: 0,
    };

    entry.cardCount++;
    entry.uniqueCardIds.add(inst.variant.card.id);

    const marketPrice = inst.variant.currentPrice?.marketPriceUsd ?? inst.purchasePrice ?? 0;
    const count = variantCounts.get(inst.variantId) ?? 1;
    if (count > 1) {
      entry.portfolioValue += marketPrice;
      entry.spareValue += marketPrice * (count - 1);
    } else {
      entry.portfolioValue += marketPrice;
    }

    franchiseMap.set(franchise.id, entry);

    const set = inst.variant.card.set;
    const setEntry = setValueMap.get(set.id) ?? { setName: set.name, franchiseName: franchise.name, cardCount: 0, portfolioValue: 0 };
    setEntry.cardCount++;
    setEntry.portfolioValue += marketPrice;
    setValueMap.set(set.id, setEntry);
  }

  const setValueBreakdown: SetValueEntry[] = [...setValueMap.entries()]
    .map(([setId, entry]) => ({ setId, ...entry }))
    .sort((a, b) => b.portfolioValue - a.portfolioValue);

  const { franchiseTotals, setTotals } = await getCatalogTotals();

  const franchiseBreakdown: FranchiseBreakdownEntry[] = [...franchiseMap.entries()]
    .map(([franchiseId, entry]) => {
      const totalCardCount = franchiseTotals[franchiseId] ?? null;
      return {
        franchiseId,
        franchiseName: entry.franchiseName,
        universeName: entry.universeName,
        cardCount: entry.cardCount,
        uniqueCardCount: entry.uniqueCardIds.size,
        portfolioValue: entry.portfolioValue,
        estimatedSpareValue: entry.spareValue,
        totalCardCount,
        completionPercent: totalCardCount ? (entry.uniqueCardIds.size / totalCardCount) * 100 : null,
      };
    })
    .sort((a, b) => b.portfolioValue - a.portfolioValue);

  // ─── Biggest Collection Gaps ────────────────────────────────────────
  // Per-Set completion (distinct from the per-Project completionScore above)
  // across every set the user owns at least one card in, ranked closest to
  // done first — "you're N cards away" is the whole point.
  const ownedCardsBySet = new Map<string, Set<string>>();
  for (const inst of instances) {
    const setId = inst.variant.card.set.id;
    const set = ownedCardsBySet.get(setId) ?? new Set<string>();
    set.add(inst.variant.card.id);
    ownedCardsBySet.set(setId, set);
  }

  const collectionGaps: CollectionGapEntry[] = [...ownedCardsBySet.entries()]
    .map(([setId, ownedIds]) => {
      const total = setTotals[setId];
      if (!total || total.totalCards === 0) return null;
      const ownedCount = ownedIds.size;
      return {
        setId,
        setName: total.setName,
        franchiseName: total.franchiseName,
        ownedCount,
        totalCount: total.totalCards,
        completionPercent: (ownedCount / total.totalCards) * 100,
        remaining: total.totalCards - ownedCount,
      };
    })
    .filter((g): g is CollectionGapEntry => g != null && g.remaining > 0)
    .sort((a, b) => b.completionPercent - a.completionPercent)
    .slice(0, 5);

  // ─── Most Volatile ──────────────────────────────────────────────────
  // (high - low) / estimate, over owned variants that have a real range —
  // no new query, same instances/currentPrice data every other section here
  // already has.
  const volatileCandidates = instances.filter((inst) => {
    const cp = inst.variant.currentPrice;
    return cp?.marketPriceUsd != null && cp.lowestListingUsd != null && cp.highestListingUsd != null && cp.highestListingUsd > cp.lowestListingUsd;
  });
  const seenVariants = new Set<string>();
  const volatileImageCardIds = [...new Set(volatileCandidates.map((i) => i.variant.card.id))];
  const volatileImages = await getImagesForEntities("Card", volatileImageCardIds);

  const mostVolatile: VolatileEntry[] = volatileCandidates
    .filter((inst) => {
      if (seenVariants.has(inst.variantId)) return false;
      seenVariants.add(inst.variantId);
      return true;
    })
    .map((inst) => {
      const cp = inst.variant.currentPrice!;
      const value = cp.marketPriceUsd!;
      const low = cp.lowestListingUsd!;
      const high = cp.highestListingUsd!;
      const images = volatileImages.get(inst.variant.card.id) ?? [];
      const imageUrl = pickPrimaryImage(images)?.url ?? null;
      return {
        cardId: inst.variant.card.id,
        cardName: inst.variant.card.name,
        cardNumber: inst.variant.card.number,
        setName: inst.variant.card.set.name,
        imageUrl,
        valueUsd: value,
        lowUsd: low,
        highUsd: high,
        volatilityPercent: value > 0 ? ((high - low) / value) * 100 : 0,
      };
    })
    .sort((a, b) => b.volatilityPercent - a.volatilityPercent)
    .slice(0, 6);

  return {
    metrics,
    healthFactors,
    insights,
    portfolioHistory,
    portfolioChange7dPercent,
    portfolioChangeToday,
    franchiseBreakdown,
    collectionGaps,
    setValueBreakdown,
    mostVolatile,
    groupedActivity,
    wishlistCount,
  };
}
