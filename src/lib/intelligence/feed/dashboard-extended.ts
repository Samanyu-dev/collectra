import { prisma } from "@/lib/prisma";

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface MarketMover {
  variantId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  franchiseName: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  changeDirection: "up" | "down";
}

export interface FranchiseBreakdownEntry {
  franchiseId: string;
  franchiseName: string;
  universeName: string;
  cardCount: number;
  uniqueCardCount: number;
  portfolioValue: number;
  estimatedSpareValue: number;
}

export interface DashboardExtended {
  portfolioHistory: PortfolioHistoryPoint[];
  portfolioChange7dPercent: number | null;
  marketMovers: MarketMover[];
  franchiseBreakdown: FranchiseBreakdownEntry[];
}

/**
 * Extended dashboard data that supplements the intelligence feed.
 * Computed on demand — not cached yet, but shaped for easy caching later.
 */
export async function getDashboardExtended(userId: string): Promise<DashboardExtended> {
  const instances = await prisma.instance.findMany({
    where: { userId },
    include: {
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
    },
    orderBy: { createdAt: "desc" },
  });

  if (instances.length === 0) {
    return {
      portfolioHistory: [],
      portfolioChange7dPercent: null,
      marketMovers: [],
      franchiseBreakdown: [],
    };
  }

  // ─── Portfolio History ──────────────────────────────────────────────
  const datedInstances = instances
    .filter((i) => i.purchaseDate)
    .sort((a, b) => a.purchaseDate!.getTime() - b.purchaseDate!.getTime());

  let cumulative = 0;
  const portfolioHistory = datedInstances.map((i) => {
    cumulative += i.variant.currentPrice?.marketPriceUsd ?? i.purchasePrice ?? 0;
    return { date: i.purchaseDate!.toISOString().slice(0, 10), value: cumulative };
  });

  let portfolioChange7dPercent: number | null = null;
  if (portfolioHistory.length >= 2) {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const baseline = [...portfolioHistory].reverse().find((p) => new Date(p.date).getTime() <= sevenDaysAgoMs);
    if (baseline && baseline.value > 0) {
      const latest = portfolioHistory[portfolioHistory.length - 1].value;
      portfolioChange7dPercent = ((latest - baseline.value) / baseline.value) * 100;
    }
  }

  // ─── Market Movers ──────────────────────────────────────────────────
  // For each variant the user owns, compare the two most recent PriceObservations
  const variantIds = [...new Set(instances.map((i) => i.variantId))];
  const priceObs = await prisma.priceObservation.findMany({
    where: { variantId: { in: variantIds }, isOutlier: false },
    orderBy: { observedAt: "desc" },
    take: variantIds.length * 2, // at most 2 per variant
  });

  // Group observations by variant, keep latest two
  const obsByVariant = new Map<string, typeof priceObs>();
  for (const o of priceObs) {
    if (!o.variantId) continue;
    const list = obsByVariant.get(o.variantId) ?? [];
    if (list.length < 2) list.push(o);
    obsByVariant.set(o.variantId, list);
  }

  const cardInfoByVariant = new Map(
    instances.map((i) => [
      i.variantId,
      {
        cardId: i.variant.card.id,
        cardName: i.variant.card.name,
        cardNumber: i.variant.card.number,
        setName: i.variant.card.set.name,
        franchiseName: i.variant.card.set.series.franchise.name,
      },
    ])
  );

  const marketMovers: MarketMover[] = [];
  for (const [variantId, obs] of obsByVariant) {
    if (obs.length < 2 || obs[1].priceUsd <= 0) continue;
    const currentPrice = obs[0].priceUsd;
    const previousPrice = obs[1].priceUsd;
    const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    if (Math.abs(changePercent) < 1) continue; // filter noise

    const info = cardInfoByVariant.get(variantId);
    if (!info) continue;

    marketMovers.push({
      variantId,
      cardId: info.cardId,
      cardName: info.cardName,
      cardNumber: info.cardNumber,
      setName: info.setName,
      franchiseName: info.franchiseName,
      currentPrice,
      previousPrice,
      changePercent,
      changeDirection: changePercent >= 0 ? "up" : "down",
    });
  }

  // Sort by absolute change, top movers first
  marketMovers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

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
      // Count primary at full value, spares at "spare value"
      entry.portfolioValue += marketPrice;
      entry.spareValue += marketPrice * (count - 1);
    } else {
      entry.portfolioValue += marketPrice;
    }

    franchiseMap.set(franchise.id, entry);
  }

  const franchiseBreakdown: FranchiseBreakdownEntry[] = [...franchiseMap.entries()]
    .map(([franchiseId, entry]) => ({
      franchiseId,
      franchiseName: entry.franchiseName,
      universeName: entry.universeName,
      cardCount: entry.cardCount,
      uniqueCardCount: entry.uniqueCardIds.size,
      portfolioValue: entry.portfolioValue,
      estimatedSpareValue: entry.spareValue,
    }))
    .sort((a, b) => b.portfolioValue - a.portfolioValue);

  return {
    portfolioHistory,
    portfolioChange7dPercent,
    marketMovers: marketMovers.slice(0, 8),
    franchiseBreakdown,
  };
}