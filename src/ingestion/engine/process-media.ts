import { prisma } from "./prisma";
import { SharpImageProcessor } from "../../../packages/media/processor/ImageProcessor";
import { StorageAdapter, SupabaseStorageAdapter, VercelBlobAdapter, AppwriteAdapter } from "../../../packages/media";

const processor = new SharpImageProcessor();
const CATALOG_BUCKET = "catalog-media";

// A card image narrower than this on its longest usable dimension isn't
// worth promoting as "the" displayed image for a card — quality gate, not a
// hard rejection (the row still gets its metadata populated either way).
const MIN_ACCEPTABLE_WIDTH = 300;

// Bits differing out of a 64-bit hash — small enough to catch the same
// image re-published at a different URL, large enough not to collide two
// genuinely different (but similarly-composed) card photos.
const HAMMING_DUPLICATE_THRESHOLD = 5;

function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (diff) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance;
}

/**
 * Finds an existing processed Media row whose perceptualHash is within a
 * small Hamming distance — catches the same image published at two
 * different URLs, which the existing URL-hash dedup (Media.originalHash)
 * misses entirely (the football database audit's core media finding).
 *
 * Linear scan over already-processed rows — fine at today's scale (starts
 * at zero processed rows); revisit with a bucketed/LSH index if the
 * processed-media count grows into the tens of thousands.
 */
export async function findDuplicateByPerceptualHash(hash: string, excludeId?: string): Promise<{ id: string } | null> {
  const candidates = await prisma.media.findMany({
    where: { perceptualHash: { not: null }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, perceptualHash: true },
  });
  for (const c of candidates) {
    if (c.perceptualHash && hammingDistanceHex(hash, c.perceptualHash) <= HAMMING_DUPLICATE_THRESHOLD) {
      return { id: c.id };
    }
  }
  return null;
}

// Provider history: Supabase Storage hit its plan quota, so new catalog
// media moved to Vercel Blob; Blob's own free tier is now the constraint
// (2026-08-07 — confirmed via a real failed put(), not just a config
// check), so Appwrite is the new default write provider going forward, per
// explicit user decision (this was already planned as the fallback — see
// PROJECT_STATE.md). Media already re-hosted on Supabase or Blob keeps its
// existing storageKey/provider/URL untouched — this only decides where the
// *next* upload lands; every read path selects the adapter per-row via
// Media.provider (see src/lib/media/resolve.ts), so old and new media
// coexist with no migration needed.
function storageAdapter(): StorageAdapter {
  if (process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && process.env.APPWRITE_API_KEY && process.env.APPWRITE_BUCKET_ID) {
    return new AppwriteAdapter({
      endpoint: process.env.APPWRITE_ENDPOINT,
      projectId: process.env.APPWRITE_PROJECT_ID,
      apiKey: process.env.APPWRITE_API_KEY,
      bucketId: process.env.APPWRITE_BUCKET_ID,
    });
  }
  if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_PUBLIC_BASE_URL) {
    return new VercelBlobAdapter({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      baseUrl: process.env.BLOB_PUBLIC_BASE_URL,
      prefix: CATALOG_BUCKET,
    });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID/APPWRITE_API_KEY/APPWRITE_BUCKET_ID, or BLOB_READ_WRITE_TOKEN/BLOB_PUBLIC_BASE_URL, or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY required to re-host processed media"
    );
  }
  return new SupabaseStorageAdapter({
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: CATALOG_BUCKET,
  });
}

// No timeout here previously meant a dead/slow source URL (eBay listing
// images especially — sellers' CDNs vary wildly in reliability) could hang
// indefinitely instead of failing fast; confirmed live during the Holiday
// Basketball backfill (2026-08-07) as a real contributor to per-item time,
// on top of the ~40% of eBay image URLs that fail outright. One retry after
// a short backoff catches the transient case; the timeout bounds the worst
// case for a truly dead URL.
async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`unreachable`); // satisfies TS control-flow analysis — the loop above always returns or throws
}

