import { describe, it, expect, vi } from "vitest";
import { MigrationMatchingEngine } from "../matching-engine";
import type { CanonicalMigrationRow } from "../adapters/base";

function row(overrides: Partial<CanonicalMigrationRow> = {}): CanonicalMigrationRow {
  return { name: "Charizard", quantity: 1, isGraded: false, ...overrides };
}

describe("MigrationMatchingEngine — existing set-provided path (CSV import) is unaffected", () => {
  it("still resolves a single unambiguous variant when a set name is given, exactly as before", async () => {
    const prisma = {
      set: { findMany: vi.fn().mockResolvedValue([{ id: "set-1", name: "Base Set" }]) },
      card: {
        findMany: vi.fn().mockResolvedValue([
          { id: "card-1", name: "Charizard", variants: [{ id: "variant-1" }] },
        ]),
      },
    } as any;

    const engine = new MigrationMatchingEngine(prisma);
    const result = await engine.match(row({ setName: "Base Set", cardNumber: "4" }));

    expect(result.variantId).toBe("variant-1");
    expect(result.confidence).toBeGreaterThan(80);
    // The new set-less branches must never run when a setName was provided.
    expect(prisma.card.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("MigrationMatchingEngine — new set-less path (Scanner/OCR)", () => {
  it("resolves a single global match on card number + name when no set name is given", async () => {
    const prisma = {
      set: { findMany: vi.fn() }, // must never be called — no setName provided
      card: {
        findMany: vi
          .fn()
          // First call: the existing §2 path would run if setMatches.length===1,
          // but it won't here since setMatches stays empty — so this mock only
          // ever serves the new global (§2b) lookup.
          .mockResolvedValue([
            { id: "card-1", name: "Charizard", number: "4", set: { name: "Base Set" }, variants: [{ id: "variant-1" }] },
          ]),
      },
    } as any;

    const engine = new MigrationMatchingEngine(prisma);
    const result = await engine.match(row({ cardNumber: "4" })); // no setName

    expect(prisma.set.findMany).not.toHaveBeenCalled();
    expect(result.variantId).toBe("variant-1");
    expect(result.reasons.some((r) => r.includes("no set name provided"))).toBe(true);
  });

  it("returns multiple top-level candidates when the same card number appears in different sets", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: {
        findMany: vi.fn().mockResolvedValue([
          { id: "card-1", name: "Charizard", number: "4", set: { name: "Base Set" }, variants: [{ id: "variant-1" }] },
          { id: "card-2", name: "Charizard", number: "4", set: { name: "Base Set 2" }, variants: [{ id: "variant-2" }] },
        ]),
      },
    } as any;

    const engine = new MigrationMatchingEngine(prisma);
    const result = await engine.match(row({ cardNumber: "4" }));

    expect(result.variantId).toBeUndefined();
    expect(result.matchCandidates).toBeDefined();
    expect(result.matchCandidates!.map((c) => c.variantId).sort()).toEqual(["variant-1", "variant-2"]);
  });

  it("falls back to a low-confidence, capped name-only match when there's no set name and no card number", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: {
        findMany: vi.fn().mockResolvedValue([
          { id: "card-1", name: "Charizard", number: "4", set: { name: "Base Set" }, variants: [{ id: "variant-1" }] },
        ]),
      },
    } as any;

    const engine = new MigrationMatchingEngine(prisma);
    const result = await engine.match(row()); // no setName, no cardNumber

    expect(result.confidence).toBeLessThanOrEqual(40); // deliberately capped — name-only is the weakest real signal
    expect(result.matchCandidates?.[0]?.variantId).toBe("variant-1");
  });

  it("reports no match, not a fabricated guess, when nothing scores high enough", async () => {
    const prisma = {
      set: { findMany: vi.fn() },
      card: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const engine = new MigrationMatchingEngine(prisma);
    const result = await engine.match(row({ cardNumber: "999" }));

    expect(result.variantId).toBeUndefined();
    expect(result.matchCandidates).toBeUndefined();
    expect(result.reasons.some((r) => r.includes("✕"))).toBe(true);
  });
});
