import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getOwnedVariantIds } from "@/lib/actions/collection";
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
              parallel: true
            }
          }
        }
      }
    }
  });

  if (!setRaw) {
    notFound();
  }

  const imagesByCard = await getImagesForEntities("Card", setRaw.cards.map((c) => c.id));
  const allVariantIds = setRaw.cards.flatMap((c) => c.variants.map((v) => v.id));
  const ownedVariantIds = new Set(await getOwnedVariantIds(allVariantIds));
  const set = {
    ...setRaw,
    cards: setRaw.cards.map((c) => ({
      ...c,
      images: imagesByCard.get(c.id) ?? [],
      owned: c.variants.some((v) => ownedVariantIds.has(v.id)),
    })),
  };
  // Find a cover image from the first few cards
  const topCards = set.cards.slice(0, 4);

  return (
    <div className="min-h-screen w-full pb-32">
      <div className="relative w-full h-[50vh] min-h-[400px] flex items-end">
        
        {/* Dynamic Mosaic Background */}
        <div className="absolute inset-0 z-0 flex flex-wrap opacity-40 blur-3xl pointer-events-none saturate-150">
          {topCards.map((card) => {
            const hqImage = card.images.find(img => img.type === 'OFFICIAL_ARTWORK' || img.type === 'THUMBNAIL');
            return hqImage ? (
              <div key={card.id} className="relative w-1/2 h-1/2">
                <Image src={hqImage.url} alt={card.name} fill className="object-cover" unoptimized priority />
              </div>
            ) : null;
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-12 pb-12 flex flex-col md:flex-row items-end gap-8">
          <div className="flex-1 space-y-2">
            <p className="text-primary font-mono text-sm tracking-widest uppercase">{set.series.franchise.name} • {set.series.brand.name} • {set.series.name}</p>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground tracking-tight">{set.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-16">
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
