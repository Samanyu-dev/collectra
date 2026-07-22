import { SourceAdapter, EntityBatch, Entity, VerificationResult, LicenseMetadata } from "./SourceAdapter";
import { parseCSV } from "../util/csv";

export interface GitHubDatasetConfig {
  owner: string;
  repo: string;
  ref?: string; // branch/tag, defaults to "main"
  file: string; // path within the repo
  format: "csv" | "json";
  requiredFields: string[];
  mapRow: (row: Record<string, any>) => Entity | null;
  licenseNote?: string;
}

/**
 * GitHubDatasetAdapter — pulls a single structured data file (JSON/CSV) from
 * a public GitHub repo's raw content, e.g. open checklist/bulk-data repos.
 * Not a repo scraper — targets one known file path per configured dataset.
 */
export class GitHubDatasetAdapter implements SourceAdapter {
  sourceId: string;
  private config: GitHubDatasetConfig;

  constructor(config: GitHubDatasetConfig) {
    this.config = config;
    this.sourceId = `github:${config.owner}/${config.repo}`;
  }

  supportsIncrementalSync(): boolean {
    return false;
  }

  async fetchChanges(_since?: Date): Promise<EntityBatch> {
    const ref = this.config.ref || "main";
    const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${ref}/${this.config.file}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`GitHub raw fetch failed: HTTP ${res.status} on ${url}`);
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
      url: `https://github.com/${this.config.owner}/${this.config.repo}`,
      attributionRequired: true,
      attributionText: this.config.licenseNote || `Data via github.com/${this.config.owner}/${this.config.repo}`,
    };
  }
}
