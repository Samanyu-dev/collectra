import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getSparklinesForVariants } from "@/lib/pricing/history";
import { getRarityTier, getVariantCardType, type RarityTier } from "@/lib/collection/classification";

export interface CatalogCard {
  variantId: string;
  cardId: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  franchiseName: string;
  imageUrl: string | null;
  marketPriceUsd: number;
  cardType: string;
  rarityTier: RarityTier;
  sparkline: number[] | null;
}

export interface MoverCard extends CatalogCard {
  changePercent: number;
}

export interface CatalogWidgets {
  gainers: MoverCard[];
  losers: MoverCard[];
  recentlyPriced: CatalogCard[];
  topValuable: CatalogCard[];
}

const CARD_INCLUDE = {
  variant: {
    include: {
      insert: true,
      parallel: true,
      printing: true,
      card: { include: { set: { include: { series: { include: { franchise: true } } } } } },
    },
  },
} as const;

type PricedVariantRow = {
  variantId: string | null;
  marketPriceUsd: number | null;
  trend30dPercent: number | null;
  variant: {
    isFoil: boolean;
    isAuto: boolean;
    isPatch: boolean;
    isRelic: boolean;
    serialTo: number | null;
    insert: { name: string } | null;
    parallel: { name: string } | null;
    printing: { name: string } | null;
    card: {
      id: string;
      name: string;
      number: string;
      set: { name: string; series: { franchise: { name: string } } };
    };
  } | null;
};

async function toCatalogCards(rows: PricedVariantRow[]): Promise<CatalogCard[]> {
  const cardIds = rows.map((r) => r.variant?.card.id).filter((id): id is string => !!id);
  const [imagesByCard, sparklines] = await Promise.all([
    getImagesForEntities("Card", cardIds),
    getSparklinesForVariants(rows.map((r) => r.variantId).filter((id): id is string => !!id)),
  ]);

  return rows
    .filter((r): r is PricedVariantRow & { variantId: string; variant: NonNullable<PricedVariantRow["variant"]>; marketPriceUsd: number } =>
      !!r.variant && !!r.variantId && r.marketPriceUsd != null
    )
    .map((r) => {
      const images = imagesByCard.get(r.variant.card.id) ?? [];
      const imageUrl =
        images.find((img) => img.type === "THUMBNAIL")?.url ??
        images.find((img) => img.type === "OFFICIAL_ARTWORK")?.url ??
        images.find((img) => img.type === "TEAM_CREST")?.url ??
        null;

      return {
        variantId: r.variantId,
        cardId: r.variant.card.id,
        cardName: r.variant.card.name,
        cardNumber: r.variant.card.number,
        setName: r.variant.card.set.name,
        franchiseName: r.variant.card.set.series.franchise.name,
        imageUrl,
        marketPriceUsd: r.marketPriceUsd,
        cardType: getVariantCardType(r.variant),
        rarityTier: getRarityTier(r.variant),
        sparkline: sparklines[r.variantId] ?? null,
      };
    });
}

/**
 * Catalog-wide market widgets — Gainers/Losers/Recently Priced/Top Valuable.
 * Deliberately NOT scoped to what the user owns (unlike the rest of the
 * dashboard): a market ticker across the whole catalog, confirmed with the
 * user as the intended scope for these three sections specifically.
 * Each is its own small, capped CurrentPrice query — no Instance/userId
 * join, so this is independent of collection size entirely.
 */
export async function getCatalogWidgets(): Promise<CatalogWidgets> {
  const take = 8;

  const [gainerRows, loserRows, recentRows, topRows] = await Promise.all([
    prisma.currentPrice.findMany({
      where: { trend30dPercent: { gt: 0 }, variantId: { not: null } },
      orderBy: { trend30dPercent: "desc" },
      take,
      include: CARD_INCLUDE,
    }),
    prisma.currentPrice.findMany({
      where: { trend30dPercent: { lt: 0 }, variantId: { not: null } },
      orderBy: { trend30dPercent: "asc" },
      take,
      include: CARD_INCLUDE,
    }),
    prisma.currentPrice.findMany({
      where: { variantId: { not: null }, latestObservationAt: { not: null }, marketPriceUsd: { not: null } },
      orderBy: { latestObservationAt: "desc" },
      take,
      include: CARD_INCLUDE,
    }),
    prisma.currentPrice.findMany({
      where: { variantId: { not: null }, marketPriceUsd: { not: null } },
      orderBy: { marketPriceUsd: "desc" },
      take: 10,
      include: CARD_INCLUDE,
    }),
  ]);

  const [gainers, losers, recentlyPriced, topValuable] = await Promise.all([
    toCatalogCards(gainerRows),
    toCatalogCards(loserRows),
    toCatalogCards(recentRows),
    toCatalogCards(topRows),
  ]);

  const withTrend = (cards: CatalogCard[], rows: PricedVariantRow[]): MoverCard[] => {
    const trendByVariant = new Map(rows.map((r) => [r.variantId, r.trend30dPercent]));
    return cards.map((c) => ({ ...c, changePercent: trendByVariant.get(c.variantId) ?? 0 }));
  };

  return {
    gainers: withTrend(gainers, gainerRows),
    losers: withTrend(losers, loserRows),
    recentlyPriced,
    topValuable,
  };
}

export interface SetTotal {
  setId: string;
  setName: string;
  franchiseName: string;
  totalCards: number;
}

export interface CatalogTotals {
  franchiseTotals: Record<string, number>; // franchiseId -> total cards
  setTotals: Record<string, SetTotal>; // setId -> total cards + names
}

/**
 * Total card counts per franchise AND per set, catalog-wide — one Set query
 * (a few hundred rows, not tens of thousands of Cards), independent of any
 * user. Feeds two things: per-franchise completion % on Franchise Breakdown,
 * and per-set completion for Biggest Collection Gaps.
 */
export async function getCatalogTotals(): Promise<CatalogTotals> {
  const sets = await prisma.set.findMany({
    include: {
      series: { include: { franchise: true } },
      _count: { select: { cards: true } },
    },
  });

  const franchiseTotals: Record<string, number> = {};
  const setTotals: Record<string, SetTotal> = {};
  for (const set of sets) {
    const franchiseId = set.series.franchise.id;
    franchiseTotals[franchiseId] = (franchiseTotals[franchiseId] ?? 0) + set._count.cards;
    setTotals[set.id] = { setId: set.id, setName: set.name, franchiseName: set.series.franchise.name, totalCards: set._count.cards };
  }
  return { franchiseTotals, setTotals };
}
