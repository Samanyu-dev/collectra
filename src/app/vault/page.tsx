import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { getImagesForEntities } from "@/lib/media/resolve";
import { VaultClient } from "./vault-client";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const user = await requireUser();
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
          card: {
            include: {
              set: { include: { series: { include: { franchise: true } } } },
            },
          },
        },
      },
    },
  });

  const cardIds = instances.map((i) => i.variant.card.id);
  const imagesByCard = await getImagesForEntities("Card", cardIds);

  const items = instances.map((i) => {
    const marketPrice = i.variant.currentPrice?.marketPriceUsd ?? i.purchasePrice ?? 0;
    const gradeMultiplier = i.certification
      ? (Number(i.certification.grade) >= 10 ? 3 : Number(i.certification.grade) >= 9 ? 1.8 : 1.2)
      : 1;

    return {
      instanceId: i.id,
      cardId: i.variant.card.id,
      name: i.variant.card.name,
      franchiseName: i.variant.card.set.series.franchise.name,
      setName: i.variant.card.set.name,
      images: imagesByCard.get(i.variant.card.id) ?? [],
      estimatedValue: marketPrice * gradeMultiplier,
      purchaseDate: i.purchaseDate?.toISOString() ?? null,
      notes: i.notes,
      isFavorite: i.isFavorite,
      certification: i.certification ? { company: i.certification.company, grade: i.certification.grade } : null,
      location: i.location ? { room: i.location.name, shelf: i.location.type } : null,
    };
  });

  const totalVaultValue = items.reduce((sum, i) => sum + i.estimatedValue, 0);

  return <VaultClient items={items} totalVaultValue={totalVaultValue} />;
}
