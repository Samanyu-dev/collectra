"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Tag, Repeat2, Heart, HeartOff, Settings2 } from "lucide-react";
import { PriceTag } from "./price-tag";
import { pickInstanceImage } from "@/lib/media/pick-image";
import { toggleWishlist } from "@/lib/actions/wishlist";
import type { CollectionItem } from "@/lib/collection/workspace";

export type CollectionCardVariant = "collection" | "list" | "binder" | "spare";

interface CollectionCardProps {
  variant: CollectionCardVariant;
  item: CollectionItem;
  priority?: boolean; // above-the-fold — skip lazy loading
}

/**
 * The one shared tile for owned-card display across Collection V2's Grid/
 * Binder/List/Spares surfaces (prop is `variant`, not `mode` — "mode" is
 * reserved for the page's own Grid/Binder/List display-mode concept).
 * Designed to be reusable later by /vault, /marketplace, /wishlist — not
 * migrating those in this pass.
 */
export function CollectionCard({ variant, item, priority = false }: CollectionCardProps) {
  const [wishlisted, setWishlisted] = useState(item.isWishlisted);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const picked = pickInstanceImage({
    scanMediaUrl: item.scanMediaUrl,
    cardImages: item.images,
    variantImages: item.variantImages,
  });

  async function handleWishlistToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistBusy) return;
    setWishlistBusy(true);
    setWishlisted((prev) => !prev); // optimistic — matches this app's other toggle actions
    try {
      await toggleWishlist(item.cardId);
    } catch {
      setWishlisted((prev) => !prev); // revert on failure
    } finally {
      setWishlistBusy(false);
    }
  }

  const sellHref = item.activeListingId ? `/marketplace/${item.activeListingId}` : `/marketplace/new?instanceId=${item.primaryInstanceId}`;
  const sellLabel = item.activeListingId ? "Manage Listing" : "Sell";

  if (variant === "list") {
    return (
      <Link
        href={`/cards/${item.cardId}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors group"
      >
        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-foreground/10 shrink-0">
          {picked.url ? (
            <Image src={picked.url} alt={item.cardName} fill className="object-cover" loading={priority ? undefined : "lazy"} unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-foreground/40 text-center p-0.5">
              {item.cardName}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{item.cardName}</p>
          <p className="text-xs text-foreground/40 truncate">
            {item.setName} · #{item.cardNumber}
            {item.quantity > 1 && <span className="ml-1 text-primary font-mono">×{item.quantity}</span>}
          </p>
        </div>
        <PriceTag compact data={item.price} />
        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-colors"
        >
          {wishlisted ? <HeartOff size={15} /> : <Heart size={15} />}
        </button>
      </Link>
    );
  }

  if (variant === "binder") {
    return (
      <Link href={`/cards/${item.cardId}`} className="relative block aspect-[63/88] rounded-lg overflow-hidden border border-foreground/10 bg-foreground/5">
        {picked.url ? (
          <Image src={picked.url} alt={item.cardName} fill className="object-cover" loading={priority ? undefined : "lazy"} unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center p-2">
            <span className="text-[10px] text-foreground/40">{item.cardName}</span>
          </div>
        )}
        {item.quantity > 1 && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-[10px] font-mono font-bold text-primary border border-primary/30">
            ×{item.quantity}
          </span>
        )}
      </Link>
    );
  }

  // "collection" (main Grid) and "spare" (Spares row) share the richer tile with hover reveal.
  const isSpare = variant === "spare";

  return (
    <motion.div
      className="relative group aspect-[63/88] rounded-xl overflow-hidden border border-foreground/10 shadow-lg"
      whileHover={{ scale: 1.05, y: -6, rotateY: 4, rotateX: 4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Link href={`/cards/${item.cardId}`} className="absolute inset-0 z-0" aria-label={`View ${item.cardName}`}>
        {picked.url ? (
          picked.fallbackType === "crest" ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-foreground/10 to-transparent p-4">
              <div className="relative w-1/2 aspect-square drop-shadow-lg">
                <Image src={picked.url} alt={item.cardName} fill className="object-contain" loading={priority ? undefined : "lazy"} unoptimized />
              </div>
              <span className="text-[10px] text-foreground/50 text-center leading-tight line-clamp-2">{item.cardName}</span>
            </div>
          ) : (
            <Image src={picked.url} alt={item.cardName} fill className="object-cover" loading={priority ? undefined : "lazy"} unoptimized />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center">
            <span className="text-xs text-foreground/40">{item.cardName}</span>
          </div>
        )}

        {item.isFoil && (
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/20 via-fuchsia-400/20 to-yellow-400/20 opacity-0 group-hover:opacity-100 mix-blend-color-dodge transition-opacity duration-500 pointer-events-none" />
        )}
      </Link>

      {/* Quantity chip — absolute overlay, never resizes the tile */}
      {item.quantity > 1 && (
        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-xs font-mono font-bold text-primary border border-primary/30">
          ×{item.quantity}
        </span>
      )}

      {/* Club badge — hidden by default, fades in on hover (secondary to artwork, per the redesign brief) */}
      {picked.fallbackType !== "crest" && (
        (() => {
          const crest = item.images.find((i) => i.type === "TEAM_CREST")?.url;
          return crest ? (
            <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-foreground/10 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="relative w-full h-full">
                <Image src={crest} alt="" fill className="object-contain" unoptimized />
              </div>
            </div>
          ) : null;
        })()
      )}

      {/* Hover meta panel — overlay only, absolutely positioned, zero layout shift */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-background/95 via-background/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <p className="text-foreground text-xs font-medium truncate">{item.cardName}</p>
        <p className="text-foreground/50 text-[10px] truncate mb-1">
          {item.setName}
          {item.parallelName ? ` · ${item.parallelName}` : ""}
        </p>
        {isSpare ? (
          <p className="text-[10px] text-foreground/60 mb-1.5">
            Spares: <span className="text-primary font-mono">{item.quantity}</span>
          </p>
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-foreground/60 mb-1.5">
            <span>
              Collection: <span className="text-foreground font-mono">1</span>
            </span>
            {item.quantity > 1 && (
              <span>
                Spares: <span className="text-primary font-mono">{item.quantity - 1}</span>
              </span>
            )}
          </div>
        )}
        <div className="mb-1.5">
          <PriceTag compact data={item.price} />
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          <Link
            href={`/cards/${item.cardId}`}
            onClick={(e) => e.stopPropagation()}
            title="View"
            aria-label="View card"
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-full text-[9px] font-medium uppercase bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors"
          >
            <Eye size={10} /> View
          </Link>
          <Link
            href={sellHref}
            onClick={(e) => e.stopPropagation()}
            title={sellLabel}
            aria-label={sellLabel}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-full text-[9px] font-medium uppercase bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors"
          >
            {item.activeListingId ? <Settings2 size={10} /> : <Tag size={10} />}
            {sellLabel}
          </Link>
          <button
            type="button"
            disabled
            title="Trade — coming soon"
            aria-label="Trade — coming soon"
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-full text-[9px] font-medium uppercase bg-foreground/5 text-foreground/30 border border-foreground/10 cursor-not-allowed"
          >
            <Repeat2 size={10} /> Trade
          </button>
          <button
            type="button"
            onClick={handleWishlistToggle}
            title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors"
          >
            {wishlisted ? <HeartOff size={10} /> : <Heart size={10} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
