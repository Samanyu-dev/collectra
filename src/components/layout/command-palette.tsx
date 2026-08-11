'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Loader2, Home, Layers, Compass, User, LayoutGrid, BookOpen,
  Shield, Heart, Target, BarChart3, Upload, PackageOpen, Clock, X, Settings, Factory,
} from 'lucide-react';
import Image from 'next/image';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { pickPrimaryImage } from '@/lib/media/pick-primary-image';

interface SearchResults {
  sets: any[];
  cards: any[];
  products: any[];
}

const NAV_ITEMS = [
  { id: 'nav-home', label: 'Home', href: '/', icon: Home },
  { id: 'nav-collections', label: 'Browse Collections', href: '/collections', icon: Layers },
  { id: 'nav-cards', label: 'All Cards', href: '/cards', icon: LayoutGrid },
  { id: 'nav-discover', label: 'Discover', href: '/discover', icon: Compass },
  { id: 'nav-explore', label: 'Explore', href: '/explore', icon: BookOpen },
  { id: 'nav-manufacturers', label: 'Manufacturers', href: '/manufacturers', icon: Factory },
  { id: 'nav-shelf', label: 'My Shelf', href: '/shelf', icon: User },
  { id: 'nav-vault', label: 'Vault', href: '/vault', icon: Shield },
  { id: 'nav-wishlist', label: 'Wishlist', href: '/wishlist', icon: Heart },
  { id: 'nav-projects', label: 'Projects', href: '/projects', icon: Target },
  { id: 'nav-statistics', label: 'Statistics', href: '/statistics', icon: BarChart3 },
  { id: 'nav-migration', label: 'Migration', href: '/migration', icon: Upload },
  { id: 'nav-pack-simulator', label: 'Pack Simulator', href: '/pack-simulator', icon: PackageOpen },
  { id: 'nav-settings', label: 'Settings', href: '/settings', icon: Settings },
];

const RECENTS_KEY = 'collectra-recent-searches';
const MAX_RECENTS = 5;

function loadRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return;
  const existing = loadRecents().filter((q) => q.toLowerCase() !== query.toLowerCase());
  const next = [query, ...existing].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

