"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The hero's signature element: a card that cycles through this app's own
 * real rarity-glow tiers (see the .rarity-glow-* utilities and
 * getRarityTier() classification — same classes, same visual language used
 * on an actual owned card in /shelf or /cards/[id], not a marketing-only
 * invention). Demonstrates the product by literally being it.
 */
const TIERS = [
  { label: "Common", glowClass: "", ring: "border-foreground/10" },
  { label: "Rare", glowClass: "rarity-glow-rare", ring: "border-transparent" },
  { label: "Epic", glowClass: "rarity-glow-epic", ring: "border-transparent" },
  { label: "Legendary", glowClass: "rarity-glow-legendary", ring: "border-transparent" },
  { label: "Unique", glowClass: "rarity-glow-unique", ring: "border-transparent" },
] as const;

export function RarityShowcaseCard() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % TIERS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const tier = TIERS[index];

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className={`relative w-48 sm:w-56 aspect-[2.5/3.5] rounded-3xl bg-gradient-to-br from-foreground/10 to-foreground/[0.02] border transition-all duration-700 ${tier.ring} ${tier.glowClass}`}
      >
        <div className="absolute inset-4 rounded-2xl border border-foreground/10 flex flex-col items-center justify-center gap-3 overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-foreground/10" />
          <div className="w-20 h-2 rounded-full bg-foreground/10" />
          <div className="w-14 h-2 rounded-full bg-foreground/5" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.span
          key={tier.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/50"
        >
          {tier.label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
