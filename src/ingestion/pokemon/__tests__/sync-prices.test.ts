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

  it("advances the cursor after a set succeeds, but never past a set that fails", async () => {
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
    // set-b failed — the cursor must NEVER be set to set-b, at any point.
    expect(mockDataSourceUpdate).not.toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-b" } });
    // set-c (after the failure) still succeeded and should have advanced the cursor past it.
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "set-c" } });

    expect(result.failedSets).toEqual(["set-b"]);
    expect(result.setsProcessed).toBe(2); // set-a and set-c; set-b does not count as processed
  });

  it("on the next run, resumes from the last *successful* cursor — a failed set is retried, not skipped", async () => {
    // Simulates the state left behind by the run above: cursor sits at "set-a"
    // (the last successful set), not "set-b" (which failed).
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
