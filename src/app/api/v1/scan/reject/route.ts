import { requireApiUser } from "@/lib/auth/api";
import { rejectScanMatchForUser } from "@/lib/actions/scanner";
import { apiSuccess, withApiErrorHandling, ApiRequestError, ApiErrorCodes } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface RejectRequestBody {
  mediaId?: unknown;
  variantId?: unknown;
}

/**
 * POST /api/v1/scan/reject — { mediaId, variantId }.
 * Delegates to rejectScanMatchForUser (src/lib/actions/scanner.ts) — free
 * against the scan quota, recorded so checkRejectedScanAbuse can catch the
 * reject-then-add-anyway abuse pattern.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    let body: RejectRequestBody;
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

    try {
      await rejectScanMatchForUser(user.id, body.mediaId, body.variantId);
      return apiSuccess({ ok: true });
    } catch (e) {
      if (e instanceof Error && e.message === "Scan photo not found") {
        throw new ApiRequestError(404, ApiErrorCodes.NOT_FOUND, e.message);
      }
      throw e;
    }
  });
}
