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

    // 2b. No set name at all (Scanner/OCR, docs/adr/004-scanner-architecture.md
    // §3 — a set symbol is rarely legible OCR text, unlike a printed card
    // number) — search globally by card number + name similarity instead of
    // requiring a pre-resolved set first. Purely additive: only runs when
    // §1/§2 found nothing AND no setName was given at all, so the existing
    // CSV-import callers (which always provide setName) are unaffected.
    if (candidateVariants.length === 0 && !row.setName && row.cardNumber) {
      const globalCards = await this.prisma.card.findMany({
        where: { number: row.cardNumber },
        include: { variants: true, set: true },
      });
      const scored = globalCards
        .map((c) => ({ card: c, score: bestMatchScore(row.name, c.name) }))
        .filter((c) => c.score >= CARD_NAME_MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 1 || (scored.length > 1 && scored[0].score - scored[1].score >= 15)) {
        confidence += 50; // number + name both matched globally — a strong signal despite no set
        reasons.push(`[✓] Card Number ${row.cardNumber} + Name "${row.name}" matched "${scored[0].card.name}" in "${scored[0].card.set.name}" (no set name provided)`);
        candidateVariants = scored[0].card.variants;
      } else if (scored.length > 1) {
        // Genuinely different cards (from different sets) share this number —
        // these aren't printings of one card, so surface them as top-level
        // candidates directly rather than forcing them through the
        // single-card "candidateVariants" shape below. Two real fields
        // corroborated (number + name) — only "which set" is ambiguous, a
        // meaningfully stronger signal than a single fuzzy field match, so
        // this is scored as a real MEDIUM-confidence, actionable result.
        confidence += 45;
        reasons.push(`[⚠] Card Number ${row.cardNumber} found in ${scored.length} different sets — ambiguous without a set name`);
        return {
          confidence: Math.min(confidence, 99),
          reasons,
          matchCandidates: scored.slice(0, 5).flatMap((s) => s.card.variants.map((v: any) => ({ variantId: v.id, confidence: Math.round(s.score) }))),
        };
      } else if (globalCards.length === 0) {
        reasons.push(`[✕] No card found with number ${row.cardNumber}`);
      }
    }

    // 2c. Neither set name nor card number (the weakest real signal OCR can
    // produce) — name-only search across the whole catalog, deliberately
    // capped at a low confidence rather than treated as equivalent to a
    // number+name match.
    if (candidateVariants.length === 0 && !row.setName && !row.cardNumber && row.name) {
      const pool = await this.prisma.card.findMany({ take: 2000, include: { variants: true, set: true } });
      const scored = pool
        .map((c) => ({ card: c, score: bestMatchScore(row.name, c.name) }))
        .filter((c) => c.score >= CARD_NAME_MATCH_THRESHOLD)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        confidence += 15;
        reasons.push(`[⚠] Name-only match against the full catalog — low confidence without a set or card number`);
        return {
          confidence: Math.min(confidence, 40),
          reasons,
          matchCandidates: scored.slice(0, 5).flatMap((s) => s.card.variants.map((v: any) => ({ variantId: v.id, confidence: Math.round(s.score * 0.5) }))),
        };
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
