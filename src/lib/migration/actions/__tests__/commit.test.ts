import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSessionFindUnique,
  mockSessionUpdate,
  mockInstanceCreate,
  mockEventCreate,
  mockRowUpdate,
  mockRequireUser,
} = vi.hoisted(() => ({
  mockSessionFindUnique: vi.fn(),
  mockSessionUpdate: vi.fn(),
  mockInstanceCreate: vi.fn(),
  mockEventCreate: vi.fn(),
  mockRowUpdate: vi.fn(),
  mockRequireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    migrationSession: { findUnique: mockSessionFindUnique, update: mockSessionUpdate },
    instance: { create: mockInstanceCreate },
    event: { create: mockEventCreate },
    migrationRow: { update: mockRowUpdate },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserForAction: mockRequireUser,
}));

import { commitMigration } from "../commit";

describe("commitMigration — ownership boundary", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockReset();
    mockSessionUpdate.mockReset();
    mockInstanceCreate.mockReset();
    mockEventCreate.mockReset();
    mockRowUpdate.mockReset();
    mockRequireUser.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
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

    expect(result).toEqual({ success: true, importedCount: 1 });
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
