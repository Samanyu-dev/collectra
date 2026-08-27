"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import type { CatalogCard } from "@/lib/intelligence/market/catalog-widgets";
import type { RarityTier } from "@/lib/collection/classification";
import { Sparkline } from "./sparkline";

// Star count communicates rarity at a glance without repeating the same
// glow-border treatment used in the card grid (Phase 1) — this is a compact
// list context, not a full card face.
const RARITY_STARS: Record<RarityTier, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  unique: 5,
};

function Stars({ tier }: { tier: RarityTier }) {
  const count = RARITY_STARS[tier];
  return (
    <span className="text-[10px] text-yellow-500/80 tracking-tighter" aria-label={`${tier} rarity`}>
      {"★".repeat(count)}
      <span className="text-foreground/15">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export function TopValuableCardsSection({
  cards,
  scopeLabel = "Catalog-wide",
  title = "Top Valuable Cards",
  emptyLabel = "No priced cards yet.",
  highlightTop = true,
}: {
  cards: CatalogCard[];
  scopeLabel?: string;
  title?: string;
  emptyLabel?: string;
  highlightTop?: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-4">
        <Trophy size={16} /> {title}
        <span className="text-[10px] text-foreground/30 normal-case tracking-normal ml-1">{scopeLabel}</span>
      </div>

      {cards.length === 0 ? (
        <div className="p-12 rounded-3xl border border-foreground/10 border-dashed text-center text-foreground/40">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {cards.map((card, i) => (
            <Link
              key={card.variantId}
              href={`/cards/${card.cardId}`}
              className={`card-frame group relative rounded-2xl border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 hover:border-foreground/20 transition-colors overflow-hidden ${
                highlightTop && i === 0 ? "foil-frame" : ""
              }`}
            >
              <div className="aspect-[63/88] relative bg-foreground/10">
                {card.imageUrl && <Image src={card.imageUrl} alt={card.cardName} fill className="object-cover" />}
                <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-[11px] font-mono font-bold text-foreground/70">
                  {i + 1}
                </span>
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{card.cardName}</p>
                <Stars tier={card.rarityTier} />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-sm font-mono font-bold tabular-nums">
                    ${card.marketPriceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                  {card.sparkline && card.sparkline.length >= 2 && <Sparkline points={card.sparkline} width={36} height={14} />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
