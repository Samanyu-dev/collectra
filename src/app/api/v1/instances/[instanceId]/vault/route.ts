import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { toggleVaultedForUser } from "@/lib/actions/collection";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/instances/[instanceId]/vault — same ownership-scoping
 * reasoning as the favorite endpoint in this same directory tree: instance
 * ownership is checked explicitly before delegating to the variant-scoped
 * toggleVaultedForUser, so a guessed/enumerated instanceId belonging to
 * another user can never be mutated.
 */
export async function POST(req: Request, { params }: { params: Promise<{ instanceId: string }> }) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const { instanceId } = await params;

    const instance = await prisma.instance.findUnique({ where: { id: instanceId }, select: { id: true, userId: true, variantId: true } });
    if (!instance || instance.userId !== user.id) {
      throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, "Instance not found in your collection.");
    }

    const updated = await toggleVaultedForUser(user.id, instance.variantId);
    return apiSuccess({ instanceId: instance.id, vaulted: updated?.isVaulted ?? false });
  });
}
