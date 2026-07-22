import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { Brush, Package, Layers } from "lucide-react";
import { getImagesForEntities } from "@/lib/media/resolve";

export const dynamic = "force-dynamic";

export default async function ArtistDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id: artistId } = await props.params;

  const artistRaw = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      cards: {
        include: {
          set: true,
          variants: {
            include: { parallel: true, currentPrice: true },
            take: 1
          }
        }
      }
    }
  });

  if (!artistRaw) notFound();

  const imagesByCard = await getImagesForEntities("Card", artistRaw.cards.map((c) => c.id));
  const artist = {
    ...artistRaw,
    cards: artistRaw.cards.map((c) => ({ ...c, images: imagesByCard.get(c.id) ?? [] })),
  };

  // Deduplicate sets
  const uniqueSets = new Map();
  artist.cards.forEach(card => {
    uniqueSets.set(card.setId, card.set);
  });

  // Calculate highest value card
  let mostExpensiveCard: any = null;
  let maxPrice = 0;

  artist.cards.forEach(card => {
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
        
        {/* Artist Header */}
        <section className="relative w-full overflow-hidden bg-foreground/5 rounded-3xl border border-foreground/10 p-8 sm:p-12 md:p-24 flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl">
          <div className="space-y-6 z-10 max-w-xl">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">{artist.name}</h1>
            <p className="text-xl text-foreground/60 font-serif leading-relaxed">
              Legendary illustrator responsible for some of the most iconic artworks in the Collectra Universal Graph.
            </p>
            
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
                  <Brush size={18} className="text-foreground/60" />
                </div>
                <div>
                  <p className="text-xl font-bold">{artist.cards.length}</p>
                  <p className="text-xs text-foreground/50 font-mono uppercase tracking-widest">Cards Drawn</p>
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
                  <p className="text-primary font-mono text-xs">Highest Valued Piece (${maxPrice.toFixed(2)})</p>
                </div>
              </Link>
            </div>
          ) : (
            artist.cards[0]?.images[0]?.url && (
              <div className="z-10 relative group">
                <Link href={`/cards/${artist.cards[0].id}`} className="block relative w-64 md:w-80 aspect-[63/88] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-transform duration-700 hover:scale-105 hover:-rotate-2">
                  <Image src={artist.cards[0].images[0].url} alt={artist.cards[0].name} fill className="object-cover" unoptimized priority />
                </Link>
              </div>
            )
          )}
          
          {/* Abstract background graphics */}
          <div className="absolute -right-32 -bottom-32 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        </section>

        {/* Complete Gallery */}
        <section className="space-y-8">
          <div className="flex items-end justify-between border-b border-foreground/10 pb-4">
            <div>
              <h2 className="text-2xl font-display font-medium">The Complete Gallery</h2>
              <p className="text-sm text-foreground/50 mt-1">Every known artwork by {artist.name}</p>
            </div>
          </div>
          
          {artist.cards.length === 0 ? (
            <div className="text-center py-20 text-foreground/40 border border-dashed border-foreground/10 rounded-2xl">
              No cards on record for this artist yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {artist.cards.map((card) => (
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
