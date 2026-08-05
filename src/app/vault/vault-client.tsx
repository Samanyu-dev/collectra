'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Building, ChevronRight, Star } from 'lucide-react';
import { pickPrimaryImage } from '@/lib/media/pick-primary-image';

interface VaultItem {
  instanceId: string;
  cardId: string;
  name: string;
  franchiseName: string;
  setName: string;
  images: { type: string; url: string }[];
  estimatedValue: number;
  purchaseDate: string | null;
  notes: string | null;
  isFavorite: boolean;
  certification: { company: string; grade: string } | null;
  location: { room: string; shelf: string } | null;
}

export function VaultClient({ items, totalVaultValue }: { items: VaultItem[]; totalVaultValue: number }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Museum Lighting Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-30" style={{
        background: 'radial-gradient(circle at 50% -20%, rgba(255,255,255,0.1) 0%, transparent 60%)'
      }} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 space-y-16 relative z-10">

        {/* Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-foreground/5 border border-foreground/10 mb-2">
            <Shield size={24} className="text-foreground/80" />
          </div>
          <h1 className="text-5xl md:text-6xl font-[family-name:var(--font-display)] font-light tracking-widest uppercase">
            The Vault
          </h1>
          <p className="text-foreground/50 max-w-xl mx-auto text-sm tracking-widest uppercase font-mono">
            Secured Assets • Total Value ${Math.round(totalVaultValue).toLocaleString()}
          </p>
        </motion.div>

        {/* Exhibition Grid */}
        <div className="space-y-32 py-16">
          {items.length === 0 ? (
            <div className="text-center py-20 text-foreground/30 space-y-4">
              <Building size={48} className="mx-auto opacity-50" />
              <p className="tracking-widest uppercase text-sm">Your vault is empty</p>
              <p className="text-xs max-w-md mx-auto">Vault your most valuable cards from their detail page for secure tracking and museum-grade display.</p>
            </div>
          ) : (
            items.map((item, i) => {
              const isEven = i % 2 === 0;
              const image = pickPrimaryImage(item.images)
                || item.images.find((img) => img.type === 'TEAM_CREST');

              return (
                <motion.div
                  key={item.instanceId}
                  className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 md:gap-24`}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1 }}
                >
                  {/* Pedestal / Display */}
                  <div className="flex-1 relative perspective-1000 w-full flex justify-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent blur-3xl -z-10 rounded-full scale-150 opacity-30" />

                    <Link href={`/cards/${item.cardId}`}>
                      <div className="relative group cursor-pointer w-[280px] aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-foreground/10 bg-foreground/5">
                        {image ? (
                          <Image src={image.url} alt={item.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-foreground/30 text-sm p-4 text-center">{item.name}</div>
                        )}
                        {item.certification && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1.5 rounded-t-lg text-xs font-bold font-mono shadow-xl border border-b-0 border-white/20 flex items-center gap-2 whitespace-nowrap">
                            <span>{item.certification.company}</span>
                            <span className="text-red-600 px-1">GRADE {item.certification.grade}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>

                  {/* Plaque / Details */}
                  <div className="flex-1 space-y-6 text-center md:text-left">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-foreground/50 tracking-widest uppercase flex items-center justify-center md:justify-start gap-2">
                        Exhibit {String(i + 1).padStart(2, '0')}
                        {item.isFavorite && <Star size={12} className="fill-current text-yellow-400" />}
                      </p>
                      <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-light tracking-tight text-foreground/90">
                        {item.name}
                      </h2>
                      <p className="text-sm text-foreground/40 tracking-wider uppercase">
                        {item.franchiseName} • {item.setName}
                      </p>
                    </div>

                    <div className="h-px w-24 bg-foreground/10 mx-auto md:mx-0" />

                    <div className="space-y-4">
                      {item.notes && (
                        <p className="text-sm leading-relaxed text-foreground/70 italic font-serif">
                          "{item.notes}"
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-left border border-foreground/10 p-4 rounded-lg bg-foreground/5 backdrop-blur-sm">
                        <div>
                          <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Est. Value</p>
                          <p className="text-xl font-mono text-foreground/90">${Math.round(item.estimatedValue).toLocaleString()}</p>
                        </div>
                        {item.purchaseDate && (
                          <div>
                            <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Acquired</p>
                            <p className="text-sm font-medium text-foreground/80">{new Date(item.purchaseDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {item.location && (
                          <div>
                            <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Location</p>
                            <p className="text-sm font-medium text-foreground/80">{item.location.room}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link href={`/cards/${item.cardId}`} className="inline-flex items-center gap-2 text-xs text-foreground/50 hover:text-foreground transition-colors tracking-widest uppercase">
                      View Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
