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
      if (where.cardId?.in) {
        const ids: string[] = where.cardId.in;
        return Promise.resolve(ALL_VARIANTS.filter((v) => ids.includes(v.cardId)));
      }
      // Priority 3 (unowned-rarities) query shape — no fixture models an
      // unowned non-base variant here, so there's nothing to return.
      return Promise.resolve([]);
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

describe("sweepEbayCatalog — tier 0 prices exactly what's owned, per-variant, across all users", () => {
  // card-b has two owned prints: its plain base variant AND a numbered
  // "Cranberry - Base /99" parallel — tier 0 must treat these as two
  // separate targets, not collapse to one "best" variant the way tiers 1+
  // do. Ownership is asserted with no userId filter anywhere in the mock,
  // matching the all-users generalization.
  const OWNED_BASE_VARIANT = { id: "variant-1", cardId: "card-b", parallelId: null, insertId: null, parallel: null, insert: null, serialTo: null, card: ALL_CARDS[1] };
  const OWNED_PARALLEL_VARIANT = {
    id: "variant-1-cranberry",
    cardId: "card-b",
    parallelId: "parallel-cranberry",
    insertId: null,
    parallel: { name: "Cranberry - Base", color: "Cranberry" },
    insert: null,
    serialTo: 99,
    card: ALL_CARDS[1],
  };

  beforeEach(() => {
    mockDataSourceUpdate.mockClear();
    mockDataSourceFindUnique.mockResolvedValue({ syncCursor: null });
    mockSetFindMany.mockResolvedValue(SETS);
    mockInstanceFindMany.mockResolvedValue([{ variantId: "variant-1" }, { variantId: "variant-1-cranberry" }]);
    mockCardFindMany.mockImplementation(({ where, cursor, skip, take }: { where: Record<string, unknown>; cursor?: { id: string }; skip?: number; take: number }) => {
      const filtered = [...applyCardFilter(where)].sort((a, b) => a.id.localeCompare(b.id));
      let startIdx = 0;
      if (cursor?.id) {
        const idx = filtered.findIndex((c) => c.id === cursor.id);
        startIdx = idx === -1 ? filtered.length : idx + (skip ?? 0);
      }
      return Promise.resolve(filtered.slice(startIdx, startIdx + take));
    });
    // Tier 0 looks up variants by id-in (include card/parallel/insert); the
    // Priority-3 unowned-rarities tier looks up by id-notIn+OR (same
    // include); tiers 1+ look up variants by cardId (select flat fields) —
    // same mock branches on which shape it was called with, mirroring
    // fetchNextWindow's own three query shapes.
    mockVariantFindMany.mockImplementation(
      ({ where }: { where: { id?: { in: string[] } | { notIn: string[] }; cardId?: { in: string[] } } }) => {
        if (where.id && "in" in where.id) {
          const byId = new Map([OWNED_BASE_VARIANT, OWNED_PARALLEL_VARIANT].map((v) => [v.id, v]));
          return Promise.resolve(where.id.in.map((id) => byId.get(id)).filter(Boolean));
        }
        if (where.id && "notIn" in where.id) {
          // No fixture models an unowned non-base variant in this describe
          // block — nothing for Priority 3 to find.
          return Promise.resolve([]);
        }
        const ids = where.cardId!.in;
        return Promise.resolve(ALL_VARIANTS.filter((v) => ids.includes(v.cardId)));
      }
    );
    mockSearchItems.mockReset();
  });

  it("emits one target per distinct owned variant (not one per card), even though the query text no longer distinguishes them", async () => {
    mockSearchItems.mockResolvedValue({
      total: 1,
      items: [
        {
          itemId: "item-1",
          title: "placeholder — overwritten per-call below",
          price: { value: "5.00", currency: "USD" },
          imageUrl: null,
          itemWebUrl: "https://ebay.com/item",
          condition: null,
          buyingOptions: ["FIXED_PRICE"],
        },
      ],
    });

    await sweepEbayCatalog({ timeBudgetMs: Infinity });

    // The parallel name is no longer baked into the query (2026-08-12 fix —
    // see the file's own note on why), so both the base print and the
    // Cranberry /99 parallel now search with the identical string — this
    // just confirms two separate searches actually happened for the two
    // distinct owned variants, not that their query text differs.
    // fetchNextWindow keeps hopping tiers/wrapping to fill WINDOW_SIZE (see
    // the priority-order test's note below) — assert "at least the two
    // owned-variant searches happened," not an exact count, same robustness
    // the original version of this test already used.
    const queries = mockSearchItems.mock.calls.map((c) => c[0] as string);
    const betaQueries = queries.filter((q) => q === "Random Sports Set Card Beta #2");
    expect(betaQueries.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects a plain-base listing for a numbered-parallel target that doesn't actually mention the parallel or its serial run", async () => {
    // Query text no longer distinguishes the base print from the Cranberry
    // /99 parallel (2026-08-12 fix — see file note), so both now search with
    // the identical string — differentiate by call order instead.
    // ownedVariantIds sorts ascending ("variant-1" before
    // "variant-1-cranberry" lexicographically), so the base target is always
    // searched first.
    let callCount = 0;
    mockSearchItems.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Base target's own listing — a plain match, nothing to reject.
        return Promise.resolve({
          total: 1,
          items: [
            {
              itemId: "base-item",
              title: "2025 Random Sports Set Card Beta #2",
              price: { value: "5.00", currency: "USD" },
              imageUrl: null,
              itemWebUrl: "https://ebay.com/item",
              condition: null,
              buyingOptions: ["FIXED_PRICE"],
            },
          ],
        });
      }
      // Cranberry /99 target's search — eBay returns a generic base-card
      // listing with no mention of Cranberry or /99 — must NOT be trusted as
      // this parallel's price.
      return Promise.resolve({
        total: 1,
        items: [
          {
            itemId: "wrong-item",
            title: "2025 Random Sports Set Card Beta #2",
            price: { value: "500.00", currency: "USD" },
            imageUrl: null,
            itemWebUrl: "https://ebay.com/item",
            condition: null,
            buyingOptions: ["FIXED_PRICE"],
          },
        ],
      });
    });

    const { writePriceObservationsBatch } = await import("@/lib/pricing/write-observation");
    const writeMock = writePriceObservationsBatch as unknown as ReturnType<typeof vi.fn>;
    writeMock.mockClear();

    await sweepEbayCatalog({ timeBudgetMs: Infinity });

    const cranberryCall = writeMock.mock.calls.find((c: unknown[]) => (c[0] as Array<{ variantId: string }>)?.[0]?.variantId === "variant-1-cranberry");
    expect(cranberryCall).toBeUndefined(); // the mismatched $500 listing must never reach the write layer

    const baseCall = writeMock.mock.calls.find((c: unknown[]) => (c[0] as Array<{ variantId: string }>)?.[0]?.variantId === "variant-1");
    expect(baseCall).toBeDefined(); // the plain base variant's own (matching) listing still writes fine
  });

  it("rejects a listing for the base target that's actually describing its own sibling parallel (real bug, 2026-08-12)", async () => {
    // The opposite direction from the test above: a real user report found
    // base-variant searches had NO protection against silently absorbing a
    // sibling parallel's price, since a base target has no variantKeywords
    // to require and (before this fix) nothing to exclude either. Base
    // target is always searched first (see the call-order note above).
    let callCount = 0;
    mockSearchItems.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Base target's search — eBay returns a listing that actually
        // describes the Cranberry /99 parallel, not the plain base card.
        // Must be rejected via excludeKeywords, not silently accepted.
        return Promise.resolve({
          total: 1,
          items: [
            {
              itemId: "actually-cranberry",
              title: "2025 Random Sports Set Card Beta #2 Cranberry - Base /99",
              price: { value: "500.00", currency: "USD" },
              imageUrl: null,
              itemWebUrl: "https://ebay.com/item",
              condition: null,
              buyingOptions: ["FIXED_PRICE"],
            },
          ],
        });
      }
      // Cranberry /99 target's own search — its real matching listing.
      return Promise.resolve({
        total: 1,
        items: [
          {
            itemId: "real-cranberry",
            title: "2025 Random Sports Set Card Beta #2 Cranberry - Base /99",
            price: { value: "45.00", currency: "USD" },
            imageUrl: null,
            itemWebUrl: "https://ebay.com/item",
            condition: null,
            buyingOptions: ["FIXED_PRICE"],
          },
        ],
      });
    });

    const { writePriceObservationsBatch } = await import("@/lib/pricing/write-observation");
    const writeMock = writePriceObservationsBatch as unknown as ReturnType<typeof vi.fn>;
    writeMock.mockClear();

    await sweepEbayCatalog({ timeBudgetMs: Infinity });

    const baseCall = writeMock.mock.calls.find((c: unknown[]) => (c[0] as Array<{ variantId: string }>)?.[0]?.variantId === "variant-1");
    expect(baseCall).toBeUndefined(); // the $500 Cranberry-describing listing must never be written as the base price

    const cranberryCall = writeMock.mock.calls.find((c: unknown[]) => (c[0] as Array<{ variantId: string }>)?.[0]?.variantId === "variant-1-cranberry");
    expect(cranberryCall).toBeDefined(); // the parallel's own real listing still writes fine
  });
});

