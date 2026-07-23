import type { SimpleImage } from "./resolve";

export interface PickedImage {
  url: string | null;
  isFallback: boolean;
  fallbackType: "crest" | "placeholder" | null;
}

/**
 * Collection V2's image priority (strengthened over the ad hoc 2-3 tier
 * chains duplicated across ~14 other files): if the collector scanned their
 * own copy, that's the image they expect to see — everything else is a
 * catalog fallback, in order of how card-specific it is.
 *
 *   1. The user's own scan photo
 *   2. Official card artwork
 *   3. Variant-specific artwork (parallel/printing image, if one exists)
 *   4. Club/team crest
 *   5. null (caller renders a text placeholder — never a broken image)
 */
export function pickInstanceImage(params: {
  scanMediaUrl?: string | null;
  cardImages: SimpleImage[];
  variantImages?: SimpleImage[];
}): PickedImage {
  const { scanMediaUrl, cardImages, variantImages = [] } = params;

  if (scanMediaUrl) return { url: scanMediaUrl, isFallback: false, fallbackType: null };

  const official =
    cardImages.find((i) => i.type === "OFFICIAL_ARTWORK")?.url ?? cardImages.find((i) => i.type === "THUMBNAIL")?.url;
  if (official) return { url: official, isFallback: false, fallbackType: null };

  const variantArt =
    variantImages.find((i) => i.type === "OFFICIAL_ARTWORK")?.url ??
    variantImages.find((i) => i.type === "THUMBNAIL")?.url;
  if (variantArt) return { url: variantArt, isFallback: false, fallbackType: null };

  const crest = cardImages.find((i) => i.type === "TEAM_CREST")?.url;
  if (crest) return { url: crest, isFallback: true, fallbackType: "crest" };

  return { url: null, isFallback: true, fallbackType: "placeholder" };
}
