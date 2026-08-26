import Image from "next/image";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      set: { include: { series: { include: { brand: true } } } },
      currentPrice: true,
    },
  });

  const images = await getImagesForEntities("Product", products.map((p) => p.id));

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-32 space-y-8">
      <div>
        <p className="flex items-center gap-2 text-foreground/50 text-sm font-mono uppercase tracking-widest mb-2">
          <PackageOpen size={16} /> Products
        </p>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Sealed products
        </h1>
        <p className="text-foreground/50 mt-2 max-w-2xl">
          {products.length} tracked box{products.length === 1 ? '' : 'es'}, packs, and bundles — with verified pull odds where available.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 text-foreground/40">No sealed products tracked yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const image = pickPrimaryImage(images.get(product.id) ?? []);
            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group p-6 rounded-2xl bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 hover:border-primary/30 transition-colors flex gap-4"
              >
                <div className="w-20 h-20 shrink-0 rounded-xl bg-background border border-foreground/10 flex items-center justify-center overflow-hidden relative">
                  {image ? (
                    <Image src={image.url} alt={product.name} fill className="object-contain p-2" />
                  ) : (
                    <PackageOpen size={24} className="text-foreground/20" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-foreground group-hover:text-primary transition-colors truncate">{product.name}</h2>
                  {product.set && (
                    <p className="text-xs text-foreground/50 mt-1 truncate">{product.set.series.brand.name} • {product.set.name}</p>
                  )}
                  <p className="text-sm font-mono text-foreground/70 mt-2">
                    {product.currentPrice?.marketPriceUsd != null ? `$${product.currentPrice.marketPriceUsd.toFixed(2)}` : 'No price data'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
