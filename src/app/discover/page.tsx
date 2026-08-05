import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Sparkles, TrendingUp, Flame, Brush, Users, Image as ImageIcon } from "lucide-react";
import { getImagesForEntity, getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";
import { getCurrentUser } from "@/lib/auth/session";
import { Greeting } from "./greeting";
import { FeaturedCard } from "@/components/ui/featured-card";

export const dynamic = "force-dynamic";

async function fetchMostValuableCard() {
  const topPrice = await prisma.currentPrice.findFirst({
    where: { variantId: { not: null }, marketPriceUsd: { not: null } },
    orderBy: { marketPriceUsd: "desc" },
    include: { variant: { include: { card: { include: { set: true } } } } },
  });
  if (!topPrice?.variant) return null;

  const images = await getImagesForEntity("Card", topPrice.variant.card.id);
  const image = pickPrimaryImage(images);
  if (!image) return null;

  return {
    cardId: topPrice.variant.card.id,
    image: image.url,
    name: topPrice.variant.card.name,
    setName: topPrice.variant.card.set.name,
    price: topPrice.marketPriceUsd!,
  };
}

async function fetchBeautifulArt() {
  // MediaAttachment is polymorphic (not a real FK), so we can't filter "cards
  // that have images" in the Prisma `where`. Pull a larger candidate pool,
  // batch-fetch their images, and keep only the ones that actually have art.
  const artCandidates = await prisma.card.findMany({
    orderBy: { id: 'desc' }, // Pseudo-random/recent
    take: 50,
    include: { set: true }
  });
  const artCandidateImages = await getImagesForEntities("Card", artCandidates.map((c) => c.id));
  return artCandidates
    .map((c) => ({ ...c, images: artCandidateImages.get(c.id) ?? [] }))
    .filter((c) => c.images.length > 0)
    .slice(0, 8);
}

async function fetchLegendaryArtists() {
  const legendaryArtistsRaw = await prisma.artist.findMany({
    take: 5,
    include: { _count: { select: { cards: true } }, cards: { take: 1 } },
    orderBy: { cards: { _count: 'desc' } }
  });
  const artistCardImages = await getImagesForEntities("Card", legendaryArtistsRaw.flatMap((a) => a.cards.map((c) => c.id)));
  return legendaryArtistsRaw.map((a) => ({
    ...a,
    cards: a.cards.map((c) => ({ ...c, images: artistCardImages.get(c.id) ?? [] })),
  }));
}

async function fetchTopCharacters() {
  const topCharactersRaw = await prisma.character.findMany({
    take: 5,
    include: { _count: { select: { cards: true } }, cards: { take: 1 } },
    orderBy: { cards: { _count: 'desc' } }
  });
  const characterCardImages = await getImagesForEntities("Card", topCharactersRaw.flatMap((c) => c.cards.map((c2) => c2.id)));
  return topCharactersRaw.map((c) => ({
    ...c,
    cards: c.cards.map((c2) => ({ ...c2, images: characterCardImages.get(c2.id) ?? [] })),
  }));
}

export default async function DiscoveryEnginePage() {
  const [user, recentReleases, beautifulArtCards, legendaryArtists, topCharacters, mostValuableCard] = await Promise.all([
    getCurrentUser(),
    prisma.release.findMany({
      where: { setId: { not: null }, date: { not: null } },
      orderBy: { date: 'desc' },
      take: 6,
      include: { set: { include: { series: { include: { brand: true } } } } }
    }),
    fetchBeautifulArt(),
    fetchLegendaryArtists(),
    fetchTopCharacters(),
    fetchMostValuableCard(),
  ]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-48 bg-background text-foreground selection:bg-primary/30">
      
      {/* Hero Welcome */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-24 md:pt-32 space-y-24">
        
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-mono uppercase tracking-widest text-primary mb-2">
            <Sparkles size={14} /> Discovery Engine
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground/90">
            <Greeting name={user?.name ?? null} />
          </h1>
          <p className="text-xl text-foreground/50 max-w-2xl font-serif">
            Explore the vast Universal Knowledge Graph. Discover new sets, admire legendary artists, and track the evolution of your favorite characters.
          </p>
        </section>

        {mostValuableCard && (
          <Link href={`/cards/${mostValuableCard.cardId}`} className="block">
            <FeaturedCard
              image={mostValuableCard.image}
              name={mostValuableCard.name}
              rarity={mostValuableCard.setName}
              value={`$${mostValuableCard.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            />
          </Link>
        )}

        {/* Module 1: Most Beautiful Art (Masonry Gallery) */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h3 className="text-2xl font-display font-medium tracking-wide flex items-center gap-3">
              <ImageIcon className="text-primary" /> Curated Masterpieces
            </h3>
          </div>
          {beautifulArtCards.length === 0 ? (
            <p className="text-foreground/30 text-sm py-8 text-center border border-dashed border-foreground/10 rounded-2xl">No illustrated cards found yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {beautifulArtCards.map((card) => (
                <Link key={card.id} href={`/cards/${card.id}`} className="group relative block w-full aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 hover:scale-105 hover:-translate-y-2 border border-foreground/10">
                  <Image src={card.images[0].url} alt={card.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-foreground font-medium text-sm truncate">{card.name}</p>
                    <p className="text-foreground/50 text-[10px] uppercase font-mono mt-1">{card.set.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Module 2: Legendary Artists */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h3 className="text-2xl font-display font-medium tracking-wide flex items-center gap-3">
              <Brush className="text-primary" /> Legendary Illustrators
            </h3>
          </div>
          {legendaryArtists.length === 0 ? (
            <p className="text-foreground/30 text-sm py-8 text-center border border-dashed border-foreground/10 rounded-2xl">No artist data found yet.</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {legendaryArtists.map((artist) => (
              <Link key={artist.id} href={`/artists/${artist.id}`} className="group relative block p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all overflow-hidden h-64 flex flex-col justify-between">
                {/* Background blurry art hint */}
                {artist.cards[0]?.images[0]?.url && (
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                    <Image src={artist.cards[0].images[0].url} alt="" fill className="object-cover blur-md" />
                  </div>
                )}
                
                <div className="relative z-10">
                  <h4 className="text-2xl font-display font-bold group-hover:text-primary transition-colors">{artist.name}</h4>
                  <p className="text-sm font-mono text-foreground/50 mt-2">{artist._count.cards} Cards</p>
                </div>
                
                <div className="relative z-10 w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                  <span className="text-foreground/50 group-hover:text-foreground transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
          )}
        </section>

        {/* Module 3: Character Lore */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h3 className="text-2xl font-display font-medium tracking-wide flex items-center gap-3">
              <Users className="text-primary" /> Character Ecosystem
            </h3>
          </div>
          {topCharacters.length === 0 ? (
            <p className="text-foreground/30 text-sm py-8 text-center border border-dashed border-foreground/10 rounded-2xl">No character data found yet.</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {topCharacters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="group relative block p-6 rounded-2xl bg-elevated border border-foreground/10 hover:bg-foreground/10 transition-all overflow-hidden h-64 flex flex-col justify-between">
                {/* Background blurry art hint */}
                {character.cards[0]?.images[0]?.url && (
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                    <Image src={character.cards[0].images[0].url} alt="" fill className="object-cover blur-sm" />
                  </div>
                )}
                
                <div className="relative z-10">
                  <h4 className="text-2xl font-display font-bold group-hover:text-primary transition-colors">{character.name}</h4>
                  <p className="text-sm font-mono text-foreground/50 mt-2">{character._count.cards} Appearances</p>
                </div>
                
                <div className="relative z-10 w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                  <span className="text-foreground/50 group-hover:text-foreground transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
          )}
        </section>

        {/* Module 4: Recently Released (Chronological Timelines) */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
            <h3 className="text-2xl font-display font-medium tracking-wide flex items-center gap-3">
              <TrendingUp className="text-primary" /> Recently Released
            </h3>
          </div>
          
          {recentReleases.length === 0 ? (
            <p className="text-foreground/30 text-sm py-8 text-center border border-dashed border-foreground/10 rounded-2xl">No dated releases found yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentReleases.map((release) => (
                release.set && (
                  <Link key={release.id} href={`/collections/${release.setId}`} className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-colors flex items-center gap-6">
                    <div className="w-16 h-16 bg-background/40 rounded-xl flex items-center justify-center relative overflow-hidden">
                      <Flame size={24} className="text-foreground/20 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-1">
                        {release.set.series.brand.name}
                      </p>
                      <h4 className="text-lg font-medium text-foreground truncate group-hover:text-primary transition-colors">{release.set.name}</h4>
                      <p className="text-xs text-foreground/50 mt-1">{new Date(release.date!).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} • {release.country || 'Global'}</p>
                    </div>
                  </Link>
                )
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
