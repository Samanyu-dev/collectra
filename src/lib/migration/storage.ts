import crypto from "crypto";
import { StorageAdapter, LocalStorageAdapter, SupabaseStorageAdapter } from "../../../packages/media";

// Migration uploads are private — no Blob store is wired up for private
// uploads yet (see scanner/storage.ts for why). Stays on Supabase.
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
 * Stores the raw uploaded migration file under the user's own storage prefix
 * (users/{userId}/uploads/...) and returns a signed, time-limited URL — the
 * user-uploads bucket is private (see docs/adr/002-authentication-architecture.md §6).
 */
export async function storeMigrationFile(userId: string, fileName: string, contents: string): Promise<{ url: string; checksum: string }> {
  const buffer = Buffer.from(contents, "utf-8");
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const adapter = storageAdapter();
  const key = `users/${userId}/uploads/${checksum}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await adapter.put(key, buffer, "text/csv");
  const url = await adapter.getSignedUrl(key, 60 * 60 * 24 * 7); // 7 days
  return { url, checksum };
}
