'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, ExternalLink, TrendingUp, TrendingDown, Star } from 'lucide-react';
import Link from 'next/link';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { pickPrimaryImage } from '@/lib/media/pick-primary-image';

interface DisplayCaseProps {
  instances: any[];
}

export function DisplayCase({ instances }: DisplayCaseProps) {
  const [selectedInstance, setSelectedInstance] = useState<any | null>(null);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12">

      {/* 3D Shelf Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10 perspective-1000">
        {instances.map((instance, index) => {
          const card = instance.variant.card;
          const hqImage = pickPrimaryImage(card.images)?.url;
          const isFoil = instance.variant.isFoil;

          return (
            <motion.button
              type="button"
              key={instance.id}
              aria-label={`View details for ${card.name}`}
              className="relative cursor-pointer group flex flex-col items-center text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              initial={{ opacity: 0, y: 50, rotateX: 20 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
              onClick={() => setSelectedInstance(instance)}
            >
              {/* Card Container with 3D Hover */}
              <motion.div
                className="relative w-full aspect-[63/88] rounded-xl overflow-hidden shadow-2xl border border-foreground/10"
                whileHover={{ scale: 1.05, y: -10, rotateY: 5, rotateX: 5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {hqImage ? (
                  <Image src={hqImage} alt={card.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-foreground/5 flex items-center justify-center p-4 text-center">
                    <span className="text-foreground/40 text-xs font-mono">{card.name}</span>
                  </div>
                )}

                {/* Foil effect */}
                {isFoil && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/20 via-fuchsia-400/20 to-yellow-400/20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 mix-blend-color-dodge transition-opacity duration-500 pointer-events-none" />
                )}

                {/* Graded Slab Representation overlay */}
                {instance.isGraded && (
                  <div className="absolute top-0 left-0 right-0 h-6 bg-white/90 backdrop-blur-md flex items-center justify-between px-2 shadow-sm border-b border-white/20 z-10">
                    <span className="text-[8px] font-bold text-black uppercase">{instance.certification?.company}</span>
                    <span className="text-[10px] font-bold text-black">{instance.certification?.grade}</span>
                  </div>
                )}
                {/* Acrylic casing glare for graded */}
                {instance.isGraded && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-foreground/0 via-foreground/10 to-foreground/0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none transition-opacity" />
                )}
              </motion.div>

              {/* Shelf Base Reflection */}
              <div className="w-4/5 h-4 bg-gradient-to-b from-foreground/20 to-transparent mt-2 rounded-t-full opacity-40 blur-sm scale-y-50" />
            </motion.button>
          );
        })}
      </div>

      {/* Instance Detail Modal */}
      <AnimatePresence>
        {selectedInstance && (
          <InstanceModal
            instance={selectedInstance}
            onClose={() => setSelectedInstance(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// Separate component for the Modal to keep the file clean
function InstanceModal({ instance, onClose }: { instance: any, onClose: () => void }) {
  const card = instance.variant.card;
  const hqImage = pickPrimaryImage(card.images)?.url;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, true);

  const currentPrice = instance.variant.currentPrice?.marketPriceUsd ?? 0;
  const purchasePrice = instance.purchasePrice || 0;

  const profit = currentPrice - purchasePrice;
  const isProfit = profit >= 0;

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} details`}
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-elevated border border-foreground/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors z-50 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Left: The Card Visual */}
        <div className="w-full md:w-2/5 p-8 md:p-12 bg-background/40 flex items-center justify-center relative overflow-hidden">
          <div className="relative w-full max-w-[300px] aspect-[63/88] rounded-xl shadow-2xl">
            {hqImage ? (
              <Image src={hqImage} alt={card.name} fill className="object-cover" />
            ) : null}
            {instance.isGraded && (
              <div className="absolute top-0 left-0 right-0 h-8 bg-white/95 flex items-center justify-between px-4 shadow-sm border-b border-black/10">
                <span className="text-xs font-bold text-black uppercase">{instance.certification?.company}</span>
                <span className="text-sm font-bold text-black">{instance.certification?.grade}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Instance Data */}
        <div className="w-full md:w-3/5 p-8 md:p-12 space-y-10">
          <div>
            <p className="text-primary font-mono text-sm tracking-widest uppercase mb-2">
              {card.set.series.franchise.name} • {card.set.name}
            </p>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">{card.name}</h2>
            <p className="text-foreground/50 text-lg">
              {/* "Base" (the near-universal default Printing) is redundant next to an actual parallel name — only shown when there's no parallel to pair it with. */}
              {instance.variant.parallel?.name
                ? [instance.variant.printing?.name?.toLowerCase() !== 'base' ? instance.variant.printing?.name : null, instance.variant.parallel.name].filter(Boolean).join(' ')
                : instance.variant.printing?.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10">
              <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-1">Current Value</p>
              <p className="text-3xl font-bold text-foreground">${currentPrice.toFixed(2)}</p>
              {purchasePrice > 0 ? (
                <div className={`mt-2 flex items-center gap-1 text-sm ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>${Math.abs(profit).toFixed(2)} ({((profit / purchasePrice) * 100).toFixed(1)}%)</span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-foreground/30">No cost basis on record</p>
              )}
            </div>

            <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10 space-y-4">
              <div>
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-1">Acquired</p>
                <p className="text-foreground">{instance.purchaseDate ? new Date(instance.purchaseDate).toLocaleDateString() : 'Unknown Date'}</p>
              </div>
              <div>
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-1">Cost Basis</p>
                <p className="text-foreground">{purchasePrice > 0 ? `$${purchasePrice.toFixed(2)}` : 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-foreground/10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground/50">Condition</span>
              <span className="text-foreground flex items-center gap-2">
                {instance.isGraded && <Star size={14} className="text-yellow-400" />}
                {instance.condition}
              </span>
            </div>
            {instance.isGraded && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-foreground/50">Cert Number</span>
                <span className="text-foreground font-mono">{instance.certification?.certNumber}</span>
              </div>
            )}
            {instance.notes && (
              <div className="flex justify-between items-start text-sm">
                <span className="text-foreground/50">Notes</span>
                <span className="text-foreground text-right max-w-[60%]">{instance.notes}</span>
              </div>
            )}
          </div>

          <div className="pt-8">
            <Link
              href={`/cards/${card.id}`}
              className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-4 rounded-xl font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span>View Museum Page</span>
              <ExternalLink size={18} aria-hidden="true" />
            </Link>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
