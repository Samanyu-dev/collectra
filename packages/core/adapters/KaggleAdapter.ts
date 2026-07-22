import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SourceAdapter, EntityBatch, Entity, VerificationResult, LicenseMetadata } from "./SourceAdapter";
import { parseCSV } from "../util/csv";

const execFileAsync = promisify(execFile);

export interface KaggleDatasetConfig {
  /** owner/dataset-slug, e.g. "some-user/topps-baseball-checklist" */
  slug: string;
  /** Required fields a row must have (after mapping) to be considered valid */
  requiredFields: string[];
  /** Maps a raw parsed CSV row to a graph-ready Entity */
  mapRow: (row: Record<string, string>) => Entity | null;
  licenseNote?: string;
}

/**
 * KaggleAdapter — downloads a specific Kaggle dataset via Kaggle's official
 * REST API (Bearer token auth, KAGGLE_API_TOKEN env var) and parses CSV
 * files inside it. Never scrapes kaggle.com directly.
 *
 * Uses the REST API rather than the `kaggle` pip CLI because the CLI (as of
 * 1.7.4.5) only supports legacy username+key kaggle.json auth, not the
 * newer opaque API token Kaggle now issues from Account settings.
 */
export class KaggleAdapter implements SourceAdapter {
  sourceId: string;
  private config: KaggleDatasetConfig;

  constructor(config: KaggleDatasetConfig) {
    this.config = config;
    this.sourceId = `kaggle:${config.slug}`;
  }

  supportsIncrementalSync(): boolean {
    return false; // Kaggle datasets don't expose a reliable "since" cursor; we re-diff on each sync
  }

  private authHeaders(): Record<string, string> {
    const token = process.env.KAGGLE_API_TOKEN;
    if (!token) throw new Error("KAGGLE_API_TOKEN is not set");
    return { Authorization: `Bearer ${token}` };
  }

  async fetchChanges(_since?: Date): Promise<EntityBatch> {
    const dest = await mkdtemp(join(tmpdir(), "collectra-kaggle-"));
    const zipPath = join(dest, "dataset.zip");

    const res = await fetch(`https://www.kaggle.com/api/v1/datasets/download/${this.config.slug}`, {
      headers: this.authHeaders(),
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Kaggle download failed: HTTP ${res.status} for ${this.config.slug}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(zipPath, buffer);

    await execFileAsync("unzip", ["-o", zipPath, "-d", dest]);

    const files = await readdir(dest);
    const csvFiles = files.filter((f) => f.toLowerCase().endsWith(".csv"));

    const entities: Entity[] = [];

    for (const file of csvFiles) {
      const text = await readFile(join(dest, file), "utf-8");
      const rows = parseCSV(text);
      for (const row of rows) {
        const entity = this.config.mapRow(row);
        if (entity) entities.push(entity);
      }
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
      url: `https://www.kaggle.com/datasets/${this.config.slug}`,
      attributionRequired: true,
      attributionText: this.config.licenseNote || `Data via Kaggle dataset ${this.config.slug}`,
    };
  }
}
