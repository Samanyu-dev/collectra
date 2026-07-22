'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { Heart, Bell } from 'lucide-react';
import { toggleWishlist } from '@/lib/actions/wishlist';
import { PriceTag, type PriceTagData } from '@/components/ui/price-tag';

interface WishlistItem {
  id: string;
  cardId: string;
  name: string;
  number: string;
  setName: string;
  priceAlert: number | null;
  addedAt: string;
  images: { type: string; url: string }[];
  price: PriceTagData;
  alertTriggered: boolean;
}

export function WishlistClient({ items: initialItems }: { items: WishlistItem[] }) {
  const [removed, setRemoved] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  function handleRemove(cardId: string) {
    setRemoved((prev) => ({ ...prev, [cardId]: true }));
    startTransition(() => {
      toggleWishlist(cardId).catch(() => setRemoved((prev) => ({ ...prev, [cardId]: false })));
    });
  }

  const items = initialItems.filter((i) => !removed[i.cardId]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold tracking-tight flex items-center gap-3">
          <Heart className="text-primary fill-primary/20" /> Wishlist
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Cards you're hunting for. Tap the heart on any card to add it here.
        </p>
      </motion.div>

      {items.length === 0 ? (
        <div className="text-center py-32 text-muted-foreground border border-dashed border-border rounded-2xl bg-card/50">
          <Heart size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-foreground">Your wishlist is empty</p>
          <p className="text-sm mt-1 mb-6">Start tracking cards you want to acquire.</p>
          <Link href="/cards" className="bg-foreground text-background px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors">
            Browse Cards
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {items.map((item, i) => {
              const image = item.images.find((img) => img.type === 'THUMBNAIL')
                || item.images.find((img) => img.type === 'OFFICIAL_ARTWORK')
                || item.images.find((img) => img.type === 'TEAM_CREST');

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors group relative"
                >
                  <Link href={`/cards/${item.cardId}`} className="shrink-0 relative w-[100px] h-[140px] rounded-lg overflow-hidden bg-foreground/5">
                    {image ? (
                      <Image src={image.url} alt={item.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-foreground/30 text-center p-1">{item.name}</div>
                    )}
                  </Link>

                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link href={`/cards/${item.cardId}`} className="hover:underline line-clamp-1 flex-1">
                        <p className="font-semibold text-sm">{item.name}</p>
                      </Link>
                      <button
                        onClick={() => handleRemove(item.cardId)}
                        className="opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0"
                        aria-label="Remove from wishlist"
                        title="Remove from wishlist"
                      >
                        <Heart size={16} className="fill-current" />
                      </button>
                    </div>

                    <p className="text-[10px] text-muted-foreground font-mono mb-3">#{item.number} • {item.setName}</p>

                    <div className="mt-auto space-y-2">
                      <PriceTag data={item.price} />

                      {item.priceAlert && (
                        <div
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                            item.alertTriggered ? "text-green-500 bg-green-500/10" : "text-primary bg-primary/10"
                          }`}
                        >
                          <Bell size={12} />
                          <span>
                            {item.alertTriggered ? "At or below your alert price — " : "Alert at "}
                            ${item.priceAlert.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
