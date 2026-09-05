import crypto from "crypto";
import { storageAdapter, CATALOG_BUCKET } from "@/ingestion/engine/process-media";

/**
 * Stores an admin-uploaded card photo via the same provider selection as the
 * catalog re-hosting pipeline (process-media.ts) — R2 first. No thumbnail/webp
 * derivatives here: nothing in the app reads MediaVariant rows today, so
 * generating them for a one-off admin upload is pure waste.
 */
export async function storeCardImage(
  cardId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ key: string; checksum: string; provider: string; bucket: string }> {
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const adapter = storageAdapter();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `catalog/${cardId}/${checksum}-${safeName}`;
  await adapter.put(key, buffer, mimeType);
  return { key, checksum, provider: adapter.provider, bucket: CATALOG_BUCKET };
}
