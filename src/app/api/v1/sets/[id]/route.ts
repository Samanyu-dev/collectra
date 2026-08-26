import { prisma } from "@/lib/prisma";
import { getImagesForEntity } from "@/lib/media/resolve";
import { getSetProgressForUser } from "@/lib/collection/set-progress";
import { getApiUser } from "@/lib/auth/api";
import { apiSuccess, apiError, withApiErrorHandling, ApiErrorCodes } from "@/lib/api/response";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/sets/[id] — public set detail (metadata + owned progress when
 * authenticated). The card grid for this set is fetched separately via the
 * already-existing `GET /api/v1/cards?setId=` — this route is header data
 * only, mirroring how the web `/collections/[id]` page separates set
 * metadata from its card checklist.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const { id: setId } = await params;

    const set = await prisma.set.findUnique({
      where: { id: setId },
      include: {
        series: { include: { franchise: true, brand: true } },
        releases: { orderBy: { date: "asc" }, take: 1, select: { date: true } },
        _count: { select: { cards: true } },
      },
    });
    if (!set) return apiError(ApiErrorCodes.NOT_FOUND, "Set not found.", 404);

    const [image, apiUser] = await Promise.all([getImagesForEntity("Set", set.id), getApiUser(req)]);
    const progress = apiUser ? (await getSetProgressForUser(apiUser.id, [set.id])).get(set.id) ?? null : null;

    return apiSuccess({
      id: set.id,
      name: set.name,
      franchiseName: set.series.franchise.name,
      brandName: set.series.brand.name,
      seriesName: set.series.name,
      imageUrl: pickPrimaryImage(image)?.url ?? null,
      releaseDate: set.releases[0]?.date ?? null,
      printedTotal: set.printedTotal || set._count.cards || 0,
      ownedCount: progress?.ownedCount ?? 0,
      totalValueUsd: progress?.totalValueUsd ?? 0,
    });
  });
}
