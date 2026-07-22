'use client';

import { useMemo, useState, useTransition } from 'react';
import { CardGrid, type CardGridCard } from '@/components/ui/card-grid';
import { CollectionStats } from '@/components/ui/collection-stats';
import { toggleCardOwned } from '@/lib/actions/collection';

interface ChecklistCard extends CardGridCard {
  subtypes: string | null;
}

export function SetChecklistClient({
  cards,
  setId,
  printedTotal,
  releaseYear,
}: {
  cards: ChecklistCard[];
  setId: string;
  printedTotal: number | null;
  releaseYear: number | null;
}) {
  const [ownedOverrides, setOwnedOverrides] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const effectiveCards = useMemo(
    () => cards.map((c) => ({ ...c, owned: ownedOverrides[c.id] ?? c.owned ?? false })),
    [cards, ownedOverrides]
  );

  const ownedCount = effectiveCards.filter((c) => c.owned).length;

  const breakdown = useMemo(() => {
    const groups = new Map<string, { owned: number; total: number }>();
    for (const card of effectiveCards) {
      const label = card.subtypes || 'Base Set';
      const g = groups.get(label) ?? { owned: 0, total: 0 };
      g.total++;
      if (card.owned) g.owned++;
      groups.set(label, g);
    }
    return Array.from(groups.entries())
      .map(([label, g]) => ({ label, ...g }))
      .sort((a, b) => b.total - a.total);
  }, [effectiveCards]);

  function handleToggleOwned(card: CardGridCard) {
    const variantId = card.variants[0]?.id;
    if (!variantId) return;
    const current = ownedOverrides[card.id] ?? card.owned ?? false;
    const next = !current;
    setOwnedOverrides((prev) => ({ ...prev, [card.id]: next }));
    startTransition(() => {
      toggleCardOwned(variantId, setId).catch(() => {
        setOwnedOverrides((prev) => ({ ...prev, [card.id]: current }));
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-foreground/50 font-mono">
        <span className="text-primary">{ownedCount} / {effectiveCards.length} Owned</span>
        <span>•</span>
        <span>{printedTotal || '?'} Printed Total</span>
        {releaseYear && (
          <>
            <span>•</span>
            <span>Released {releaseYear}</span>
          </>
        )}
      </div>

      <div className="space-y-12 pt-8">
        <CollectionStats owned={ownedCount} total={effectiveCards.length} breakdown={breakdown} />
        <CardGrid initialCards={effectiveCards} setId={setId} onToggleOwned={handleToggleOwned} />
      </div>
    </div>
  );
}
