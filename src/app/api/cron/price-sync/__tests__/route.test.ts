import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSync } = vi.hoisted(() => ({ mockSync: vi.fn() }));

vi.mock("@/ingestion/pokemon/sync-prices", () => ({
  syncPokemonPrices: mockSync,
}));

import { GET } from "../route";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/price-sync", { headers });
}

describe("GET /api/cron/price-sync — auth", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    mockSync.mockReset();
    process.env.CRON_SECRET = "test-secret-value";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("500s if CRON_SECRET isn't configured on the deployment", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest({ authorization: "Bearer anything" }));
    expect(res.status).toBe(500);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("401s with no Authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("401s with the wrong secret", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong-secret" }));
    expect(res.status).toBe(401);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("401s with a correctly-formed but non-matching bearer token", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer test-secret-valueX" }));
    expect(res.status).toBe(401);
  });

  it("invokes the real sync exactly once with the correct secret", async () => {
    mockSync.mockResolvedValue({ observationsWritten: 10, variantsTouched: 5, failedSets: [], elapsedMs: 100 });
    const res = await GET(makeRequest({ authorization: "Bearer test-secret-value" }));
    expect(res.status).toBe(200);
    expect(mockSync).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, observationsWritten: 10, variantsTouched: 5 });
  });

  it("returns 500 and does not throw if the sync itself fails", async () => {
    mockSync.mockRejectedValue(new Error("upstream API down"));
    const res = await GET(makeRequest({ authorization: "Bearer test-secret-value" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
