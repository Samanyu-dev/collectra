import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockCreate, mockDelete, mockFindMany, mockEventCreate, mockRequireUser, mockGetCurrentUser } =
  vi.hoisted(() => ({
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
    mockDelete: vi.fn(),
    mockFindMany: vi.fn(),
    mockEventCreate: vi.fn(),
    mockRequireUser: vi.fn(),
    mockGetCurrentUser: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist: { findFirst: mockFindFirst, create: mockCreate, delete: mockDelete, findMany: mockFindMany },
    event: { create: mockEventCreate },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserForAction: mockRequireUser,
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { toggleWishlist, getWishlistedCardIds } from "../wishlist";

describe("wishlist actions — ownership boundary", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockCreate.mockReset();
    mockDelete.mockReset();
    mockFindMany.mockReset();
    mockEventCreate.mockReset();
    mockRequireUser.mockReset();
    mockGetCurrentUser.mockReset();
  });

  it("scopes toggleWishlist writes to the authenticated caller, not a client-suppliable id", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-a" });
    mockFindFirst.mockResolvedValue(null);

    await toggleWishlist("card-1");

    expect(mockFindFirst).toHaveBeenCalledWith({ where: { userId: "user-a", cardId: "card-1" } });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-a", cardId: "card-1" }) })
    );
  });

  it("returns no wishlisted cards for an anonymous visitor instead of throwing", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await getWishlistedCardIds(["card-1", "card-2"]);

    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("scopes getWishlistedCardIds reads to the authenticated caller", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-a" });
    mockFindMany.mockResolvedValue([{ cardId: "card-1" }]);

    const result = await getWishlistedCardIds(["card-1", "card-2"]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-a", cardId: { in: ["card-1", "card-2"] } },
      select: { cardId: true },
    });
    expect(result).toEqual(["card-1"]);
  });
});
