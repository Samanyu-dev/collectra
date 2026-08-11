"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";
import { storeScanPhoto, getScanPhotoBuffer } from "@/lib/scanner/storage";
import { getOcrProvider, OcrNotConfiguredError } from "@/lib/scanner/ocr";
import { identifyFromOcr, type ScanResult } from "@/lib/scanner/identify";
import { getImagesForEntities } from "@/lib/media/resolve";
import { pickPrimaryImage } from "@/lib/media/pick-primary-image";
import { refreshVariantPrice } from "@/lib/actions/pricing";
import { toPriceDisplay } from "@/lib/pricing/display";
import type { PriceTagData } from "@/components/ui/price-tag";
import { assertCanAddToSet, assertCanScan, checkRejectedScanAbuse } from "@/lib/billing/entitlements";

/**
 * The scan-quota / abuse-detection audit log lives on ScanAttempt, keyed by
 * (userId, mediaId). identifyScan() opens the row (NO_MATCH or PENDING);
 * confirmScanMatch()/rejectScanMatch() close the most recent PENDING one out
 * to CONFIRMED/REJECTED. A quota only ever charges at CONFIRMED — see
 * entitlements.ts's doc comments for why NO_MATCH/REJECTED are free.
 */
async function resolveScanAttempt(userId: string, mediaId: string, status: "CONFIRMED" | "REJECTED", variantId: string) {
  const pending = await prisma.scanAttempt.findFirst({
    where: { userId, mediaId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (pending) {
    await prisma.scanAttempt.update({
      where: { id: pending.id },
      data: { status, matchedVariantId: variantId, resolvedAt: new Date() },
    });
  } else {
    // No tracked PENDING row for this mediaId (e.g. confirm/reject called
    // without a preceding identifyScan in this session) — still record it.
    await prisma.scanAttempt.create({
      data: { userId, mediaId, status, matchedVariantId: variantId, resolvedAt: new Date() },
    });
  }
}

/**
 * Step 1 of the scan pipeline (docs/adr/004-scanner-architecture.md §0):
 * stores the captured/uploaded photo as a real, private, per-user Media row
 * — same convention every other upload in this app uses (ADR 002 §6).
 *
 * userId-parameterized core, shared by the web Server Action below and the
 * `/api/v1/scan` route (Bearer-token authenticated, no cookie session for
 * requireUserForAction() to read) — see incrementVariantQuantityForUser's
 * doc comment in collection.ts for why this split exists across scan/collection/migration.
 */
export async function uploadScanPhotoForUser(
  userId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ mediaId: string; previewUrl: string }> {
  const { key, url, checksum, provider } = await storeScanPhoto(userId, fileName, buffer, mimeType || "image/jpeg");

  const media = await prisma.media.upsert({
    where: { originalHash: checksum },
    update: {},
    create: {
      originalHash: checksum,
      storageKey: key,
      bucket: "user-uploads",
      provider,
      status: "READY",
      source: "USER_UPLOAD",
      sourceType: "USER_UPLOAD",
      license: "USER_UPLOAD",
      uploadedByUserId: userId,
      verificationStatus: "PENDING",
      mimeType: mimeType || "image/jpeg",
      filesize: buffer.byteLength,
    },
  });

  return { mediaId: media.id, previewUrl: url };
}

export async function uploadScanPhoto(formData: FormData): Promise<{ mediaId: string; previewUrl: string }> {
  const user = await requireUserForAction();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please provide a photo to scan.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadScanPhotoForUser(user.id, buffer, file.name, file.type || "image/jpeg");
}

export interface EnrichedCandidate {
  variantId: string;
  confidence: number;
  cardName: string;
  cardNumber: string;
  setName: string;
  imageUrl: string | null;
}

export type IdentifyScanResponse =
  | { ocrConfigured: false }
  | ({ ocrConfigured: true } & Omit<ScanResult, "candidates" | "variantId"> & {
        resolved: EnrichedCandidate | null; // HIGH-confidence single match
        candidates: EnrichedCandidate[]; // MEDIUM — pick one
      });

async function enrichVariantIds(variantIds: string[]): Promise<Map<string, EnrichedCandidate>> {
  if (variantIds.length === 0) return new Map();
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: { card: { include: { set: true } }, parallel: true, printing: true },
  });
  const imagesByCard = await getImagesForEntities("Card", variants.map((v) => v.card.id));
  const map = new Map<string, EnrichedCandidate>();
  for (const v of variants) {
    const images = imagesByCard.get(v.card.id) ?? [];
    const image = pickPrimaryImage(images);
    let cardName = v.card.name;
    // "Base" is the near-universal default Printing and is redundant next
    // to an actual parallel name — only shown when there's no parallel to
    // pair it with.
    const printingLabel = v.printing?.name && v.printing.name.toLowerCase() !== "base" ? v.printing.name : null;
    const descriptor = v.parallel?.name ? [printingLabel, v.parallel.name].filter(Boolean).join(" ") : (printingLabel ?? v.printing?.name);
    if (descriptor) {
      cardName += ` (${descriptor})`;
    }
    map.set(v.id, {
      variantId: v.id,
      confidence: 0, // filled in by the caller, which knows the match score per candidate
      cardName,
      cardNumber: v.card.number,
      setName: v.card.set.name,
      imageUrl: image?.url ?? null,
    });
  }
  return map;
}

/**
 * Step 2: run OCR against the stored photo and resolve it through the
 * existing MigrationMatchingEngine (extended, not duplicated — see
 * matching-engine.ts §2b/§2c). "No OCR provider configured" is a real,
 * designed-for response state, not an exception — Server Action errors don't
 * reliably preserve their type across the client boundary, and this is an
 * expected condition the UI needs to show a specific, honest message for,
 * not treat as a generic failure (ADR 004 §3/§4).
 */
export async function identifyScan(mediaId: string): Promise<IdentifyScanResponse> {
  const user = await requireUserForAction();
  return identifyScanForUser(user.id, mediaId);
}

/** userId-parameterized core — see uploadScanPhotoForUser's doc comment. */
export async function identifyScanForUser(userId: string, mediaId: string): Promise<IdentifyScanResponse> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new Error("Scan photo not found");

  let blocks;
  try {
    const provider = getOcrProvider(); // can throw OcrNotConfiguredError itself now (e.g. a misconfigured OCR_PROVIDER), not just extractText()
    const imageBuffer = await getScanPhotoBuffer(media.storageKey, media.provider);
    blocks = await provider.extractText(imageBuffer);
  } catch (e) {
    if (e instanceof OcrNotConfiguredError) return { ocrConfigured: false };
    throw new Error(`OCR failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const result = await identifyFromOcr(prisma, blocks);

  const allIds = [...(result.variantId ? [result.variantId] : []), ...result.candidates.map((c) => c.variantId)];
  const enrichedMap = await enrichVariantIds(allIds);

  const resolved = result.variantId ? enrichedMap.get(result.variantId) ?? null : null;
  const candidates = result.candidates
    .map((c) => {
      const enriched = enrichedMap.get(c.variantId);
      return enriched ? { ...enriched, confidence: c.confidence } : null;
    })
    .filter((c): c is EnrichedCandidate => c != null);

  // Free-tier scan quota only ever charges at CONFIRMED (see resolveScanAttempt) —
  // a failed identification costs nothing, so this NO_MATCH row is pure audit trail.
  await prisma.scanAttempt.create({
    data: { userId, mediaId, status: resolved || candidates.length > 0 ? "PENDING" : "NO_MATCH" },
  });

  return {
    ocrConfigured: true,
    confidenceLabel: result.confidenceLabel,
    confidence: result.confidence,
    reasons: result.reasons,
    extractedName: result.extractedName,
    extractedCardNumber: result.extractedCardNumber,
    resolved,
    candidates,
  };
}

/**
 * Step 3: the user has reviewed the candidate(s) and confirmed a real
 * variantId — writes a normal Instance (same table every other "add to
 * collection" path writes to), tagged with scanMediaId for real provenance,
 * plus the CARD_SCANNED event the schema already anticipated.
 *
 * Football database foundation (Scanner-first image acquisition): if the
 * user opts in, this scan can also become a real, moderated public catalog
 * image for the card — not just private provenance for their own Instance.
 * Declining leaves everything exactly as it was before this option existed.
 */
export async function confirmScanMatch(params: {
  mediaId: string;
  variantId: string;
  condition: string;
  contributeToPublicCatalog?: boolean;
}): Promise<{ instanceId: string; price: PriceTagData | null }> {
  const user = await requireUserForAction();
  return confirmScanMatchForUser(user.id, params);
}

/** userId-parameterized core — see uploadScanPhotoForUser's doc comment. */
export async function confirmScanMatchForUser(
  userId: string,
  params: {
    mediaId: string;
    variantId: string;
    condition: string;
    contributeToPublicCatalog?: boolean;
  }
): Promise<{ instanceId: string; price: PriceTagData | null }> {
  const variant = await prisma.variant.findUnique({ where: { id: params.variantId }, include: { card: { select: { setId: true } } } });
  if (!variant) throw new Error("Variant not found");

  const media = await prisma.media.findUnique({ where: { id: params.mediaId } });
  if (!media || media.uploadedByUserId !== userId) throw new Error("Scan photo not found");

  // A scan-confirm both spends scan quota and adds to a (possibly new) set —
  // both free-tier checks apply, same as the manual add-to-collection path.
  await assertCanScan(userId);
  await assertCanAddToSet(userId, variant.card.setId);

  const instance = await prisma.instance.create({
    data: {
      userId,
      variantId: params.variantId,
      condition: params.condition,
      scanMediaId: params.mediaId,
    },
  });

  await prisma.event.create({
    data: {
      userId,
      instanceId: instance.id,
      type: "CARD_SCANNED",
      metadata: JSON.stringify({ variantId: params.variantId, mediaId: params.mediaId }),
    },
  });
  await resolveScanAttempt(userId, params.mediaId, "CONFIRMED", params.variantId);
  await checkRejectedScanAbuse(userId, params.variantId);

  if (params.contributeToPublicCatalog) {
    // Makes the scan visible to getImagesForEntities("Card", ...) — i.e. a
    // real candidate for the card's public-facing image, not just this
    // user's own private Instance view. Starts unverified (PENDING); a
    // moderator (or the automated quality gate in the media pipeline)
    // promotes it from there — see contribution-processor.ts.
    await prisma.mediaAttachment
      .create({ data: { mediaId: params.mediaId, entityType: "Card", entityId: variant.cardId, usage: "FRONT_SCAN" } })
      .catch(() => {}); // idempotent-enough: a duplicate attachment for the same scan is harmless, not worth a pre-check race
    await prisma.contribution.create({
      data: {
        entityType: "Media",
        entityId: params.mediaId,
        payload: JSON.stringify({ promote: true }),
        status: "PENDING",
        submittedByUserId: userId,
      },
    });
  }

  // ADR 004 §9 "optional immediate pricing refresh" — best-effort: a stale
  // rate limit or missing Tier 0 source must not fail the scan itself, since
  // the card is already saved to the collection at this point.
  try {
    await refreshVariantPrice(params.variantId);
  } catch {
    // fall through to whatever price already exists, if any
  }
  const priced = await prisma.currentPrice.findUnique({ where: { variantId: params.variantId } });

  revalidatePath("/shelf");
  revalidatePath("/scan");
  return { instanceId: instance.id, price: toPriceDisplay(priced) };
}

/**
 * The user looked at a scan candidate and said "that's wrong" — costs
 * nothing against the scan quota (see resolveScanAttempt/entitlements.ts).
 * Recorded specifically so checkRejectedScanAbuse can catch the case where
 * they then turn around and add this exact card another way.
 */
export async function rejectScanMatch(mediaId: string, variantId: string): Promise<void> {
  const user = await requireUserForAction();
  return rejectScanMatchForUser(user.id, mediaId, variantId);
}

/** userId-parameterized core — see uploadScanPhotoForUser's doc comment. */
export async function rejectScanMatchForUser(userId: string, mediaId: string, variantId: string): Promise<void> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media || media.uploadedByUserId !== userId) throw new Error("Scan photo not found");

  await resolveScanAttempt(userId, mediaId, "REJECTED", variantId);
}
