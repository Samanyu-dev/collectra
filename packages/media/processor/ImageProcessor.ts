import sharp from "sharp";
import { encode as encodeBlurhash } from "blurhash";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface IntelligentMetadata {
  blurhash: string;
  averageColor: string; // "#rrggbb"
  palette: string[]; // JSON-serializable array of "#rrggbb", dominant-first
  brightness: number; // 0-1
  contrast: number; // 0-1
  perceptualHash: string; // 64-bit dHash, hex-encoded
}

export interface ImageProcessor {
  /**
   * Returns metadata about the original buffer
   */
  getMetadata(buffer: Buffer): Promise<{ width?: number; height?: number; format?: string }>;

  /**
   * Generates a constrained thumbnail preserving aspect ratio
   */
  generateThumbnail(buffer: Buffer, maxWidth?: number): Promise<ProcessedImage>;

  /**
   * Converts the image to WebP format for modern web serving
   */
  toWebP(buffer: Buffer): Promise<ProcessedImage>;

  /**
   * Converts the image to AVIF format for next-gen web serving
   */
  toAVIF(buffer: Buffer): Promise<ProcessedImage>;

  /**
   * Populates Media's blurhash/averageColor/palette/brightness/contrast/perceptualHash
   */
  analyze(buffer: Buffer): Promise<IntelligentMetadata>;
}

export class SharpImageProcessor implements ImageProcessor {
  async getMetadata(buffer: Buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  }

  async generateThumbnail(buffer: Buffer, maxWidth = 400): Promise<ProcessedImage> {
    const s = sharp(buffer).resize(maxWidth, null, { withoutEnlargement: true });
    const { data, info } = await s.toBuffer({ resolveWithObject: true });
    
    return {
      buffer: data,
      width: info.width,
      height: info.height,
      format: info.format,
      size: info.size
    };
  }

  async toWebP(buffer: Buffer): Promise<ProcessedImage> {
    const s = sharp(buffer).webp({ quality: 80 });
    const { data, info } = await s.toBuffer({ resolveWithObject: true });
    
    return {
      buffer: data,
      width: info.width,
      height: info.height,
      format: info.format,
      size: info.size
    };
  }

  async toAVIF(buffer: Buffer): Promise<ProcessedImage> {
    const s = sharp(buffer).avif({ quality: 65 });
    const { data, info } = await s.toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: info.width,
      height: info.height,
      format: info.format,
      size: info.size
    };
  }

  async analyze(buffer: Buffer): Promise<IntelligentMetadata> {
    const [blurhash, averageColor, palette, { brightness, contrast }, perceptualHash] = await Promise.all([
      this.computeBlurhash(buffer),
      this.computeAverageColor(buffer),
      this.computePalette(buffer),
      this.computeBrightnessContrast(buffer),
      this.computePerceptualHash(buffer),
    ]);

    return { blurhash, averageColor, palette, brightness, contrast, perceptualHash };
  }

  private async computeBlurhash(buffer: Buffer): Promise<string> {
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return encodeBlurhash(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  }

  private toHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  }

  private async computeAverageColor(buffer: Buffer): Promise<string> {
    const { data } = await sharp(buffer).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
    return this.toHex(data[0], data[1], data[2]);
  }

  private async computePalette(buffer: Buffer, swatches = 5): Promise<string[]> {
    const size = 16;
    const { data, info } = await sharp(buffer)
      .resize(size, size, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let i = 0; i + channels <= data.length; i += channels) {
      // Quantize to reduce near-duplicate colors dominating distinct buckets
      const r = data[i] - (data[i] % 32);
      const g = data[i + 1] - (data[i + 1] % 32);
      const b = data[i + 2] - (data[i + 2] % 32);
      const key = `${r},${g},${b}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.count++;
      else buckets.set(key, { count: 1, r, g, b });
    }

    return Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, swatches)
      .map((b) => this.toHex(b.r, b.g, b.b));
  }

  private async computeBrightnessContrast(buffer: Buffer): Promise<{ brightness: number; contrast: number }> {
    const stats = await sharp(buffer).stats();
    const channels = stats.channels.slice(0, 3); // ignore alpha if present
    const brightness = channels.reduce((sum, c) => sum + c.mean, 0) / channels.length / 255;
    const contrast = channels.reduce((sum, c) => sum + c.stdev, 0) / channels.length / 255;
    return { brightness, contrast };
  }

  /** 64-bit difference hash (dHash) — cheap, rotation-sensitive perceptual hash good enough for near-duplicate detection. */
  private async computePerceptualHash(buffer: Buffer): Promise<string> {
    const { data } = await sharp(buffer)
      .resize(9, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = data[row * 9 + col];
        const right = data[row * 9 + col + 1];
        bits += left > right ? "1" : "0";
      }
    }

    let hex = "";
    for (let i = 0; i < bits.length; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  }
}
