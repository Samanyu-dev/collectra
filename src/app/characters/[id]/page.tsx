import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { Users, Package, Layers } from "lucide-react";
import { getImagesForEntities } from "@/lib/media/resolve";

export const dynamic = "force-dynamic";

export default async function CharacterDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id: characterId } = await props.params;

  const characterRaw = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      cards: {
        include: {
          set: true,
          variants: {
            include: { parallel: true, currentPrice: true },
          },
        }
      }
    }
  });

  if (!characterRaw) notFound();

  const imagesByCard = await getImagesForEntities("Card", characterRaw.cards.map((c) => c.id));
  const character = {
    ...characterRaw,
    cards: characterRaw.cards.map((c) => ({ ...c, images: imagesByCard.get(c.id) ?? [] })),
  };

  // Deduplicate sets and variants
  const uniqueSets = new Set<string>();
  let totalVariants = 0;
  let mostExpensiveCard: any = null;
  let maxPrice = 0;

  character.cards.forEach(card => {
    uniqueSets.add(card.setId);
    totalVariants += card.variants.length;

    card.variants.forEach(v => {
      const price = v.currentPrice?.marketPriceUsd;
      if (price != null && price > maxPrice) {
        maxPrice = price;
        mostExpensiveCard = card;
      }
    });
  });

  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/30 pb-48 font-sans">
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-32 space-y-24">
        
        {/* Character Header */}
        <section className="relative w-full overflow-hidden bg-foreground/5 rounded-3xl border border-foreground/10 p-8 sm:p-12 md:p-24 flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl">
          <div className="space-y-6 z-10 max-w-xl">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">{character.name}</h1>
            <p className="text-xl text-foreground/60 font-serif leading-relaxed">
              Explore the complete printing history of {character.name} across the Universal Collectibles Graph.
            </p>
            
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
                  <Layers size={18} className="text-foreground/60" />
                </div>
                <div>
                  <p className="text-xl font-bold">{totalVariants}</p>
                  <p className="text-xs text-foreground/50 font-mono uppercase tracking-widest">Known Variants</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
                  <Package size={18} className="text-foreground/60" />
                </div>
                <div>
                  <p className="text-xl font-bold">{uniqueSets.size}</p>
                  <p className="text-xs text-foreground/50 font-mono uppercase tracking-widest">Sets Appeared In</p>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Art (Most Expensive or First) */}
          {mostExpensiveCard ? (
            <div className="z-10 relative group">
              <Link href={`/cards/${mostExpensiveCard.id}`} className="block relative w-64 md:w-80 aspect-[63/88] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-transform duration-700 hover:scale-105 hover:-rotate-2">
                <Image src={mostExpensiveCard.images[0]?.url} alt={mostExpensiveCard.name} fill className="object-cover" unoptimized priority />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-foreground font-medium truncate">{mostExpensiveCard.name}</p>
                  <p className="text-green-400 font-mono text-xs font-bold">Highest Valued Variant (${maxPrice.toFixed(2)})</p>
                </div>
              </Link>
            </div>
          ) : (
            character.cards[0]?.images[0]?.url && (
              <div className="z-10 relative group">
                <Link href={`/cards/${character.cards[0].id}`} className="block relative w-64 md:w-80 aspect-[63/88] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-transform duration-700 hover:scale-105 hover:-rotate-2">
                  <Image src={character.cards[0].images[0].url} alt={character.cards[0].name} fill className="object-cover" unoptimized priority />
                </Link>
              </div>
            )
          )}
          
          {/* Abstract background graphics */}
          <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        </section>

        {/* Complete Timeline/Gallery */}
        <section className="space-y-8">
          <div className="flex items-end justify-between border-b border-foreground/10 pb-4">
            <div>
              <h2 className="text-2xl font-display font-medium">Evolution Timeline</h2>
              <p className="text-sm text-foreground/50 mt-1">Every base card featuring {character.name}</p>
            </div>
          </div>
          
          {character.cards.length === 0 ? (
            <div className="text-center py-20 text-foreground/40 border border-dashed border-foreground/10 rounded-2xl">
              No cards on record for this character yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {character.cards.map((card) => (
                <Link key={card.id} href={`/cards/${card.id}`} className="group relative block w-full aspect-[63/88] rounded-xl overflow-hidden bg-foreground/5 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 border border-foreground/10">
                  {card.images[0]?.url ? (
                    <Image src={card.images[0].url} alt={card.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <Layers className="text-foreground/20 mb-2" size={24} />
                      <p className="text-xs text-foreground/50 font-mono">No Image</p>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <p className="text-foreground text-xs font-medium truncate">{card.name}</p>
                    <p className="text-foreground/50 text-[10px] uppercase font-mono mt-0.5 truncate">{card.set.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
