"use client";

import { useState } from "react";
import Image from "next/image";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import Link from "next/link";
import type { CatalogCard, MoverCard } from "@/lib/intelligence/market/catalog-widgets";
import { Sparkline } from "./sparkline";

function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function CardRow({ card, trailing }: { card: CatalogCard; trailing: React.ReactNode }) {
  return (
    <Link
      href={`/cards/${card.cardId}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-foreground/5 transition-colors group"
    >
      <div className="w-9 h-12 rounded-md overflow-hidden bg-foreground/10 shrink-0 relative">
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt={card.cardName} fill className="object-cover" unoptimized />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{card.cardName}</p>
        <p className="text-[11px] font-mono text-foreground/40 truncate">
          {card.setName} • #{card.cardNumber}
        </p>
      </div>

      {card.sparkline && card.sparkline.length >= 2 && (
        <div className="shrink-0 hidden sm:block">
          <Sparkline points={card.sparkline} width={44} height={16} />
        </div>
      )}

      {trailing}
    </Link>
  );
}

const TABS = [
  { key: "gainers", label: "Gainers", icon: TrendingUp },
  { key: "losers", label: "Losers", icon: TrendingDown },
  { key: "recentlyPriced", label: "Recently Priced", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function MarketMoversSection({
  gainers,
  losers,
  recentlyPriced,
}: {
  gainers: MoverCard[];
  losers: MoverCard[];
  recentlyPriced: CatalogCard[];
}) {
  const [tab, setTab] = useState<TabKey>("gainers");
  const active = tab === "gainers" ? gainers : tab === "losers" ? losers : recentlyPriced;

  return (
    <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest">
          <TrendingUp size={16} /> Market Movers
        </div>
        <span className="text-[10px] text-foreground/30 uppercase tracking-widest">Catalog-wide</span>
      </div>

      <div className="flex gap-1 mb-3 border-b border-foreground/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-foreground/40 hover:text-foreground/70"
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-foreground/40 py-2">
          {tab === "recentlyPriced"
            ? "Waiting for enough observations — cards will appear here as they get priced."
            : "Not enough price history yet — movers appear once cards have a real trend."}
        </p>
      ) : (
        <div className="space-y-1">
          {tab === "recentlyPriced"
            ? (active as CatalogCard[]).map((card) => (
                <CardRow
                  key={card.variantId}
                  card={card}
                  trailing={
                    <span className="text-sm font-mono tabular-nums shrink-0">
                      ${card.marketPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  }
                />
              ))
            : (active as MoverCard[]).map((card) => (
                <CardRow
                  key={card.variantId}
                  card={card}
                  trailing={
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono tabular-nums">
                        ${card.marketPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums px-1.5 py-0.5 rounded-md ${
                          card.changePercent >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {card.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatChange(card.changePercent)}
                      </span>
                    </div>
                  }
                />
              ))}
        </div>
      )}
    </div>
  );
}