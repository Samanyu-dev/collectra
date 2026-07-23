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
