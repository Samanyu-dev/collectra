import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getImagesForEntities } from "@/lib/media/resolve";
import { NewListingClient } from "./new-listing-client";

export const dynamic = "force-dynamic";

export default async function NewListingPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const initialInstanceId = typeof searchParams.instanceId === "string" ? searchParams.instanceId : undefined;

  const instances = await prisma.instance.findMany({
    where: {
      userId: user.id,
      listings: { none: { status: { in: ["ACTIVE", "RESERVED"] } } },
    },
    include: { certification: true, variant: { include: { card: { include: { set: true } } } } },
    orderBy: { purchaseDate: "desc" },
  });

  const images = await getImagesForEntities("Card", instances.map((i) => i.variant.card.id));

  const items = instances.map((i) => ({
    id: i.id,
    cardName: i.variant.card.name,
    cardNumber: i.variant.card.number,
    setName: i.variant.card.set.name,
    condition: i.condition,
    grade: i.certification ? `${i.certification.company} ${i.certification.grade}` : null,
    imageUrl: images.get(i.variant.card.id)?.[0]?.url ?? null,
  }));

  return <NewListingClient instances={items} initialInstanceId={initialInstanceId} />;
}
