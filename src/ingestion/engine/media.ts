import crypto from "node:crypto";
import { prisma } from "./prisma";

const dataSourceCache = new Map<string, string>();

// Postgres upsert (INSERT ... ON CONFLICT DO UPDATE) isn't fully immune to a
// unique-constraint race when many concurrent callers hit the same row
// before it exists yet (see GraphBuilder.upsertSafe for the same pattern) —
// batch ingestion (pokemon fetch-all.ts) triggers this constantly since
// every card in the first batch races to create the same DataSource/Media row.
const isUniqueConstraintError = (e: any) => e?.code === "P2002";

export async function getOrCreateDataSource(identifier: string, kind: string): Promise<string> {
  if (dataSourceCache.has(identifier)) return dataSourceCache.get(identifier)!;
  let ds;
  try {
    ds = await prisma.dataSource.upsert({
      where: { identifier },
      update: {},
      create: {
        identifier,
        kind,
        name: identifier,
        trustLevel: kind === "OFFICIAL_API" ? 100 : 10,
        lastSyncedAt: new Date(),
      },
    });
  } catch (e: any) {
    if (!isUniqueConstraintError(e)) throw e;
    ds = await prisma.dataSource.findUnique({ where: { identifier } });
    if (!ds) throw e;
  }
  dataSourceCache.set(identifier, ds.id);
  return ds.id;
}

/**
 * Attaches a hotlinked (not downloaded/redistributed) image to an entity.
 * Idempotent: safe to call repeatedly for the same url/entity/usage across re-runs.
 */
const KIND_DEFAULTS: Record<string, { sourceType: string; verificationStatus: string; license: string }> = {
  OFFICIAL_API: { sourceType: "OFFICIAL", verificationStatus: "OFFICIAL", license: "OFFICIAL" },
  KAGGLE: { sourceType: "OPENLY_LICENSED", verificationStatus: "PENDING", license: "COMMUNITY" },
  HUGGINGFACE: { sourceType: "OPENLY_LICENSED", verificationStatus: "PENDING", license: "COMMUNITY" },
  GITHUB: { sourceType: "OPENLY_LICENSED", verificationStatus: "PENDING", license: "COMMUNITY" },
  COMMUNITY: { sourceType: "COMMUNITY", verificationStatus: "PENDING", license: "COMMUNITY" },
};

export async function attachHotlinkImage(opts: {
  url?: string | null;
  entityType: string;
  entityId: string;
  usage: string;
  sourceIdentifier: string; // e.g. "pokemontcg-api", "kaggle:owner/slug"
  sourceKind?: string; // OFFICIAL_API (default), KAGGLE, HUGGINGFACE, GITHUB, COMMUNITY
}): Promise<void> {
  const { url, entityType, entityId, usage } = opts;
  if (!url) return;

  const kind = opts.sourceKind || "OFFICIAL_API";
  const defaults = KIND_DEFAULTS[kind] || KIND_DEFAULTS.OFFICIAL_API;
  const dataSourceId = await getOrCreateDataSource(opts.sourceIdentifier, kind);
  const originalHash = crypto.createHash("sha256").update(url).digest("hex");

  let media;
  try {
    media = await prisma.media.upsert({
      where: { originalHash },
      update: {},
      create: {
        originalHash,
        storageKey: url,
        bucket: "external",
        provider: "external",
        status: "READY",
        source: kind === "OFFICIAL_API" ? "API" : "IMPORT",
        license: defaults.license,
        sourceType: defaults.sourceType,
        sourceName: opts.sourceIdentifier,
        sourceUrl: url,
        verificationStatus: defaults.verificationStatus,
        dataSourceId,
      },
    });
  } catch (e: any) {
    if (!isUniqueConstraintError(e)) throw e;
    const existing = await prisma.media.findUnique({ where: { originalHash } });
    if (!existing) throw e;
    media = existing;
  }

  const existingAttachment = await prisma.mediaAttachment.findFirst({
    where: { mediaId: media.id, entityType, entityId, usage },
  });
  if (!existingAttachment) {
    await prisma.mediaAttachment.create({
      data: { mediaId: media.id, entityType, entityId, usage },
    });
  }
}
