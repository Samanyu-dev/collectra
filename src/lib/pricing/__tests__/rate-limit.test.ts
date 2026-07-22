import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sourceRateLimit: { findUnique: mockFindUnique, create: mockCreate, update: mockUpdate },
  },
}));

import { throttleRequest, getRateLimitStatus, RateLimitExceededError } from "../rate-limit";
import type { PricingPrismaClient } from "../db";

const fakeClient = {
  sourceRateLimit: { findUnique: mockFindUnique, create: mockCreate, update: mockUpdate, findMany: vi.fn() },
} as unknown as PricingPrismaClient;

describe("throttleRequest", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
  });

  it("creates a fresh window, then records the first request against it", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "row-1", sourceId: "s1", windowSeconds: 60, maxPerWindow: 30, requestCount: 0, windowStartAt: new Date() });

    await throttleRequest("s1", [{ windowSeconds: 60, maxPerWindow: 30 }], fakeClient);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "row-1" }, data: { requestCount: { increment: 1 } } });
  });

  it("increments the counter when under the limit, in one window", async () => {
    mockFindUnique.mockResolvedValue({
      id: "row-1",
      sourceId: "s1",
      windowSeconds: 60,
      maxPerWindow: 30,
      requestCount: 5,
      windowStartAt: new Date(), // fresh, well within the window
    });

    await throttleRequest("s1", [{ windowSeconds: 60, maxPerWindow: 30 }], fakeClient);

    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "row-1" }, data: { requestCount: { increment: 1 } } });
  });

  it("resets the window and allows the request once the window has expired", async () => {
    mockFindUnique.mockResolvedValue({
      id: "row-1",
      sourceId: "s1",
      windowSeconds: 60,
      maxPerWindow: 30,
      requestCount: 30, // was at the cap, but...
      windowStartAt: new Date(Date.now() - 120_000), // ...the window ended 60s ago
    });

    await throttleRequest("s1", [{ windowSeconds: 60, maxPerWindow: 30 }], fakeClient);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "row-1" },
      data: { windowStartAt: expect.any(Date), requestCount: 1 },
    });
  });

  it("throws RateLimitExceededError instead of silently proceeding when maxWaitMs is exceeded", async () => {
    mockFindUnique.mockResolvedValue({
      id: "row-1",
      sourceId: "s1",
      windowSeconds: 60,
      maxPerWindow: 30,
      requestCount: 30, // at the cap
      windowStartAt: new Date(), // window just started — a long wait ahead
    });

    await expect(
      throttleRequest("s1", [{ windowSeconds: 60, maxPerWindow: 30 }], fakeClient, 100 /* ms — much shorter than the real wait */)
    ).rejects.toThrow(RateLimitExceededError);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("checks every configured window, not just the first", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ id: "minute", sourceId: "s1", windowSeconds: 60, maxPerWindow: 30, requestCount: 5, windowStartAt: new Date() })
      .mockResolvedValueOnce({ id: "day", sourceId: "s1", windowSeconds: 86400, maxPerWindow: 1000, requestCount: 999, windowStartAt: new Date() });

    await throttleRequest(
      "s1",
      [
        { windowSeconds: 60, maxPerWindow: 30 },
        { windowSeconds: 86400, maxPerWindow: 1000 },
      ],
      fakeClient
    );

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "minute" }, data: { requestCount: { increment: 1 } } });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "day" }, data: { requestCount: { increment: 1 } } });
  });
});

describe("getRateLimitStatus", () => {
  it("maps rows to a read-only status without mutating anything", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "1", sourceId: "s1", windowSeconds: 60, maxPerWindow: 30, requestCount: 12, windowStartAt: new Date("2026-07-23T12:00:00Z") },
    ]);
    const update = vi.fn();
    const create = vi.fn();
    const client = { sourceRateLimit: { findMany, update, create } } as unknown as PricingPrismaClient;

    const status = await getRateLimitStatus("s1", client);

    expect(status).toEqual([
      { windowSeconds: 60, maxPerWindow: 30, requestCount: 12, windowResetAt: new Date("2026-07-23T12:01:00Z") },
    ]);
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
