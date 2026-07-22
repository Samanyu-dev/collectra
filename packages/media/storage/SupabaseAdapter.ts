import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { StorageAdapter } from "./StorageAdapter";

/**
 * Server-only. Requires the service-role key (never expose to the client) —
 * uploads/deletes must bypass bucket RLS from trusted ingestion/upload code.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  public provider = "supabase";
  private client: SupabaseClient;
  private bucket: string;

  constructor(opts: { url: string; serviceRoleKey: string; bucket: string }) {
    this.client = createClient(opts.url, opts.serviceRoleKey);
    this.bucket = opts.bucket;
  }

  async put(key: string, buffer: Buffer, mimeType?: string): Promise<string> {
    const { error } = await this.client.storage.from(this.bucket).upload(key, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw new Error(`SupabaseStorageAdapter.put failed for ${key}: ${error.message}`);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) throw new Error(`SupabaseStorageAdapter.get failed for ${key}: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  getPublicUrl(key: string): string {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(key, expiresInSeconds);
    if (error || !data) throw new Error(`SupabaseStorageAdapter.getSignedUrl failed for ${key}: ${error?.message}`);
    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw new Error(`SupabaseStorageAdapter.delete failed for ${key}: ${error.message}`);
  }
}
