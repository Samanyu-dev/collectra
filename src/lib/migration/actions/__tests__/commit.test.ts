import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSessionFindUnique,
  mockSessionUpdate,
  mockInstanceCreate,
  mockEventCreate,
  mockRowUpdate,
  mockVariantFindUnique,
  mockRequireUser,
  mockGetSubscriptionTier,
  mockGetOwnedSetIds,
} = vi.hoisted(() => ({
  mockSessionFindUnique: vi.fn(),
  mockSessionUpdate: vi.fn(),
  mockInstanceCreate: vi.fn(),
  mockEventCreate: vi.fn(),
  mockRowUpdate: vi.fn(),
  mockVariantFindUnique: vi.fn(),
  mockRequireUser: vi.fn(),
  mockGetSubscriptionTier: vi.fn(),
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
  getSubscriptionTier: mockGetSubscriptionTier,
  getOwnedSetIds: mockGetOwnedSetIds,
  // Real (trivial, pure) implementation rather than a second mock to keep
  // in sync — same 4/20/unlimited mapping as the real one in entitlements.ts.
  getSetLimitForTier: (tier: "free" | "plus" | "pro") => (tier === "pro" ? Infinity : tier === "plus" ? 20 : 4),
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
    mockGetSubscriptionTier.mockReset();
    mockGetOwnedSetIds.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
    // Default to Pro so the existing ownership-boundary tests below exercise
    // exactly the behavior they did before tiered gating existed — the
    // gating itself is covered separately below.
    mockGetSubscriptionTier.mockResolvedValue("pro");
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
    mockGetSubscriptionTier.mockReset();
    mockGetOwnedSetIds.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
    mockGetSubscriptionTier.mockResolvedValue("free");
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

describe("commitMigration — Plus-tier set cap", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockReset();
    mockSessionUpdate.mockReset();
    mockInstanceCreate.mockReset();
    mockEventCreate.mockReset();
    mockRowUpdate.mockReset();
    mockVariantFindUnique.mockReset();
    mockRequireUser.mockReset();
    mockGetSubscriptionTier.mockReset();
    mockGetOwnedSetIds.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
    mockGetSubscriptionTier.mockResolvedValue("plus");
  });

  it("allows a Plus-tier user up to 20 sets, not the Free 4-set ceiling", async () => {
    mockGetOwnedSetIds.mockResolvedValue(new Set(Array.from({ length: 19 }, (_, i) => `set-${i}`)));
    mockSessionFindUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-a",
      status: "STAGED",
      sourceAdapter: "generic_csv",
      rows: [
        { id: "row-1", status: "STAGED_MATCH", resolvedVariantId: "variant-in-new-set-20", condition: "near-mint", purchasePrice: null, purchaseDate: null },
        { id: "row-2", status: "STAGED_MATCH", resolvedVariantId: "variant-in-new-set-21", condition: "near-mint", purchasePrice: null, purchaseDate: null },
      ],
    });
    mockVariantFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "variant-in-new-set-20" ? { card: { setId: "set-20th" } } : { card: { setId: "set-21st" } }
      )
    );
    mockInstanceCreate.mockResolvedValue({ id: "instance-1" });

    const result = await commitMigration("sess-1");

    // The 20th set (bringing the user from 19 to 20 owned sets) is still
    // allowed; the 21st is beyond the Plus ceiling and gets skipped.
    expect(result).toEqual({ success: true, importedCount: 1, skippedForTierLimitCount: 1 });
    expect(mockInstanceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ variantId: "variant-in-new-set-20" }) })
    );
    expect(mockRowUpdate).toHaveBeenCalledWith({ where: { id: "row-2" }, data: { status: "SKIPPED_TIER_LIMIT" } });
  });
});
