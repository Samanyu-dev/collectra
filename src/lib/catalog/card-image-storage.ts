import crypto from "crypto";
import sharp from "sharp";
import { storageAdapter, CATALOG_BUCKET } from "@/ingestion/engine/process-media";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Stretches contrast to the image's actual dynamic range and sharpens
 * slightly — a cheap "make it look like a clean scan" pass on a phone/webcam
 * photo. Not the client-side crop's job (that's plain geometry); this is the
 * one enhancement step, reusing sharp (already a dependency for
 * SharpImageProcessor) rather than hand-rolling pixel math.
 */
async function enhance(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).normalize().sharpen().jpeg({ quality: 90 }).toBuffer();
}

/**
 * Stores an admin-uploaded card photo via the same provider selection as the
 * catalog re-hosting pipeline (process-media.ts) — R2 first. No thumbnail/webp
 * derivatives here: nothing in the app reads MediaVariant rows today, so
 * generating them for a one-off admin upload is pure waste.
 *
 * Keyed by franchise/set/card (not just card) purely for human browsability
 * in the R2 dashboard and so a franchise/set can be bulk-deleted by prefix —
 * nothing in the app resolves an image by guessing this path, Media.storageKey
 * in the DB is always the source of truth.
 */
export async function storeCardImage(
  cardId: string,
  franchiseName: string,
  setId: string,
  fileName: string,
  buffer: Buffer
): Promise<{ key: string; checksum: string; provider: string; bucket: string; filesize: number }> {
  const enhanced = await enhance(buffer);
  const checksum = crypto.createHash("sha256").update(enhanced).digest("hex");
  const adapter = storageAdapter();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "") + ".jpg";
  const key = `catalog/${slugify(franchiseName)}/${setId}/${cardId}/${checksum}-${safeName}`;
  await adapter.put(key, enhanced, "image/jpeg");
  return { key, checksum, provider: adapter.provider, bucket: CATALOG_BUCKET, filesize: enhanced.byteLength };
}
