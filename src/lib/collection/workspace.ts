import { prisma } from "@/lib/prisma";
import { getImagesForEntities, mediaUrl, type SimpleImage } from "@/lib/media/resolve";
import { getIntelligenceFeed } from "@/lib/intelligence/feed/service";
import { toPriceDisplay } from "@/lib/pricing/display";
import type { PriceTagData } from "@/components/ui/price-tag";

export interface CollectionItem {
  variantId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  franchiseName: string;
  printingName: string | null;
  parallelName: string | null;
  isFoil: boolean;
  images: SimpleImage[];
  variantImages: SimpleImage[];
  scanMediaUrl: string | null;
  quantity: number;
  primaryInstanceId: string;
  createdAt: Date;
  condition: string;
  isGraded: boolean;
  isFavorite: boolean;
  price: PriceTagData;
  purchasePrice: number | null;
  acquisitionSource: "Scanner" | "Manual" | "Import" | "Unknown";
  activeListingId: string | null;
  isWishlisted: boolean;
}

export interface SpareGroup {
  variantId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  franchiseName: string;
  printingName: string | null;
  parallelName: string | null;
  isFoil: boolean;
  images: SimpleImage[];
  variantImages: SimpleImage[];
  spareCount: number;
  estimatedSpareValue: number;
  estimatedUnitValue: number;
  instanceIds: string[];
  activeListingId: string | null;
  latestAddedAt: Date;
}

export interface ActivityEntry {
  id: string;
  kind: "added" | "scanned" | "imported" | "listed" | "sold" | "price_move";
  label: string;
  cardName?: string;
  timestamp: Date;
  count?: number;
}

export interface SetProgressEntry {
  setId: string;
  setName: string;
  franchiseName: string;
  owned: number;
  total: number;
  percent: number;
  missing: number;
  nextMilestonePercent: number | null;
  cardsToNextMilestone: number;
  teams: { teamId: string; teamName: string; owned: number; total: number }[];
}

export interface Breakdown {
  id: string;
  name: string;
  count: number;
}

export interface CollectionWorkspace {
  overview: {
    portfolioValue: number;
    healthScore: number;
    completionScore: number;
    unrealizedGain: number;
    unrealizedGainPercent: number | null;
    portfolioChange7dPercent: number | null;
    totalCards: number;
    uniqueCards: number;
    spareCount: number;
    avgCardValue: number;
  };
  collection: CollectionItem[];
  spares: SpareGroup[];
  sidebar: {
    recentActivity: ActivityEntry[];
    setProgress: SetProgressEntry[];
    topTeams: Breakdown[];
    topSets: Breakdown[];
    topPlayers: Breakdown[];
    portfolio: { history: { date: string; value: number }[] } | null;
  };
}

const CREATION_EVENT_TYPES = ["CARD_ADDED", "CARD_SCANNED", "IMPORT_COMPLETED"] as const;
const BATCH_WINDOW_MS = 10_000; // consecutive same-type creation events within this gap count as one batch (e.g. one CSV import run)

function emptyWorkspace(): CollectionWorkspace {
  return {
    overview: {
      portfolioValue: 0,
      healthScore: 0,
      completionScore: 0,
      unrealizedGain: 0,
      unrealizedGainPercent: null,
      portfolioChange7dPercent: null,
      totalCards: 0,
      uniqueCards: 0,
      spareCount: 0,
      avgCardValue: 0,
    },
    collection: [],
    spares: [],
    sidebar: { recentActivity: [], setProgress: [], topTeams: [], topSets: [], topPlayers: [], portfolio: null },
  };
}

/**
 * The one place Collection V2 (/shelf) talks to Prisma. Everything downstream
 * — page, sidebar widgets, Spares row — just receives this shaped payload,
 * so the same aggregation is reusable later (mobile, notifications, AI
 * insights) without re-deriving it.
 */
