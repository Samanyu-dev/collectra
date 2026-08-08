import { Client, Storage, Tokens } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createHash } from "crypto";
import { StorageAdapter } from "./StorageAdapter";

/**
 * Server-only. Appwrite Storage has no path-like keys — fileId must be
 * <=36 chars, alphanumeric/./-/_ only, no slashes — unlike Supabase/S3/
 * Vercel Blob, which all accept this codebase's path-style keys (e.g.
 * "catalog-media/card/xyz.jpg") directly. This adapter deterministically
 * derives a valid Appwrite fileId from the given key (sha1, truncated to
 * 36 hex chars) so the same key always resolves to the same file across
 * separate adapter instances/invocations — required because every caller
 * of `.put()` in this codebase discards its return value and later calls
 * get/getPublicUrl/delete with the ORIGINAL key it already had (confirmed
 * via process-media.ts and lib/marketplace/storage.ts), not whatever this
 * method returns.
 */
export class AppwriteAdapter implements StorageAdapter {
  public provider = "appwrite";
  private storage: Storage;
  private tokens: Tokens;
  private bucketId: string;
  private endpoint: string;
  private projectId: string;

  constructor(opts: { endpoint: string; projectId: string; apiKey: string; bucketId: string }) {
    const client = new Client().setEndpoint(opts.endpoint).setProject(opts.projectId).setKey(opts.apiKey);
    this.storage = new Storage(client);
    this.tokens = new Tokens(client);
    this.bucketId = opts.bucketId;
    this.endpoint = opts.endpoint.replace(/\/$/, "");
    this.projectId = opts.projectId;
  }

  private fileIdFor(key: string): string {
    return createHash("sha1").update(key).digest("hex").slice(0, 36);
  }

  async put(key: string, buffer: Buffer, mimeType?: string): Promise<string> {
    const fileId = this.fileIdFor(key);
    const filename = key.split("/").pop() || fileId;
    const file = InputFile.fromBuffer(buffer, filename);
    try {
      await this.storage.createFile({ bucketId: this.bucketId, fileId, file });
    } catch (e: unknown) {
      // Appwrite has no "replace content at this id" op — 409 (already
      // exists) means overwrite semantics (matches the other adapters'
      // upsert:true / allowOverwrite:true): delete then recreate.
      const err = e as { code?: number };
      if (err.code === 409) {
        await this.storage.deleteFile({ bucketId: this.bucketId, fileId });
        await this.storage.createFile({ bucketId: this.bucketId, fileId, file });
      } else {
        throw e;
      }
    }
    void mimeType; // Appwrite infers content-type from the upload itself; no explicit param on createFile.
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const fileId = this.fileIdFor(key);
    const arrayBuffer = await this.storage.getFileDownload({ bucketId: this.bucketId, fileId });
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }

  getPublicUrl(key: string): string {
    const fileId = this.fileIdFor(key);
    return `${this.endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${this.projectId}`;
  }

  // Bucket is left with default (non-public) permissions — see this
  // codebase's storage-provider notes — so a real client-facing URL needs a
  // short-lived file token appended, not just the bare view URL.
  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const fileId = this.fileIdFor(key);
    const token = await this.tokens.createFileToken({
      bucketId: this.bucketId,
      fileId,
      expire: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    });
    return `${this.getPublicUrl(key)}&token=${(token as { secret: string }).secret}`;
  }

  async delete(key: string): Promise<void> {
    const fileId = this.fileIdFor(key);
    await this.storage.deleteFile({ bucketId: this.bucketId, fileId });
  }
}
