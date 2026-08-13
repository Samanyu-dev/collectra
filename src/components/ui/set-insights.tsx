"use client";

import { motion } from "framer-motion";
import { ProgressRing, AnimatedNumber } from "./collectra-ui";
import { BarBreakdownChart } from "./charts/bar-breakdown-chart";
import { TopValuableCardsSection } from "./top-valuable-cards";
import { MarketMoversSection } from "./market-movers";
import type { SetWidgets } from "@/lib/intelligence/market/set-widgets";

const formatUsd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * Set-scoped analytics: Completion + Collection Value up top (how complete →
 * how much it's worth), then What's valuable / What's moving, then What makes
 * up the value / how trustworthy that value is. Confidence is never hidden
 * behind the headline $ figure — the "N / M priced" line and the Data
 * Confidence chart are load-bearing, not decoration (a set can show a large
 * total while most of it rests on LOW/NO_DATA pricing).
 */
export function SetInsights({
  widgets,
  ownedCount,
  totalCount,
}: {
  widgets: SetWidgets;
  ownedCount: number;
  totalCount: number;
}) {
  const { collectionValue, topValuable, gainers, losers, recentlyPriced, valueByRarity, confidence } = widgets;
  const completionPercent = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <section className="space-y-6">
      <div className="text-foreground/50 text-sm font-mono uppercase tracking-widest">Set Insights</div>

      {/* Completion -> Collection Value */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-foreground/10 bg-foreground/5 p-8 flex flex-col items-center justify-center gap-4"
        >
          <ProgressRing value={ownedCount} max={totalCount || 1} size={140} strokeWidth={10} color="var(--primary)">
            <div className="flex flex-col items-center">
              <AnimatedNumber value={completionPercent} suffix="%" className="text-3xl font-display font-bold text-foreground" />
              <span className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1">Complete</span>
            </div>
          </ProgressRing>
          <p className="text-foreground/60 font-mono text-sm">
            <AnimatedNumber value={ownedCount} className="text-foreground font-bold" /> / {totalCount} cards owned
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl border border-foreground/10 bg-foreground/5 p-8 flex flex-col justify-center gap-3"
        >
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Collection Value · Owned only</span>
          <AnimatedNumber value={Math.round(collectionValue.totalValueUsd)} prefix="$" className="text-4xl font-display font-bold text-foreground tabular-nums" />
          <p className="text-foreground/60 font-mono text-sm">
            {collectionValue.pricedCount} / {collectionValue.ownedVariantCount} cards priced · {collectionValue.percentPriced}% priced
          </p>
        </motion.div>
      </div>

      {/* What's valuable -> What's moving */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopValuableCardsSection cards={topValuable} scopeLabel="This set" />
        <MarketMoversSection gainers={gainers} losers={losers} recentlyPriced={recentlyPriced} scopeLabel="This set" />
      </div>

      {/* What makes up the value -> how trustworthy is that number */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-widest text-foreground/40">Value by Rarity</h3>
          <BarBreakdownChart data={valueByRarity} formatValue={formatUsd} />
        </div>
        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-6 space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-widest text-foreground/40">Data Confidence</h3>
          <BarBreakdownChart data={confidence} color="#4ADE80" />
        </div>
      </div>
    </section>
  );
}
