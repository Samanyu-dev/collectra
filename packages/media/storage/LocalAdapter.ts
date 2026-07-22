import * as fs from "fs/promises";
import * as path from "path";
import { StorageAdapter } from "./StorageAdapter";

export class LocalStorageAdapter implements StorageAdapter {
  public provider = "local";
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async put(key: string, buffer: Buffer, mimeType?: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key);
    return await fs.readFile(fullPath);
  }

  getPublicUrl(key: string): string {
    // In Next.js, files in `public/media/` map to `/media/`
    return `/media/${key}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    // No access control in local dev storage — same URL, just documenting intent.
    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await fs.unlink(fullPath);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
}
