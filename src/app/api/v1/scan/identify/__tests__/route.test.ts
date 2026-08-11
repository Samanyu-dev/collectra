import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRequireApiUser, mockUploadScanPhotoForUser, mockIdentifyScanForUser } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
  mockUploadScanPhotoForUser: vi.fn(),
  mockIdentifyScanForUser: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ requireApiUser: mockRequireApiUser }));
vi.mock("@/lib/actions/scanner", () => ({
  uploadScanPhotoForUser: mockUploadScanPhotoForUser,
  identifyScanForUser: mockIdentifyScanForUser,
}));

// Real @/lib/api/response has `import "server-only"`, which unconditionally
// throws outside Next's own bundler (same reason commit.test.ts needed
// @/lib/billing/entitlements mocked). Reimplemented faithfully here rather
// than imported, since it's plain logic with no other dependency.
vi.mock("@/lib/api/response", async () => {
  const { NextResponse } = await import("next/server");
  class ApiRequestError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  const ApiErrorCodes = {
    UNAUTHENTICATED: "UNAUTHENTICATED",
    INVALID_TOKEN: "INVALID_TOKEN",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    FORBIDDEN: "FORBIDDEN",
    PAYWALL: "PAYWALL",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  } as const;
  return {
    ApiRequestError,
    ApiErrorCodes,
    apiSuccess: (data: unknown, status = 200) => NextResponse.json({ data }, { status }),
    apiError: (code: string, message: string, status: number) => NextResponse.json({ error: { code, message } }, { status }),
    withApiErrorHandling: async (handler: () => Promise<Response>) => {
      try {
        return await handler();
      } catch (e) {
        if (e instanceof ApiRequestError) {
          return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
        }
        return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, { status: 500 });
      }
    },
  };
});

import { POST } from "../route";
import { ApiRequestError } from "@/lib/api/response";

function req(body: unknown, headers: Record<string, string> = { authorization: "Bearer test-token" }) {
  return new Request("http://localhost/api/v1/scan/identify", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/scan/identify", () => {
  beforeEach(() => {
    mockRequireApiUser.mockReset();
    mockUploadScanPhotoForUser.mockReset();
    mockIdentifyScanForUser.mockReset();
    mockRequireApiUser.mockResolvedValue({ id: "user-a" });
  });

  it("propagates a 401 from requireApiUser without calling the scan pipeline", async () => {
    mockRequireApiUser.mockRejectedValue(new ApiRequestError(401, "UNAUTHENTICATED", "Missing token"));

    const res = await POST(req({ imageBase64: "aGVsbG8=" }));

    expect(res.status).toBe(401);
    expect(mockUploadScanPhotoForUser).not.toHaveBeenCalled();
  });

  it("rejects a request with no imageBase64", async () => {
    const res = await POST(req({}));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockUploadScanPhotoForUser).not.toHaveBeenCalled();
  });

  it("uploads then identifies, merging mediaId and previewUrl into the response", async () => {
    mockUploadScanPhotoForUser.mockResolvedValue({ mediaId: "media-1", previewUrl: "https://example.com/preview.jpg" });
    mockIdentifyScanForUser.mockResolvedValue({
      ocrConfigured: true,
      confidenceLabel: "HIGH",
      confidence: 0.9,
      reasons: [],
      extractedName: "Some Card",
      extractedCardNumber: "1",
      resolved: null,
      candidates: [],
    });

    const res = await POST(req({ imageBase64: Buffer.from("fake-image-bytes").toString("base64"), mimeType: "image/png" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUploadScanPhotoForUser).toHaveBeenCalledWith("user-a", expect.any(Buffer), "scan.jpg", "image/png");
    expect(mockIdentifyScanForUser).toHaveBeenCalledWith("user-a", "media-1");
    expect(body.data.mediaId).toBe("media-1");
    expect(body.data.previewUrl).toBe("https://example.com/preview.jpg");
    expect(body.data.ocrConfigured).toBe(true);
  });
});
