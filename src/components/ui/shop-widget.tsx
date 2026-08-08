"use client";

import Link from "next/link";
import { ExternalLink, ShoppingBag, Award, Tag } from "lucide-react";

interface ShopWidgetProps {
  cardName: string;
  cardNumber?: string;
  setName?: string;
  /** Plain (non-affiliate) TCGPlayer product link — never Collectr's affiliate-wrapped URL. */
  tcgplayerUrl?: string | null;
  cardmarketUrl?: string | null;
  /** Set true for Japanese-exclusive sets to surface a Mercari Japan search link. */
  isJapaneseExclusive?: boolean;
}

function SearchRow({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-foreground/5 transition-colors group"
    >
      <span className="flex items-center gap-2.5 text-sm text-foreground/80">
        {icon}
        {label}
      </span>
      <ExternalLink size={14} className="text-foreground/30 group-hover:text-foreground/60" />
    </a>
  );
}

export function ShopWidget({ cardName, cardNumber, setName, tcgplayerUrl, cardmarketUrl, isJapaneseExclusive }: ShopWidgetProps) {
  const query = encodeURIComponent([cardName, cardNumber, setName].filter(Boolean).join(" "));
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${query}`;
  const mercariJpUrl = `https://jp.mercari.com/search?keyword=${query}`;
  const psaGradingUrl = "https://www.psacard.com/gradingservices/tradingcards";

  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5 space-y-1">
      <div className="flex items-center gap-2 mb-2 px-1">
        <ShoppingBag size={16} className="text-foreground/50" />
        <h4 className="text-sm font-semibold">Shop</h4>
      </div>

      {tcgplayerUrl && <SearchRow icon={<Tag size={14} className="text-foreground/40" />} label="View on TCGPlayer" href={tcgplayerUrl} />}
      {cardmarketUrl && <SearchRow icon={<Tag size={14} className="text-foreground/40" />} label="View on Cardmarket" href={cardmarketUrl} />}
      <SearchRow icon={<Tag size={14} className="text-foreground/40" />} label="Search eBay listings" href={ebayUrl} />
      {isJapaneseExclusive && (
        <SearchRow icon={<Tag size={14} className="text-foreground/40" />} label="Search Mercari Japan" href={mercariJpUrl} />
      )}
      <SearchRow icon={<Award size={14} className="text-foreground/40" />} label="Grade your card" href={psaGradingUrl} />

      <div className="pt-2 mt-1 border-t border-foreground/5">
        <Link
          href="/marketplace/new"
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          List this card on Collectra
        </Link>
      </div>
    </div>
  );
}
