import { SourceAdapter, EntityBatch, Entity, VerificationResult, LicenseMetadata } from "./SourceAdapter";
import { parseCSV } from "../util/csv";

export interface HuggingFaceDatasetConfig {
  /** org/dataset-name on huggingface.co */
  repo: string;
  /** File path within the dataset repo, e.g. "data/checklist.csv" */
  file: string;
  format: "csv" | "json";
  requiredFields: string[];
  mapRow: (row: Record<string, any>) => Entity | null;
  licenseNote?: string;
}

/**
 * HuggingFaceAdapter — downloads a single file from a public HF dataset repo
 * via the official resolve URL. Gated/private datasets need HF_TOKEN (not
 * required for public datasets, which is the default target).
 */
export class HuggingFaceAdapter implements SourceAdapter {
  sourceId: string;
  private config: HuggingFaceDatasetConfig;

  constructor(config: HuggingFaceDatasetConfig) {
    this.config = config;
    this.sourceId = `huggingface:${config.repo}`;
  }

  supportsIncrementalSync(): boolean {
    return false;
  }

  async fetchChanges(_since?: Date): Promise<EntityBatch> {
    const url = `https://huggingface.co/datasets/${this.config.repo}/resolve/main/${this.config.file}`;
    const headers: Record<string, string> = {};
    if (process.env.HF_TOKEN) headers["Authorization"] = `Bearer ${process.env.HF_TOKEN}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HuggingFace fetch failed: HTTP ${res.status} on ${url}`);
    const text = await res.text();

    const rawRows: Record<string, any>[] =
      this.config.format === "csv" ? parseCSV(text) : JSON.parse(text);

    const entities: Entity[] = [];
    for (const row of rawRows) {
      const entity = this.config.mapRow(row);
      if (entity) entities.push(entity);
    }

    return { entities };
  }

  verify(entity: Entity): VerificationResult {
    const issues = this.config.requiredFields.filter((f) => !entity[f]);
    if (issues.length > 0) {
      return { isValid: false, issues: issues.map((f) => `Missing required field: ${f}`) };
    }
    return { isValid: true };
  }

  getLicense(): LicenseMetadata {
    return {
      type: "OPENLY_LICENSED",
      url: `https://huggingface.co/datasets/${this.config.repo}`,
      attributionRequired: true,
      attributionText: this.config.licenseNote || `Data via HuggingFace dataset ${this.config.repo}`,
    };
  }
}
