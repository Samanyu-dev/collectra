import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockRequireUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockRequireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    migrationRow: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserForAction: mockRequireUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { resolveMigrationRow, ignoreMigrationRow } from "../rows";

describe("migration row actions — ownership boundary", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
    mockRequireUser.mockReset();
    mockRequireUser.mockResolvedValue({ id: "user-a" });
  });

  it("rejects resolving a row that belongs to another user's session", async () => {
    mockFindUnique.mockResolvedValue({ id: "row-1", session: { userId: "user-b" } });

    await expect(resolveMigrationRow("row-1", "variant-1")).rejects.toThrow(/unauthorized/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects resolving a row that doesn't exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(resolveMigrationRow("missing-row", "variant-1")).rejects.toThrow(/unauthorized|not found/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows resolving a row owned by the caller", async () => {
    mockFindUnique.mockResolvedValue({ id: "row-1", sessionId: "sess-1", session: { userId: "user-a" } });
    mockUpdate.mockResolvedValue({ id: "row-1", sessionId: "sess-1" });

    await resolveMigrationRow("row-1", "variant-1");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "row-1" },
      data: { resolvedVariantId: "variant-1", status: "STAGED_MATCH" },
    });
  });

  it("rejects ignoring a row that belongs to another user's session", async () => {
    mockFindUnique.mockResolvedValue({ id: "row-2", session: { userId: "user-b" } });

    await expect(ignoreMigrationRow("row-2")).rejects.toThrow(/unauthorized/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows ignoring a row owned by the caller", async () => {
    mockFindUnique.mockResolvedValue({ id: "row-2", sessionId: "sess-1", session: { userId: "user-a" } });
    mockUpdate.mockResolvedValue({ id: "row-2", sessionId: "sess-1" });

    await ignoreMigrationRow("row-2");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "row-2" },
      data: { status: "IGNORED" },
    });
  });
});
