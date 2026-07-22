export const API_URL = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_TCG_API_KEY || "";
const headers = API_KEY ? { "X-Api-Key": API_KEY } : {};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url: string, retries = 6): Promise<any> {
  for (let i = 0; i < retries; i++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: headers as any, signal: AbortSignal.timeout(20000) });
    } catch (e: any) {
      console.log(`  Network error (${e.message}), waiting ${(i + 1) * 5}s...`);
      await sleep((i + 1) * 5000);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      console.log(`  API Error ${res.status}, waiting ${(i + 1) * 5}s...`);
      await sleep((i + 1) * 5000);
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${url}`);
    }
    return await res.json();
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries.`);
}

export { sleep };
