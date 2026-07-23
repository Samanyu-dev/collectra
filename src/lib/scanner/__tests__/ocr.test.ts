import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleVisionProvider, OcrSpaceProvider, getOcrProvider, OcrNotConfiguredError } from "../ocr";

function visionResponse(blocks: Array<{ paragraphs: Array<{ confidence: number; text: string }> }>) {
  return {
    responses: [
      {
        fullTextAnnotation: {
          pages: [
            {
              blocks: blocks.map((b) => ({
                paragraphs: b.paragraphs.map((p) => ({
                  confidence: p.confidence,
                  words: p.text.split(" ").map((word) => ({
                    symbols: word.split("").map((char) => ({ text: char })),
                  })),
                })),
              })),
            },
          ],
        },
      },
    ],
  };
}

describe("GoogleVisionProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("emits one OcrTextBlock per paragraph, reconstructed from words/symbols, with paragraph confidence", async () => {
    const body = visionResponse([
      { paragraphs: [{ confidence: 0.98, text: "Charizard" }] },
      { paragraphs: [{ confidence: 0.91, text: "4 102" }] },
    ]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body });

    const provider = new GoogleVisionProvider("test-key");
    const blocks = await provider.extractText(Buffer.from("fake-image"));

    expect(blocks).toEqual([
      { text: "Charizard", confidence: 0.98 },
      { text: "4 102", confidence: 0.91 },
    ]);
  });

  it("drops empty paragraphs", async () => {
    const body = visionResponse([{ paragraphs: [{ confidence: 0.5, text: "" }] }]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => body });

    const provider = new GoogleVisionProvider("test-key");
    const blocks = await provider.extractText(Buffer.from("fake-image"));
    expect(blocks).toEqual([]);
  });

  it("throws when the HTTP response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "Forbidden" });
    const provider = new GoogleVisionProvider("bad-key");
    await expect(provider.extractText(Buffer.from("x"))).rejects.toThrow(/403/);
  });

  it("throws when Vision returns a per-request error payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ responses: [{ error: { message: "Bad image data" } }] }),
    });
    const provider = new GoogleVisionProvider("test-key");
    await expect(provider.extractText(Buffer.from("x"))).rejects.toThrow(/Bad image data/);
  });
});

describe("OcrSpaceProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("emits one OcrTextBlock per line with confidence: null (OCR.space never reports one)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        IsErroredOnProcessing: false,
        ParsedResults: [{ TextOverlay: { Lines: [{ LineText: "Charizard" }, { LineText: "4/102" }] } }],
      }),
    });

    const provider = new OcrSpaceProvider("test-key");
    const blocks = await provider.extractText(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    expect(blocks).toEqual([
      { text: "Charizard", confidence: null },
      { text: "4/102", confidence: null },
    ]);
  });

  it("sends the api key as a header, not a body field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ IsErroredOnProcessing: false, ParsedResults: [{ TextOverlay: { Lines: [] } }] }),
    });
    global.fetch = fetchMock;

    await new OcrSpaceProvider("my-secret-key").extractText(Buffer.from("x"));

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({ apikey: "my-secret-key" });
  });

  it("drops empty lines", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ IsErroredOnProcessing: false, ParsedResults: [{ TextOverlay: { Lines: [{ LineText: "" }] } }] }),
    });
    const provider = new OcrSpaceProvider("test-key");
    const blocks = await provider.extractText(Buffer.from("x"));
    expect(blocks).toEqual([]);
  });

  it("throws when the HTTP response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "Forbidden" });
    const provider = new OcrSpaceProvider("bad-key");
    await expect(provider.extractText(Buffer.from("x"))).rejects.toThrow(/403/);
  });

  it("throws when OCR.space reports IsErroredOnProcessing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ IsErroredOnProcessing: true, ErrorMessage: ["Unsupported file type"] }),
    });
    const provider = new OcrSpaceProvider("test-key");
    await expect(provider.extractText(Buffer.from("x"))).rejects.toThrow(/Unsupported file type/);
  });
});

