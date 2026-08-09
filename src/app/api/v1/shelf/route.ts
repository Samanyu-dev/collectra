import { requireApiUser } from "@/lib/auth/api";
import { getCollectionWorkspace } from "@/lib/collection/workspace";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/shelf — the authenticated user's personal collection.
 * Delegates entirely to `getCollectionWorkspace(userId)`
 * (src/lib/collection/workspace.ts), the same userId-scoped aggregation the
 * web `/shelf` page already uses — its own doc comment says it exists
 * specifically so "the same aggregation is reusable later (mobile, ...)
 * without re-deriving it." No separate query logic here.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const workspace = await getCollectionWorkspace(user.id);
    return apiSuccess(workspace);
  });
}
