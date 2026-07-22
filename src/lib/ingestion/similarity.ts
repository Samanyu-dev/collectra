/**
 * Generic string-similarity scoring shared by collection-import matching
 * (src/lib/migration) and bulk catalog ingestion matching.
 */

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prevRow[j] = j;

  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currRow;
  }

  return prevRow[b.length];
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Returns a similarity ratio in [0, 1] — 1 means identical (after normalization).
 */
export function similarityRatio(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const distance = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - distance / maxLen;
}

/**
 * Token-set aware similarity — more forgiving of word order/extra tokens
 * (e.g. "Charizard ex" vs "ex Charizard" vs "Charizard").
 */
export function tokenSetSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalize(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalize(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let shared = 0;
  for (const t of tokensA) if (tokensB.has(t)) shared++;
  const union = new Set([...tokensA, ...tokensB]).size;

  const exactRatio = similarityRatio(a, b);
  const jaccard = shared / union;
  return Math.max(exactRatio, jaccard);
}

export function bestMatchScore(query: string, candidate: string): number {
  return Math.round(tokenSetSimilarity(query, candidate) * 100);
}
