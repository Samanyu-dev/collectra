import { requireApiUser } from "@/lib/auth/api";
import { confirmScanMatchForUser } from "@/lib/actions/scanner";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface ConfirmRequestBody {
  mediaId?: unknown;
  variantId?: unknown;
  condition?: unknown;
  contributeToPublicCatalog?: unknown;
}

/**
 * POST /api/v1/scan/confirm — { mediaId, variantId, condition, contributeToPublicCatalog? }.
 * Delegates to confirmScanMatchForUser (src/lib/actions/scanner.ts) — the
 * exact same domain logic the web scan flow's confirm step uses, including
 * the free-tier scan/set quota checks.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    let body: ConfirmRequestBody;
    try {
      body = await req.json();
    } catch {
      throw new ApiRequestError(400, ApiErrorCodes.VALIDATION_ERROR, "Request body must be valid JSON.");
    }

    if (typeof body.mediaId !== "string" || body.mediaId.length === 0) {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`mediaId` is required.");
    }
    if (typeof body.variantId !== "string" || body.variantId.length === 0) {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`variantId` is required.");
    }
    if (typeof body.condition !== "string" || body.condition.length === 0) {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`condition` is required.");
    }
    if (body.contributeToPublicCatalog !== undefined && typeof body.contributeToPublicCatalog !== "boolean") {
      throw new ApiRequestError(422, ApiErrorCodes.VALIDATION_ERROR, "`contributeToPublicCatalog` must be a boolean.");
    }

    try {
      const result = await confirmScanMatchForUser(user.id, {
        mediaId: body.mediaId,
        variantId: body.variantId,
        condition: body.condition,
        contributeToPublicCatalog: body.contributeToPublicCatalog,
      });
      return apiSuccess(result);
    } catch (e) {
      // Same PAYWALL_* -> 402 mapping the quantity route already establishes
      // as this API's convention (src/app/api/v1/cards/[id]/variants/[variantId]/quantity/route.ts).
      if (e instanceof Error && e.message.startsWith("PAYWALL_")) {
        throw new ApiRequestError(402, ApiErrorCodes.PAYWALL, e.message);
      }
      if (e instanceof Error && (e.message === "Variant not found" || e.message === "Scan photo not found")) {
        throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, e.message);
      }
      throw e;
    }
  });
}
