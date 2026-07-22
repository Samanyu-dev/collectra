import { MigrationAdapter, CanonicalMigrationRow } from './base';

function firstOf(row: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && row[found]) return row[found];
  }
  return undefined;
}

/**
 * Best-effort column mapping for a generic spreadsheet export — no fixed
 * schema, so it recognizes a set of common header spellings instead of
 * requiring an exact template.
 */
export const GenericCSVAdapter: MigrationAdapter = {
  id: 'generic_csv',
  name: 'Generic Spreadsheet',
  description: 'Best-effort column mapping for any CSV/XLSX export with recognizable headers.',

  canHandle(): boolean {
    // Fallback adapter — only used when no more specific adapter claims the file.
    return true;
  },

  normalize(rawRow: Record<string, any>): CanonicalMigrationRow {
    const name = firstOf(rawRow, ['Name', 'Card Name', 'Product Name', 'Card', 'Title']) || '';
    const setName = firstOf(rawRow, ['Set', 'Set Name', 'Series']);
    const cardNumber = firstOf(rawRow, ['Number', 'Card Number', 'Card #', '#']);
    const condition = firstOf(rawRow, ['Condition']);
    const language = firstOf(rawRow, ['Language', 'Lang']);
    const printing = firstOf(rawRow, ['Printing', 'Variant', 'Parallel']);
    const priceStr = firstOf(rawRow, ['Purchase Price', 'Price', 'Market Price', 'Cost']);
    const quantityStr = firstOf(rawRow, ['Quantity', 'Qty']);
    const gradeStr = firstOf(rawRow, ['Grade']);
    const gradingCompany = firstOf(rawRow, ['Grading Company', 'Grader']);

    const purchasePrice = priceStr ? parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) : undefined;
    const isFoil = !!printing && /foil|holo/i.test(printing);

    return {
      name,
      cardNumber,
      setName,
      language: language || 'English',
      condition,
      isFoil,
      printing,
      quantity: quantityStr ? parseInt(quantityStr, 10) || 1 : 1,
      purchasePrice: purchasePrice != null && !Number.isNaN(purchasePrice) ? purchasePrice : undefined,
      isGraded: !!gradeStr,
      grade: gradeStr,
      gradingCompany,
    };
  },
};
