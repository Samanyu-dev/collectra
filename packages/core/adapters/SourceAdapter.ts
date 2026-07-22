export interface Entity {
  id: string;
  [key: string]: any;
}

export interface EntityBatch {
  entities: Entity[];
  nextCursor?: string;
}

export interface VerificationResult {
  isValid: boolean;
  issues?: string[];
}

export interface LicenseMetadata {
  type: string;
  url?: string;
  attributionRequired: boolean;
  attributionText?: string;
}

export interface SourceAdapter {
  sourceId: string;
  supportsIncrementalSync(): boolean;
  fetchChanges(since?: Date): Promise<EntityBatch>;
  verify(entity: Entity): VerificationResult;
  getLicense(): LicenseMetadata;
}
