import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/me — authenticated profile + a small collection summary.
 * Deliberately NOT the full dashboard/intelligence-feed system (that's a
 * separate, larger scope) — just enough for the app's profile screen and to
 * confirm auth is working end-to-end.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    const [instanceCount, uniqueVariantCount, favoriteCount, vaultedCount, wishlistCount] = await Promise.all([
      prisma.instance.count({ where: { userId: user.id } }),
      prisma.instance.findMany({ where: { userId: user.id }, distinct: ["variantId"], select: { variantId: true } }).then((r) => r.length),
      prisma.instance.count({ where: { userId: user.id, isFavorite: true } }),
      prisma.instance.count({ where: { userId: user.id, isVaulted: true } }),
      prisma.wishlist.count({ where: { userId: user.id } }),
    ]);

    return apiSuccess({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      collectionSummary: {
        totalCards: instanceCount,
        uniqueCards: uniqueVariantCount,
        favoriteCount,
        vaultedCount,
        wishlistCount,
      },
    });
  });
}
