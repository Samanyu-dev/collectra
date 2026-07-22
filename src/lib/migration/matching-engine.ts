import { PrismaClient } from '@prisma/client';
import { CanonicalMigrationRow, AdapterMatchResult } from './adapters/base';
import { bestMatchScore } from '../ingestion/similarity';

// Real string-similarity (Levenshtein/token-set) based matching, shared with
// bulk catalog ingestion via src/lib/ingestion/similarity.ts — see that module
// for the scoring primitives. This is the confidence-weighting policy on top.
const SET_NAME_MATCH_THRESHOLD = 70; // similarity score (0-100) to consider a set a candidate
const CARD_NAME_MATCH_THRESHOLD = 65;

export class MigrationMatchingEngine {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async match(row: CanonicalMigrationRow): Promise<AdapterMatchResult> {
    const reasons: string[] = [];
    let confidence = 0;

    // 1. Initial Set Lookup — fetch a candidate pool, then rank by similarity
    let setMatches: any[] = [];
    if (row.setName) {
      const candidatePool = await this.prisma.set.findMany({ take: 500 });
      const scored = candidatePool
        .map((s) => ({ set: s, score: bestMatchScore(row.setName!, s.name) }))
        .filter((s) => s.score >= SET_NAME_MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score);

      setMatches = scored.map((s) => s.set);

      if (scored.length === 1 || (scored.length > 1 && scored[0].score - scored[1].score >= 15)) {
        confidence += 30;
        reasons.push(`[✓] Set Name matched "${scored[0].set.name}" (${scored[0].score}% similarity)`);
        setMatches = [scored[0].set];
      } else if (scored.length > 1) {
        confidence += 10;
        reasons.push(`[⚠] Multiple sets found matching "${row.setName}"`);
      } else {
        reasons.push(`[✕] Unknown Set: "${row.setName}"`);
      }
    }

    // 2. Card Number Match (Highest weight)
    let candidateVariants: any[] = [];
    if (row.cardNumber && setMatches.length === 1) {
      const setId = setMatches[0].id;
      // We look up cards in the set with this number
      const cards = await this.prisma.card.findMany({
        where: {
          setId,
          number: row.cardNumber
        },
        include: { variants: true }
      });

      if (cards.length === 1) {
        confidence += 40;
        reasons.push(`[✓] Card Number ${row.cardNumber} matched`);
        candidateVariants = cards[0].variants;
      } else if (cards.length === 0) {
        // Fallback to name similarity search within the set
        const setCards = await this.prisma.card.findMany({ where: { setId }, include: { variants: true } });
        const scored = setCards
          .map((c) => ({ card: c, score: bestMatchScore(row.name, c.name) }))
          .filter((c) => c.score >= CARD_NAME_MATCH_THRESHOLD)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 1 || (scored.length > 1 && scored[0].score - scored[1].score >= 15)) {
          confidence += 30;
          reasons.push(`[✓] Card Name "${row.name}" matched "${scored[0].card.name}" (${scored[0].score}% similarity)`);
          candidateVariants = scored[0].card.variants;
        }
      }
    }

    // 3. Variant Match (Foil, 1st Ed, Language)
    if (candidateVariants.length > 0) {
      // Simplistic variant matching logic
      // In reality, this would inspect `isFoil`, `printing`, etc.
      if (candidateVariants.length === 1) {
        confidence += 30;
        reasons.push('[✓] Exact Variant isolated');
        return {
          confidence: Math.min(confidence, 100),
          reasons,
          variantId: candidateVariants[0].id
        };
      } else {
        // We have multiple variants (e.g. Holo and Reverse Holo)
        confidence += 15;
        reasons.push(`[⚠] ${candidateVariants.length} possible variants. Needs review.`);
        
        return {
          confidence: Math.min(confidence, 99),
          reasons,
          matchCandidates: candidateVariants.map(v => ({ variantId: v.id, confidence: 75 }))
        };
      }
    }

    // Fallback failure
    return {
      confidence,
      reasons: [...reasons, '[✕] Could not resolve card'],
    };
  }
}
