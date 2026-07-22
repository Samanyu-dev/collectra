import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { PackageOpen, Scale, Calendar, Tag, ArrowLeft, TrendingUp } from "lucide-react";
import { getImagesForEntity, getImagesForEntities } from "@/lib/media/resolve";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id: productId } = await props.params;

  const productRaw = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      set: {
        include: { series: { include: { franchise: true, brand: true } } }
      },
      releases: true,
      currentPrice: true,
      weightEvidence: true,
      components: {
        include: {
          pack: {
            include: {
              possiblePulls: {
                include: {
                  variant: { include: { card: true, printing: true, parallel: true, currentPrice: true } },
                  evidence: true
                }
              }
            }
          },
          guaranteedVariant: { include: { card: true, parallel: true, currentPrice: true } }
        }
      },
      identifiers: true,
      sourceRelations: { include: { target: true } },
      targetRelations: { include: { source: true } },
    }
  });

  if (!productRaw) notFound();

  const cardIds = new Set<string>();
  for (const comp of productRaw.components) {
    if (comp.guaranteedVariant) cardIds.add(comp.guaranteedVariant.card.id);
    if (comp.pack) for (const pull of comp.pack.possiblePulls) cardIds.add(pull.variant.card.id);
  }

  const [productImages, cardImagesMap] = await Promise.all([
    getImagesForEntity("Product", productRaw.id),
    getImagesForEntities("Card", Array.from(cardIds)),
  ]);

  const product = {
    ...productRaw,
    images: productImages,
    components: productRaw.components.map((comp) => ({
      ...comp,
      guaranteedVariant: comp.guaranteedVariant && {
        ...comp.guaranteedVariant,
        card: { ...comp.guaranteedVariant.card, images: cardImagesMap.get(comp.guaranteedVariant.card.id) ?? [] },
      },
      pack: comp.pack && {
        ...comp.pack,
        possiblePulls: comp.pack.possiblePulls.map((pull) => ({
          ...pull,
          variant: { ...pull.variant, card: { ...pull.variant.card, images: cardImagesMap.get(pull.variant.card.id) ?? [] } },
        })),
      },
    })),
  };

  // Basic info
  const hqImage = product.images.find(i => i.type === 'OFFICIAL_ARTWORK')?.url || product.images[0]?.url;
  const currentPrice = product.currentPrice?.marketPriceUsd ?? null;

  // Calculate EV (Expected Value) if there are packs with possible pulls
  // Note: True EV requires verified odds. We calculate what we can.
  let calculatedEV = 0;
  let hasValidEV = false;

  product.components.forEach(comp => {
    if (comp.pack && comp.pack.possiblePulls.length > 0) {
      let packEV = 0;
      comp.pack.possiblePulls.forEach(pull => {
        const pullPrice = pull.variant.currentPrice?.marketPriceUsd ?? 0;
        packEV += pullPrice * pull.odds;
      });
      calculatedEV += packEV * comp.quantity;
      hasValidEV = true;
    }
    if (comp.guaranteedVariant) {
      const gvPrice = comp.guaranteedVariant.currentPrice?.marketPriceUsd ?? 0;
      calculatedEV += gvPrice * comp.quantity;
      hasValidEV = true;
    }
  });

  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/30 pb-48 font-sans">
      
      {/* Top Nav */}
      <div className="fixed top-0 left-0 right-0 z-50 p-6 pointer-events-none">
        {product.set && (
          <Link 
            href={`/collections/${product.setId}`}
            className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors pointer-events-auto bg-background/40 backdrop-blur-xl px-4 py-2 rounded-full border border-foreground/10"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to {product.set.name}</span>
          </Link>
        )}
      </div>

      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-32 space-y-24">
        
        {/* Product Hero */}
        <section className="flex flex-col md:flex-row gap-12 lg:gap-24">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative w-full aspect-[4/3] bg-foreground/5 rounded-2xl border border-foreground/10 flex items-center justify-center p-8 shadow-2xl">
              {hqImage ? (
                <Image src={hqImage} alt={product.name} fill className="object-contain p-8" unoptimized priority />
              ) : (
                <PackageOpen size={64} className="text-foreground/20" />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-4 mt-4 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <div key={`${img.url}-${idx}`} className="w-20 h-20 bg-foreground/5 rounded-xl border border-foreground/10 relative overflow-hidden">
                    <Image src={img.url} alt="Thumbnail" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-8">
            <div>
              {product.set && (
                <p className="text-primary font-mono text-xs tracking-widest uppercase mb-2">
                  {product.set.series.brand.name} • {product.set.name}
                </p>
              )}
              <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-4">{product.name}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-foreground/50 text-sm font-mono mt-6">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{product.releases[0] ? new Date(product.releases[0].date!).toLocaleDateString() : 'Unknown Release'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag size={16} />
                  <span>{product.identifiers.find(i => i.type === 'UPC')?.value || 'No UPC'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale size={16} />
                  <span>
                    {product.weight ? `${product.weight}g` : 'Unverified Weight'} 
                    {product.weightEvidence && <span className="ml-1 text-green-400">({product.weightEvidence.sourceType})</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Economics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-foreground/10">
              <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-2">Market Price</p>
                <p className="text-3xl font-bold">{currentPrice ? `$${currentPrice.toFixed(2)}` : 'N/A'}</p>
              </div>
              <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-2">Original MSRP</p>
                {/* No real MSRP source is wired yet — that's fixed historical retail
                    pricing, not a live market aggregate CurrentPrice models. */}
                <p className="text-3xl font-bold">N/A</p>
              </div>
              <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/10">
                <p className="text-foreground/40 text-xs font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={14} /> EV Engine
                </p>
                {hasValidEV ? (
                  <p className="text-3xl font-bold text-green-400">${calculatedEV.toFixed(2)}</p>
                ) : (
                  <p className="text-sm text-foreground/50 mt-2 leading-tight">Awaiting verified community pull rates to calculate Expected Value.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Contents Breakdown */}
        <section className="space-y-8">
          <h3 className="text-xl font-mono text-foreground/50 uppercase tracking-widest border-b border-foreground/10 pb-4">Product Contents</h3>
          
          {product.components.length === 0 ? (
            <div className="bg-foreground/5 border border-foreground/10 border-dashed rounded-3xl p-12 text-center text-foreground/40 font-mono">
              Component breakdown is pending verification by the Collectra community.
            </div>
          ) : (
            <div className="space-y-8">
              {product.components.map(comp => (
                <div key={comp.id} className="bg-elevated rounded-2xl border border-foreground/10 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-2xl font-display font-medium">
                      <span className="text-foreground/40">{comp.quantity}x</span> {comp.name}
                    </h4>
                    <span className="px-3 py-1 bg-foreground/10 rounded-full text-xs font-mono text-foreground/60">
                      {comp.type}
                    </span>
                  </div>

                  {/* Guaranteed Hit Rendering */}
                  {comp.guaranteedVariant && (
                    <Link href={`/cards/${comp.guaranteedVariant.cardId}`} className="block w-full max-w-sm bg-foreground/5 hover:bg-foreground/10 transition-colors border border-foreground/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer">
                      <div className="w-12 h-16 bg-foreground/10 rounded shrink-0 relative overflow-hidden">
                        {comp.guaranteedVariant.card.images?.[0]?.url && (
                          <Image src={comp.guaranteedVariant.card.images[0].url} alt={comp.guaranteedVariant.card.name} fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{comp.guaranteedVariant.card.name}</p>
                        <p className="text-xs text-primary font-mono mt-1">{comp.guaranteedVariant.parallel?.name || 'Guaranteed Promo'}</p>
                      </div>
                    </Link>
                  )}

                  {/* Pack Odds Rendering */}
                  {comp.pack && comp.pack.possiblePulls.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-sm font-mono text-foreground/40">Verified Possible Pulls (Odds)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comp.pack.possiblePulls.map(pull => (
                          <Link href={`/cards/${pull.variant.cardId}`} key={pull.id} className="flex items-center justify-between p-4 bg-background border border-foreground/10 rounded-xl hover:bg-foreground/5 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-14 bg-foreground/10 rounded relative overflow-hidden">
                                {pull.variant.card.images?.[0]?.url && (
                                  <Image src={pull.variant.card.images[0].url} alt={pull.variant.card.name} fill className="object-cover" unoptimized />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium group-hover:text-primary transition-colors">{pull.variant.card.name}</p>
                                <p className="text-xs text-foreground/50">{pull.variant.parallel?.name || 'Base'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono text-green-400">{(pull.odds * 100).toFixed(2)}%</p>
                              {pull.evidence && (
                                <p className="text-[10px] text-foreground/30 uppercase">{pull.evidence.sourceType}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
