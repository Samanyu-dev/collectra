import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";
import { getRarityTier, type RarityTier } from "@/lib/collection/classification";

export interface PublicPullCard {
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl: string | null;
}

export interface PublicProfileData {
  name: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  totalCards: number;
  uniqueCards: number;
  completionPercent: number | null;
  favoriteFranchise: { name: string; cardCount: number } | null;
  rarestPull: (PublicPullCard & { rarityTier: RarityTier }) | null;
  latestPull: (PublicPullCard & { addedAt: Date }) | null;
  // Only populated when the profile owner has showValuePublicly on — the
  // caller (the page) still checks the flag itself before rendering these;
  // this function computes them unconditionally since a franchise-scoped
  // instances fetch is already required for every other field here.
  portfolioValue: number;
  valueRange: { low: number; high: number } | null;
}

const RARITY_RANK: Record<RarityTier, number> = { common: 0, rare: 1, epic: 2, legendary: 3, unique: 4 };

/**
 * Everything a public /u/[username] profile needs, for a user already
 * confirmed to have isPublic === true (checked by the caller before this is
 * invoked) — deliberately does NOT select email or any field beyond what's
 * rendered. "Favorite franchise" is by owned unique-card count, not $ value,
 * so it stays meaningful even for a profile with showValuePublicly off.
 */
export async function getPublicProfileData(user: {
  id: string;
  name: string | null;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
}): Promise<PublicProfileData> {
  const instances = await prisma.instance.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      variant: {
        include: {
          insert: true,
          parallel: true,
          printing: true,
          currentPrice: true,
          card: {
            include: { set: { include: { series: { include: { franchise: true } } } } },
          },
        },
      },
    },
  });

  if (instances.length === 0) {
    return {
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      totalCards: 0,
      uniqueCards: 0,
      completionPercent: null,
      favoriteFranchise: null,
      rarestPull: null,
      latestPull: null,
      portfolioValue: 0,
      valueRange: null,
    };
  }

  const uniqueCardIds = new Set(instances.map((i) => i.variant.card.id));

  // Favorite franchise — by owned unique-card count.
  const franchiseCounts = new Map<string, { name: string; cardIds: Set<string> }>();
  for (const inst of instances) {
    const franchise = inst.variant.card.set.series.franchise;
    const entry = franchiseCounts.get(franchise.id) ?? { name: franchise.name, cardIds: new Set<string>() };
    entry.cardIds.add(inst.variant.card.id);
    franchiseCounts.set(franchise.id, entry);
  }
  const favoriteFranchiseEntry = [...franchiseCounts.values()].sort((a, b) => b.cardIds.size - a.cardIds.size)[0] ?? null;

  // Overall completion — across every franchise the user owns at least one
  // card in, owned-unique over catalog-total, combined (not per-franchise).
  const franchiseIds = [...franchiseCounts.keys()];
  const totals = await prisma.set.findMany({
    where: { series: { franchiseId: { in: franchiseIds } } },
    include: { series: { select: { franchiseId: true } }, _count: { select: { cards: true } } },
  });
  const totalByFranchise = new Map<string, number>();
  for (const s of totals) {
    totalByFranchise.set(s.series.franchiseId, (totalByFranchise.get(s.series.franchiseId) ?? 0) + s._count.cards);
  }
  const totalCatalogAcrossOwnedFranchises = [...totalByFranchise.values()].reduce((sum, n) => sum + n, 0);

  // Rarest pull.
  let rarest: (typeof instances)[number] | null = null;
  let rarestRank = -1;
  for (const inst of instances) {
    const rank = RARITY_RANK[getRarityTier(inst.variant)];
    if (rank > rarestRank) {
      rarestRank = rank;
      rarest = inst;
    }
  }

  const latest = instances[0]; // already sorted desc by createdAt

  const pullCardIds = [rarest?.variant.card.id, latest?.variant.card.id].filter((id): id is string => !!id);
  const images = await getImagesForEntities("Card", pullCardIds);
  const imageFor = (cardId: string) => {
    const list = images.get(cardId) ?? [];
    return pickPrimaryImage(list)?.url ?? null;
  };

  // Portfolio value + range — always computed; the page decides whether to show them.
  let portfolioValue = 0;
  const lows: number[] = [];
  const highs: number[] = [];
  const seenVariantsForValue = new Set<string>();
  for (const inst of instances) {
    const price = inst.variant.currentPrice?.marketPriceUsd;
    if (price != null) portfolioValue += price;
    if (!seenVariantsForValue.has(inst.variantId)) {
      seenVariantsForValue.add(inst.variantId);
      if (inst.variant.currentPrice?.lowestListingUsd != null) lows.push(inst.variant.currentPrice.lowestListingUsd);
      if (inst.variant.currentPrice?.highestListingUsd != null) highs.push(inst.variant.currentPrice.highestListingUsd);
    }
  }

  return {
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    totalCards: instances.length,
    uniqueCards: uniqueCardIds.size,
    completionPercent: totalCatalogAcrossOwnedFranchises > 0 ? (uniqueCardIds.size / totalCatalogAcrossOwnedFranchises) * 100 : null,
    favoriteFranchise: favoriteFranchiseEntry ? { name: favoriteFranchiseEntry.name, cardCount: favoriteFranchiseEntry.cardIds.size } : null,
    rarestPull: rarest
      ? {
          cardId: rarest.variant.card.id,
          cardName: rarest.variant.card.name,
          setName: rarest.variant.card.set.name,
          imageUrl: imageFor(rarest.variant.card.id),
          rarityTier: getRarityTier(rarest.variant),
        }
      : null,
    latestPull: latest
      ? {
          cardId: latest.variant.card.id,
          cardName: latest.variant.card.name,
          setName: latest.variant.card.set.name,
          imageUrl: imageFor(latest.variant.card.id),
          addedAt: latest.createdAt,
        }
      : null,
    portfolioValue,
    valueRange: lows.length > 0 && highs.length > 0 ? { low: Math.min(...lows), high: Math.max(...highs) } : null,
  };
}
