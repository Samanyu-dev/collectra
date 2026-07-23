import crypto from "crypto";
import { StorageAdapter, LocalStorageAdapter, SupabaseStorageAdapter } from "../../../packages/media";

function storageAdapter(): StorageAdapter {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorageAdapter({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: "user-uploads",
    });
  }
  return new LocalStorageAdapter("public/media");
}

/**
 * Stores a scan photo under the user's own storage prefix
 * (users/{userId}/scans/...) — same private-bucket convention as migration
 * uploads (docs/adr/002 §6), since a scan photo is exactly as personal.
 */
export async function storeScanPhoto(
  userId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ key: string; url: string; checksum: string }> {
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const adapter = storageAdapter();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `users/${userId}/scans/${checksum}-${safeName}`;
  await adapter.put(key, buffer, mimeType);
  const url = await adapter.getSignedUrl(key, 60 * 60); // 1 hour — long enough for the scan session, not a permanent public link
  return { key, url, checksum };
}

/** Fetches the raw bytes of a previously-stored scan photo — what the OCR provider actually needs, not a URL. */
export async function getScanPhotoBuffer(storageKey: string): Promise<Buffer> {
  return storageAdapter().get(storageKey);
}
