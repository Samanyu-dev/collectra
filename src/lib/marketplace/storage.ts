import crypto from "crypto";
import { StorageAdapter, LocalStorageAdapter, SupabaseStorageAdapter } from "../../../packages/media";

function storageAdapter(): StorageAdapter {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorageAdapter({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: "marketplace-media",
    });
  }
  // LocalStorageAdapter.getPublicUrl() always resolves to /media/... regardless
  // of the base path given to it — matching "public/media" here (same as every
  // other local-fallback adapter in this codebase) keeps that URL correct,
  // rather than silently producing a broken link under a different base path.
  return new LocalStorageAdapter("public/media");
}

/**
 * Stores a listing photo under a listing-scoped key, in a real separate
 * public bucket (ADR 005 §6/Security & Authorization) — not the private
 * `users/{userId}/...` bucket every other upload in this app uses. A
 * listing photo is meant to be publicly visible while the listing is
 * ACTIVE, so its storage location, not a state-dependent policy, is what
 * makes it public.
 */
export async function storeListingPhoto(
  listingId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ key: string; url: string; checksum: string }> {
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const adapter = storageAdapter();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `listings/${listingId}/${checksum}-${safeName}`;
  await adapter.put(key, buffer, mimeType);
  const url = adapter.getPublicUrl(key);
  return { key, url, checksum };
}
