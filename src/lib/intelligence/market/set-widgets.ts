import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getVariantCategory, type VariantCategory } from "@/lib/collection/classification";
import type { ConfidenceLabel } from "@/lib/pricing/confidence";
import type { Breakdown } from "@/lib/collection/workspace";
import { CARD_INCLUDE, toCatalogCards, attachTrend, type CatalogCard, type MoverCard } from "./catalog-widgets";

export interface SetCollectionValue {
  totalValueUsd: number;
  pricedCount: number; // owned variants with a price
  ownedVariantCount: number; // distinct owned variants in this set
  percentPriced: number; // 0-100
}

export interface SetWidgets {
  collectionValue: SetCollectionValue;
  topValuable: CatalogCard[]; // top 10 in this set, catalog-wide (not owned-only)
  gainers: MoverCard[];
  losers: MoverCard[];
  recentlyPriced: CatalogCard[];
  valueByRarity: Breakdown[]; // base/parallel/insert — owned value in USD, not card count
  confidence: Breakdown[]; // HIGH/MEDIUM/LOW/NO_DATA — owned variant count
}

const EMPTY_COLLECTION_VALUE: SetCollectionValue = { totalValueUsd: 0, pricedCount: 0, ownedVariantCount: 0, percentPriced: 0 };

const CATEGORY_LABEL: Record<VariantCategory, string> = { base: "Base", parallel: "Parallel", insert: "Insert" };
const CONFIDENCE_ORDER: ConfidenceLabel[] = ["HIGH", "MEDIUM", "LOW", "NO_DATA"];

/**
 * Set Insights data for one Set — same shape of widgets as the homepage's
 * catalog-wide market ticker (getCatalogWidgets), but Top Valuable/Movers are
 * scoped to this set's cards and two more owned-value widgets are added
 * (Collection Value, Value by Rarity). Public (getCurrentUser-based, not
 * requireUserForAction) since the Set page itself is browsable signed-out —
 * an anonymous visitor still sees the catalog-wide widgets, just with a
 * zeroed-out Collection Value/Value by Rarity (nothing owned).
 */
export async function getSetWidgets(setId: string): Promise<SetWidgets> {
  const user = await getCurrentUser();
  return getSetWidgetsForUser(user?.id ?? null, setId);
}

export async function getSetWidgetsForUser(userId: string | null, setId: string): Promise<SetWidgets> {
  const take = 8;
  const setScope = { variant: { card: { setId } } };

  const [gainerRows, loserRows, recentRows, topRows] = await Promise.all([
    prisma.currentPrice.findMany({
      where: { ...setScope, trend30dPercent: { gt: 0 }, variantId: { not: null } },
      orderBy: { trend30dPercent: "desc" },
      take,
      include: CARD_INCLUDE,
    }),
    prisma.currentPrice.findMany({
      where: { ...setScope, trend30dPercent: { lt: 0 }, variantId: { not: null } },
      orderBy: { trend30dPercent: "asc" },
      take,
      include: CARD_INCLUDE,
    }),
    prisma.currentPrice.findMany({
      where: { ...setScope, variantId: { not: null }, latestObservationAt: { not: null }, marketPriceUsd: { not: null } },
      orderBy: { latestObservationAt: "desc" },
      take,
      include: CARD_INCLUDE,
    }),
    prisma.currentPrice.findMany({
      where: { ...setScope, variantId: { not: null }, marketPriceUsd: { not: null } },
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

  let collectionValue = EMPTY_COLLECTION_VALUE;
  let valueByRarity: Breakdown[] = [];
  let confidence: Breakdown[] = [];

  if (userId) {
    const owned = await prisma.instance.findMany({
      where: { userId, variant: { card: { setId } } },
      select: {
        variantId: true,
        variant: {
          select: {
            insert: { select: { name: true } },
            parallel: { select: { name: true } },
            currentPrice: { select: { marketPriceUsd: true, confidenceLabel: true } },
          },
        },
      },
    });

    const qtyByVariant = new Map<string, number>();
    const variantById = new Map<string, (typeof owned)[number]["variant"]>();
    for (const o of owned) {
      qtyByVariant.set(o.variantId, (qtyByVariant.get(o.variantId) ?? 0) + 1);
      variantById.set(o.variantId, o.variant);
    }

    let totalValueUsd = 0;
    let pricedCount = 0;
    const rarityValueUsd = new Map<VariantCategory, number>();
    const confidenceCount = new Map<ConfidenceLabel, number>();

    for (const [variantId, qty] of qtyByVariant) {
      const variant = variantById.get(variantId)!;
      const label = (variant.currentPrice?.confidenceLabel as ConfidenceLabel | undefined) ?? "NO_DATA";
      confidenceCount.set(label, (confidenceCount.get(label) ?? 0) + 1);

      const price = variant.currentPrice?.marketPriceUsd;
      if (price == null) continue;
      pricedCount++;
      const lineValueUsd = price * qty;
      totalValueUsd += lineValueUsd;
      const category = getVariantCategory(variant);
      rarityValueUsd.set(category, (rarityValueUsd.get(category) ?? 0) + lineValueUsd);
    }

    const ownedVariantCount = qtyByVariant.size;
    collectionValue = {
      totalValueUsd,
      pricedCount,
      ownedVariantCount,
      percentPriced: ownedVariantCount > 0 ? Math.round((pricedCount / ownedVariantCount) * 100) : 0,
    };

    valueByRarity = (["base", "parallel", "insert"] as const)
      .map((category) => ({ id: category, name: CATEGORY_LABEL[category], count: Math.round((rarityValueUsd.get(category) ?? 0) * 100) / 100 }))
      .filter((b) => b.count > 0);

    confidence = CONFIDENCE_ORDER.map((label) => ({ id: label, name: label, count: confidenceCount.get(label) ?? 0 })).filter((b) => b.count > 0);
  }

  return {
    collectionValue,
    topValuable,
    gainers: attachTrend(gainers, gainerRows),
    losers: attachTrend(losers, loserRows),
    recentlyPriced,
    valueByRarity,
    confidence,
  };
}
