import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/api";
import { getImagesForEntities } from "@/lib/media/resolve";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/vault — same query/shaping as the web `/vault` page
 * (src/app/vault/page.tsx), scoped to `{ userId: user.id, isVaulted: true }`
 * — always the Bearer-token-resolved user, never a client-suppliable id.
 */
export async function GET(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireApiUser(req);

    const instances = await prisma.instance.findMany({
      where: { userId: user.id, isVaulted: true },
      orderBy: { purchaseDate: "desc" },
      include: {
        certification: true,
        location: true,
        variant: {
          include: {
            currentPrice: true,
            parallel: true,
            card: { include: { set: { include: { series: { include: { franchise: true } } } } } },
          },
        },
      },
    });

    const imagesByCard = await getImagesForEntities("Card", instances.map((i) => i.variant.card.id));

    const items = instances.map((i) => {
      const marketPrice = i.variant.currentPrice?.marketPriceUsd ?? i.purchasePrice ?? 0;
      const gradeMultiplier = i.certification
        ? Number(i.certification.grade) >= 10
          ? 3
          : Number(i.certification.grade) >= 9
            ? 1.8
            : 1.2
        : 1;

      return {
        instanceId: i.id,
        cardId: i.variant.card.id,
        variantId: i.variantId,
        name: i.variant.card.name,
        franchiseName: i.variant.card.set.series.franchise.name,
        setName: i.variant.card.set.name,
        images: imagesByCard.get(i.variant.card.id) ?? [],
        estimatedValue: marketPrice * gradeMultiplier,
        purchaseDate: i.purchaseDate?.toISOString() ?? null,
        notes: i.notes,
        isFavorite: i.isFavorite,
        certification: i.certification ? { company: i.certification.company, grade: i.certification.grade } : null,
      };
    });

    const totalVaultValue = items.reduce((sum, i) => sum + i.estimatedValue, 0);

    return apiSuccess({ items, totalVaultValue });
  });
}
