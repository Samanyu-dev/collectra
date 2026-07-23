import { describe, it, expect, vi, beforeEach } from "vitest";

// Full dependency mock so we drive the *real* syncPokemonPrices control flow
// (not a reimplementation of it) through a deterministic failure scenario —
// verifying the cursor-advance guarantee precisely, rather than waiting for a
// live external API to fail on cue.
const { mockDataSourceUpdate, mockDataSourceFindUnique, mockVariantFindMany, mockFetchWithRetry } = vi.hoisted(() => ({
  mockDataSourceUpdate: vi.fn().mockResolvedValue({}),
  mockDataSourceFindUnique: vi.fn().mockResolvedValue({ syncCursor: null }),
  mockVariantFindMany: vi.fn().mockResolvedValue([]),
  mockFetchWithRetry: vi.fn(),
}));

vi.mock("../../engine/prisma", () => ({
  prisma: {
    dataSource: { update: mockDataSourceUpdate, findUnique: mockDataSourceFindUnique },
    variant: { findMany: mockVariantFindMany },
  },
}));

vi.mock("../../engine/builder", () => ({
  builder: {
    getOrCreateParallel: vi.fn().mockResolvedValue("parallel-id"),
  },
}));

vi.mock("../../engine/media", () => ({
  getOrCreateDataSource: vi.fn().mockResolvedValue("source-id"),
}));

vi.mock("../api-client", () => ({
  fetchWithRetry: mockFetchWithRetry,
  sleep: vi.fn().mockResolvedValue(undefined),
  API_URL: "https://api.pokemontcg.io/v2",
}));

vi.mock("@/lib/pricing/write-observation", () => ({
  writePriceObservationsBatch: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/pricing/recompute", () => ({
  recomputeCurrentPricesForVariants: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pricing/rate-limit", () => ({
  throttleRequest: vi.fn().mockResolvedValue(undefined),
  POKEMON_TCG_API_WINDOWS: [],
}));

import { syncPokemonPrices } from "../sync-prices";

describe("syncPokemonPrices — resume-cursor failure guarantee (Phase 5.1)", () => {
  beforeEach(() => {
    mockDataSourceUpdate.mockClear();
    mockDataSourceFindUnique.mockResolvedValue({ syncCursor: null });
    mockVariantFindMany.mockResolvedValue([]);
    mockFetchWithRetry.mockReset();
  });

  it("advances the cursor through successes, but freezes it the moment a set fails — even if later sets in the same run succeed", async () => {
    // This is the exact scenario a live production cross-check caught a real
    // bug in: set-a succeeds, set-b fails, set-c succeeds. The cursor must
    // stop at set-a, NOT jump to set-c just because something later happened
    // to work — otherwise set-b silently stops being retried anytime soon.
    mockFetchWithRetry.mockImplementation((url: string) => {
      if (url.endsWith("/sets")) {
        return Promise.resolve({
          data: [
            { id: "set-a", name: "Set A" },
            { id: "set-b", name: "Set B" },
            { id: "set-c", name: "Set C" },
          ],
        });
      }
      if (url.includes("set.id:set-a")) return Promise.resolve({ data: [] });
      if (url.includes("set.id:set-b")) return Promise.reject(new Error("simulated mid-set failure"));
      if (url.includes("set.id:set-c")) return Promise.resolve({ data: [] });
      throw new Error(`unexpected URL in test: ${url}`);
    });

    const result = await syncPokemonPrices({ timeBudgetMs: Infinity });

    // set-a succeeded — cursor should have advanced to it.
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-a" } });
    // set-b failed — the cursor must never be set to set-b...
    expect(mockDataSourceUpdate).not.toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-b" } });
    // ...and critically, must NOT be set to set-c either, even though set-c's
    // own write succeeded — the watermark freezes at the last *contiguous*
    // success, not the last success overall.
    expect(mockDataSourceUpdate).not.toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-c" } });
    // Exactly one syncCursor-advancing call happened (a separate lastSyncedAt
    // call also hits this same mock at the top of the function — irrelevant here).
    const cursorCalls = mockDataSourceUpdate.mock.calls.filter(([arg]) => "syncCursor" in (arg.data ?? {}));
    expect(cursorCalls).toHaveLength(1);

    expect(result.failedSets).toEqual(["set-b"]);
    expect(result.setsProcessed).toBe(2); // set-a and set-c both did real work; only set-a moved the watermark
  });

  it("on the next run, resumes right at the frozen cursor and retries the failed set before anything past it", async () => {
    // Real state left behind by the run above: cursor is "set-a" (frozen
    // there by set-b's failure), not "set-c".
    mockDataSourceFindUnique.mockResolvedValue({ syncCursor: "set-a" });
    mockFetchWithRetry.mockImplementation((url: string) => {
      if (url.endsWith("/sets")) {
        return Promise.resolve({
          data: [
            { id: "set-a", name: "Set A" },
            { id: "set-b", name: "Set B" },
            { id: "set-c", name: "Set C" },
          ],
        });
      }
      // This time set-b succeeds — proving it gets retried, not permanently skipped.
      return Promise.resolve({ data: [] });
    });

    const result = await syncPokemonPrices({ timeBudgetMs: Infinity });

    expect(result.failedSets).toEqual([]);
    expect(result.setsProcessed).toBe(2); // set-b and set-c — resumed right after set-a, not from the start
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-b" } });
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-c" } });
  });
});
