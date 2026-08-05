"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, PackageOpen, ArrowRight } from "lucide-react";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";

interface SetResult {
  id: string;
  name: string;
  series?: { franchise?: { name: string } | null } | null;
}
interface CardResult {
  id: string;
  name: string;
  number: string;
  set?: { name: string } | null;
  images?: { url: string; type: string }[];
}
interface ProductResult {
  id: string;
  name: string;
}
interface QuickResults {
  sets: SetResult[];
  cards: CardResult[];
  products: ProductResult[];
}

const EMPTY: QuickResults = { sets: [], cards: [], products: [] };

/**
 * Compact quick-search for the dashboard — jump to a card/set/product
 * without leaving the page. Reuses the same /api/search endpoint the full
 * /search page already hits; that page remains the deep, filterable
 * experience, this is just the fast path plus a link into it.
 */
export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Nothing to clear when the query is too short — the dropdown itself
    // is gated on query.length >= 2, so stale `results` never renders.
    if (query.length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults({
          sets: (data.sets ?? []).slice(0, 3),
          cards: (data.cards ?? []).slice(0, 4),
          products: (data.products ?? []).slice(0, 2),
        });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const total = results.sets.length + results.cards.length + results.products.length;

  return (
    <div ref={containerRef} className="relative w-full sm:w-80">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35" />
      <input
        type="text"
        placeholder="Search cards, sets, brands..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query)}`);
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full h-10 bg-foreground/5 border border-foreground/10 rounded-full pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      {open && query.length >= 2 && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-foreground/10 bg-background/95 backdrop-blur shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-4 text-xs text-foreground/40">Searching…</div>
          ) : total === 0 ? (
            <div className="p-4 text-xs text-foreground/40">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.sets.map((set) => (
                <Link
                  key={set.id}
                  href={`/collections/${set.id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-foreground/5 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                    <PackageOpen size={14} className="text-foreground/40" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{set.name}</p>
                    <p className="text-[11px] text-foreground/40 truncate">{set.series?.franchise?.name}</p>
                  </div>
                </Link>
              ))}
              {results.cards.map((card) => {
                const image = pickPrimaryImage(card.images) || card.images?.[0];
                return (
                  <Link
                    key={card.id}
                    href={`/cards/${card.id}`}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-foreground/5 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <div className="relative w-7 h-9 rounded-md overflow-hidden bg-foreground/10 shrink-0">
                      {image && <Image src={image.url} alt={card.name} fill className="object-cover" unoptimized />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{card.name}</p>
                      <p className="text-[11px] text-foreground/40 truncate font-mono">
                        #{card.number} • {card.set?.name}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {results.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-foreground/5 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0">
                    <PackageOpen size={14} className="text-foreground/40" />
                  </div>
                  <p className="text-sm truncate">{product.name}</p>
                </Link>
              ))}

              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                className="flex items-center justify-between px-4 py-2.5 mt-1 border-t border-foreground/10 text-xs text-foreground/50 hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                See all results <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
