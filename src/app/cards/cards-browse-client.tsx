'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { PriceTag, type PriceTagData } from '@/components/ui/price-tag';
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
}

export function CardsBrowseClient({
  items,
  query,
  page,
  totalPages,
  total,
}: {
  items: CardItem[];
  query: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const [search, setSearch] = useState(query);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/cards${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold tracking-tight">
          Card Database
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Every card ingested into the Universal Graph — {total.toLocaleString()} total.
        </p>
      </motion.div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          aria-label="Search cards"
          placeholder="Search number, player, team, insert, set..."
          className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((card, i) => {
          const image = pickPrimaryImage(card.images)
            || card.images.find((img) => img.type === 'TEAM_CREST');

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '80px' }}
              transition={{ duration: 0.25, delay: (i % 18) * 0.02 }}
            >
              <Link href={`/cards/${card.id}`} className="block group">
                <div className={`relative aspect-[63/88] rounded-xl overflow-hidden bg-foreground/5 border transition-colors ${card.ownedQuantity > 0 ? 'border-primary/50' : 'border-foreground/5 group-hover:border-foreground/20'}`}>
                  <div className={`w-full h-full transition-all duration-300 ${card.ownedQuantity > 0 ? '' : 'grayscale-[85%] opacity-45 group-hover:grayscale-0 group-hover:opacity-90'}`}>
                    {image ? (
                      <Image src={image.url} alt={card.name} fill className="object-cover" loading="lazy" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-foreground/30 text-center p-2">{card.name}</div>
                    )}
                  </div>
                  {card.ownedQuantity > 0 && (
                    <div className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg font-mono text-[10px] font-bold" aria-label={`${card.ownedQuantity} owned`}>
                      {card.ownedQuantity > 1 ? `×${card.ownedQuantity}` : <Check size={11} strokeWidth={3} />}
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm font-medium line-clamp-1">{card.name}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>#{card.number} • {card.franchiseName}</span>
                    {card.price.valueUsd != null && <PriceTag compact data={card.price} />}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Search size={48} className="mx-auto mb-4 opacity-20" />
          <p>No cards found matching your search.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-8">
          {page > 1 && (
            <Link href={`/cards?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ''}`} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground font-mono">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/cards?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ''}`} className="px-5 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
