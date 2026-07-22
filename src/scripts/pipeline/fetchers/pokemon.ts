export async function fetchPokemonSets() {
  console.log("Fetching Pokemon Sets...");
  const res = await fetch("https://api.pokemontcg.io/v2/sets");
  const data = await res.json();
  return data.data;
}

export async function fetchPokemonCardsBySet(setId: string) {
  console.log(`Fetching Pokemon Cards for Set: ${setId}...`);
  // Handle pagination to get all cards for the set
  let cards: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250`);
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      cards = [...cards, ...data.data];
      page++;
      // Sleep to avoid rate limiting without API key
      await new Promise(r => setTimeout(r, 1000));
    } else {
      hasMore = false;
    }
  }

  return cards;
}
