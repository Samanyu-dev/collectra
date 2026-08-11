import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { incrementVariantQuantityForUser, decrementVariantQuantityForUser } from "@/lib/actions/collection";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/cards/[id]/variants/[variantId]/quantity — { action: "increment" | "decrement" }.
 * Delegates to the exact same domain logic the web `/cards/[id]` page's
 * quantity controls use (src/lib/actions/collection.ts's
 * increment/decrementVariantQuantityForUser) — no duplicated Prisma writes,
 * no duplicated "can't remove a copy with an active listing" rule.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const { id: cardId, variantId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiRequestError(400, ApiErrorCodes.VALIDATION_ERROR, "Request body must be valid JSON.");
    }
    const action = (body as { action?: unknown })?.action;
    if (action !== "increment" && action !== "decrement") {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`action` must be \"increment\" or \"decrement\".");
    }

    const variant = await prisma.variant.findUnique({ where: { id: variantId }, select: { id: true, cardId: true } });
    if (!variant) throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, "Variant not found.");
    if (variant.cardId !== cardId) {
      throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, "Variant does not belong to the specified card.");
    }

    try {
      const result =
        action === "increment"
          ? await incrementVariantQuantityForUser(user.id, variantId, { cardId })
          : await decrementVariantQuantityForUser(user.id, variantId, { cardId });
      return apiSuccess(result);
    } catch (e) {
      // decrementVariantQuantityForUser throws a plain Error for the one
      // real business rule violation ("finish the active listing first") —
      // surface it as a 409 rather than letting withApiErrorHandling treat
      // it as an unexpected 500.
      if (e instanceof Error && e.message.includes("active listing")) {
        throw new ApiRequestError(409, ApiErrorCodes.VALIDATION_ERROR, e.message);
      }
      if (e instanceof Error && e.message.startsWith("PAYWALL_")) {
        throw new ApiRequestError(402, ApiErrorCodes.PAYWALL, e.message);
      }
      throw e;
    }
  });
}
