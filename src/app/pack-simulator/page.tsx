import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { PackSimulatorClient } from "./pack-simulator-client";

export const dynamic = "force-dynamic";

export default async function PackSimulatorPage() {
  // Only products with real, verified pull-rate data can be simulated —
  // no fabricated odds. Most products won't have this until pull rates are
  // ingested from a licensed/curated source.
  const products = await prisma.product.findMany({
    where: {
      components: {
        some: { pack: { possiblePulls: { some: {} } } },
      },
    },
    include: {
      components: {
        include: {
          pack: {
            include: {
              possiblePulls: {
                include: { variant: { include: { card: true, parallel: true } } },
              },
            },
          },
        },
      },
    },
    take: 20,
  });

  const imagesByProduct = await getImagesForEntities("Product", products.map((p) => p.id));

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: imagesByProduct.get(p.id)?.[0]?.url ?? null,
    packs: p.components
      .filter((c) => c.pack)
      .map((c) => ({
        name: c.name,
        pulls: c.pack!.possiblePulls.map((pull) => ({
          variantId: pull.variantId,
          cardName: pull.variant.card.name,
          parallelName: pull.variant.parallel?.name ?? null,
          odds: pull.odds,
        })),
      })),
  }));

  return <PackSimulatorClient products={items} />;
}
