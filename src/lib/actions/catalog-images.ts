"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media/resolve";
import { storeCardImage } from "@/lib/catalog/card-image-storage";
import { ADMIN_ROLES } from "@/app/admin/pricing/utils";

/**
 * Admin-curated card photo, stored via storeCardImage (R2) and set as the
 * card's OFFICIAL_ARTWORK — same "check then create" idempotency as
 * uploadListingPhoto, plus a replace step so re-uploading for the same card
 * swaps the image instead of accumulating a second one.
 */
export async function uploadCardImage(cardId: string, formData: FormData): Promise<{ mediaId: string; url: string }> {
  const user = await requireUserForAction();
  if (!ADMIN_ROLES.includes(user.role)) throw new Error("Not authorized");

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("Card not found");

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please provide an image");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key, checksum, provider, bucket } = await storeCardImage(cardId, file.name, buffer, file.type || "image/jpeg");

  const media = await prisma.media.upsert({
    where: { originalHash: checksum },
    update: {},
    create: {
      originalHash: checksum,
      storageKey: key,
      bucket,
      provider,
      status: "READY",
      source: "USER_UPLOAD",
      sourceType: "USER_UPLOAD",
      license: "USER_UPLOAD",
      uploadedByUserId: user.id,
      // Admin-curated, not a public submission awaiting review — trust it
      // immediately so it wins getPrimaryMedia's ranking right away.
      verificationStatus: "AUTO_VERIFIED",
      moderatorVerified: true,
      mimeType: file.type || "image/jpeg",
      filesize: file.size,
    },
  });

  const stale = await prisma.mediaAttachment.findMany({
    where: { entityType: "Card", entityId: cardId, usage: "OFFICIAL_ARTWORK", mediaId: { not: media.id } },
  });
  if (stale.length > 0) {
    await prisma.mediaAttachment.deleteMany({ where: { id: { in: stale.map((a) => a.id) } } });
  }

  const existingAttachment = await prisma.mediaAttachment.findFirst({
    where: { mediaId: media.id, entityType: "Card", entityId: cardId, usage: "OFFICIAL_ARTWORK" },
  });
  if (!existingAttachment) {
    await prisma.mediaAttachment.create({
      data: { mediaId: media.id, entityType: "Card", entityId: cardId, usage: "OFFICIAL_ARTWORK" },
    });
  }

  const url = await mediaUrl(media);

  revalidatePath("/admin/card-images");
  revalidatePath(`/cards/${cardId}`);
  return { mediaId: media.id, url };
}