export async function getCollectionWorkspace(userId: string): Promise<CollectionWorkspace> {
  const instances = await prisma.instance.findMany({
    where: { userId },
    include: {
      certification: true,
      variant: {
        include: {
          card: {
            include: {
              set: { include: { series: { include: { franchise: true } } } },
              teams: true,
              persons: true,
            },
          },
          printing: true,
          parallel: true,
          currentPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (instances.length === 0) return emptyWorkspace();

  const cardIds = [...new Set(instances.map((i) => i.variant.card.id))];
  const variantIds = [...new Set(instances.map((i) => i.variantId))];
  const setIds = [...new Set(instances.map((i) => i.variant.card.setId))];
  const scanMediaIds = instances.flatMap((i) => (i.scanMediaId ? [i.scanMediaId] : []));

  const [cardImages, variantImages, listings, wishlistEntries, events, feed, scanMedia, setsWithCards, priceObs] =
    await Promise.all([
      getImagesForEntities("Card", cardIds),
      getImagesForEntities("Variant", variantIds),
      prisma.listing.findMany({
        where: { instance: { userId }, status: { in: ["ACTIVE", "RESERVED"] } },
        select: { id: true, instanceId: true },
      }),
      prisma.wishlist.findMany({ where: { userId, cardId: { in: cardIds } }, select: { cardId: true } }),
      prisma.event.findMany({
        where: { userId, type: { in: [...CREATION_EVENT_TYPES, "LISTING_CREATED", "LISTING_SOLD"] } },
        orderBy: { timestamp: "desc" },
        take: 300,
      }),
      getIntelligenceFeed(userId),
      scanMediaIds.length > 0
        ? prisma.media.findMany({ where: { id: { in: scanMediaIds }, status: "READY" } })
        : Promise.resolve([]),
      prisma.set.findMany({
        where: { id: { in: setIds } },
        include: { series: { include: { franchise: true } }, cards: { include: { teams: true } } },
      }),
      prisma.priceObservation.findMany({
        where: { variantId: { in: variantIds }, isOutlier: false },
        orderBy: { observedAt: "desc" },
      }),
    ]);

  const scanMediaUrlById = new Map(scanMedia.map((m) => [m.id, mediaUrl(m)]));
  const listingByInstanceId = new Map(listings.map((l) => [l.instanceId, l]));
  const wishlistedCardIds = new Set(wishlistEntries.flatMap((w) => (w.cardId ? [w.cardId] : [])));

  const sourceByInstanceId = new Map<string, CollectionItem["acquisitionSource"]>();
  for (const e of events) {
    if (!e.instanceId) continue;
    if (e.type === "CARD_SCANNED") sourceByInstanceId.set(e.instanceId, "Scanner");
    else if (e.type === "IMPORT_COMPLETED") sourceByInstanceId.set(e.instanceId, "Import");
    else if (e.type === "CARD_ADDED" && !sourceByInstanceId.has(e.instanceId)) sourceByInstanceId.set(e.instanceId, "Manual");
  }

  // ---- Dedup by variant: collection (one tile per variant) + spares (quantity > 1) ----
  const groups = new Map<string, typeof instances>();
  for (const inst of instances) {
    const list = groups.get(inst.variantId) ?? [];
    list.push(inst);
    groups.set(inst.variantId, list);
  }

  const collection: CollectionItem[] = [];
  const spares: SpareGroup[] = [];
  let totalValue = 0;

  for (const [variantId, group] of groups) {
    const sorted = [...group].sort((a, b) => {
      if (a.isGraded !== b.isGraded) return a.isGraded ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    const primary = sorted[0];
    const spareInstances = sorted.slice(1);
    const card = primary.variant.card;
    const price = toPriceDisplay(primary.variant.currentPrice);
    const unitValue = price.valueUsd ?? primary.purchasePrice ?? 0;
    const activeListing = group.map((i) => listingByInstanceId.get(i.id)).find(Boolean) ?? null;

    collection.push({
      variantId,
      cardId: card.id,
      cardName: card.name,
      cardNumber: card.number,
      setName: card.set.name,
      franchiseName: card.set.series.franchise.name,
      printingName: primary.variant.printing?.name ?? null,
      parallelName: primary.variant.parallel?.name ?? null,
      isFoil: primary.variant.isFoil,
      images: cardImages.get(card.id) ?? [],
      variantImages: variantImages.get(variantId) ?? [],
      scanMediaUrl: primary.scanMediaId ? scanMediaUrlById.get(primary.scanMediaId) ?? null : null,
      quantity: group.length,
      primaryInstanceId: primary.id,
      createdAt: primary.createdAt,
      condition: primary.condition,
      isGraded: primary.isGraded,
      isFavorite: primary.isFavorite,
      price,
      purchasePrice: primary.purchasePrice,
      acquisitionSource: sourceByInstanceId.get(primary.id) ?? "Unknown",
      activeListingId: activeListing?.id ?? null,
      isWishlisted: wishlistedCardIds.has(card.id),
    });

    totalValue += unitValue * group.length;

    if (spareInstances.length > 0) {
      spares.push({
        variantId,
        cardId: card.id,
        cardName: card.name,
        cardNumber: card.number,
        setName: card.set.name,
        franchiseName: card.set.series.franchise.name,
        printingName: primary.variant.printing?.name ?? null,
        parallelName: primary.variant.parallel?.name ?? null,
        isFoil: primary.variant.isFoil,
        images: cardImages.get(card.id) ?? [],
        variantImages: variantImages.get(variantId) ?? [],
        spareCount: spareInstances.length,
        estimatedSpareValue: unitValue * spareInstances.length,
        estimatedUnitValue: unitValue,
        instanceIds: spareInstances.map((i) => i.id),
        activeListingId: spareInstances.map((i) => listingByInstanceId.get(i.id)).find(Boolean)?.id ?? null,
        latestAddedAt: spareInstances.reduce((max, i) => (i.createdAt > max ? i.createdAt : max), spareInstances[0].createdAt),
      });
    }
  }

  // ---- Overview ----
  const uniqueCards = groups.size;
  const spareCount = instances.length - uniqueCards;
  const avgCardValue = instances.length > 0 ? totalValue / instances.length : 0;

  const datedInstances = instances
    .filter((i) => i.purchaseDate)
    .sort((a, b) => a.purchaseDate!.getTime() - b.purchaseDate!.getTime());
  let cumulative = 0;
  const portfolioHistory = datedInstances.map((i) => {
    cumulative += i.variant.currentPrice?.marketPriceUsd ?? i.purchasePrice ?? 0;
    return { date: i.purchaseDate!.toISOString(), value: cumulative };
  });
  const portfolio = portfolioHistory.length >= 2 ? { history: portfolioHistory } : null;

  let portfolioChange7dPercent: number | null = null;
  if (portfolioHistory.length >= 2) {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const baseline = [...portfolioHistory].reverse().find((p) => new Date(p.date).getTime() <= sevenDaysAgoMs);
    if (baseline && baseline.value > 0) {
      const latest = portfolioHistory[portfolioHistory.length - 1].value;
      portfolioChange7dPercent = ((latest - baseline.value) / baseline.value) * 100;
    }
  }

  // ---- Set / Collection Progress ----
  const ownedCardIds = new Set(instances.map((i) => i.variant.card.id));
  const setProgress: SetProgressEntry[] = setsWithCards
    .map((set) => {
      const total = set.printedTotal && set.printedTotal > 0 ? set.printedTotal : set.cards.length;
      const owned = set.cards.filter((c) => ownedCardIds.has(c.id)).length;
      const percent = total > 0 ? Math.round((owned / total) * 100) : 0;
      const missing = Math.max(total - owned, 0);
      const nextMilestonePercent = percent >= 100 ? null : Math.min(Math.ceil((percent + 1) / 10) * 10, 100);
      const cardsToNextMilestone = nextMilestonePercent
        ? Math.max(Math.ceil((nextMilestonePercent / 100) * total) - owned, 0)
        : 0;

      const teamMap = new Map<string, { teamId: string; teamName: string; owned: number; total: number }>();
      for (const card of set.cards) {
        for (const team of card.teams) {
          const entry = teamMap.get(team.id) ?? { teamId: team.id, teamName: team.name, owned: 0, total: 0 };
          entry.total += 1;
          if (ownedCardIds.has(card.id)) entry.owned += 1;
          teamMap.set(team.id, entry);
        }
      }

      return {
        setId: set.id,
        setName: set.name,
        franchiseName: set.series.franchise.name,
        owned,
        total,
        percent,
        missing,
        nextMilestonePercent,
        cardsToNextMilestone,
        teams: [...teamMap.values()].sort((a, b) => b.owned - a.owned),
      };
    })
    .sort((a, b) => b.percent - a.percent);

  // ---- Top Teams / Sets / Players ----
  const teamCounts = new Map<string, Breakdown>();
  const setCounts = new Map<string, Breakdown>();
  const playerCounts = new Map<string, Breakdown>();
  for (const inst of instances) {
    const card = inst.variant.card;
    const setEntry = setCounts.get(card.setId) ?? { id: card.setId, name: card.set.name, count: 0 };
    setEntry.count++;
    setCounts.set(card.setId, setEntry);
    for (const team of card.teams) {
      const e = teamCounts.get(team.id) ?? { id: team.id, name: team.name, count: 0 };
      e.count++;
      teamCounts.set(team.id, e);
    }
    for (const person of card.persons) {
      const e = playerCounts.get(person.id) ?? { id: person.id, name: person.name, count: 0 };
      e.count++;
      playerCounts.set(person.id, e);
    }
  }
  const topN = (m: Map<string, Breakdown>) => [...m.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  // ---- Recent Activity (batched — bulk imports collapse to one line; "Added", never "Collected") ----
  const instanceById = new Map(instances.map((i) => [i.id, i]));
  const creationEvents = events
    .filter((e) => (CREATION_EVENT_TYPES as readonly string[]).includes(e.type))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  type RawBatch = { type: string; start: Date; end: Date; count: number; sampleInstanceId: string | null };
  const rawBatches: RawBatch[] = [];
  for (const e of creationEvents) {
    const last = rawBatches[rawBatches.length - 1];
    if (last && last.type === e.type && e.timestamp.getTime() - last.end.getTime() <= BATCH_WINDOW_MS) {
      last.count++;
      last.end = e.timestamp;
    } else {
      rawBatches.push({ type: e.type, start: e.timestamp, end: e.timestamp, count: 1, sampleInstanceId: e.instanceId });
    }
  }

  const activity: ActivityEntry[] = rawBatches.map((b, idx) => {
    const sampleCard = b.sampleInstanceId ? instanceById.get(b.sampleInstanceId)?.variant.card.name : undefined;
    let label: string;
    let kind: ActivityEntry["kind"];
    if (b.type === "CARD_SCANNED") {
      kind = "scanned";
      label = b.count > 1 ? `Scanner added ${b.count} cards` : `Scanner found ${sampleCard ?? "a card"}`;
    } else if (b.type === "IMPORT_COMPLETED") {
      kind = "imported";
      label = `Imported ${b.count} card${b.count === 1 ? "" : "s"}`;
    } else {
      kind = "added";
      label = b.count > 1 ? `Added ${b.count} cards` : `Added ${sampleCard ?? "a card"}`;
    }
    return { id: `batch-${idx}-${b.end.toISOString()}`, kind, label, cardName: sampleCard, timestamp: b.end, count: b.count };
  });

  for (const e of events) {
    if (e.type === "LISTING_CREATED") {
      activity.push({ id: e.id, kind: "listed", label: "Listed a card for sale", timestamp: e.timestamp });
    } else if (e.type === "LISTING_SOLD") {
      activity.push({ id: e.id, kind: "sold", label: "Sold a card", timestamp: e.timestamp });
    }
  }

  const obsByVariant = new Map<string, typeof priceObs>();
  for (const o of priceObs) {
    if (!o.variantId) continue;
    const list = obsByVariant.get(o.variantId) ?? [];
    if (list.length < 2) list.push(o);
    obsByVariant.set(o.variantId, list);
  }
  const cardNameByVariant = new Map(collection.map((c) => [c.variantId, c.cardName]));
  for (const [variantId, obs] of obsByVariant) {
    if (obs.length < 2 || obs[1].priceUsd <= 0) continue;
    const [latest, prev] = obs;
    const pct = ((latest.priceUsd - prev.priceUsd) / prev.priceUsd) * 100;
    if (Math.abs(pct) < 1) continue; // real move only, not noise
    activity.push({
      id: `price-${variantId}`,
      kind: "price_move",
      label: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% price move`,
      cardName: cardNameByVariant.get(variantId),
      timestamp: latest.observedAt,
    });
  }

  activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    overview: {
      portfolioValue: feed.metrics.portfolioValue,
      healthScore: feed.metrics.healthScore,
      completionScore: feed.metrics.completionScore,
      unrealizedGain: feed.metrics.unrealizedGain,
      unrealizedGainPercent: feed.metrics.unrealizedGainPercent,
      portfolioChange7dPercent,
      totalCards: instances.length,
      uniqueCards,
      spareCount,
      avgCardValue,
    },
    collection,
    spares,
    sidebar: {
      recentActivity: activity.slice(0, 15),
      setProgress,
      topTeams: topN(teamCounts),
      topSets: topN(setCounts),
      topPlayers: topN(playerCounts),
      portfolio,
    },
  };
}
