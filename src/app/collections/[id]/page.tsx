import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";
import { getOwnedVariantQuantities } from "@/lib/actions/collection";
import { getVariantCardType, getVariantRarityLabel, getRarityTier } from "@/lib/collection/classification";
import { getSparklinesForVariants } from "@/lib/pricing/history";
import { getSetWidgets } from "@/lib/intelligence/market/set-widgets";
import { SetInsights } from "@/components/ui/set-insights";
import { SetChecklistClient } from "./set-checklist-client";

export const dynamic = "force-dynamic";

export default async function CollectionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const setId = params.id;

  const setRaw = await prisma.set.findUnique({
    where: { id: setId },
    include: {
      series: {
        include: {
          franchise: true,
          brand: true
        }
      },
      releases: true,
      cards: {
        orderBy: { number: 'asc' },
        include: {
          variants: {
            include: {
              currentPrice: true,
              printing: true,
              parallel: true,
              insert: true
            }
          }
        }
      }
    }
  });

  if (!setRaw) {
    notFound();
  }

  const allVariantIds = setRaw.cards.flatMap((c) => c.variants.map((v) => v.id));
  const [imagesByCard, ownedQuantities, setWidgets] = await Promise.all([
    getImagesForEntities("Card", setRaw.cards.map((c) => c.id)),
    getOwnedVariantQuantities(allVariantIds),
    getSetWidgets(setId),
  ]);

  // Sparkline data keyed by each card's highest-priced variant — the same
  // variant CardGrid's PriceTag renders a value for, so the two stay in sync.
  const topVariantIdByCard = new Map<string, string>();
  for (const c of setRaw.cards) {
    const top = c.variants
      .filter((v) => v.currentPrice?.marketPriceUsd != null)
      .sort((a, b) => (b.currentPrice!.marketPriceUsd ?? 0) - (a.currentPrice!.marketPriceUsd ?? 0))[0];
    if (top) topVariantIdByCard.set(c.id, top.id);
  }
  const sparklinesByVariant = await getSparklinesForVariants([...topVariantIdByCard.values()]);

  const set = {
    ...setRaw,
    cards: setRaw.cards.map((c) => {
      const topVariantId = topVariantIdByCard.get(c.id);
      return {
        ...c,
        variants: c.variants.map((v) => ({ ...v, ownedQuantity: ownedQuantities[v.id] ?? 0 })),
        images: imagesByCard.get(c.id) ?? [],
        ownedQuantity: c.variants.reduce((sum, v) => sum + (ownedQuantities[v.id] ?? 0), 0),
        owned: c.variants.some((v) => (ownedQuantities[v.id] ?? 0) > 0),
        cardType: c.variants[0] ? getVariantCardType(c.variants[0]) : "Base",
        rarityLabel: c.variants[0] ? getVariantRarityLabel(c.variants[0]) : "Base",
        rarityTier: c.variants[0] ? getRarityTier(c.variants[0]) : "common",
        sparkline: topVariantId ? sparklinesByVariant[topVariantId] ?? null : null,
      };
    }),
  };
  // Find a cover image from the first few cards
  const topCards = set.cards.slice(0, 4);
  const ownedCount = set.cards.filter((c) => c.owned).length;

  return (
    <div className="min-h-screen w-full pb-32">
      <div className="relative w-full h-[50vh] min-h-[400px] flex items-end">
        
        {/* Dynamic Mosaic Background */}
        <div className="absolute inset-0 z-0 flex flex-wrap opacity-40 blur-3xl pointer-events-none saturate-150">
          {topCards.map((card) => {
            const hqImage = pickPrimaryImage(card.images);
            return hqImage ? (
              <div key={card.id} className="relative w-1/2 h-1/2">
                <Image src={hqImage.url} alt={card.name} fill className="object-cover" priority />
              </div>
            ) : null;
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-12 pb-12 flex flex-col md:flex-row items-end gap-8">
          <div className="flex-1 space-y-2">
            <nav className="flex items-center gap-1.5 text-sm text-foreground/50" aria-label="Breadcrumb">
              <Link href="/collections" className="hover:text-foreground transition-colors">Sets</Link>
              <ChevronRight size={14} className="text-foreground/30" />
              <Link href={`/collections?franchise=${set.series.franchise.id}`} className="hover:text-foreground transition-colors">{set.series.franchise.name}</Link>
              <ChevronRight size={14} className="text-foreground/30" />
              <span className="text-foreground/70 truncate">{set.name}</span>
            </nav>
            <p className="text-primary font-mono text-sm tracking-widest uppercase">{set.series.franchise.name} • {set.series.brand.name} • {set.series.name}</p>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground tracking-tight">{set.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-16 space-y-16">
        <SetInsights widgets={setWidgets} ownedCount={ownedCount} totalCount={set.cards.length} />
        <SetChecklistClient
          cards={set.cards}
          setId={set.id}
          printedTotal={set.printedTotal}
          releaseYear={set.releases?.[0]?.date ? new Date(set.releases[0].date).getFullYear() : null}
        />
      </div>
    </div>
  );
}
