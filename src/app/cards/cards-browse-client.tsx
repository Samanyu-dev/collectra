'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, Heart, Check, SlidersHorizontal } from 'lucide-react';
import { PriceTag, type PriceTagData } from '@/components/ui/price-tag';
import { QuantityControl } from '@/components/ui/quantity-control';
import { SmartSelect } from '@/components/ui/smart-select';
import { PaywallModal } from '@/components/ui/paywall-modal';
import { paywallMessageFor } from '@/lib/billing/paywall-messages';
import { incrementVariantQuantity, decrementVariantQuantity } from '@/lib/actions/collection';
import { toggleWishlist } from '@/lib/actions/wishlist';
import { pickPrimaryImage } from '@/lib/media/pick-primary-image';

interface CardItem {
  id: string;
  name: string;
  number: string;
  setName: string;
  franchiseName: string;
  images: { type: string; url: string }[];
  price: PriceTagData;
  ownedQuantity: number;
  variantId: string | null;
  wishlisted: boolean;
}

type Ownership = 'all' | 'owned' | 'not-owned';

export function CardsBrowseClient({
  items,
  query,
  page,
  totalPages,
  total,
  franchises,
  franchiseId,
  sort,
  minPrice,
  maxPrice,
  ownership,
  watchlistOnly,
  isLoggedIn,
}: {
  items: CardItem[];
  query: string;
  page: number;
  totalPages: number;
  total: number;
  franchises: { id: string; name: string }[];
  franchiseId: string;
  sort: 'name-asc' | 'name-desc';
  minPrice: number | null;
  maxPrice: number | null;
  ownership: Ownership;
  watchlistOnly: boolean;
  isLoggedIn: boolean;
}) {
  const [search, setSearch] = useState(query);
  const [minPriceInput, setMinPriceInput] = useState(minPrice != null ? String(minPrice) : '');
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice != null ? String(maxPrice) : '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});
  const [wishlistOverrides, setWishlistOverrides] = useState<Record<string, boolean>>({});
  const [paywallMessage, setPaywallMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function buildUrl(overrides: {
    q?: string;
    page?: number;
    franchise?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    ownership?: string;
    watchlist?: boolean;
  }) {
    const params = new URLSearchParams();
    const q = overrides.q ?? query;
    const f = overrides.franchise ?? franchiseId;
    const s = overrides.sort ?? sort;
    const min = overrides.minPrice ?? (minPrice != null ? String(minPrice) : '');
    const max = overrides.maxPrice ?? (maxPrice != null ? String(maxPrice) : '');
    const own = overrides.ownership ?? ownership;
    const wl = overrides.watchlist ?? watchlistOnly;
    const p = overrides.page ?? 1;
    if (q) params.set('q', q);
    if (f) params.set('franchise', f);
    if (s !== 'name-asc') params.set('sort', s);
    if (min) params.set('minPrice', min);
    if (max) params.set('maxPrice', max);
    if (own !== 'all') params.set('ownership', own);
    if (wl) params.set('watchlist', '1');
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/cards${qs ? `?${qs}` : ''}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ q: search }));
  }

  function handlePriceApply(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ minPrice: minPriceInput, maxPrice: maxPriceInput }));
  }

  function quantityFor(card: CardItem) {
    return quantityOverrides[card.id] ?? card.ownedQuantity;
  }

  function wishlistedFor(card: CardItem) {
    return wishlistOverrides[card.id] ?? card.wishlisted;
  }

  function handleQuantityChange(card: CardItem, delta: 1 | -1) {
    if (!card.variantId) return;
    const current = quantityFor(card);
    if (delta === -1 && current <= 0) return;
    const next = Math.max(current + delta, 0);
    setQuantityOverrides((prev) => ({ ...prev, [card.id]: next }));
    startTransition(() => {
      const action = delta === 1 ? incrementVariantQuantity : decrementVariantQuantity;
      action(card.variantId!, { cardId: card.id }).catch((e) => {
        setQuantityOverrides((prev) => ({ ...prev, [card.id]: current }));
        const paywallMsg = paywallMessageFor(e);
        if (paywallMsg) setPaywallMessage(paywallMsg);
      });
    });
  }

  function handleToggleWishlist(card: CardItem) {
    const next = !wishlistedFor(card);
    setWishlistOverrides((prev) => ({ ...prev, [card.id]: next }));
    startTransition(() => {
      toggleWishlist(card.id).catch(() => {
        setWishlistOverrides((prev) => ({ ...prev, [card.id]: !next }));
      });
    });
  }

  const activeFilterCount =
    (franchiseId ? 1 : 0) + (ownership !== 'all' ? 1 : 0) + (watchlistOnly ? 1 : 0) + (minPrice != null || maxPrice != null ? 1 : 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Card Database
        </h1>
        <p className="text-foreground/50 mt-2 max-w-2xl">
          Every card ingested into the Universal Graph — {total.toLocaleString()} total.
        </p>
      </motion.div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
        <input
          type="text"
          aria-label="Search cards"
          placeholder="Search number, player, team, insert, set..."
          className="w-full bg-foreground/5 border border-foreground/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground/5 border border-foreground/10 text-sm font-medium"
        >
          <SlidersHorizontal size={15} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <SmartSelect
          value={sort}
          onChange={(value) => router.push(buildUrl({ sort: value }))}
          ariaLabel="Sort cards by"
          className="w-44"
          size="sm"
          options={[
            { value: 'name-asc', label: 'Name (A–Z)' },
            { value: 'name-desc', label: 'Name (Z–A)' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        <aside className={`space-y-6 rounded-2xl border border-foreground/10 bg-foreground/5 p-5 lg:sticky lg:top-6 ${filtersOpen ? '' : 'hidden lg:block'}`}>
          {isLoggedIn && (
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Watchlist</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={watchlistOnly}
                  onChange={(e) => router.push(buildUrl({ watchlist: e.target.checked, page: 1 }))}
                  className="w-4 h-4 rounded border-foreground/20 accent-primary"
                />
                Show only my watchlist
              </label>
            </div>
          )}

          {isLoggedIn && (
            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Ownership</p>
              <SmartSelect
                value={ownership}
                onChange={(value) => router.push(buildUrl({ ownership: value, page: 1 }))}
                ariaLabel="Filter by ownership"
                className="w-full"
                size="sm"
                options={[
                  { value: 'all', label: 'Owned & not owned' },
                  { value: 'owned', label: 'Owned only' },
                  { value: 'not-owned', label: 'Not owned only' },
                ]}
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Franchise</p>
            <SmartSelect
              value={franchiseId}
              onChange={(value) => router.push(buildUrl({ franchise: value, page: 1 }))}
              ariaLabel="Filter by franchise"
              className="w-full"
              size="sm"
              placeholder="All franchises"
              options={[{ value: '', label: 'All franchises' }, ...franchises.map((f) => ({ value: f.id, label: f.name }))]}
            />
          </div>

          <form onSubmit={handlePriceApply} className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Price range</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Minimum price"
                placeholder="Min"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                className="w-full bg-background border border-foreground/10 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-foreground/30 text-xs">to</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Maximum price"
                placeholder="Max"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                className="w-full bg-background border border-foreground/10 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <button type="submit" className="w-full text-xs font-medium py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors">
              Apply
            </button>
          </form>

          <div className="hidden lg:block space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-foreground/50">Sort by</p>
            <SmartSelect
              value={sort}
              onChange={(value) => router.push(buildUrl({ sort: value }))}
              ariaLabel="Sort cards by"
              className="w-full"
              size="sm"
              options={[
                { value: 'name-asc', label: 'Name (A–Z)' },
                { value: 'name-desc', label: 'Name (Z–A)' },
              ]}
            />
          </div>

          {activeFilterCount > 0 && (
            <Link href="/cards" className="block text-xs text-foreground/50 hover:text-foreground transition-colors text-center">
              Clear all filters
            </Link>
          )}
        </aside>

        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((card, i) => {
              const image = pickPrimaryImage(card.images)
                || card.images.find((img) => img.type === 'TEAM_CREST');
              const ownedQuantity = quantityFor(card);
              const wishlisted = wishlistedFor(card);

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '80px' }}
                  transition={{ duration: 0.25, delay: (i % 18) * 0.02 }}
                  className="group relative"
                >
                  <Link href={`/cards/${card.id}`} className="block">
                    <div className={`relative aspect-[63/88] rounded-xl overflow-hidden bg-foreground/5 border transition-colors ${ownedQuantity > 0 ? 'border-primary/50' : 'border-foreground/5 group-hover:border-foreground/20'}`}>
                      <div className={`w-full h-full transition-all duration-300 ${ownedQuantity > 0 ? '' : 'grayscale-[85%] opacity-45 group-hover:grayscale-0 group-hover:opacity-90'}`}>
                        {image ? (
                          <Image src={image.url} alt={card.name} fill className="object-cover" loading="lazy" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[11px] text-foreground/30 text-center p-2">{card.name}</div>
                        )}
                      </div>
                      {ownedQuantity > 0 && (
                        <div className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg font-mono text-[10px] font-bold" aria-label={`${ownedQuantity} owned`}>
                          {ownedQuantity > 1 ? `×${ownedQuantity}` : <Check size={11} strokeWidth={3} />}
                        </div>
                      )}
                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleWishlist(card); }}
                          aria-label={wishlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                          title={wishlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                          className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center border backdrop-blur transition-colors ${
                            wishlisted
                              ? 'bg-primary/20 border-primary/40 text-primary opacity-100'
                              : 'bg-background/60 border-foreground/20 text-foreground/60 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                          }`}
                        >
                          <Heart size={11} strokeWidth={2.5} className={wishlisted ? 'fill-primary' : ''} />
                        </button>
                      )}
                    </div>
                  </Link>
                  <div className="mt-2 space-y-1.5">
                    <Link href={`/cards/${card.id}`}>
                      <p className="text-sm font-medium line-clamp-1">{card.name}</p>
                      <div className="flex items-center justify-between text-[10px] text-foreground/50 font-mono">
                        <span>#{card.number} • {card.franchiseName}</span>
                        {card.price.valueUsd != null && <PriceTag compact data={card.price} />}
                      </div>
                    </Link>
                    {isLoggedIn && card.variantId && (
                      <div onClick={(e) => e.preventDefault()}>
                        <QuantityControl
                          compact
                          quantity={ownedQuantity}
                          onIncrement={() => handleQuantityChange(card, 1)}
                          onDecrement={() => handleQuantityChange(card, -1)}
                          className="w-full justify-center"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="text-center py-20 text-foreground/50">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>No cards found matching your filters.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-8">
              {page > 1 && (
                <Link href={buildUrl({ page: page - 1 })} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors">
                  Previous
                </Link>
              )}
              <span className="text-sm text-foreground/50 font-mono">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={buildUrl({ page: page + 1 })} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors">
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {paywallMessage && <PaywallModal message={paywallMessage} onClose={() => setPaywallMessage(null)} />}
      </AnimatePresence>
    </div>
  );
}
