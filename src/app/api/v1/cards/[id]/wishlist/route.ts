import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { toggleWishlistForUser } from "@/lib/actions/wishlist";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/** POST /api/v1/cards/[id]/wishlist — toggle, delegates to the same logic `/wishlist` (web) uses. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const { id: cardId } = await params;

    const card = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true } });
    if (!card) throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, "Card not found.");

    const result = await toggleWishlistForUser(user.id, cardId);
    return apiSuccess(result);
  });
}
