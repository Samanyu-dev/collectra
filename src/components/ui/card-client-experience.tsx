'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmbientBackground } from './ambient-background';
import { CardDeepZoom } from './card-deep-zoom';
import { VariantShelf } from './variant-shelf';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Users, Layers, Tag, PackageOpen, Check, Plus, Heart, Shield, Star, Share2, ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import Image from 'next/image';
import { toggleCardOwned, toggleVaulted, toggleFavorite } from '@/lib/actions/collection';
import { toggleWishlist } from '@/lib/actions/wishlist';
import { PriceTag } from './price-tag';
import { toPriceDisplay } from '@/lib/pricing/display';

interface RelatedCard {
  id: string;
  name: string;
  number: string;
  images: { type: string; url: string }[];
}

interface CardClientExperienceProps {
  card: any; // Deep, page-specific Prisma include shape — not worth a dedicated type
  topVariantId: string;
  relatedCards?: RelatedCard[];
}

export function CardClientExperience({ card, topVariantId, relatedCards = [] }: CardClientExperienceProps) {
  const [activeVariantId, setActiveVariantId] = useState(topVariantId);
  const [owned, setOwned] = useState(!!card.variants.find((v: any) => v.id === topVariantId)?.owned);
  const [wishlisted, setWishlisted] = useState(!!card.isWishlisted);
  const [vaulted, setVaulted] = useState(!!card.variants.find((v: any) => v.id === topVariantId)?.vaulted);
  const [favorited, setFavorited] = useState(!!card.variants.find((v: any) => v.id === topVariantId)?.favorited);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: card.name, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — nothing more we can do without a fallback UI
    }
  }

  function handleToggleOwned() {
    const next = !owned;
    setOwned(next);
    if (!next) {
      setVaulted(false); // can't be vaulted if no longer owned
      setFavorited(false); // can't be favorited if no longer owned
    }
    startTransition(() => {
      toggleCardOwned(activeVariantId, card.setId).catch(() => setOwned(!next));
    });
  }

  function handleToggleWishlist() {
    const next = !wishlisted;
    setWishlisted(next);
    startTransition(() => {
      toggleWishlist(card.id).catch(() => setWishlisted(!next));
    });
  }

  function handleToggleVaulted() {
    if (!owned) return;
    const next = !vaulted;
    setVaulted(next);
    startTransition(() => {
      toggleVaulted(activeVariantId).catch(() => setVaulted(!next));
    });
  }

  function handleToggleFavorite() {
    if (!owned) return;
    const next = !favorited;
    setFavorited(next);
    startTransition(() => {
      toggleFavorite(activeVariantId).catch(() => setFavorited(!next));
    });
  }

  const hqImage = card.images?.find((i: any) => i.type === 'OFFICIAL_ARTWORK')?.url
               || card.images?.find((i: any) => i.type === 'THUMBNAIL')?.url
               || "";
  const crestImage = card.images?.find((i: any) => i.type === 'TEAM_CREST')?.url || "";

  const activeVariant = card.variants.find((v: any) => v.id === activeVariantId) || card.variants[0];

  // Map variants for the shelf
  const shelfVariants = card.variants.map((v: any) => {
    // Determine the name based on printing/parallel
    let name = "Base";
    if (v.printing?.name && v.parallel?.name) name = `${v.printing.name} ${v.parallel.name}`;
    else if (v.printing?.name) name = v.printing.name;
    else if (v.parallel?.name) name = v.parallel.name;
    
    return {
      id: v.id,
      name,
      price: v.currentPrice?.marketPriceUsd ?? undefined,
      isFoil: v.isFoil,
      isActive: v.id === activeVariantId
    };
  });

  const cycleVariant = useCallback(
    (direction: 1 | -1) => {
      const ids = shelfVariants.map((v: any) => v.id);
      const currentIndex = ids.indexOf(activeVariantId);
      if (currentIndex === -1 || ids.length < 2) return;
      const nextIndex = (currentIndex + direction + ids.length) % ids.length;
      setActiveVariantId(ids[nextIndex]);
    },
    [shelfVariants, activeVariantId]
  );

  // Keyboard shortcuts: ← → cycle variants, W wishlist, F favorite, S share.
  // Ignored while typing in an input/textarea or holding a modifier key.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cycleVariant(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cycleVariant(1);
      } else if (e.key.toLowerCase() === 'w') {
        handleToggleWishlist();
      } else if (e.key.toLowerCase() === 'f' && owned) {
        handleToggleFavorite();
      } else if (e.key.toLowerCase() === 's') {
        handleShare();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleVariant, owned, wishlisted, favorited]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/30 overflow-x-hidden pb-48">
      {/* 1. Ambient Background Layer */}
      <AmbientBackground imageUrl={hqImage || crestImage} />

      {/* Top Nav / Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="fixed top-0 left-0 right-0 z-50 p-6 md:p-8 pointer-events-none flex items-center gap-2 overflow-x-auto scrollbar-none"
      >
        <Link
          href={`/collections/${card.setId}`}
          className="shrink-0 w-9 h-9 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors pointer-events-auto bg-background/40 backdrop-blur-xl rounded-full border border-foreground/10 shadow-2xl hover:bg-background/60"
          aria-label={`Back to ${card.set.name}`}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2 pointer-events-auto bg-background/40 backdrop-blur-xl px-4 py-2 rounded-full border border-foreground/10 shadow-2xl text-sm font-medium whitespace-nowrap">
          <Link href={`/collections?franchise=${card.set.series.franchiseId}`} className="text-foreground/60 hover:text-foreground transition-colors">
            {card.set.series.franchise.name}
          </Link>
          <span className="text-foreground/30">/</span>
          <Link href={`/collections/${card.setId}`} className="text-foreground/60 hover:text-foreground transition-colors">
            {card.set.name}
          </Link>
          <span className="text-foreground/30">/</span>
          <span className="text-foreground truncate max-w-[160px] md:max-w-xs">{card.name}</span>
        </div>
      </nav>

      {/* 2. Massive Hero Section */}
      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-24">
          
          {/* Deep Zoom Image */}
          <div className="flex-shrink-0">
            {hqImage ? (
              <CardDeepZoom imageUrl={hqImage} name={card.name} />
            ) : crestImage ? (
              <div className="relative w-64 md:w-80 aspect-[63/88] rounded-2xl overflow-hidden bg-gradient-to-b from-foreground/10 to-background/40 border border-foreground/10 shadow-2xl flex flex-col items-center justify-center gap-4 p-8">
                <div className="relative w-2/3 aspect-square drop-shadow-2xl">
                  <Image src={crestImage} alt={card.name} fill className="object-contain" unoptimized />
                </div>
                <span className="text-foreground/40 text-xs font-mono uppercase tracking-widest text-center">{card.name}</span>
              </div>
            ) : (
              <div className="w-64 md:w-80 aspect-[63/88] rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                <span className="text-foreground/30 text-sm">{card.name}</span>
              </div>
            )}
          </div>

          {/* Core Title & Typography */}
          <div className="flex-1 space-y-8 text-center lg:text-left mt-8 lg:mt-16">
            <div className="space-y-2">
              <p className="text-primary font-mono text-sm tracking-widest uppercase">
                {card.set.series.franchise.name} • {card.set.name} • #{card.number}
              </p>
              <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight text-foreground drop-shadow-2xl">
                {card.name}
              </h1>
            </div>

            {/* Collection Actions */}
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <motion.button
                type="button"
                onClick={handleToggleOwned}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-colors border ${
                  owned
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-foreground/10 text-foreground border-foreground/20 hover:bg-foreground/20'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {owned ? (
                    <motion.span key="o" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }} className="flex items-center gap-2">
                      <Check size={16} strokeWidth={3} /> In Collection
                    </motion.span>
                  ) : (
                    <motion.span key="u" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                      <Plus size={16} strokeWidth={3} /> Add to Collection
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleToggleWishlist}
                whileTap={{ scale: 0.9 }}
                title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors ${
                  wishlisted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-foreground/10 border-foreground/20 text-foreground/60 hover:text-foreground hover:bg-foreground/20'
                }`}
              >
                <Heart size={18} className={wishlisted ? 'fill-current' : ''} />
              </motion.button>

              {owned && (
                <motion.button
                  type="button"
                  onClick={handleToggleVaulted}
                  whileTap={{ scale: 0.9 }}
                  title={vaulted ? 'Remove from vault' : 'Move to vault'}
                  className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors ${
                    vaulted ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-foreground/10 border-foreground/20 text-foreground/60 hover:text-foreground hover:bg-foreground/20'
                  }`}
                >
                  <Shield size={18} className={vaulted ? 'fill-current' : ''} />
                </motion.button>
              )}

              {owned && (
                <motion.button
                  type="button"
                  onClick={handleToggleFavorite}
                  whileTap={{ scale: 0.9 }}
                  title={favorited ? 'Remove favorite' : 'Mark as favorite'}
                  className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors ${
                    favorited ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-foreground/10 border-foreground/20 text-foreground/60 hover:text-foreground hover:bg-foreground/20'
                  }`}
                >
                  <Star size={18} className={favorited ? 'fill-current' : ''} />
                </motion.button>
              )}

              <motion.button
                type="button"
                onClick={handleShare}
                whileTap={{ scale: 0.9 }}
                title={copied ? 'Link copied' : 'Share this card'}
                aria-label={copied ? 'Link copied to clipboard' : 'Share this card'}
                className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors ${
                  copied ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-foreground/10 border-foreground/20 text-foreground/60 hover:text-foreground hover:bg-foreground/20'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="copied" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check size={18} strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="share" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Share2 size={18} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 font-mono text-foreground/50 text-sm">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{card.artists?.map((a:any)=>a.name).join(', ') || 'Unknown Artist'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{card.set.releaseDate ? new Date(card.set.releaseDate).getFullYear() : 'Unknown Year'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers size={16} />
                <span>{card.supertype} {card.subtypes ? `(${card.subtypes})` : ''}</span>
              </div>
            </div>

            {/* Active Variant Price Highlight */}
            <div className="pt-8 border-t border-foreground/10">
              <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-2">Market Value ({activeVariant.parallel?.name || 'Base'})</p>
              <PriceTag data={toPriceDisplay(activeVariant.currentPrice)} />
            </div>
          </div>

        </div>
      </main>

      {/* 3. The Variant Shelf */}
      <section className="relative z-10 w-full mt-12 bg-gradient-to-b from-transparent to-background/80">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-mono text-foreground/50 uppercase tracking-widest">Printings & Parallels</h3>
          {shelfVariants.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 text-foreground/30 text-xs font-mono" title="Use ← → to switch variants">
              <Keyboard size={13} aria-hidden="true" />
              <ChevronLeft size={11} aria-hidden="true" />
              <ChevronRight size={11} aria-hidden="true" />
              <span>switch variants</span>
            </div>
          )}
        </div>
        <VariantShelf
          variants={shelfVariants}
          onSelect={setActiveVariantId}
        />
      </section>

      {/* 4. The Museum Editorial */}
      <section className="relative z-10 w-full max-w-[800px] mx-auto px-6 md:px-12 mt-32 space-y-24">
        
        {/* Story */}
        <div className="space-y-6">
          <h3 className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
            <Tag size={16} /> The Story
          </h3>
          <div className="prose prose-invert prose-lg md:prose-xl font-serif text-foreground/80 leading-relaxed">
            {card.flavorText ? (
              <blockquote className="border-l-2 border-primary pl-6 italic text-foreground/90 font-medium">
                "{card.flavorText}"
              </blockquote>
            ) : null}
            <p className="mt-8">
              Released as part of the highly anticipated <strong>{card.set.name}</strong> set, this iteration of {card.name} represents a cornerstone piece for {card.set.series.franchise.name} collectors. 
            </p>
            <p>
              Illustrated by <strong>{card.artists?.map((a:any)=>a.name).join(', ') || 'an unknown artist'}</strong>, the artwork breaks traditional framing boundaries, offering a glimpse into a broader narrative ecosystem. It continues to be one of the most heavily traded assets on the secondary market.
            </p>
          </div>
        </div>

          {/* Found In / Related Products */}
          <div className="pt-12 border-t border-foreground/10 space-y-6">
            <h3 className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
              <PackageOpen size={16} /> Found In
            </h3>
            
            {(() => {
              // Extract all products from possibleIn and guaranteedIn
              const products = new Map<string, any>();
              
              activeVariant.possibleIn?.forEach((pull: any) => {
                pull.pack?.components?.forEach((comp: any) => {
                  if (comp.product) products.set(comp.product.id, comp.product);
                });
              });
              
              activeVariant.guaranteedIn?.forEach((comp: any) => {
                if (comp.product) products.set(comp.product.id, comp.product);
              });

              const productArray = Array.from(products.values());

              if (productArray.length === 0) {
                return (
                  <div className="bg-foreground/5 border border-foreground/10 border-dashed rounded-2xl p-6 text-center">
                    <p className="text-foreground/40 text-sm font-mono">No verified sealed product data for this variant.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {productArray.map(prod => (
                    <Link key={prod.id} href={`/products/${prod.id}`} className="group p-4 rounded-xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors flex items-center gap-4">
                      <div className="w-12 h-12 bg-background/40 rounded flex items-center justify-center relative overflow-hidden">
                        {prod.images?.[0]?.url ? (
                          <Image src={prod.images[0].url} alt={prod.name} fill className="object-cover" unoptimized />
                        ) : (
                          <PackageOpen size={20} className="text-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{prod.name}</p>
                        <p className="text-xs text-foreground/40 font-mono mt-1">View Odds</p>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Related Cards */}
          {relatedCards.length > 0 && (
            <div className="pt-12 border-t border-foreground/10 space-y-6">
              <h3 className="text-primary font-mono text-sm tracking-widest uppercase flex items-center gap-2">
                <Layers size={16} /> More from {card.set.name}
              </h3>
              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
                {relatedCards.map((rc: RelatedCard) => {
                  const thumb = rc.images.find((i) => i.type === 'THUMBNAIL') || rc.images.find((i) => i.type === 'OFFICIAL_ARTWORK');
                  return (
                    <Link
                      key={rc.id}
                      href={`/cards/${rc.id}`}
                      className="group shrink-0 w-28 space-y-2"
                    >
                      <div className="relative w-28 aspect-[63/88] rounded-lg overflow-hidden bg-foreground/5 border border-foreground/10 group-hover:border-primary/40 transition-colors">
                        {thumb ? (
                          <Image src={thumb.url} alt={rc.name} fill className="object-cover" loading="lazy" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2 text-center">
                            <span className="text-[10px] text-foreground/30">{rc.name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-foreground/60 group-hover:text-foreground transition-colors truncate">{rc.name}</p>
                      <p className="text-[10px] text-foreground/30 font-mono">#{rc.number}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-foreground/10">
            <Link href={`/collections/${card.setId}`} className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors">
              <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-3">Set Checklist</p>
              <h4 className="text-xl font-display text-foreground group-hover:text-primary transition-colors">{card.set.name}</h4>
              <p className="text-sm text-foreground/50 mt-2">Explore the full checklist of cards.</p>
            </Link>
            
            {card.artists?.[0] ? (
              <Link href={`/artists/${card.artists[0].id}`} className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors cursor-pointer">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-3">Artist Profile</p>
                <h4 className="text-xl font-display text-foreground group-hover:text-primary transition-colors">{card.artists[0].name}</h4>
                <p className="text-sm text-foreground/50 mt-2">View other iconic pieces by this illustrator.</p>
              </Link>
            ) : (
              <div className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors cursor-pointer">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-3">Artist Profile</p>
                <h4 className="text-xl font-display text-foreground group-hover:text-primary transition-colors">Unknown</h4>
                <p className="text-sm text-foreground/50 mt-2">No illustrator data available.</p>
              </div>
            )}
            
            {card.characters?.[0] ? (
              <Link href={`/characters/${card.characters[0].id}`} className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors cursor-pointer">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-3">Character Lore</p>
                <h4 className="text-xl font-display text-foreground group-hover:text-primary transition-colors">{card.characters[0].name}</h4>
                <p className="text-sm text-foreground/50 mt-2">Explore the complete printing history of this character.</p>
              </Link>
            ) : (
              <div className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors cursor-pointer">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-3">Character Lore</p>
                <h4 className="text-xl font-display text-foreground group-hover:text-primary transition-colors">None</h4>
                <p className="text-sm text-foreground/50 mt-2">No character tied to this card.</p>
              </div>
            )}
          </div>

      </section>
    </div>
  );
}
