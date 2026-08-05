'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search as SearchIcon, PackageOpen, Clock, X, Compass, Layers } from 'lucide-react';
import { ListRowsSkeleton } from '@/components/ui/skeleton';
import { pickPrimaryImage } from '@/lib/media/pick-primary-image';

interface SearchResults {
  cards: any[];
  sets: any[];
  products: any[];
}

type ResultType = 'all' | 'sets' | 'cards' | 'products';

const RECENTS_KEY = 'collectra-recent-searches';
const MAX_RECENTS = 6;

function loadRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  if (typeof window === 'undefined' || !q.trim()) return;
  const existing = loadRecents().filter((r) => r.toLowerCase() !== q.toLowerCase());
  localStorage.setItem(RECENTS_KEY, JSON.stringify([q, ...existing].slice(0, MAX_RECENTS)));
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-foreground rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ cards: [], sets: [], products: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ResultType>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ cards: [], sets: [], products: [] });
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults({ cards: data.cards ?? [], sets: data.sets ?? [], products: data.products ?? [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, filter, results]);

  const flatItems = useMemo(() => {
    const items: { type: 'set' | 'card' | 'product'; id: string; href: string }[] = [];
    if (filter === 'all' || filter === 'sets') items.push(...results.sets.map((s) => ({ type: 'set' as const, id: s.id, href: `/collections/${s.id}` })));
    if (filter === 'all' || filter === 'cards') items.push(...results.cards.map((c) => ({ type: 'card' as const, id: c.id, href: `/cards/${c.id}` })));
    if (filter === 'all' || filter === 'products') items.push(...results.products.map((p) => ({ type: 'product' as const, id: p.id, href: `/products/${p.id}` })));
    return items;
  }, [results, filter]);

  const hasResults = flatItems.length > 0;
  const totalCount = results.sets.length + results.cards.length + results.products.length;

  const commitSearch = useCallback((href: string) => {
    saveRecent(query);
    router.push(href);
  }, [query, router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) commitSearch(item.href);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  }

  const filterTabs: { key: ResultType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'sets', label: 'Sets', count: results.sets.length },
    { key: 'cards', label: 'Cards', count: results.cards.length },
    { key: 'products', label: 'Products', count: results.products.length },
  ];

  let rowIndex = -1;
  const nextRowIndex = () => ++rowIndex;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={hasResults}
          aria-controls="search-results-list"
          aria-label="Search across every card, set, and product" placeholder="Search across every card, set, and product..."
          className="w-full bg-card border border-border rounded-2xl pl-12 pr-12 py-5 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </motion.div>

      {query.length >= 2 && totalCount > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Filter results by type">
          {filterTabs.filter((t) => t.key === 'all' || t.count > 0).map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label} <span className="opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && loading && (
        <ListRowsSkeleton count={5} />
      )}

      {query.length >= 2 && !loading && !hasResults && (
        <div className="text-center py-20 text-muted-foreground space-y-4">
          <SearchIcon size={40} className="mx-auto opacity-20" />
          <p className="text-lg">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm max-w-sm mx-auto">Check the spelling, try a broader term, or browse instead.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/collections" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium hover:border-primary/50 transition-colors">
              <Layers size={16} /> Browse Collections
            </Link>
            <Link href="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium hover:border-primary/50 transition-colors">
              <Compass size={16} /> Explore
            </Link>
          </div>
        </div>
      )}

      {query.length >= 2 && !loading && hasResults && (
        <div id="search-results-list" role="listbox" className="space-y-10">
          {(filter === 'all' || filter === 'sets') && results.sets.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sets</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.sets.map((set: any) => {
                  const idx = nextRowIndex();
                  const active = activeIndex === idx;
                  return (
                    <motion.div key={set.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                      <Link
                        href={`/collections/${set.id}`}
                        onClick={() => saveRecent(query)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        role="option"
                        aria-selected={active}
                        className={`flex items-center gap-4 bg-card border p-3 rounded-xl transition-colors group ${active ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                          <PackageOpen size={18} className="text-foreground/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors"><HighlightMatch text={set.name} query={query} /></p>
                          <p className="text-xs text-muted-foreground">{set.series?.franchise?.name}</p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'cards') && results.cards.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cards</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.cards.map((card: any) => {
                  const idx = nextRowIndex();
                  const active = activeIndex === idx;
                  const image = pickPrimaryImage(card.images);
                  return (
                    <motion.div key={card.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                      <Link
                        href={`/cards/${card.id}`}
                        onClick={() => saveRecent(query)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        role="option"
                        aria-selected={active}
                        className={`flex items-center gap-4 bg-card border p-3 rounded-xl transition-colors group ${active ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="relative w-12 h-16 rounded-md overflow-hidden bg-foreground/5 shrink-0">
                          {image && <Image src={image.url} alt={card.name} fill className="object-cover" unoptimized />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors"><HighlightMatch text={card.name} query={query} /></p>
                          <p className="text-xs text-muted-foreground font-mono">#{card.number} • {card.set?.name}</p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'products') && results.products.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sealed Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.products.map((product: any) => {
                  const idx = nextRowIndex();
                  const active = activeIndex === idx;
                  const image = product.images?.[0];
                  return (
                    <motion.div key={product.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                      <Link
                        href={`/products/${product.id}`}
                        onClick={() => saveRecent(query)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        role="option"
                        aria-selected={active}
                        className={`flex items-center gap-4 bg-card border p-3 rounded-xl transition-colors group ${active ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-foreground/5 shrink-0 flex items-center justify-center">
                          {image ? <Image src={image.url} alt={product.name} fill className="object-contain" unoptimized /> : <PackageOpen size={18} className="text-foreground/30" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors"><HighlightMatch text={product.name} query={query} /></p>
                          {product.currentPrice?.marketPriceUsd != null && <p className="text-xs text-green-400 font-mono">${product.currentPrice.marketPriceUsd.toFixed(2)}</p>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {query.length === 0 && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {recents.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Searches</h2>
                  <button
                    onClick={() => { localStorage.removeItem(RECENTS_KEY); setRecents([]); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recents.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm hover:border-primary/50 transition-colors"
                    >
                      <Clock size={13} className="text-muted-foreground" /> {r}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="text-center py-16 text-muted-foreground space-y-4">
              <SearchIcon size={40} className="mx-auto opacity-20" />
              <p>Start typing to search across every card, set, and sealed product.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link href="/collections" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium hover:border-primary/50 transition-colors">
                  <Layers size={16} /> Browse Collections
                </Link>
                <Link href="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium hover:border-primary/50 transition-colors">
                  <Compass size={16} /> Explore
                </Link>
              </div>
            </section>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
