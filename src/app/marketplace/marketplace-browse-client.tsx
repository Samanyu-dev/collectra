'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Tag, Plus } from 'lucide-react';

interface ListingItem {
  id: string;
  cardName: string;
  cardNumber: string;
  setName: string;
  condition: string;
  grade: string | null;
  price: number;
  currency: string;
  shipsTo: string;
  imageUrl: string | null;
}

const SHIPS_TO_OPTIONS = ['', 'Worldwide', 'Europe', 'India', 'Local pickup'];

export function MarketplaceBrowseClient({
  items,
  query,
  shipsTo,
  page,
  totalPages,
  total,
}: {
  items: ListingItem[];
  query: string;
  shipsTo: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const [search, setSearch] = useState(query);
  const router = useRouter();

  function buildUrl(overrides: { q?: string; shipsTo?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = overrides.q ?? query;
    const st = overrides.shipsTo ?? shipsTo;
    const p = overrides.page ?? 1;
    if (q) params.set('q', q);
    if (st) params.set('shipsTo', st);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/marketplace${qs ? `?${qs}` : ''}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ q: search }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-2">
            <Tag size={16} /> Marketplace
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            {total.toLocaleString()} cards, listed by collectors
          </h1>
          <p className="text-foreground/50 mt-2 max-w-2xl">
            Deals happen between you and the seller directly — Collectra doesn't touch the money.
          </p>
        </div>
        <Link
          href="/marketplace/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus size={16} /> List a card
        </Link>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            type="text"
            aria-label="Search listings by card name"
            placeholder="Search by card name..."
            className="w-full bg-foreground/5 border border-foreground/10 rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          aria-label="Filter by shipping region"
          className="bg-foreground/5 border border-foreground/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          value={shipsTo}
          onChange={(e) => router.push(buildUrl({ shipsTo: e.target.value }))}
        >
          {SHIPS_TO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || 'Ships anywhere'}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '80px' }}
            transition={{ duration: 0.25, delay: (i % 18) * 0.02 }}
          >
            <Link href={`/marketplace/${item.id}`} className="block group">
              <div className="relative aspect-[63/88] rounded-xl overflow-hidden bg-foreground/5 border border-foreground/5 group-hover:border-foreground/20 transition-colors">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.cardName} fill className="object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-foreground/30 text-center p-2">{item.cardName}</div>
                )}
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-[10px] font-mono font-bold">
                  {item.currency === 'USD' ? '$' : `${item.currency} `}{item.price.toFixed(2)}
                </div>
              </div>
              <div className="mt-2 space-y-0.5">
                <p className="text-sm font-medium line-clamp-1">{item.cardName}</p>
                <div className="flex items-center justify-between text-[10px] text-foreground/50 font-mono">
                  <span>#{item.cardNumber} · {item.setName}</span>
                </div>
                <p className="text-[10px] text-foreground/40">{item.condition}{item.grade ? ` · ${item.grade}` : ''}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 text-foreground/40 border border-dashed border-foreground/10 rounded-3xl bg-foreground/5">
          <Tag size={48} className="mx-auto mb-4 opacity-20" />
          <p>No listings found.</p>
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
  );
}
