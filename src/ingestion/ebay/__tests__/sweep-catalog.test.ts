import { describe, it, expect, vi, beforeEach } from "vitest";

// Same approach as src/ingestion/pokemon/__tests__/sync-prices.test.ts: drive
// the REAL sweepEbayCatalog control flow (tiered cursor, windowed pagination,
// cursor-freezes-on-failure) through a deterministic scenario, rather than
// re-implementing that logic in the test. Three cards in a single set that
// matches none of the franchise priority patterns, so they land in the REST
// tier (tier 5, since PRIORITY_NAME_PATTERNS has 4 entries) after the owned
// and franchise tiers all come back empty.
const ALL_CARDS = [
  { id: "card-a", setId: "set-x", name: "Card Alpha", number: "1" },
  { id: "card-b", setId: "set-x", name: "Card Beta", number: "2" },
  { id: "card-c", setId: "set-x", name: "Card Gamma", number: "3" },
];
const ALL_VARIANTS = ALL_CARDS.map((c, i) => ({
  id: `variant-${i}`,
  cardId: c.id,
  parallelId: null,
  isAuto: false,
  isPatch: false,
  isRelic: false,
  serialTo: null,
}));
const SETS = [{ id: "set-x", name: "Random Sports Set" }];

const {
  mockDataSourceUpdate,
  mockDataSourceFindUnique,
  mockCardCount,
  mockCardFindMany,
  mockVariantFindMany,
  mockInstanceFindMany,
  mockSetFindMany,
  mockSearchItems,
} = vi.hoisted(() => ({
  mockDataSourceUpdate: vi.fn().mockResolvedValue({}),
  mockDataSourceFindUnique: vi.fn().mockResolvedValue({ syncCursor: null }),
  mockCardCount: vi.fn().mockResolvedValue(3),
  mockCardFindMany: vi.fn(),
  mockVariantFindMany: vi.fn(),
  mockInstanceFindMany: vi.fn().mockResolvedValue([]),
  mockSetFindMany: vi.fn(),
  mockSearchItems: vi.fn(),
}));

vi.mock("../../engine/prisma", () => ({
  prisma: {
    dataSource: { update: mockDataSourceUpdate, findUnique: mockDataSourceFindUnique },
    card: { count: mockCardCount, findMany: mockCardFindMany },
    variant: { findMany: mockVariantFindMany },
    instance: { findMany: mockInstanceFindMany },
    set: { findMany: mockSetFindMany },
  },
}));

vi.mock("../../engine/media", () => ({
  getOrCreateDataSource: vi.fn().mockResolvedValue("source-id"),
  attachHotlinkImage: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../engine/process-media", () => ({
  processMediaRow: vi.fn().mockResolvedValue({ status: "ok" }),
}));

vi.mock("../api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api-client")>();
  return { ...actual, searchItems: mockSearchItems };
});

vi.mock("@/lib/pricing/write-observation", () => ({
  writePriceObservationsBatch: vi.fn().mockResolvedValue(1),
}));

vi.mock("@/lib/pricing/recompute", () => ({
  recomputeCurrentPricesForVariants: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pricing/rate-limit", () => ({
  throttleRequest: vi.fn().mockResolvedValue(undefined),
}));

import { sweepEbayCatalog } from "../sweep-catalog";

// Mimics Prisma's orderBy id asc + cursor/skip pagination against ALL_CARDS,
// filtered per the same `where` shapes sweep-catalog.ts's fetchNextWindow
// actually issues (id-in for the owned tier, setId-in for a franchise tier,
// setId-notIn for REST).
function applyCardFilter(where: any) {
  if (where.id?.in) return ALL_CARDS.filter((c) => where.id.in.includes(c.id));
  if (where.setId?.in) return ALL_CARDS.filter((c) => where.setId.in.includes(c.setId));
  if (where.setId?.notIn) return ALL_CARDS.filter((c) => !where.setId.notIn.includes(c.setId));
  return [];
}

