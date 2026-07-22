import { SourceAdapter, EntityBatch, Entity, VerificationResult, LicenseMetadata } from "./SourceAdapter";

/**
 * TcdbAdapter (Trading Card Database)
 * 
 * Implements the SourceAdapter interface to ingest TCG/Sports cards from tcdb.com.
 * Note: TCDB employs strict bot protection (e.g. returning 403 Forbidden to standard HTTP clients).
 * This adapter will require a stealth headless browser (like Puppeteer with stealth plugin) 
 * or an authorized API key if they provide one in the future.
 */
export class TcdbAdapter implements SourceAdapter {
  sourceId = "tcdb";

  supportsIncrementalSync(): boolean {
    return true; // We can track "Latest Additions" or specific set updates
  }

  async fetchChanges(since?: Date): Promise<EntityBatch> {
    console.log(`[TcdbAdapter] Fetching changes from tcdb.com (since: ${since?.toISOString() || 'ALL_TIME'})`);
    
    // TODO: Implement actual TCDB extraction logic.
    // Given the 403 Forbidden response on basic HTTP requests, this requires a 
    // specialized scraping approach (e.g. Playwright + Stealth) to parse the HTML tables.

    // Mock payload to validate pipeline flow
    const mockEntities: Entity[] = [
      {
        id: "tcdb_12345",
        type: "CARD",
        name: "Ken Griffey Jr.",
        cardNumber: "1",
        releaseYear: 1989,
        category: "SPORTS",
        setName: "Upper Deck",
        imageUrl: "https://www.tcdb.com/Images/Cards/Baseball/12345/12345-1.jpg"
      }
    ];

    return {
      entities: mockEntities,
      nextCursor: undefined
    };
  }

  verify(entity: Entity): VerificationResult {
    // TCDB entries must at least have a name and set mapping
    if (!entity.name || !entity.setName) {
      return { isValid: false, issues: ["Missing core TCDB metadata (name/setName)"] };
    }
    return { isValid: true };
  }

  getLicense(): LicenseMetadata {
    return {
      type: "COMMUNITY",
      attributionRequired: true,
      url: "https://www.tcdb.com",
      attributionText: "Data sourced from Trading Card Database (TCDB)"
    };
  }
}