describe("sweepEbayCatalog — priority order is owned, then base catalog, then unowned rarities (never rarity-first)", () => {
  // card-a is owned via a DISTINCT parallel print ("Owned Foil") so its
  // query text can't be confused with card-a's own separate base-card
  // search under Priority 2 — both legitimately fire, at different tiers.
  // card-c additionally has an unowned rare parallel only Priority 3 should
  // ever reach.
  const OWNED_VARIANT = {
    id: "variant-owned-foil",
    cardId: "card-a",
    parallelId: "parallel-owned-foil",
    insertId: null,
    parallel: { name: "Owned Foil", color: null },
    insert: null,
    serialTo: null,
    card: ALL_CARDS[0],
  };
  const UNOWNED_RARE_VARIANT = {
    id: "variant-rare",
    cardId: "card-c",
    parallelId: "parallel-rare",
    insertId: null,
    parallel: { name: "Rare Foil", color: "Gold" },
    insert: null,
    serialTo: 10,
    card: ALL_CARDS[2],
  };

  beforeEach(() => {
    mockDataSourceUpdate.mockClear();
    mockDataSourceFindUnique.mockResolvedValue({ syncCursor: null });
    mockSetFindMany.mockResolvedValue(SETS);
    mockInstanceFindMany.mockResolvedValue([{ variantId: OWNED_VARIANT.id }]);
    mockCardFindMany.mockImplementation(({ where, cursor, skip, take }: { where: Record<string, unknown>; cursor?: { id: string }; skip?: number; take: number }) => {
      const filtered = [...applyCardFilter(where)].sort((a, b) => a.id.localeCompare(b.id));
      let startIdx = 0;
      if (cursor?.id) {
        const idx = filtered.findIndex((c) => c.id === cursor.id);
        startIdx = idx === -1 ? filtered.length : idx + (skip ?? 0);
      }
      return Promise.resolve(filtered.slice(startIdx, startIdx + take));
    });
    mockVariantFindMany.mockImplementation(({ where }: { where: { id?: { in: string[] } | { notIn: string[] }; cardId?: { in: string[] } } }) => {
      if (where.id && "in" in where.id) {
        const byId = new Map([[OWNED_VARIANT.id, OWNED_VARIANT]]);
        return Promise.resolve(where.id.in.map((id) => byId.get(id)).filter(Boolean));
      }
      if (where.id && "notIn" in where.id) {
        return Promise.resolve(where.id.notIn.includes(UNOWNED_RARE_VARIANT.id) ? [] : [UNOWNED_RARE_VARIANT]);
      }
      const ids = where.cardId!.in;
      return Promise.resolve(ALL_VARIANTS.filter((v) => ids.includes(v.cardId)));
    });
    mockSearchItems.mockReset().mockResolvedValue({
      total: 1,
      items: [
        {
          itemId: "item-1",
          title: "match-everything placeholder",
          price: { value: "5.00", currency: "USD" },
          imageUrl: null,
          itemWebUrl: "https://ebay.com/item",
          condition: null,
          buyingOptions: ["FIXED_PRICE"],
        },
      ],
    });
  });

  it("searches the owned print first, all three base cards next, and the unowned rare parallel dead last", async () => {
    await sweepEbayCatalog({ timeBudgetMs: Infinity });

    // Query strings no longer carry the insert/parallel name (2026-08-12 fix
    // — see sweep-catalog.ts's note on why: appending it made eBay's search
    // return zero results for insert/parallel variants). That means the
    // owned foil print and card Alpha's later base-representative search now
    // produce the *same* query string, as do Gamma's base-representative
    // search and the unowned rare parallel search — distinguishing "which
    // target" now requires call position, not distinct query content, so
    // this asserts the whole ordered sequence directly instead of searching
    // for unique strings.
    const queries = mockSearchItems.mock.calls.map((c) => c[0] as string);
    expect(queries).toEqual([
      "Random Sports Set Card Alpha #1", // Priority 1: the owned foil print (tier 0) — searched first
      "Random Sports Set Card Alpha #1", // Priority 2: base-representative for the same card
      "Random Sports Set Card Beta #2",
      "Random Sports Set Card Gamma #3",
      "Random Sports Set Card Gamma #3", // Priority 3: the unowned rare parallel — dead last, never ahead of Priority 1/2
      // fetchNextWindow keeps hopping tiers to fill WINDOW_SIZE even after a
      // full lap completes (only 5 real targets exist here) — pre-existing,
      // documented behavior (see its own "at most one full pass ... plus a
      // small safety margin" comment), not something this fix changed.
      "Random Sports Set Card Alpha #1",
    ]);
  });
});
