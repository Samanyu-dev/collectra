import { PrismaClient } from "@prisma/client";
import { MigrationMatchingEngine } from "../migration/matching-engine";
import type { OcrTextBlock } from "./ocr";
import type { ConfidenceLabel } from "../pricing/confidence";

export interface ScanCandidate {
  variantId: string;
  confidence: number; // 0-100, as MigrationMatchingEngine reports it
}

export interface ScanResult {
  confidenceLabel: ConfidenceLabel; // reuses the exact HIGH/MEDIUM/LOW/NO_DATA taxonomy from pricing (ADR 004 §4)
  confidence: number;
  reasons: string[];
  variantId: string | null; // set only for a single, high-confidence resolution
  candidates: ScanCandidate[]; // set for a MEDIUM (multiple candidates) result
  extractedName: string | null; // what OCR/heuristics actually read — shown to the user for transparency, not hidden
  extractedCardNumber: string | null;
}

// Best-effort first-pass heuristics for turning raw OCR text blocks into
// (name, cardNumber) candidates. Real trading-card layouts vary a lot; this
// is deliberately simple and documented as needing refinement against real
// scan photos (docs/adr/004-scanner-architecture.md §8/Success Metrics) once
// a real OCR provider is wired in — not tuned against real data yet, since
// none exists.
const CARD_NUMBER_PATTERN = /(\d{1,4})\s*\/\s*\d{1,4}/; // e.g. "4/102" -> capture "4"
const STANDALONE_NUMBER_PATTERN = /^#?(\d{1,4})$/;

function extractCardNumber(blocks: OcrTextBlock[]): string | null {
  for (const block of blocks) {
    const slashMatch = block.text.match(CARD_NUMBER_PATTERN);
    if (slashMatch) return slashMatch[1];
  }
  for (const block of blocks) {
    const standalone = block.text.trim().match(STANDALONE_NUMBER_PATTERN);
    if (standalone) return standalone[1];
  }
  return null;
}

// Text that appears on a real trading card but is never the card's own name —
// rules text, stats, and copyright lines. Found by running this heuristic
// against a real scanned card (Base Set Charizard) end-to-end: the original
// "longest alphabetic block wins" version picked the illustrator/copyright
// line over "Charizard" because it was literally the longest line on the
// card. A period is treated the same way — card names never contain one,
// but rules text, flavor text, and copyright lines (prose) almost always do.
const NON_NAME_KEYWORDS = [
  "stage", "evolves", "hp", "energy", "weakness", "resistance", "retreat",
  "illus", "©", "nintendo", "wizards", "gamefreak", "pokémon power", "pokemon power",
];

function extractCardName(blocks: OcrTextBlock[], excluding: string | null): string | null {
  const candidates = blocks.filter((b) => {
    const trimmed = b.text.trim();
    if (trimmed.length < 2) return false;
    if (excluding && trimmed === excluding) return false;
    if (CARD_NUMBER_PATTERN.test(trimmed) || STANDALONE_NUMBER_PATTERN.test(trimmed)) return false;
    if (!/[a-zA-Z]/.test(trimmed)) return false; // must contain at least some letters
    if (trimmed.length > 12 && trimmed.includes(".")) return false; // prose, not a name
    const lower = trimmed.toLowerCase();
    return !NON_NAME_KEYWORDS.some((kw) => lower.includes(kw));
  });
  if (candidates.length === 0) return null;
  // First surviving block, not the longest — card layouts put the name near
  // the top, and OCR providers report blocks in roughly top-to-bottom
  // reading order, so "first" tracks the real card layout better than
  // "longest" (which favors whichever rules/flavor text happens to be
  // wordiest).
  return candidates[0].text.trim();
}

function labelForConfidence(score: number, hasResult: boolean): ConfidenceLabel {
  if (!hasResult) return "NO_DATA";
  if (score >= 70) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

/**
 * Bridges OCR output into the existing, already-proven MigrationMatchingEngine
 * (docs/adr/004-scanner-architecture.md §3) — extended with a set-less path
 * (matching-engine.ts §2b/§2c) rather than duplicated, since OCR routinely
 * can't read a card's tiny set symbol the way a CSV import always has a set
 * column.
 */
export async function identifyFromOcr(prisma: PrismaClient | any, blocks: OcrTextBlock[]): Promise<ScanResult> {
  const cardNumber = extractCardNumber(blocks);
  const name = extractCardName(blocks, cardNumber);

  if (!name) {
    return {
      confidenceLabel: "NO_DATA",
      confidence: 0,
      reasons: ["[✕] Could not read any card name text from the photo"],
      variantId: null,
      candidates: [],
      extractedName: null,
      extractedCardNumber: cardNumber,
    };
  }

  const engine = new MigrationMatchingEngine(prisma as any);
  const result = await engine.match({
    name,
    cardNumber: cardNumber ?? undefined,
    quantity: 1,
    isGraded: false,
  });

  const hasResult = !!result.variantId || (result.matchCandidates?.length ?? 0) > 0;

  return {
    confidenceLabel: labelForConfidence(result.confidence, hasResult),
    confidence: result.confidence,
    reasons: result.reasons,
    variantId: result.variantId ?? null,
    candidates: result.matchCandidates ?? [],
    extractedName: name,
    extractedCardNumber: cardNumber,
  };
}
