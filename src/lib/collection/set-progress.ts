import "server-only";
import { prisma } from "@/lib/prisma";

export interface SetProgress {
  ownedCount: number;
  totalValueUsd: number;
}

/**
 * Per-set owned unique-card count + total value for one user, batched across
 * `setIds` in a single Instance query rather than N+1 per set. Extracted
 * from `src/app/collections/page.tsx`'s inline version so the web sets index
 * and `/api/v1/sets` compute this identically instead of two copies of the
 * same Instance-grouping logic. Value convention (marketPriceUsd, falling
 * back to purchasePrice when unpriced) matches the dashboard and Set
 * Insights.
 */
export async function getSetProgressForUser(userId: string, setIds: string[]): Promise<Map<string, SetProgress>> {
  const progressBySet = new Map<string, SetProgress>();
  if (setIds.length === 0) return progressBySet;

  const owned = await prisma.instance.findMany({
    where: { userId, variant: { card: { setId: { in: setIds } } } },
    select: {
      purchasePrice: true,
      variant: { select: { currentPrice: { select: { marketPriceUsd: true } }, card: { select: { id: true, setId: true } } } },
    },
  });

  const ownedCardIdsBySet = new Map<string, Set<string>>();
  for (const inst of owned) {
    const setId = inst.variant.card.setId;
    const entry = progressBySet.get(setId) ?? { ownedCount: 0, totalValueUsd: 0 };
    const cardIds = ownedCardIdsBySet.get(setId) ?? new Set<string>();
    cardIds.add(inst.variant.card.id);
    ownedCardIdsBySet.set(setId, cardIds);
    entry.totalValueUsd += inst.variant.currentPrice?.marketPriceUsd ?? inst.purchasePrice ?? 0;
    entry.ownedCount = cardIds.size;
    progressBySet.set(setId, entry);
  }

  return progressBySet;
}
