"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";
import { storeListingPhoto } from "@/lib/marketplace/storage";

const LISTING_DURATION_DAYS = 30;
const UNIQUE_CONSTRAINT_ERROR = "P2002";

function isUniqueConstraintError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === UNIQUE_CONSTRAINT_ERROR;
}

/**
 * Step 1 (ADR 005 §1/§2): a Listing is a full snapshot of the Instance at
 * creation time — condition and grade are copied here, never read live from
 * the Instance again. Starts in DRAFT; the seller adds photos and publishes
 * separately (§5 requires at least one real photo before a listing can go
 * ACTIVE).
 */
export async function createListing(params: {
  instanceId: string;
  price: number;
  currency?: string;
  shipsTo: string;
  description?: string;
}): Promise<{ listingId: string }> {
  const user = await requireUserForAction();

  const instance = await prisma.instance.findUnique({
    where: { id: params.instanceId },
    include: { certification: true },
  });
  if (!instance || instance.userId !== user.id) throw new Error("Instance not found");
  if (params.price <= 0) throw new Error("Price must be greater than zero");

  const listing = await prisma.listing.create({
    data: {
      instanceId: instance.id,
      sellerId: user.id,
      status: "DRAFT",
      conditionSnapshot: instance.condition,
      gradeSnapshot: instance.certification ? `${instance.certification.company} ${instance.certification.grade}` : null,
      description: params.description,
      price: params.price,
      currency: params.currency ?? "USD",
      shipsTo: params.shipsTo,
    },
  });

  revalidatePath("/marketplace/selling");
  return { listingId: listing.id };
}

async function requireOwnedListing(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) throw new Error("Listing not found");
  return listing;
}

