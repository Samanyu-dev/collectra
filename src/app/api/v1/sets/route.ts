import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { getSetProgressForUser } from "@/lib/collection/set-progress";
import { getApiUser } from "@/lib/auth/api";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/sets?franchiseId=&page=&pageSize= — public sets browse, same
 * data shape as the web `/collections` page (src/app/collections/page.tsx),
 * as JSON. Owned progress is included when the caller is authenticated, via
 * the same shared `getSetProgressForUser` the web page now also calls.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(req.url);
    const franchiseId = searchParams.get("franchiseId") ?? undefined;
    const query = searchParams.get("query")?.trim();
    const pagination = parsePagination(searchParams);

    const where = {
      ...(franchiseId ? { series: { franchiseId } } : {}),
      ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
    };

    const [sets, total, apiUser] = await Promise.all([
      prisma.set.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          series: { include: { franchise: true, brand: true } },
          releases: { orderBy: { date: "asc" }, take: 1, select: { date: true } },
          _count: { select: { cards: true } },
        },
      }),
      prisma.set.count({ where }),
      getApiUser(req),
    ]);

    const setIds = sets.map((s) => s.id);
    const [imagesBySet, progressBySet] = await Promise.all([
      getImagesForEntities("Set", setIds),
      apiUser ? getSetProgressForUser(apiUser.id, setIds) : Promise.resolve(new Map()),
    ]);

    const items = sets.map((s) => {
      const total = s.printedTotal || s._count.cards || 0;
      const progress = progressBySet.get(s.id) ?? null;
      return {
        id: s.id,
        name: s.name,
        franchiseName: s.series.franchise.name,
        brandName: s.series.brand.name,
        seriesName: s.series.name,
        imageUrl: pickPrimaryImage(imagesBySet.get(s.id) ?? [])?.url ?? null,
        releaseDate: s.releases[0]?.date ?? null,
        printedTotal: total,
        ownedCount: progress?.ownedCount ?? 0,
        totalValueUsd: progress?.totalValueUsd ?? 0,
      };
    });

    return apiSuccess({ items, pagination: paginationMeta(pagination, total) });
  });
}
