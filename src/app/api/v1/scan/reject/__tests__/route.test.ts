import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRequireApiUser, mockRejectScanMatchForUser } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
  mockRejectScanMatchForUser: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ requireApiUser: mockRequireApiUser }));
vi.mock("@/lib/actions/scanner", () => ({ rejectScanMatchForUser: mockRejectScanMatchForUser }));

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
  return new Request("http://localhost/api/v1/scan/reject", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-token" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/scan/reject", () => {
  beforeEach(() => {
    mockRequireApiUser.mockReset();
    mockRejectScanMatchForUser.mockReset();
    mockRequireApiUser.mockResolvedValue({ id: "user-a" });
  });

  it("requires mediaId and variantId", async () => {
    const res = await POST(req({ mediaId: "m1" }));
    expect(res.status).toBe(422);
    expect(mockRejectScanMatchForUser).not.toHaveBeenCalled();
  });

  it("maps 'Scan photo not found' to 404", async () => {
    mockRejectScanMatchForUser.mockRejectedValue(new Error("Scan photo not found"));
    const res = await POST(req({ mediaId: "m1", variantId: "v1" }));
    expect(res.status).toBe(404);
  });

  it("delegates to rejectScanMatchForUser and returns ok", async () => {
    mockRejectScanMatchForUser.mockResolvedValue(undefined);
    const res = await POST(req({ mediaId: "m1", variantId: "v1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockRejectScanMatchForUser).toHaveBeenCalledWith("user-a", "m1", "v1");
    expect(body.data.ok).toBe(true);
  });
});
