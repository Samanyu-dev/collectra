import { put, del } from "@vercel/blob";
import { StorageAdapter } from "./StorageAdapter";

/**
 * Server-only. A Blob store's access level (public/private) is fixed at
 * creation — unlike Supabase/Firebase there's no per-object override — so
 * this adapter only targets a single public store. Private uploads
 * (scanner/migration) stay on their existing adapter until a private store
 * is connected to the project (the Vercel CLI can't set a custom env-var
 * prefix for a second store; that step is dashboard-only).
 */
export class VercelBlobAdapter implements StorageAdapter {
  public provider = "vercel-blob";
  private token: string;
  private baseUrl: string;
  private prefix: string;

  constructor(opts: { token: string; baseUrl: string; prefix?: string }) {
    this.token = opts.token;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.prefix = opts.prefix ? `${opts.prefix}/` : "";
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async put(key: string, buffer: Buffer, mimeType?: string): Promise<string> {
    await put(this.fullKey(key), buffer, {
      access: "public",
      token: this.token,
      contentType: mimeType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetch(this.getPublicUrl(key));
    if (!res.ok) throw new Error(`VercelBlobAdapter.get failed for ${key}: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  getPublicUrl(key: string): string {
    return `https://${this.baseUrl}/${this.fullKey(key)}`;
  }

  // This adapter only ever targets a public store — signed/time-limited
  // access isn't meaningful here, same convention as LocalStorageAdapter.
  async getSignedUrl(key: string): Promise<string> {
    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    await del(this.getPublicUrl(key), { token: this.token });
  }
}
