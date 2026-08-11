import { requireApiUser } from "@/lib/auth/api";
import { getScanQuotaStatus } from "@/lib/billing/entitlements";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/scan/quota — read-only pre-flight check for Phase 6C's mobile
 * scan gate ("don't open the camera if the quota's already spent"). No
 * equivalent existed pre-Phase 6: the web scan flow just lets you try and
 * shows the PAYWALL error at confirm time, which is fine for a page reload
 * but wastes a camera session on mobile. Narrowly scoped to scan quota only
 * (not the set-limit paywall, which only applies at confirm time, after this
 * phase's scope ends) — see getScanQuotaStatus's doc comment.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const status = await getScanQuotaStatus(user.id);
    return apiSuccess(status);
  });
}
