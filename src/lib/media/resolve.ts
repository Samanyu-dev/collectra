import { PrismaClient, Media } from "@prisma/client";
import { StorageAdapter, LocalStorageAdapter, SupabaseStorageAdapter } from "../../../packages/media";

const prisma = new PrismaClient();

// Hybrid Media Source priority order — see prisma/schema.prisma Media.sourceType docs.
// Football database foundation (Scanner-first): a verified real photo of the
// actual physical card outranks even official promotional art, since it's
// provably the real thing rather than generic stock imagery. Order:
// USER_SCAN_VERIFIED > USER_SCAN_PENDING > OFFICIAL > COMMUNITY(verified) >
// OPENLY_LICENSED > HOTLINK/COMMUNITY(unverified) > GENERATED.
const SOURCE_TYPE_PRIORITY: Record<string, number> = {
  USER_UPLOAD: 0, // split into verified(0)/pending(1) in rank() below
  OFFICIAL: 2,
  COMMUNITY: 3,
  OPENLY_LICENSED: 4,
  HOTLINK: 5,
  GENERATED: 6,
};

const VERIFIED_STATUSES = new Set(["AUTO_VERIFIED", "COMMUNITY_VERIFIED", "OFFICIAL"]);

/** Only considers COMMUNITY-sourced media "trustworthy enough" once verified; user scans split into verified/pending tiers. */
function rank(media: Media): number {
  if (media.sourceType === "USER_UPLOAD") {
    const verified = media.moderatorVerified || media.visualVerified || VERIFIED_STATUSES.has(media.verificationStatus);
    return verified ? 0 : 1;
  }
  let base = SOURCE_TYPE_PRIORITY[media.sourceType] ?? 99;
  if (media.sourceType === "COMMUNITY" && !VERIFIED_STATUSES.has(media.verificationStatus)) {
    base += 10; // unverified community submissions sort behind everything else
  }
  return base;
}

/**
 * Picks the best Media for an entity (optionally scoped to a specific usage/image-type),
 * per the hybrid source-priority order. An entity may have many Media rows — this
 * returns the single "primary" one; callers wanting the full gallery should query
 * MediaAttachment directly instead.
 */
export async function getPrimaryMedia(entityType: string, entityId: string, usage?: string): Promise<Media | null> {
  const attachments = await prisma.mediaAttachment.findMany({
    where: { entityType, entityId, ...(usage ? { usage } : {}) },
    include: { media: true },
  });
  if (attachments.length === 0) return null;

  const candidates = attachments.map((a) => a.media).filter((m) => m.status === "READY");
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates[0];
}

export async function getAllMedia(entityType: string, entityId: string, usage?: string): Promise<Media[]> {
  const attachments = await prisma.mediaAttachment.findMany({
    where: { entityType, entityId, ...(usage ? { usage } : {}) },
    include: { media: true },
  });
  return attachments.map((a) => a.media).filter((m) => m.status === "READY");
}

function storageAdapterFor(media: Media): StorageAdapter | null {
  if (media.provider === "supabase") {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return new SupabaseStorageAdapter({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: media.bucket,
    });
  }
  if (media.provider === "local") {
    return new LocalStorageAdapter("public/media");
  }
  return null; // "external" has no adapter — storageKey IS the URL
}

/** Resolves a Media row to the URL the browser should actually load. */
export function mediaUrl(media: Media): string {
  if (media.provider === "external") return media.storageKey;
  const adapter = storageAdapterFor(media);
  if (!adapter) throw new Error(`No storage adapter available for Media ${media.id} (provider=${media.provider})`);
  return adapter.getPublicUrl(media.storageKey);
}

/** Convenience: same-origin URL that always points at the current best asset for an entity. */
export function mediaResolverUrl(entityType: string, entityId: string, usage?: string): string {
  const params = new URLSearchParams({ entityType, entityId, ...(usage ? { usage } : {}) });
  return `/api/media/resolve?${params.toString()}`;
}

export interface SimpleImage {
  url: string;
  type: string; // the MediaAttachment.usage value (e.g. "OFFICIAL_ARTWORK", "THUMBNAIL")
}

/**
 * Batch-fetches images for many entities of one type in a single query and
 * shapes them as `{ url, type }[]` — the flat shape UI components already
 * expect (a holdover from the pre-Media `Image` model's field names, kept so
 * existing components don't need to change). `MediaAttachment` is polymorphic
 * (entityType/entityId strings, not a real FK), so this can't be a Prisma
 * `include` — it's a manual second query grouped by entityId.
 */
export async function getImagesForEntities(entityType: string, entityIds: string[]): Promise<Map<string, SimpleImage[]>> {
  const result = new Map<string, SimpleImage[]>();
  if (entityIds.length === 0) return result;

  const attachments = await prisma.mediaAttachment.findMany({
    where: { entityType, entityId: { in: entityIds } },
    include: { media: true },
  });

  for (const a of attachments) {
    if (a.media.status !== "READY") continue;
    const list = result.get(a.entityId) ?? [];
    list.push({ url: mediaUrl(a.media), type: a.usage });
    result.set(a.entityId, list);
  }

  return result;
}

/** Single-entity convenience wrapper around getImagesForEntities. */
export async function getImagesForEntity(entityType: string, entityId: string): Promise<SimpleImage[]> {
  const map = await getImagesForEntities(entityType, [entityId]);
  return map.get(entityId) ?? [];
}
