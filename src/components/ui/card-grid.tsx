'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, Plus, Search } from 'lucide-react';
import { PriceTag } from './price-tag';
import { QuantityControl } from './quantity-control';
import { SmartSelect } from './smart-select';
import { toPriceDisplay } from '@/lib/pricing/display';

type CurrentPrice = {
  marketPriceUsd: number | null;
  confidenceLabel: string;
  observationCount: number;
  latestObservationAt: Date | null;
  contributingSources: string | null;
};
type Variant = {
  id: string;
  isFoil: boolean;
  currentPrice: CurrentPrice | null;
  printing?: { name: string } | null;
  parallel?: { name: string } | null;
  insert?: { name: string } | null;
  ownedQuantity?: number;
};

type CardImage = { type: string; url: string };

export type CardGridCard = {
  id: string;
  name: string;
  number: string;
  images: CardImage[];
  variants: Variant[];
  owned?: boolean;
  ownedQuantity?: number;
  cardType?: string | null;
  rarityLabel?: string | null;
};

export function CardGrid({
  initialCards,
  onQuantityChange,
}: {
  initialCards: CardGridCard[];
  onQuantityChange: (card: CardGridCard, delta: 1 | -1) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'price' | 'name' | 'owned'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [cardTypeFilter, setCardTypeFilter] = useState('');
  const [justPulled, setJustPulled] = useState<Record<string, boolean>>({});

  function quantityFor(card: CardGridCard) {
    return card.ownedQuantity ?? card.variants.reduce((sum, variant) => sum + (variant.ownedQuantity ?? 0), 0) ?? (card.owned ? 1 : 0);
  }

  function handleQuantityChange(card: CardGridCard, delta: 1 | -1) {
    if (delta === 1 && quantityFor(card) === 0) {
      // Brief "pulled from a pack" flourish — the one moment worth a flourish.
      setJustPulled((prev) => ({ ...prev, [card.id]: true }));
      setTimeout(() => setJustPulled((prev) => ({ ...prev, [card.id]: false })), 700);
    }
    onQuantityChange(card, delta);
  }

  const cardTypeOptions = useMemo(() => {
    const values = new Set(initialCards.flatMap((card) => (card.cardType ? [card.cardType] : [])));
    return [
      { value: '', label: 'All card types' },
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b))
        .map((label) => ({ value: label, label })),
    ];
  }, [initialCards]);

  const filteredAndSorted = useMemo(() => {
    let result = [...initialCards];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.number.toLowerCase().includes(q)
      );
    }

    if (cardTypeFilter) {
      result = result.filter((c) => c.cardType === cardTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'number') {
        const numA = parseInt(a.number, 10) || 0;
        const numB = parseInt(b.number, 10) || 0;
        cmp = numA - numB;
        if (cmp === 0) cmp = a.number.localeCompare(b.number);
      } else if (sortBy === 'price') {
        // Find highest market price among variants
        const maxPriceA = Math.max(0, ...a.variants.map(v => v.currentPrice?.marketPriceUsd ?? 0));
        const maxPriceB = Math.max(0, ...b.variants.map(v => v.currentPrice?.marketPriceUsd ?? 0));
        cmp = maxPriceA - maxPriceB;
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'owned') {
        cmp = quantityFor(a) - quantityFor(b);
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [cardTypeFilter, initialCards, search, sortBy, sortOrder]);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-foreground/5 border border-foreground/10 p-4 rounded-2xl backdrop-blur-md">
        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35" />
          <input
            type="text"
            aria-label="Search cards in this set"
            placeholder="Search number, player, team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 bg-background/50 border border-foreground/10 rounded-full pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 w-full lg:w-auto">
          <SmartSelect
            value={cardTypeFilter}
            onChange={setCardTypeFilter}
            options={cardTypeOptions}
            ariaLabel="Filter by card type"
            className="w-full sm:w-56"
          />
          <SmartSelect
            value={sortBy}
            onChange={(value) => setSortBy(value as typeof sortBy)}
            ariaLabel="Sort cards by"
            className="w-full sm:w-48"
            options={[
              { value: 'number', label: 'Sort by number' },
              { value: 'price', label: 'Sort by price' },
              { value: 'name', label: 'Sort by name' },
              { value: 'owned', label: 'Sort by quantity' },
            ]}
          />

          <button
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            aria-label={sortOrder === 'asc' ? 'Sort ascending, click to sort descending' : 'Sort descending, click to sort ascending'}
            className="h-11 w-11 inline-flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 rounded-full text-sm text-foreground transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredAndSorted.map((card, index) => {
          // Determine top variant price — the highest-priced variant's full CurrentPrice, not just a number
          const topPriced = card.variants
            .filter((v) => v.currentPrice?.marketPriceUsd != null)
            .sort((a, b) => b.currentPrice!.marketPriceUsd! - a.currentPrice!.marketPriceUsd!)[0]?.currentPrice ?? null;

          // Find image — prefer real card art, fall back to team crest, then blank
          const realArt = card.images.find(img => img.type === 'THUMBNAIL')?.url
            || card.images.find(img => img.type === 'OFFICIAL_ARTWORK')?.url;
          const crestArt = card.images.find(img => img.type === 'TEAM_CREST')?.url;
          const thumbImage = realArt || crestArt;
          const isCrestFallback = !realArt && !!crestArt;
          const ownedQuantity = quantityFor(card);
          const owned = ownedQuantity > 0;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '80px' }}
              transition={{ duration: 0.3, delay: (index % 24) * 0.02, ease: 'easeOut' }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative aspect-[63/88] rounded-xl overflow-hidden border shadow-lg hover:shadow-2xl ${owned ? 'border-primary/60 bg-primary/5' : 'border-foreground/5 bg-foreground/5 hover:border-foreground/20'}`}
            >
              <Link href={`/cards/${card.id}`} className="absolute inset-0 z-0">
                {/* Holo/foil sheen — a diagonal light catches the card on hover, like tilting it in your hand */}
                <div
                  className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-[opacity,background-position] duration-500 ease-out bg-[length:250%_250%] bg-[position:110%_110%] group-hover:bg-[position:-10%_-10%]"
                  style={{
                    backgroundImage: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.22) 47%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.22) 53%, transparent 70%)',
                    mixBlendMode: 'overlay',
                  }}
                />
                {/* Unowned cards recede — grayscale + dimmed, like a gap in a checklist — so a scan of the
                    grid instantly shows what's missing. Hovering previews the card in full color. */}
                <div className={`w-full h-full transition-all duration-300 ${owned ? '' : 'grayscale-[85%] opacity-45 group-hover:grayscale-0 group-hover:opacity-90'}`}>
                  {thumbImage ? (
                    isCrestFallback ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-foreground/10 to-transparent p-4">
                        <div className="relative w-1/2 aspect-square drop-shadow-lg">
                          <Image src={thumbImage} alt={card.name} fill className="object-contain" loading="lazy" unoptimized />
                        </div>
                        <span className="text-[10px] text-foreground/50 text-center leading-tight line-clamp-2">{card.name}</span>
                      </div>
                    ) : (
                      <Image
                        src={thumbImage}
                        alt={card.name}
                        fill
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-xs text-foreground/40">{card.name}</span>
                    </div>
                  )}
                </div>
              </Link>

              {/* "Pulled!" flourish — the one moment worth celebrating: adding a card to your collection */}
              <AnimatePresence>
                {justPulled[card.id] && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0.3, opacity: 0.9 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute w-16 h-16 rounded-full"
                      style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.6, times: [0, 0.3, 1] }}
                      className="absolute inset-0"
                      style={{
                        backgroundImage: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.5) 50%, transparent 65%)',
                        mixBlendMode: 'overlay',
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {owned ? (
                <motion.span
                  layout
                  className="absolute top-2 right-2 z-20 min-w-7 h-7 px-2 rounded-full flex items-center justify-center border border-primary/40 bg-background/80 text-primary font-mono text-[11px] font-bold shadow-lg backdrop-blur"
                  aria-label={`${ownedQuantity} owned`}
                >
                  {ownedQuantity > 1 ? `×${ownedQuantity}` : <Check size={13} strokeWidth={3} />}
                </motion.span>
              ) : (
                <motion.button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleQuantityChange(card, 1); }}
                  whileTap={{ scale: 0.8 }}
                  title="Add to collection"
                  aria-label="Add to collection"
                  className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center border shadow-lg transition-colors bg-background/60 border-foreground/30 text-foreground/70 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 hover:border-foreground hover:text-foreground"
                >
                  <Plus size={14} strokeWidth={3} />
                </motion.button>
              )}

              {/* Hover Meta + explicit quantity control */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/95 via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <p className="text-foreground text-xs truncate font-medium">{card.name}</p>
                <div className="flex justify-between items-center mt-0.5 mb-2">
                  <p className="text-primary font-mono text-[10px]">#{card.number}</p>
                  {topPriced?.marketPriceUsd != null && <PriceTag compact data={toPriceDisplay(topPriced)} />}
                </div>
                {card.cardType && <p className="mb-2 text-[10px] text-foreground/45 truncate">{card.cardType}</p>}
                <div className="pointer-events-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <QuantityControl
                    compact
                    quantity={ownedQuantity}
                    onIncrement={() => handleQuantityChange(card, 1)}
                    onDecrement={() => handleQuantityChange(card, -1)}
                    className="w-full justify-center"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="py-24 text-center text-foreground/40 font-mono">
          No cards found matching your criteria.
        </div>
      )}
    </div>
  );
}
