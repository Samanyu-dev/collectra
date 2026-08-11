import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRequireApiUser, mockGetScanQuotaStatus } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
  mockGetScanQuotaStatus: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ requireApiUser: mockRequireApiUser }));
vi.mock("@/lib/billing/entitlements", () => ({ getScanQuotaStatus: mockGetScanQuotaStatus }));

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
  return {
    ApiRequestError,
    ApiErrorCodes: { UNAUTHENTICATED: "UNAUTHENTICATED", INVALID_TOKEN: "INVALID_TOKEN", NOT_FOUND: "NOT_FOUND", VALIDATION_ERROR: "VALIDATION_ERROR", FORBIDDEN: "FORBIDDEN", PAYWALL: "PAYWALL", INTERNAL_ERROR: "INTERNAL_ERROR" },
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

import { GET } from "../route";
import { ApiRequestError } from "@/lib/api/response";

function req() {
  return new Request("http://localhost/api/v1/scan/quota", { headers: { authorization: "Bearer test-token" } });
}

describe("GET /api/v1/scan/quota", () => {
  beforeEach(() => {
    mockRequireApiUser.mockReset();
    mockGetScanQuotaStatus.mockReset();
    mockRequireApiUser.mockResolvedValue({ id: "user-a" });
  });

  it("propagates a 401 from requireApiUser without calling getScanQuotaStatus", async () => {
    mockRequireApiUser.mockRejectedValue(new ApiRequestError(401, "UNAUTHENTICATED", "Missing token"));

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(mockGetScanQuotaStatus).not.toHaveBeenCalled();
  });

  it("returns the caller's quota status for a free user within quota", async () => {
    mockGetScanQuotaStatus.mockResolvedValue({ isPro: false, canScan: true, scansUsedThisWeek: 10, scanLimitPerWeek: 25 });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockGetScanQuotaStatus).toHaveBeenCalledWith("user-a");
    expect(body.data).toEqual({ isPro: false, canScan: true, scansUsedThisWeek: 10, scanLimitPerWeek: 25 });
  });

  it("returns canScan=false once the free-tier weekly quota is spent", async () => {
    mockGetScanQuotaStatus.mockResolvedValue({ isPro: false, canScan: false, scansUsedThisWeek: 25, scanLimitPerWeek: 25 });

    const res = await GET(req());
    const body = await res.json();

    expect(body.data.canScan).toBe(false);
  });

  it("returns canScan=true for a Pro user regardless of scan count", async () => {
    mockGetScanQuotaStatus.mockResolvedValue({ isPro: true, canScan: true, scansUsedThisWeek: 0, scanLimitPerWeek: 25 });

    const res = await GET(req());
    const body = await res.json();

    expect(body.data.isPro).toBe(true);
    expect(body.data.canScan).toBe(true);
  });
});
