// Client-safe (no Prisma import — resolve.ts isn't, since it instantiates
// PrismaClient at module scope). Centralizes the "which image type wins as
// the primary display image" priority so every page agrees, instead of each
// component hand-rolling its own .find() chain that silently misses newer
// usage tags (confirmed: EBAY_LISTING_PHOTO was invisible on every one of
// the ~12 pages that had their own inline chain before this existed).
const PRIMARY_IMAGE_PRIORITY = ["OFFICIAL_ARTWORK", "THUMBNAIL", "EBAY_LISTING_PHOTO", "LISTING_PHOTO"];

export interface ImageLike {
  url: string;
  type: string;
}

export function pickPrimaryImage<T extends ImageLike>(images: T[] | undefined | null): T | undefined {
  if (!images || images.length === 0) return undefined;
  for (const type of PRIMARY_IMAGE_PRIORITY) {
    const match = images.find((i) => i.type === type);
    if (match) return match;
  }
  return undefined;
}
