import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSessionFindUnique,
  mockSessionUpdate,
  mockInstanceCreate,
  mockEventCreate,
  mockRowUpdate,
  mockVariantFindUnique,
  mockRequireUser,
  mockIsPro,
  mockGetOwnedSetIds,
} = vi.hoisted(() => ({
  mockSessionFindUnique: vi.fn(),
  mockSessionUpdate: vi.fn(),
  mockInstanceCreate: vi.fn(),
  mockEventCreate: vi.fn(),
  mockRowUpdate: vi.fn(),
  mockVariantFindUnique: vi.fn(),
  mockRequireUser: vi.fn(),
  mockIsPro: vi.fn(),
  mockGetOwnedSetIds: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    migrationSession: { findUnique: mockSessionFindUnique, update: mockSessionUpdate },
    instance: { create: mockInstanceCreate },
    event: { create: mockEventCreate },
    migrationRow: { update: mockRowUpdate },
    variant: { findUnique: mockVariantFindUnique },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserForAction: mockRequireUser,
}));

vi.mock("@/lib/billing/entitlements", () => ({
  isPro: mockIsPro,
  getOwnedSetIds: mockGetOwnedSetIds,
  FREE_SET_LIMIT: 4,
}));

import { commitMigration } from "../commit";

describe("commitMigration — ownership boundary", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockReset();
    mockSessionUpdate.mockReset();
    mockInstanceCreate.mockReset();
    mockEventCreate.mockReset();
    mockRowUpdate.mockReset();
    mockVariantFindUnique.mockReset();
    mockRequireUser.mockReset();
    mockIsPro.mockReset();
    mockGetOwnedSetIds.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
    // Default to Pro so the existing ownership-boundary tests below exercise
    // exactly the behavior they did before free-tier gating existed — the
    // gating itself is covered separately below.
    mockIsPro.mockResolvedValue(true);
  });

  it("rejects committing a session that doesn't exist", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    await expect(commitMigration("sess-missing")).rejects.toThrow(/unauthorized|not found/i);
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it("rejects committing a session owned by another user, even if the caller supplies its id directly", async () => {
    mockSessionFindUnique.mockResolvedValue({ id: "sess-1", userId: "user-b", status: "STAGED", rows: [] });

    await expect(commitMigration("sess-1")).rejects.toThrow(/unauthorized/i);
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it("rejects committing a session that isn't staged", async () => {
    mockSessionFindUnique.mockResolvedValue({ id: "sess-1", userId: "user-a", status: "COMPLETED", rows: [] });

    await expect(commitMigration("sess-1")).rejects.toThrow(/not ready to commit/i);
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it("commits matched rows for the owning user and skips rows with no resolved variant", async () => {
    mockSessionFindUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-a",
      status: "STAGED",
      sourceAdapter: "generic_csv",
      rows: [
        { id: "row-1", status: "STAGED_MATCH", resolvedVariantId: "variant-1", condition: "near-mint", purchasePrice: 10, purchaseDate: null },
        { id: "row-2", status: "STAGED_MATCH", resolvedVariantId: null },
        { id: "row-3", status: "STAGED_REVIEW", resolvedVariantId: "variant-3" },
      ],
    });
    mockInstanceCreate.mockResolvedValue({ id: "instance-1" });

    const result = await commitMigration("sess-1");

    expect(result).toEqual({ success: true, importedCount: 1, skippedForTierLimitCount: 0 });
    expect(mockInstanceCreate).toHaveBeenCalledTimes(1);
    expect(mockInstanceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-a", variantId: "variant-1" }) })
    );
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-a", instanceId: "instance-1" }) })
    );
    expect(mockSessionUpdate).toHaveBeenCalledWith({ where: { id: "sess-1" }, data: { status: "COMMITTING" } });
    expect(mockSessionUpdate).toHaveBeenCalledWith({ where: { id: "sess-1" }, data: { status: "COMPLETED" } });
  });
});

describe("commitMigration — free-tier set cap", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockReset();
    mockSessionUpdate.mockReset();
    mockInstanceCreate.mockReset();
    mockEventCreate.mockReset();
    mockRowUpdate.mockReset();
    mockVariantFindUnique.mockReset();
    mockRequireUser.mockReset();
    mockIsPro.mockReset();
    mockGetOwnedSetIds.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
    mockIsPro.mockResolvedValue(false);
  });

  it("skips rows that would push a free-tier user past the set cap, and still commits the rest", async () => {
    mockGetOwnedSetIds.mockResolvedValue(new Set(["set-1", "set-2", "set-3", "set-4"]));
    mockSessionFindUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-a",
      status: "STAGED",
      sourceAdapter: "generic_csv",
      rows: [
        { id: "row-1", status: "STAGED_MATCH", resolvedVariantId: "variant-in-owned-set", condition: "near-mint", purchasePrice: null, purchaseDate: null },
        { id: "row-2", status: "STAGED_MATCH", resolvedVariantId: "variant-in-new-set", condition: "near-mint", purchasePrice: null, purchaseDate: null },
      ],
    });
    mockVariantFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "variant-in-owned-set" ? { card: { setId: "set-1" } } : { card: { setId: "set-5" } }
      )
    );
    mockInstanceCreate.mockResolvedValue({ id: "instance-1" });

    const result = await commitMigration("sess-1");

    expect(result).toEqual({ success: true, importedCount: 1, skippedForTierLimitCount: 1 });
    expect(mockInstanceCreate).toHaveBeenCalledTimes(1);
    expect(mockInstanceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ variantId: "variant-in-owned-set" }) })
    );
    expect(mockRowUpdate).toHaveBeenCalledWith({ where: { id: "row-2" }, data: { status: "SKIPPED_TIER_LIMIT" } });
  });
});
