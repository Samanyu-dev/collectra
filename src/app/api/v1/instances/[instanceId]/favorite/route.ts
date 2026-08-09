import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { toggleFavoriteForUser } from "@/lib/actions/collection";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/instances/[instanceId]/favorite — toggles favorite on one
 * owned copy. `toggleFavoriteForUser` itself already scopes its update to
 * `{ userId, variantId }`, but that's keyed by variant, not this specific
 * instance — so ownership of THIS instanceId is checked explicitly first,
 * otherwise a caller could toggle another user's favorite state on a shared
 * variantId by guessing/enumerating instance ids.
 */
export async function POST(req: Request, { params }: { params: Promise<{ instanceId: string }> }) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const { instanceId } = await params;

    const instance = await prisma.instance.findUnique({ where: { id: instanceId }, select: { id: true, userId: true, variantId: true } });
    if (!instance || instance.userId !== user.id) {
      // Same 404 whether the instance doesn't exist or belongs to someone
      // else — never confirm another user's instance id exists.
      throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, "Instance not found in your collection.");
    }

    const updated = await toggleFavoriteForUser(user.id, instance.variantId);
    return apiSuccess({ instanceId: instance.id, favorited: updated?.isFavorite ?? false });
  });
}
