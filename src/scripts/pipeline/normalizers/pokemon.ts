export function normalizePokemonSet(rawSet: any, franchiseId: string) {
  return {
    id: rawSet.id,
    name: rawSet.name,
    franchiseId,
    series: rawSet.series,
    releaseDate: rawSet.releaseDate ? new Date(rawSet.releaseDate.replace(/\//g, "-")) : null,
    printedTotal: rawSet.printedTotal,
    total: rawSet.total,
    coverImage: rawSet.images?.logo,
  };
}

export function normalizePokemonCard(rawCard: any, setId: string) {
  return {
    id: rawCard.id,
    name: rawCard.name,
    number: rawCard.number,
    rarity: rawCard.rarity || "Common",
    setId,
    imageThumb: rawCard.images?.small,
    imageSmall: rawCard.images?.small,
    imageMedium: rawCard.images?.large,
    imageLarge: rawCard.images?.large,
    imageRaw: rawCard.images?.large,
    artist: rawCard.artist,
    flavorText: rawCard.flavorText,
    supertype: rawCard.supertype,
    subtypes: rawCard.subtypes ? rawCard.subtypes.join(", ") : null,
  };
}

export function normalizePokemonVariants(rawCard: any) {
  const variants = [];
  
  if (rawCard.tcgplayer?.prices?.normal) {
    variants.push({
      id: `${rawCard.id}-normal`,
      cardId: rawCard.id,
      type: "Normal",
      marketPrice: rawCard.tcgplayer.prices.normal.market || null,
      lowPrice: rawCard.tcgplayer.prices.normal.low || null,
    });
  }
  
  if (rawCard.tcgplayer?.prices?.holofoil) {
    variants.push({
      id: `${rawCard.id}-holofoil`,
      cardId: rawCard.id,
      type: "Holofoil",
      marketPrice: rawCard.tcgplayer.prices.holofoil.market || null,
      lowPrice: rawCard.tcgplayer.prices.holofoil.low || null,
    });
  }
  
  if (rawCard.tcgplayer?.prices?.reverseHolofoil) {
    variants.push({
      id: `${rawCard.id}-reverse-holofoil`,
      cardId: rawCard.id,
      type: "Reverse Holofoil",
      marketPrice: rawCard.tcgplayer.prices.reverseHolofoil.market || null,
      lowPrice: rawCard.tcgplayer.prices.reverseHolofoil.low || null,
    });
  }
  
  if (variants.length === 0) {
    // Default variant if no pricing data
    variants.push({
      id: `${rawCard.id}-base`,
      cardId: rawCard.id,
      type: "Base",
      marketPrice: null,
      lowPrice: null,
    });
  }
  
  return variants;
}
