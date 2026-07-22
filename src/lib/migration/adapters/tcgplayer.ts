import { MigrationAdapter, CanonicalMigrationRow } from './base';

export const TCGPlayerV1Adapter: MigrationAdapter = {
  id: 'tcgplayer_v1',
  name: 'TCGPlayer Export (v1)',
  description: 'Parses standard CSV exports from the TCGPlayer Collection Tracker.',
  
  canHandle(rawPayload: string): boolean {
    // A simple heuristic: TCGPlayer CSVs always have these headers
    return rawPayload.includes('Product Name') && rawPayload.includes('Set Name') && rawPayload.includes('TCGPlayer Id');
  },
  
  normalize(rawRow: Record<string, any>): CanonicalMigrationRow {
    // Example TCGPlayer Row:
    // Quantity, Name, Simple Name, Set Name, Card Number, Set Code, Printing, Condition, Language, Rarity, Product ID, SKU
    // 1, Charizard - Base Set, Charizard, Base Set, 4/102, BS, Normal, Near Mint, English, HoloRare, 42382, 394829
    
    let isFoil = false;
    let isFirstEd = false;
    
    const printing = rawRow['Printing'] || '';
    if (printing.toLowerCase().includes('foil') || printing.toLowerCase().includes('holo')) {
      isFoil = true;
    }
    
    if (rawRow['Name']?.toLowerCase().includes('1st edition')) {
      isFirstEd = true;
    }
    
    const priceStr = rawRow['Market Price'] || rawRow['Purchase Price'];
    const purchasePrice = priceStr ? parseFloat(priceStr.replace(/[^0-9.-]+/g,"")) : undefined;
    
    return {
      name: rawRow['Simple Name'] || rawRow['Name'] || rawRow['Product Name'],
      cardNumber: rawRow['Card Number'],
      setName: rawRow['Set Name'],
      language: rawRow['Language'] || 'English',
      condition: rawRow['Condition'],
      isFoil,
      isFirstEdition: isFirstEd,
      printing: printing,
      quantity: parseInt(rawRow['Quantity'] || '1', 10),
      purchasePrice,
      isGraded: false // TCGPlayer CSV exports are overwhelmingly raw cards
    };
  }
};