describe("getOcrProvider", () => {
  const originalOcrSpaceKey = process.env.OCR_SPACE_API_KEY;
  const originalVisionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  const originalOcrProvider = process.env.OCR_PROVIDER;

  beforeEach(() => {
    delete process.env.OCR_SPACE_API_KEY;
    delete process.env.GOOGLE_CLOUD_VISION_API_KEY;
    delete process.env.OCR_PROVIDER;
  });

  afterEach(() => {
    if (originalOcrSpaceKey === undefined) delete process.env.OCR_SPACE_API_KEY;
    else process.env.OCR_SPACE_API_KEY = originalOcrSpaceKey;
    if (originalVisionKey === undefined) delete process.env.GOOGLE_CLOUD_VISION_API_KEY;
    else process.env.GOOGLE_CLOUD_VISION_API_KEY = originalVisionKey;
    if (originalOcrProvider === undefined) delete process.env.OCR_PROVIDER;
    else process.env.OCR_PROVIDER = originalOcrProvider;
  });

  it("returns the not-configured stub when no API key is set", async () => {
    const provider = getOcrProvider();
    expect(provider.id).toBe("not-configured");
    await expect(provider.extractText(Buffer.from("x"))).rejects.toThrow(OcrNotConfiguredError);
  });

  it("returns a GoogleVisionProvider when only the Vision key is set", () => {
    process.env.GOOGLE_CLOUD_VISION_API_KEY = "some-key";
    const provider = getOcrProvider();
    expect(provider.id).toBe("google-cloud-vision");
    expect(provider).toBeInstanceOf(GoogleVisionProvider);
  });

  it("returns an OcrSpaceProvider when only the OCR.space key is set", () => {
    process.env.OCR_SPACE_API_KEY = "some-key";
    const provider = getOcrProvider();
    expect(provider.id).toBe("ocr-space");
    expect(provider).toBeInstanceOf(OcrSpaceProvider);
  });

  it("prefers OCR.space when both keys are set and OCR_PROVIDER is unset", () => {
    process.env.OCR_SPACE_API_KEY = "ocr-space-key";
    process.env.GOOGLE_CLOUD_VISION_API_KEY = "vision-key";
    const provider = getOcrProvider();
    expect(provider.id).toBe("ocr-space");
  });

  it("OCR_PROVIDER picks Google even when an OCR.space key is also set", () => {
    process.env.OCR_PROVIDER = "google-cloud-vision";
    process.env.OCR_SPACE_API_KEY = "ocr-space-key";
    process.env.GOOGLE_CLOUD_VISION_API_KEY = "vision-key";
    const provider = getOcrProvider();
    expect(provider.id).toBe("google-cloud-vision");
  });

  it("OCR_PROVIDER picks OCR.space explicitly", () => {
    process.env.OCR_PROVIDER = "ocr-space";
    process.env.OCR_SPACE_API_KEY = "ocr-space-key";
    const provider = getOcrProvider();
    expect(provider.id).toBe("ocr-space");
  });

  it("throws OcrNotConfiguredError when OCR_PROVIDER is set but its key is missing, rather than falling back to another provider", async () => {
    process.env.OCR_PROVIDER = "google-cloud-vision";
    process.env.OCR_SPACE_API_KEY = "ocr-space-key"; // present, but must NOT be used as a fallback
    expect(() => getOcrProvider()).toThrow(OcrNotConfiguredError);
    expect(() => getOcrProvider()).toThrow(/GOOGLE_CLOUD_VISION_API_KEY/);
  });

  it("throws OcrNotConfiguredError for an unknown OCR_PROVIDER value", () => {
    process.env.OCR_PROVIDER = "some-typo";
    expect(() => getOcrProvider()).toThrow(OcrNotConfiguredError);
    expect(() => getOcrProvider()).toThrow(/Unknown OCR_PROVIDER/);
  });
});
