import { prisma } from "./prisma";
import { builder } from "./builder";
import { attachHotlinkImage } from "./media";
import { bestMatchScore } from "../../lib/ingestion/similarity";

/**
 * Normalized shape every dataset-specific `mapRow()` (Kaggle/HuggingFace/GitHub
 * adapter configs) must produce. Keeping ingestion generic here means new
 * datasets only ever need a mapping function, never new graph-writing code.
 */
export interface CatalogCardEntity {
  id: string; // stable id within the source dataset
  type: "CARD";
  name: string;
  cardNumber?: string;
  universe: string; // "Sports", "Non-Sports", "TCG"
  manufacturer: string; // "Topps", "Panini", ...
  franchise: string; // "MLB", "Star Wars", ...
  brand?: string;
  series?: string;
  setName: string;
  releaseYear?: number;
  imageUrl?: string;
  parallel?: string;
  serialTo?: number;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Kind passed through to attachHotlinkImage's per-kind trust/verification defaults. */
export async function ingestCatalogCard(entity: CatalogCardEntity, sourceIdentifier: string, sourceKind: string) {
  const universeId = await builder.getOrCreateUniverse(entity.universe);
  const manufacturerId = await builder.getOrCreateManufacturer(entity.manufacturer);
  const franchiseId = await builder.getOrCreateFranchise(entity.franchise, universeId);
  const brandId = await builder.getOrCreateBrand(entity.brand || entity.manufacturer, manufacturerId);
  const seriesId = await builder.getOrCreateSeries(entity.series || entity.setName, franchiseId, brandId);

  // Reuse an existing Set in this series if the name is a near-exact match,
  // instead of creating near-duplicate Sets across re-runs/sources.
  const existingSets = await prisma.set.findMany({ where: { seriesId }, take: 200 });
  const scored = existingSets
    .map((s) => ({ set: s, score: bestMatchScore(entity.setName, s.name) }))
    .sort((a, b) => b.score - a.score);

  let setId: string;
  if (scored.length > 0 && scored[0].score >= 90) {
    setId = scored[0].set.id;
  } else {
    const set = await builder.getOrCreateSet({
      id: `${slugify(sourceIdentifier)}-set-${slugify(entity.setName)}`,
      name: entity.setName,
      seriesId,
      releaseDate: entity.releaseYear ? new Date(`${entity.releaseYear}-01-01`) : undefined,
    });
    setId = set.id;
  }

  const cardId = `${slugify(sourceIdentifier)}-${slugify(entity.id)}`;
  const card = await prisma.card.upsert({
    where: { id: cardId },
    update: {},
    create: {
      id: cardId,
      name: entity.name,
      number: entity.cardNumber || "",
      setId,
    },
  });

  const parallelId = entity.parallel ? await builder.getOrCreateParallel(entity.parallel) : undefined;

  const existingVariant = await prisma.variant.findFirst({
    where: { cardId: card.id, parallelId: parallelId ?? null },
  });
  if (!existingVariant) {
    await prisma.variant.create({
      data: { cardId: card.id, parallelId, serialTo: entity.serialTo },
    });
  }

  await attachHotlinkImage({
    url: entity.imageUrl,
    entityType: "Card",
    entityId: card.id,
    usage: "OFFICIAL_ARTWORK",
    sourceIdentifier,
    sourceKind,
  });

  return card;
}
