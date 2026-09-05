import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { StorageAdapter } from "./StorageAdapter";

/**
 * Server-only. Cloudflare R2, accessed via its S3-compatible API (this app
 * runs as a normal Node.js server, not a Cloudflare Worker, so there's no
 * R2Bucket binding available — the S3 SDK is the only option here).
 *
 * Targets a single public bucket (custom domain or r2.dev), same convention
 * as VercelBlobAdapter — getSignedUrl() just returns the public URL since
 * there's no private-bucket use case in this codebase yet. `region: "auto"`
 * is required by the S3 SDK for R2 even though R2 itself is region-less.
 */
export class R2Adapter implements StorageAdapter {
  public provider = "r2";
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;
  private prefix: string;

  constructor(opts: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBaseUrl: string; prefix?: string }) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
    this.bucket = opts.bucket;
    this.publicBaseUrl = opts.publicBaseUrl.replace(/\/$/, "");
    this.prefix = opts.prefix ? `${opts.prefix}/` : "";
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async put(key: string, buffer: Buffer, mimeType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.fullKey(key),
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.fullKey(key) }));
    const body = res.Body;
    if (!body) throw new Error(`R2Adapter.get failed for ${key}: empty body`);
    const chunks: Buffer[] = [];
    // @ts-expect-error — Body is a Node.js Readable at runtime in this SDK's Node target, despite the broader SdkStream type.
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${this.fullKey(key)}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.fullKey(key) }));
  }
}
