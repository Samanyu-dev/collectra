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
  // When true, a resolved image that DIFFERS from what's currently attached
  // REPLACES it (old MediaAttachment removed, orphaned Media row cleaned up)
  // instead of silently accumulating alongside it. Off by default — every
  // other caller (Pokemon/MTG/Yu-Gi-Oh official artwork) wants the original
  // idempotent-skip behavior, since official artwork doesn't change and
  // re-fetching/replacing it on every re-run would be pure churn. Added
  // specifically for eBay listing photos: match-quality logic there can
  // legitimately improve between sweep passes (see the query-matching fix
  // earlier this session), and without this a Card that got a WRONG image
  // attached during a buggy window keeps showing it forever — the intended
  // "usage" scoping combined with an unscoped mediaId check meant a
  // different image for the same entity+usage created a SECOND attachment
  // row rather than either replacing or truly skipping, and the original
  // (wrong) one kept winning display selection via stable-sort tie order.
  replaceExisting?: boolean;
}): Promise<{ mediaId: string; replaced: boolean } | null> {
  const { url, entityType, entityId, usage } = opts;
  if (!url) return null;

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

  if (opts.replaceExisting) {
    // All current attachments for this entity+usage, not just ones pointing
    // at THIS media — this is the difference from the default path below,
    // which only ever checked for a duplicate of the SAME image.
    const currentAttachments = await prisma.mediaAttachment.findMany({
      where: { entityType, entityId, usage },
    });
    const stale = currentAttachments.filter((a) => a.mediaId !== media.id);
    let replaced = false;
    if (stale.length > 0) {
      await prisma.mediaAttachment.deleteMany({ where: { id: { in: stale.map((a) => a.id) } } });
      replaced = true;
      // Best-effort cleanup of now-orphaned stale Media rows — never delete
      // one still referenced by another attachment or a user's scan-match.
      for (const staleMediaId of new Set(stale.map((a) => a.mediaId))) {
        const stillReferenced = await prisma.mediaAttachment.findFirst({ where: { mediaId: staleMediaId } });
        const scanReferenced = await prisma.instance.findFirst({ where: { scanMediaId: staleMediaId } });
        if (!stillReferenced && !scanReferenced) {
          await prisma.media.delete({ where: { id: staleMediaId } }).catch(() => {});
        }
      }
    }
    const alreadyCorrect = currentAttachments.some((a) => a.mediaId === media.id);
    if (!alreadyCorrect) {
      await prisma.mediaAttachment.create({ data: { mediaId: media.id, entityType, entityId, usage } });
    }
    return { mediaId: media.id, replaced };
  }

  const existingAttachment = await prisma.mediaAttachment.findFirst({
    where: { mediaId: media.id, entityType, entityId, usage },
  });
  if (!existingAttachment) {
    await prisma.mediaAttachment.create({
      data: { mediaId: media.id, entityType, entityId, usage },
    });
  }

  return { mediaId: media.id, replaced: false };
}