/** Wraps the substring of `text` matching `query` in a <mark> for visual highlighting. */
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

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useFocusTrap(modalRef, isOpen);

  const flatItems = useMemo(() => {
    if (query.length >= 2) {
      if (!results) return [];
      return [
        ...results.sets.map((s) => ({ type: 'set' as const, id: s.id, data: s })),
        ...results.cards.map((c) => ({ type: 'card' as const, id: c.id, data: c })),
        ...results.products.map((p) => ({ type: 'product' as const, id: p.id, data: p })),
      ];
    }
    return NAV_ITEMS.map((n) => ({ type: 'nav' as const, id: n.id, data: n }));
  }, [query, results]);

  function navigate(item: (typeof flatItems)[number]) {
    setIsOpen(false);
    if (item.type === 'nav') router.push(item.data.href);
    else if (item.type === 'set') router.push(`/collections/${item.data.id}`);
    else if (item.type === 'card') router.push(`/cards/${item.data.id}`);
    else if (item.type === 'product') router.push(`/products/${item.data.id}`);
    if (query.length >= 2) saveRecent(query);
  }

  // Cmd+K / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setRecents(loadRecents());
    } else {
      setQuery('');
      setResults(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results]);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults({ sets: data.sets ?? [], cards: data.cards ?? [], products: data.products ?? [] });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (item) navigate(item);
      }
    },
    [flatItems, activeIndex]
  );

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  let runningIndex = -1;
  const nextIndex = () => ++runningIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      <div ref={modalRef} className="relative w-full max-w-2xl bg-elevated border border-foreground/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-4 border-b border-foreground/10">
          <Search className="w-5 h-5 text-foreground/40 mr-3 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={flatItems[activeIndex] ? `cp-item-${flatItems[activeIndex].id}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label="Search cards, sets, products, or jump to a page" placeholder="Search cards, sets, products, or jump to a page..."
            className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder-foreground/30"
          />
          {loading && <Loader2 className="w-5 h-5 text-foreground/40 animate-spin ml-3" aria-label="Loading" />}
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="ml-2 text-foreground/30 hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
          <div className="hidden md:flex items-center ml-4 gap-1">
            <kbd className="bg-foreground/10 text-foreground/50 px-2 py-1 rounded text-xs font-mono">esc</kbd>
          </div>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
          {query.length >= 2 && !loading && flatItems.length === 0 && (
            <div className="p-8 text-center text-foreground/40">No results found for &ldquo;{query}&rdquo;.</div>
          )}

          {query.length >= 2 && results && (
            <div className="space-y-6 p-2">
              {results.sets.length > 0 && (
                <ResultGroup label="Sets">
                  {results.sets.map((set) => {
                    const idx = nextIndex();
                    return (
                      <ResultRow key={set.id} id={`cp-item-${set.id}`} index={idx} active={activeIndex === idx} onClick={() => navigate(flatItems[idx])} onMouseEnter={() => setActiveIndex(idx)}>
                        <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center overflow-hidden shrink-0">
                          <span className="text-foreground/30 font-bold text-xs uppercase">{set.series.franchise.name.substring(0, 3)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-foreground font-medium truncate"><HighlightMatch text={set.name} query={query} /></div>
                          <div className="text-xs text-foreground/50 font-mono truncate">{set.series.franchise.name} • {set.series.name}</div>
                        </div>
                      </ResultRow>
                    );
                  })}
                </ResultGroup>
              )}

              {results.cards.length > 0 && (
                <ResultGroup label="Cards">
                  {results.cards.map((card) => {
                    const idx = nextIndex();
                    const thumb = pickPrimaryImage(card.images)?.url;
                    return (
                      <ResultRow key={card.id} id={`cp-item-${card.id}`} index={idx} active={activeIndex === idx} onClick={() => navigate(flatItems[idx])} onMouseEnter={() => setActiveIndex(idx)}>
                        <div className="w-8 h-11 bg-foreground/5 shrink-0 rounded overflow-hidden relative border border-foreground/10">
                          {thumb && <Image src={thumb} alt={card.name} fill className="object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-foreground font-medium truncate"><HighlightMatch text={card.name} query={query} /></div>
                          <div className="text-xs text-foreground/50 font-mono truncate">{card.set.name} • {card.set.series.franchise.name}</div>
                        </div>
                      </ResultRow>
                    );
                  })}
                </ResultGroup>
              )}

              {results.products.length > 0 && (
                <ResultGroup label="Sealed Products">
                  {results.products.map((product) => {
                    const idx = nextIndex();
                    const thumb = product.images?.[0]?.url;
                    return (
                      <ResultRow key={product.id} id={`cp-item-${product.id}`} index={idx} active={activeIndex === idx} onClick={() => navigate(flatItems[idx])} onMouseEnter={() => setActiveIndex(idx)}>
                        <div className="w-10 h-10 bg-foreground/5 shrink-0 rounded-lg overflow-hidden relative border border-foreground/10 flex items-center justify-center">
                          {thumb ? <Image src={thumb} alt={product.name} fill className="object-contain" /> : <PackageOpen size={16} className="text-foreground/20" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-foreground font-medium truncate"><HighlightMatch text={product.name} query={query} /></div>
                        </div>
                      </ResultRow>
                    );
                  })}
                </ResultGroup>
              )}
            </div>
          )}

          {query.length === 0 && (
            <div className="p-2 space-y-6">
              {recents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider px-2">Recent Searches</h3>
                  <div className="space-y-1">
                    {recents.map((r) => (
                      <button
                        key={r}
                        onClick={() => setQuery(r)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-foreground/5 text-sm text-foreground/70 hover:text-foreground text-left transition-colors"
                      >
                        <Clock size={14} className="text-foreground/30 shrink-0" />
                        <span className="truncate">{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider px-2">Navigation</h3>
                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const idx = nextIndex();
                    return (
                      <ResultRow key={item.id} id={`cp-item-${item.id}`} index={idx} active={activeIndex === idx} onClick={() => navigate(flatItems[idx])} onMouseEnter={() => setActiveIndex(idx)}>
                        <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center shrink-0">
                          <item.icon size={15} className="text-foreground/60" />
                        </div>
                        <span className="text-foreground">{item.label}</span>
                      </ResultRow>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider px-2">{label}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ResultRow({
  id,
  index,
  active,
  onClick,
  onMouseEnter,
  children,
}: {
  id: string;
  index: number;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      data-index={index}
      role="option"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-4 p-2 rounded-xl transition-colors text-left ${active ? 'bg-foreground/10' : 'hover:bg-foreground/5'}`}
    >
      {children}
    </button>
  );
}
