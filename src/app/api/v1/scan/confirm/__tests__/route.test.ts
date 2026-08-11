import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRequireApiUser, mockConfirmScanMatchForUser } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
  mockConfirmScanMatchForUser: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ requireApiUser: mockRequireApiUser }));
vi.mock("@/lib/actions/scanner", () => ({ confirmScanMatchForUser: mockConfirmScanMatchForUser }));

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

function req(body: unknown) {
  return new Request("http://localhost/api/v1/scan/confirm", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-token" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/scan/confirm", () => {
  beforeEach(() => {
    mockRequireApiUser.mockReset();
    mockConfirmScanMatchForUser.mockReset();
    mockRequireApiUser.mockResolvedValue({ id: "user-a" });
  });

  it("requires mediaId, variantId, and condition", async () => {
    const res = await POST(req({ mediaId: "m1" }));
    expect(res.status).toBe(422);
    expect(mockConfirmScanMatchForUser).not.toHaveBeenCalled();
  });

  it("maps PAYWALL_SCAN_LIMIT to 402 PAYWALL, matching the quantity route's established convention", async () => {
    mockConfirmScanMatchForUser.mockRejectedValue(new Error("PAYWALL_SCAN_LIMIT"));

    const res = await POST(req({ mediaId: "m1", variantId: "v1", condition: "Near Mint" }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error.code).toBe("PAYWALL");
    expect(body.error.message).toBe("PAYWALL_SCAN_LIMIT");
  });

  it("maps PAYWALL_SET_LIMIT to 402 PAYWALL", async () => {
    mockConfirmScanMatchForUser.mockRejectedValue(new Error("PAYWALL_SET_LIMIT"));

    const res = await POST(req({ mediaId: "m1", variantId: "v1", condition: "Near Mint" }));
    expect(res.status).toBe(402);
  });

  it("maps 'Variant not found' to 404", async () => {
    mockConfirmScanMatchForUser.mockRejectedValue(new Error("Variant not found"));

    const res = await POST(req({ mediaId: "m1", variantId: "v1", condition: "Near Mint" }));
    expect(res.status).toBe(404);
  });

  it("delegates to confirmScanMatchForUser with the caller's userId and returns its result", async () => {
    mockConfirmScanMatchForUser.mockResolvedValue({ instanceId: "instance-1", price: null });

    const res = await POST(req({ mediaId: "m1", variantId: "v1", condition: "Near Mint", contributeToPublicCatalog: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockConfirmScanMatchForUser).toHaveBeenCalledWith("user-a", {
      mediaId: "m1",
      variantId: "v1",
      condition: "Near Mint",
      contributeToPublicCatalog: true,
    });
    expect(body.data.instanceId).toBe("instance-1");
  });
});