describe("sweepEbayCatalog — tiered resumable cursor (mirrors Phase 5.1's resume-cursor guarantee)", () => {
  beforeEach(() => {
    mockDataSourceUpdate.mockClear();
    mockDataSourceFindUnique.mockResolvedValue({ syncCursor: null });
    mockSetFindMany.mockResolvedValue(SETS);
    mockCardFindMany.mockImplementation(({ where, cursor, skip, take }: any) => {
      const filtered = [...applyCardFilter(where)].sort((a, b) => a.id.localeCompare(b.id));
      let startIdx = 0;
      if (cursor?.id) {
        const idx = filtered.findIndex((c) => c.id === cursor.id);
        startIdx = idx === -1 ? filtered.length : idx + (skip ?? 0);
      }
      return Promise.resolve(filtered.slice(startIdx, startIdx + take));
    });
    mockVariantFindMany.mockImplementation(({ where }: any) => {
      const ids: string[] = where.cardId.in;
      return Promise.resolve(ALL_VARIANTS.filter((v) => ids.includes(v.cardId)));
    });
    mockSearchItems.mockReset();
  });

  it("advances the cursor through successes, but freezes it the moment a card fails — even if a later card in the same window succeeds", async () => {
    // card-a succeeds, card-b fails (simulated eBay error), card-c succeeds —
    // the exact shape of bug the Pokemon sync's own resume-cursor test guards
    // against, applied here to the tiered eBay cursor.
    mockSearchItems.mockImplementation((query: string) => {
      if (query.includes("#2")) return Promise.reject(new Error("simulated eBay failure"));
      return Promise.resolve({
        total: 1,
        items: [
          {
            itemId: "item-1",
            title: query,
            price: { value: "5.00", currency: "USD" },
            imageUrl: null,
            itemWebUrl: "https://ebay.com/item",
            condition: null,
            buyingOptions: ["FIXED_PRICE"],
          },
        ],
      });
    });

    const result = await sweepEbayCatalog({ timeBudgetMs: Infinity });

    // card-a succeeded — cursor should have advanced to REST tier (5) at card-a.
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "5:card-a" } });
    // card-b failed — cursor must never land on it...
    expect(mockDataSourceUpdate).not.toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "5:card-b" } });
    // ...and must NOT skip ahead to card-c either, even though card-c's own write succeeded.
    expect(mockDataSourceUpdate).not.toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "5:card-c" } });
    const cursorCalls = mockDataSourceUpdate.mock.calls.filter(([arg]) => "syncCursor" in (arg.data ?? {}));
    expect(cursorCalls).toHaveLength(1);

    expect(result.failedCardIds).toEqual(["card-b"]);
    expect(result.processed).toBe(2); // card-a and card-c both did real work; only card-a moved the watermark
  });

  it("on the next run, resumes right at the frozen cursor and retries the failed card before anything past it", async () => {
    // Real state left behind by the run above: cursor frozen at "5:card-a".
    mockDataSourceFindUnique.mockResolvedValue({ syncCursor: "5:card-a" });
    mockSearchItems.mockImplementation((query: string) =>
      Promise.resolve({
        total: 1,
        items: [
          {
            itemId: "item-1",
            title: query,
            price: { value: "5.00", currency: "USD" },
            imageUrl: null,
            itemWebUrl: "https://ebay.com/item",
            condition: null,
            buyingOptions: ["FIXED_PRICE"],
          },
        ],
      })
    );

    const result = await sweepEbayCatalog({ timeBudgetMs: Infinity });

    // With only 3 cards total, fetchNextWindow's own documented behavior is
    // to keep topping up (and eventually wrap) until it fills WINDOW_SIZE —
    // so this tiny fixture legitimately revisits card-a within the same
    // invocation after exhausting REST once. That wrap is real, correct
    // behavior (see sweep-catalog.ts's fetchNextWindow doc comment), not
    // something to suppress here. The actual resume guarantee under test is
    // ORDER: the very first card searched this run must be card-b (the one
    // frozen at, i.e. not yet advanced past), never card-a again first.
    expect(mockSearchItems.mock.calls[0][0]).toContain("Card Beta");
    expect(mockSearchItems.mock.calls[1][0]).toContain("Card Gamma");
    expect(result.failedCardIds).toEqual([]);
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "5:card-b" } });
    expect(mockDataSourceUpdate).toHaveBeenCalledWith({ where: { id: "source-id" }, data: { syncCursor: "5:card-c" } });
  });
});
