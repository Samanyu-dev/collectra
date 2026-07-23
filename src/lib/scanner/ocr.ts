// Cloud OCR boundary (docs/adr/004-scanner-architecture.md §3) — deliberately
// the ONLY place that knows which OCR provider is in use. Swapping providers
// later means implementing OcrProvider once, never touching the matching,
// confidence, or UI layers that consume its output.

export interface OcrTextBlock {
  text: string;
  confidence: number | null; // 0-1 as reported by the provider, or null if this provider doesn't report one — never a guessed number standing in for a real one
}

export interface OcrProvider {
  id: string; // e.g. "google-cloud-vision", "ocr-space"
  extractText(imageBuffer: Buffer): Promise<OcrTextBlock[]>;
}

export class OcrNotConfiguredError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "No OCR provider is configured. Set OCR_SPACE_API_KEY or GOOGLE_CLOUD_VISION_API_KEY " +
          "(see docs/adr/004-scanner-architecture.md §3) before scanning can identify anything."
    );
    this.name = "OcrNotConfiguredError";
  }
}

class NotConfiguredOcrProvider implements OcrProvider {
  id = "not-configured";
  async extractText(): Promise<OcrTextBlock[]> {
    throw new OcrNotConfiguredError();
  }
}

interface VisionSymbol {
  text: string;
}
interface VisionWord {
  symbols?: VisionSymbol[];
}
interface VisionParagraph {
  confidence?: number;
  words?: VisionWord[];
}
interface VisionBlock {
  paragraphs?: VisionParagraph[];
}
interface VisionAnnotateResponse {
  responses?: Array<{
    fullTextAnnotation?: { pages?: Array<{ blocks?: VisionBlock[] }> };
    error?: { message?: string };
  }>;
}

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

function paragraphText(paragraph: VisionParagraph): string {
  return (paragraph.words ?? [])
    .map((w) => (w.symbols ?? []).map((s) => s.text).join(""))
    .join(" ")
    .trim();
}

/**
 * Google Cloud Vision, chosen for V1 (ADR 004 §3/Resolved decisions):
 * DOCUMENT_TEXT_DETECTION rather than plain TEXT_DETECTION because it's the
 * feature type that returns per-paragraph confidence scores — the legacy
 * TEXT_DETECTION annotations don't carry a numeric confidence at all, and
 * this scanner's whole design leans on confidence being real, not assumed.
 * Emits one OcrTextBlock per paragraph (not per block): Vision's "blocks"
 * are whole visual regions that can bundle several lines together, which
 * breaks identify.ts's per-block regexes (e.g. a card-number check that
 * expects an entire block to be just the number) — paragraphs are closer to
 * single lines and match what those heuristics were written against.
 * Uses the plain REST endpoint with an API key rather than the
 * @google-cloud/vision client library + service-account JSON: one fetch
 * call, no extra dependency, no credential file to manage in a serverless
 * deployment — the same "prefer the documented HTTP surface" choice already
 * made for the Pokémon TCG API client.
 */
export class GoogleVisionProvider implements OcrProvider {
  id = "google-cloud-vision";

  constructor(private readonly apiKey: string) {}

