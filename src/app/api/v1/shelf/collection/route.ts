import { requireApiUser } from "@/lib/auth/api";
import { getShelfCollectionItems } from "@/lib/collection/workspace";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/shelf/collection — lean counterpart to `GET /api/v1/shelf`
 * for clients (the iOS Shelf) that only need the card-tile grid, not the
 * full dashboard aggregation (setProgress, top teams/sets/players,
 * portfolio history, activity feed, intelligence-feed health/completion
 * scores). Purely additive: does not change `/api/v1/shelf`'s behavior or
 * the web `/shelf` page, which still calls `getCollectionWorkspace`
 * directly and is untouched. See `getShelfCollectionItems`'s doc comment
 * (src/lib/collection/workspace.ts) for the profiling that justified this —
 * a Phase 5 investigation finding, not a speculative optimization.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);
    const items = await getShelfCollectionItems(user.id);
    return apiSuccess({ items });
  });
}