/** Public listing photos (ADR 005 §6) — stored in the separate `marketplace-media` bucket, not the private one. */
export async function uploadListingPhoto(listingId: string, formData: FormData): Promise<{ mediaId: string; url: string }> {
  const user = await requireUserForAction();
  const listing = await requireOwnedListing(listingId, user.id);
  if (listing.status !== "DRAFT" && listing.status !== "ACTIVE") {
    throw new Error("Photos can only be added while a listing is a draft or active");
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please provide a photo");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key, url, checksum } = await storeListingPhoto(listingId, file.name, buffer, file.type || "image/jpeg");

  const media = await prisma.media.upsert({
    where: { originalHash: checksum },
    update: {},
    create: {
      originalHash: checksum,
      storageKey: key,
      bucket: "marketplace-media",
      provider: "supabase",
      status: "READY",
      source: "USER_UPLOAD",
      sourceType: "USER_UPLOAD",
      license: "USER_UPLOAD",
      uploadedByUserId: user.id,
      verificationStatus: "PENDING",
      mimeType: file.type || "image/jpeg",
      filesize: file.size,
    },
  });

  // Same "check then create" idempotency pattern as attachMediaToEntity
  // (src/ingestion/engine/media.ts) — avoids a duplicate attachment row if
  // the same photo is submitted twice.
  const existingAttachment = await prisma.mediaAttachment.findFirst({
    where: { mediaId: media.id, entityType: "Listing", entityId: listingId, usage: "LISTING_PHOTO" },
  });
  if (!existingAttachment) {
    await prisma.mediaAttachment.create({
      data: { mediaId: media.id, entityType: "Listing", entityId: listingId, usage: "LISTING_PHOTO" },
    });
  }

  revalidatePath(`/marketplace/selling`);
  return { mediaId: media.id, url };
}

/**
 * DRAFT → ACTIVE (ADR 005 §7). Requires at least one real listing photo
 * (§5) — a stock/no photo is not sufficient. The "one ACTIVE listing per
 * instance" rule is enforced by the database's partial unique index, not
 * re-checked here first — a check-then-write here would still race under
 * concurrent publishes; catching the real constraint violation is correct,
 * a pre-check would only be a false sense of safety.
 */
export async function publishListing(listingId: string): Promise<void> {
  const user = await requireUserForAction();
  const listing = await requireOwnedListing(listingId, user.id);
  if (listing.status !== "DRAFT") throw new Error("Only a draft listing can be published");

  const photoCount = await prisma.mediaAttachment.count({ where: { entityType: "Listing", entityId: listingId, usage: "LISTING_PHOTO" } });
  if (photoCount === 0) throw new Error("Add at least one photo before publishing");

  const expiresAt = new Date(Date.now() + LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000);

  try {
    await prisma.listing.update({ where: { id: listingId }, data: { status: "ACTIVE", expiresAt } });
  } catch (e) {
    if (isUniqueConstraintError(e)) throw new Error("This card already has an active listing");
    throw e;
  }

  await prisma.event.create({
    data: { userId: user.id, instanceId: listing.instanceId, type: "LISTING_CREATED", metadata: JSON.stringify({ listingId }) },
  });

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/selling");
}

/** Seller-cancelled, at any pre-sold state (ADR 005 §7). */
export async function withdrawListing(listingId: string): Promise<void> {
  const user = await requireUserForAction();
  const listing = await requireOwnedListing(listingId, user.id);
  if (listing.status === "SOLD" || listing.status === "WITHDRAWN") throw new Error("This listing can't be withdrawn");

  await prisma.listing.update({ where: { id: listingId }, data: { status: "WITHDRAWN", withdrawnAt: new Date() } });
  await prisma.event.create({
    data: { userId: user.id, instanceId: listing.instanceId, type: "LISTING_WITHDRAWN", metadata: JSON.stringify({ listingId }) },
  });

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/selling");
}

/**
 * ACTIVE → RESERVED (ADR 005 §7) — a buyer's real, non-binding-in-Collectra
 * commitment; the actual transaction still happens off-platform (Guiding
 * Principle). Uses a conditional update (not read-then-write) so two buyers
 * reserving the same listing at once can't both succeed.
 */
export async function reserveListing(listingId: string): Promise<void> {
  const user = await requireUserForAction();
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  if (listing.sellerId === user.id) throw new Error("You can't reserve your own listing");

  const { count } = await prisma.listing.updateMany({
    where: { id: listingId, status: "ACTIVE" },
    data: { status: "RESERVED", reservedByUserId: user.id, reservedAt: new Date() },
  });
  if (count === 0) throw new Error("This listing is no longer available");

  await prisma.event.create({
    data: { userId: user.id, instanceId: listing.instanceId, type: "LISTING_RESERVED", metadata: JSON.stringify({ listingId }) },
  });

  revalidatePath(`/marketplace/${listingId}`);
}

/** RESERVED → ACTIVE — the reservation fell through; re-lists it rather than leaving it stuck. */
export async function cancelReservation(listingId: string): Promise<void> {
  const user = await requireUserForAction();
  const listing = await requireOwnedListing(listingId, user.id);
  if (listing.status !== "RESERVED") throw new Error("This listing isn't reserved");

  await prisma.listing.update({ where: { id: listingId }, data: { status: "ACTIVE", reservedByUserId: null, reservedAt: null } });
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace/selling");
}

/**
 * Retires the listing (ADR 005 §7) — does NOT transfer Instance ownership.
 * The buyer transacted off-platform and may not even have a Collectra
 * account; the seller separately removes the card from their own collection
 * via the existing toggleCardOwned flow if they choose to.
 */
export async function markListingSold(listingId: string): Promise<void> {
  const user = await requireUserForAction();
  const listing = await requireOwnedListing(listingId, user.id);
  if (listing.status !== "ACTIVE" && listing.status !== "RESERVED") throw new Error("Only an active or reserved listing can be marked sold");

  await prisma.listing.update({ where: { id: listingId }, data: { status: "SOLD", soldAt: new Date() } });
  await prisma.event.create({
    data: { userId: user.id, instanceId: listing.instanceId, type: "LISTING_SOLD", metadata: JSON.stringify({ listingId }) },
  });

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/selling");
}

/**
 * "Message Seller" (ADR 005 §3a) — one inquiry row per buyer per listing,
 * not a full thread. A second call from the same buyer on the same listing
 * updates their message rather than spamming duplicate rows.
 */
export async function createListingInquiry(listingId: string, message: string): Promise<void> {
  const user = await requireUserForAction();
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  if (listing.sellerId === user.id) throw new Error("You can't message yourself about your own listing");
  if (!message.trim()) throw new Error("Message can't be empty");

  const existing = await prisma.listingInquiry.findFirst({ where: { listingId, buyerId: user.id } });
  if (existing) {
    await prisma.listingInquiry.update({ where: { id: existing.id }, data: { message: message.trim() } });
  } else {
    await prisma.listingInquiry.create({ data: { listingId, buyerId: user.id, message: message.trim() } });
  }

  revalidatePath(`/marketplace/${listingId}`);
}

/**
 * The seller's first reply sets respondedAt permanently — that timestamp is
 * the real signal behind the "response rate" trust fact (ADR 005 §5); a
 * later edit to the reply text shouldn't quietly refresh it.
 */
export async function replyToInquiry(inquiryId: string, reply: string): Promise<void> {
  const user = await requireUserForAction();
  const inquiry = await prisma.listingInquiry.findUnique({ where: { id: inquiryId }, include: { listing: true } });
  if (!inquiry || inquiry.listing.sellerId !== user.id) throw new Error("Inquiry not found");
  if (!reply.trim()) throw new Error("Reply can't be empty");

  await prisma.listingInquiry.update({
    where: { id: inquiryId },
    data: { reply: reply.trim(), respondedAt: inquiry.respondedAt ?? new Date() },
  });

  revalidatePath("/marketplace/selling");
}
