import { PrismaClient } from "@prisma/client";
import { registerJob } from "../worker";
import { ingestCatalogCard, CatalogCardEntity } from "../../engine/ingest-entity";
import { getOrCreateDataSource } from "../../engine/media";
import { writePriceObservation } from "../../../lib/pricing/write-observation";
import { recomputeCurrentPriceForVariant } from "../../../lib/pricing/recompute";

const prisma = new PrismaClient();

// ADR-003 (docs/adr/003-price-engine-architecture.md) §2 Tier 0 source #4:
// "Community/manual pricing" — a human-submitted, moderator-reviewed price is
// real data with its own trust level, same as an API response. This was
// scoped in the ADR but never wired up; every other Tier 0 source needs
// something this codebase doesn't have yet (a populated Instance.purchasePrice
// backfill — currently 0 rows — or eBay credentials). This is the one Tier 0
// path that's actually buildable today with zero external dependencies, reusing
// the same review pipeline every other Contribution type already goes through.
const COMMUNITY_PRICE_SOURCE_IDENTIFIER = "community_manual_price";
const COMMUNITY_PRICE_TRUST_LEVEL = 15; // low — below any OFFICIAL_API (100), same tier as other community input

interface PriceContributionPayload {
  variantId?: string;
  productId?: string;
  kind: "LISTING" | "SOLD";
  price: number;
  currency: string; // ISO 4217
  observedAt?: string; // ISO date string; defaults to now if omitted
  sourceUrl?: string; // e.g. a link to the actual eBay/marketplace listing being cited
}

/**
 * Payload shapes for each supported Contribution type (all still require a
 * human moderator to have already moved the row to APPROVED — this job only
 * drains what's already been reviewed, never auto-approves anything):
 *   - Card, entityId null:            { ...CatalogCardEntity }              (new product/checklist submission)
 *   - Card, entityId set:             { fields: Partial<Card> }             (checklist correction — name/number/subtypes/etc.)
 *   - Media, entityId set:            { promote: true }                     (Scanner "contribute to public catalog?" consent, or a moderator approving a community image)
 *   - PriceObservation, entityId null: PriceContributionPayload              (user-submitted price for a variant/product, reviewed before it affects CurrentPrice)
 */
const ALLOWED_CARD_CORRECTION_FIELDS = ["name", "number", "subtypes", "supertype", "hp", "rules", "flavorText"] as const;

registerJob("contribution-processor", async (jobId, log) => {
  log(`[JOB:contribution-processor] Running for job ${jobId}`);

  const approved = await prisma.contribution.findMany({
    where: { status: "APPROVED" },
    take: 200,
  });

  if (approved.length === 0) {
    log("No approved contributions waiting to be applied.");
    return;
  }

  let applied = 0;
  let skipped = 0;

  for (const contribution of approved) {
    try {
      if (contribution.entityType === "Card" && !contribution.entityId) {
        // New product/checklist submission.
        const entity = JSON.parse(contribution.payload) as CatalogCardEntity;
        await ingestCatalogCard(entity, `contribution:${contribution.id}`, "COMMUNITY");
      } else if (contribution.entityType === "Card" && contribution.entityId) {
        // Checklist correction — a bounded field diff against an existing Card, never an arbitrary write.
        const payload = JSON.parse(contribution.payload) as { fields?: Record<string, unknown> };
        const fields = payload.fields ?? {};
        const safeFields = Object.fromEntries(
          Object.entries(fields).filter(([k]) => (ALLOWED_CARD_CORRECTION_FIELDS as readonly string[]).includes(k))
        );
        if (Object.keys(safeFields).length === 0) throw new Error("No applicable correction fields in payload");
        await prisma.card.update({ where: { id: contribution.entityId }, data: safeFields });
      } else if (contribution.entityType === "Media" && contribution.entityId) {
        // Promote a pending image (Scanner consent, or a moderator-approved community upload) to public/verified.
        await prisma.media.update({
          where: { id: contribution.entityId },
          data: { verificationStatus: "COMMUNITY_VERIFIED" },
        });
      } else if (contribution.entityType === "PriceObservation") {
        const payload = JSON.parse(contribution.payload) as PriceContributionPayload;
        if (!payload.variantId && !payload.productId) throw new Error("Price contribution needs a variantId or productId");
        if (!(payload.price > 0)) throw new Error("Price contribution needs a positive price");

        const sourceId = await getOrCreateDataSource(COMMUNITY_PRICE_SOURCE_IDENTIFIER, "COMMUNITY");
        // getOrCreateDataSource seeds new sources at trustLevel 10 for any
        // non-OFFICIAL_API kind (src/ingestion/engine/media.ts) — bump this
        // one source to its documented level once, not on every run.
        await prisma.dataSource.updateMany({
          where: { id: sourceId, trustLevel: { not: COMMUNITY_PRICE_TRUST_LEVEL } },
          data: { trustLevel: COMMUNITY_PRICE_TRUST_LEVEL },
        });

        const written = await writePriceObservation({
          variantId: payload.variantId,
          productId: payload.productId,
          kind: payload.kind,
          price: payload.price,
          currency: payload.currency,
          observedAt: payload.observedAt ? new Date(payload.observedAt) : new Date(),
          sourceUrl: payload.sourceUrl,
          externalRef: `contribution:${contribution.id}`,
          sourceId,
          confidence: 0.5, // moderator-reviewed but single-witness — see ADR §8 confidence model
        });
        if (!written) throw new Error(`Currency ${payload.currency} not normalizable to USD yet (no ExchangeRate row)`);

        if (payload.variantId) await recomputeCurrentPriceForVariant(payload.variantId);
      } else {
        skipped++;
        continue;
      }

      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "APPLIED" } });
      applied++;
    } catch (e: any) {
      log(`Failed to apply contribution ${contribution.id}: ${e.message}`);
      skipped++;
    }
  }

  log(`Applied ${applied} contributions, skipped ${skipped} (unsupported type or needs manual apply).`);
});