  async extractText(imageBuffer: Buffer): Promise<OcrTextBlock[]> {
    const res = await fetch(`${VISION_ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBuffer.toString("base64") },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Google Cloud Vision request failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as VisionAnnotateResponse;
    const first = json.responses?.[0];
    if (first?.error) {
      throw new Error(`Google Cloud Vision error: ${first.error.message ?? "unknown error"}`);
    }

    const blocks = first?.fullTextAnnotation?.pages?.flatMap((page) => page.blocks ?? []) ?? [];
    const paragraphs = blocks.flatMap((block) => block.paragraphs ?? []);
    return paragraphs
      .map((paragraph) => ({ text: paragraphText(paragraph), confidence: paragraph.confidence ?? null }))
      .filter((b) => b.text.length > 0);
  }
}

interface OcrSpaceLine {
  LineText?: string;
}
interface OcrSpaceParsedResult {
  TextOverlay?: { Lines?: OcrSpaceLine[] };
}
interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
}

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

function detectImageMimeType(buffer: Buffer): string {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/jpeg"; // same fallback uploadScanPhoto's caller already uses when a browser doesn't report a type
}

/**
 * OCR.space, chosen as a lower-friction alternative to Google Cloud Vision
 * (which requires a GCP billing account even for its free tier) — no billing
 * account, just an API key. Real, documented limitation (verified against
 * OCR.space's own docs, not assumed): the API never returns a confidence
 * score at any level, so every OcrTextBlock here carries `confidence: null`
 * rather than a fabricated number — see the OcrTextBlock doc comment.
 * Emits one block per detected line (`TextOverlay.Lines`, requested via
 * `isOverlayRequired`) rather than the single whole-image `ParsedText` blob,
 * for the same reason GoogleVisionProvider uses paragraphs: identify.ts's
 * heuristics expect roughly line-sized blocks.
 */
export class OcrSpaceProvider implements OcrProvider {
  id = "ocr-space";

  constructor(private readonly apiKey: string) {}

  async extractText(imageBuffer: Buffer): Promise<OcrTextBlock[]> {
    const mimeType = detectImageMimeType(imageBuffer);
    const form = new FormData();
    form.append("base64Image", `data:${mimeType};base64,${imageBuffer.toString("base64")}`);
    form.append("language", "eng");
    form.append("isOverlayRequired", "true");
    form.append("scale", "true");
    form.append("OCREngine", "2");

    const res = await fetch(OCR_SPACE_ENDPOINT, {
      method: "POST",
      headers: { apikey: this.apiKey },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`OCR.space request failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as OcrSpaceResponse;
    if (json.IsErroredOnProcessing) {
      const message = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join("; ") : json.ErrorMessage;
      throw new Error(`OCR.space error: ${message ?? "unknown error"}`);
    }

    const lines = json.ParsedResults?.[0]?.TextOverlay?.Lines ?? [];
    return lines
      .map((line) => ({ text: (line.LineText ?? "").trim(), confidence: null }))
      .filter((b) => b.text.length > 0);
  }
}

const KNOWN_PROVIDER_IDS = ["ocr-space", "google-cloud-vision"] as const;
type KnownProviderId = (typeof KNOWN_PROVIDER_IDS)[number];

function buildProvider(id: KnownProviderId): OcrProvider {
  if (id === "ocr-space") {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) throw new OcrNotConfiguredError('OCR_PROVIDER="ocr-space" but OCR_SPACE_API_KEY is not set.');
    return new OcrSpaceProvider(apiKey);
  }
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) throw new OcrNotConfiguredError('OCR_PROVIDER="google-cloud-vision" but GOOGLE_CLOUD_VISION_API_KEY is not set.');
  return new GoogleVisionProvider(apiKey);
}

/**
 * Returns the active OCR provider. If OCR_PROVIDER is set, it wins outright
 * — a deployment that sets it is explicit about which provider runs and
 * fails loudly (OcrNotConfiguredError, caught the same way as "no provider
 * at all" by identifyScan) if that provider's key is missing, rather than
 * silently falling through to a different one. Without it, falls back to
 * whichever key is present (OCR.space first — no billing account required)
 * for zero-config local dev; set OCR_PROVIDER explicitly in any deployment
 * where more than one key might be configured at once.
 */
export function getOcrProvider(): OcrProvider {
  const explicit = process.env.OCR_PROVIDER;
  if (explicit) {
    if (!(KNOWN_PROVIDER_IDS as readonly string[]).includes(explicit)) {
      throw new OcrNotConfiguredError(`Unknown OCR_PROVIDER "${explicit}" — expected one of: ${KNOWN_PROVIDER_IDS.join(", ")}.`);
    }
    return buildProvider(explicit as KnownProviderId);
  }

  if (process.env.OCR_SPACE_API_KEY) return buildProvider("ocr-space");
  if (process.env.GOOGLE_CLOUD_VISION_API_KEY) return buildProvider("google-cloud-vision");
  return new NotConfiguredOcrProvider();
}
