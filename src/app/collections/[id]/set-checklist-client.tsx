'use client';

import { useMemo, useState, useTransition } from 'react';
import { CardGrid, type CardGridCard } from '@/components/ui/card-grid';
import { CollectionStats } from '@/components/ui/collection-stats';
import { decrementVariantQuantity, incrementVariantQuantity } from '@/lib/actions/collection';

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
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});
  const [, startTransition] = useTransition();

  function variantQuantity(variant: CardGridCard['variants'][number]) {
    return quantityOverrides[variant.id] ?? variant.ownedQuantity ?? 0;
  }

  const effectiveCards = useMemo(() => {
    return cards.map((card) => {
      const variants = card.variants.map((variant) => ({ ...variant, ownedQuantity: quantityOverrides[variant.id] ?? variant.ownedQuantity ?? 0 }));
      const ownedQuantity = variants.reduce((sum, variant) => sum + (variant.ownedQuantity ?? 0), 0);
      return { ...card, variants, ownedQuantity, owned: ownedQuantity > 0 };
    });
  }, [cards, quantityOverrides]);

  const ownedCount = effectiveCards.filter((c) => (c.ownedQuantity ?? 0) > 0).length;
  const totalOwnedQuantity = effectiveCards.reduce((sum, c) => sum + (c.ownedQuantity ?? 0), 0);
  const spareCount = effectiveCards.reduce((sum, c) => sum + Math.max((c.ownedQuantity ?? 0) - 1, 0), 0);

  const breakdown = useMemo(() => {
    const groups = new Map<string, { owned: number; total: number }>();
    for (const card of effectiveCards) {
      const label = card.cardType || card.subtypes || 'Base';
      const g = groups.get(label) ?? { owned: 0, total: 0 };
      g.total++;
      if ((card.ownedQuantity ?? 0) > 0) g.owned++;
      groups.set(label, g);
    }
    return Array.from(groups.entries())
      .map(([label, g]) => ({ label, ...g }))
      .sort((a, b) => b.total - a.total);
  }, [effectiveCards]);

  function handleQuantityChange(card: CardGridCard, delta: 1 | -1) {
    const variant =
      card.variants.find((v) => variantQuantity(v) > 0) ??
      card.variants[0];
    if (!variant) return;

    const current = variantQuantity(variant);
    if (delta === -1 && current <= 0) return;
    const next = Math.max(current + delta, 0);
    setQuantityOverrides((prev) => ({ ...prev, [variant.id]: next }));
    startTransition(() => {
      const action = delta === 1 ? incrementVariantQuantity : decrementVariantQuantity;
      action(variant.id, { setId, cardId: card.id }).catch(() => {
        setQuantityOverrides((prev) => ({ ...prev, [variant.id]: current }));
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-foreground/50 font-mono">
        <span className="text-primary">{ownedCount} / {effectiveCards.length} Owned</span>
        <span>•</span>
        <span>{totalOwnedQuantity} Total Cards</span>
        <span>•</span>
        <span>{spareCount} Spares</span>
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
        <CardGrid initialCards={effectiveCards} onQuantityChange={handleQuantityChange} />
      </div>
    </div>
  );
}
