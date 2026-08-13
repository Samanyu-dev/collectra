type VariantClassificationInput = {
  insert?: { name: string } | null;
  parallel?: { name: string } | null;
  printing?: { name: string } | null;
  isAuto?: boolean;
  isRelic?: boolean;
  isPatch?: boolean;
  isFoil?: boolean;
  serialTo?: number | null;
};

export function getVariantCardType(variant: VariantClassificationInput): string {
  if (variant.insert?.name) return variant.insert.name;
  if (variant.parallel?.name) return variant.parallel.name;
  if (variant.printing?.name && variant.printing.name.toLowerCase() !== "base") return variant.printing.name;
  if (variant.isAuto) return "Autograph";
  if (variant.isPatch) return "Patch";
  if (variant.isRelic) return "Relic";
  if (variant.serialTo) return "Numbered";
  if (variant.isFoil) return "Foil";
  return "Base";
}

export function getVariantRarityLabel(variant: VariantClassificationInput): string {
  const labels = [
    variant.insert?.name,
    variant.parallel?.name,
    variant.isAuto ? "Autograph" : null,
    variant.isPatch ? "Patch" : null,
    variant.isRelic ? "Relic" : null,
    variant.serialTo ? `/${variant.serialTo}` : null,
    variant.isFoil ? "Foil" : null,
  ].filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels.join(" · ") : "Base";
}

export type VariantCategory = "base" | "parallel" | "insert";

/** Same insert > parallel > base precedence as getVariantCardType, bucketed instead of named — for grouping/summing (e.g. Value by Rarity). */
export function getVariantCategory(variant: VariantClassificationInput): VariantCategory {
  if (variant.insert?.name) return "insert";
  if (variant.parallel?.name) return "parallel";
  return "base";
}

export type RarityTier = "common" | "rare" | "epic" | "legendary" | "unique";

/**
 * A 5-tier visual rarity derived entirely from existing Variant flags — no
 * new catalog data required, works uniformly across every franchise (sports
 * autographs/relics, TCG foils/parallels, anime inserts) since it reads the
 * same signals getVariantRarityLabel does, just bucketed for a glow/border
 * treatment instead of a text label.
 */
export function getRarityTier(variant: VariantClassificationInput): RarityTier {
  if (variant.serialTo === 1) return "unique"; // a true 1-of-1
  if (variant.isAuto || variant.isRelic || variant.isPatch || (variant.serialTo != null && variant.serialTo <= 25)) {
    return "legendary";
  }
  if (variant.insert?.name || variant.parallel?.name || (variant.serialTo != null && variant.serialTo <= 99)) {
    return "epic";
  }
  if (variant.isFoil || (variant.printing?.name && variant.printing.name.toLowerCase() !== "base")) {
    return "rare";
  }
  return "common";
}
