export interface CanonicalMigrationRow {
  // Required Identifiers
  name: string;
  
  // Optional but highly recommended Identifiers
  cardNumber?: string;
  setName?: string;
  franchise?: string;
  game?: string;
  
  // Variant specifics
  language?: string;
  condition?: string;
  isFoil?: boolean;
  isFirstEdition?: boolean;
  printing?: string; // e.g., "Reverse Holo", "Secret Rare"
  
  // Instance metadata (will be mapped directly to Instance table)
  purchasePrice?: number;
  purchaseDate?: Date;
  quantity: number;
  notes?: string;
  
  // Grading
  isGraded: boolean;
  gradingCompany?: string;
  grade?: string;
  certNumber?: string;
}

export interface AdapterMatchResult {
  confidence: number;
  reasons: string[];
  variantId?: string;
  productId?: string;
  matchCandidates?: { variantId: string, confidence: number }[];
}

export interface MigrationAdapter {
  id: string; // e.g., "tcgplayer_v1"
  name: string;
  description: string;
  
  // Returns true if this adapter can parse the given raw CSV/JSON payload
  canHandle(rawPayload: string): boolean;
  
  // Normalizes a raw external row into Collectra's canonical format
  normalize(rawRow: Record<string, any>): CanonicalMigrationRow;
}