async function upsertVariant(mediaId: string, type: string, image: { buffer: Buffer; width: number; height: number; size: number }, key: string) {
  const existing = await prisma.mediaVariant.findFirst({ where: { mediaId, type } });
  if (existing) {
    await prisma.mediaVariant.update({
      where: { id: existing.id },
      data: { storageKey: key, width: image.width, height: image.height, filesize: image.size },
    });
  } else {
    await prisma.mediaVariant.create({
      data: { mediaId, type, storageKey: key, width: image.width, height: image.height, filesize: image.size },
    });
  }
}

export interface ProcessMediaResult {
  status: "processed" | "duplicate" | "failed";
  mediaId: string;
  duplicateOfId?: string;
  error?: string;
}

/**
 * Downloads, analyzes, dedupes (by content, not URL), re-hosts, and
 * generates derivatives for one Media row still awaiting processing. This is
 * the pipeline stage that's been entirely dead code until now — every image
 * ingested so far is an unfetched external hotlink with perceptualHash,
 * width, height, blurhash, etc. all permanently null (see the football
 * database audit).
 */
export async function processMediaRow(mediaId: string): Promise<ProcessMediaResult> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return { status: "failed", mediaId, error: "not found" };
  if (media.provider !== "external") return { status: "processed", mediaId }; // already re-hosted, nothing to do

  try {
    const buffer = await download(media.storageKey);
    const metadata = await processor.getMetadata(buffer);
    const analysis = await processor.analyze(buffer);

    const duplicate = await findDuplicateByPerceptualHash(analysis.perceptualHash, media.id);
    if (duplicate) {
      // Don't create a second real asset for an image that already exists —
      // repoint this row's attachments at the canonical Media and archive it.
      await prisma.mediaAttachment.updateMany({ where: { mediaId: media.id }, data: { mediaId: duplicate.id } });
      await prisma.media.update({ where: { id: media.id }, data: { status: "ARCHIVED" } });
      return { status: "duplicate", mediaId, duplicateOfId: duplicate.id };
    }

    const format = metadata.format ?? "jpeg";
    const adapter = storageAdapter();
    const originalKey = `catalog/${media.id}/original.${format}`;
    await adapter.put(originalKey, buffer, `image/${format}`);

    const [thumbnail, webp] = await Promise.all([processor.generateThumbnail(buffer), processor.toWebP(buffer)]);
    const thumbnailKey = `catalog/${media.id}/thumbnail.jpg`;
    const webpKey = `catalog/${media.id}/image.webp`;
    await Promise.all([adapter.put(thumbnailKey, thumbnail.buffer, "image/jpeg"), adapter.put(webpKey, webp.buffer, "image/webp")]);
    await Promise.all([
      upsertVariant(media.id, "thumbnail", thumbnail, thumbnailKey),
      upsertVariant(media.id, "webp", webp, webpKey),
    ]);

    await prisma.media.update({
      where: { id: media.id },
      data: {
        provider: adapter.provider,
        bucket: CATALOG_BUCKET,
        storageKey: originalKey,
        width: metadata.width,
        height: metadata.height,
        mimeType: `image/${format}`,
        filesize: buffer.byteLength,
        blurhash: analysis.blurhash,
        averageColor: analysis.averageColor,
        palette: JSON.stringify(analysis.palette),
        brightness: analysis.brightness,
        contrast: analysis.contrast,
        perceptualHash: analysis.perceptualHash,
        checksumVerified: true,
        dimensionsVerified: !!(metadata.width && metadata.width >= MIN_ACCEPTABLE_WIDTH),
        // A row that failed once (status flipped to FAILED in the catch
        // block below) and then succeeded on a later retry was never being
        // un-flagged here — this update touched every other field but not
        // status, so a fully re-hosted, perfectly good image stayed
        // permanently invisible (getPrimaryMedia/getAllMedia both filter on
        // status === "READY"). Real impact found live: 23 EBAY_LISTING_PHOTO
        // rows with provider=supabase (successfully re-hosted) stuck at
        // status=FAILED from an earlier attempt.
        status: "READY",
      },
    });

    return { status: "processed", mediaId };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[process-media] failed for ${mediaId}:`, error);
    // Mark FAILED (same convention image-verifier.ts already uses for dead
    // links) so this row stops being picked up by future processing batches.
    await prisma.media.update({ where: { id: media.id }, data: { status: "FAILED" } }).catch(() => {});
    return { status: "failed", mediaId, error };
  }
}
