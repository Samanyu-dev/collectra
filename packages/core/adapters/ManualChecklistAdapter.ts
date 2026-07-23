import { readFile } from "node:fs/promises";
import { SourceAdapter, EntityBatch, Entity, VerificationResult, LicenseMetadata } from "./SourceAdapter";
import { parseCSV } from "../util/csv";

/**
 * Generalizes the one-off curate-topps-match-attax-*.ts scripts into a
 * reusable, manufacturer-agnostic adapter: any Panini/Topps/Daka product's
 * checklist becomes one CSV submission file with a consistent column set,
 * instead of a bespoke regex parser per product. Same SourceAdapter shape
 * Kaggle/GitHub/HuggingFace adapters already use — a future licensed
 * provider or official feed plugs into the same pipeline without a rewrite.
 *
 * Expected CSV columns: number, name, set, team, nationalTeam, insert,
 * parallel, isAuto, isPatch, isRelic, serialTo, cardType, sourceNote.
 * Only number/name/set are required; everything else is optional.
 */
export interface ManualChecklistConfig {
  filePath: string;
  curatorIdentifier: string; // e.g. "curator:panini-adrenalyn-xl-2025-26"
  curatorName: string; // human-readable description for the DataSource row
}

const REQUIRED_COLUMNS = ["number", "name", "set"];
const VALID_NUMBER_RE = /^[A-Za-z0-9. /#-]+$/;

function toBool(v: string | undefined): boolean {
  const normalized = v?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export class ManualChecklistAdapter implements SourceAdapter {
  sourceId: string;
  private config: ManualChecklistConfig;

  constructor(config: ManualChecklistConfig) {
    this.config = config;
    this.sourceId = config.curatorIdentifier;
  }

  supportsIncrementalSync(): boolean {
    return false; // a checklist submission is re-diffed wholesale each run, not incrementally polled
  }

  async fetchChanges(): Promise<EntityBatch> {
    const text = await readFile(this.config.filePath, "utf-8");
    const rows = parseCSV(text);
    const entities: Entity[] = rows.map((row, i) => ({
      id: row.number || `row-${i}`,
      number: row.number?.trim(),
      name: row.name?.trim(),
      team: row.team?.trim() || undefined,
      nationalTeam: row.nationalTeam?.trim() || undefined,
      set: row.set?.trim(),
      insert: row.insert?.trim() || undefined,
      parallel: row.parallel?.trim() || undefined,
      isAuto: toBool(row.isAuto),
      isPatch: toBool(row.isPatch),
      isRelic: toBool(row.isRelic),
      serialTo: row.serialTo ? parseInt(row.serialTo, 10) : undefined,
      cardType: row.cardType?.trim() || "Player",
      sourceNote: row.sourceNote?.trim() || undefined,
    }));
    return { entities };
  }

  /** Row-level validation — numbering format and required fields. Duplicate detection (within-file and against the DB) is a cross-row concern handled by the CLI's own "validate" step, not per-row here. */
  verify(entity: Entity): VerificationResult {
    const issues: string[] = [];
    for (const field of REQUIRED_COLUMNS) {
      if (!entity[field]) issues.push(`Missing required field: ${field}`);
    }
    if (entity.number && !VALID_NUMBER_RE.test(entity.number)) {
      issues.push(`Card number "${entity.number}" contains unexpected characters`);
    }
    return { isValid: issues.length === 0, issues: issues.length ? issues : undefined };
  }

  getLicense(): LicenseMetadata {
    return {
      type: "COMMUNITY",
      attributionRequired: true,
      attributionText: this.config.curatorName,
    };
  }
}
