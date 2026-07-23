import { PrismaClient } from "@prisma/client";
import { registerJob } from "../worker";
import { ingestCatalogCard, CatalogCardEntity } from "../../engine/ingest-entity";

const prisma = new PrismaClient();

/**
 * Payload shapes for each supported Contribution type (all still require a
 * human moderator to have already moved the row to APPROVED — this job only
 * drains what's already been reviewed, never auto-approves anything):
 *   - Card, entityId null:      { ...CatalogCardEntity }              (new product/checklist submission)
 *   - Card, entityId set:       { fields: Partial<Card> }             (checklist correction — name/number/subtypes/etc.)
 *   - Media, entityId set:      { promote: true }                     (Scanner "contribute to public catalog?" consent, or a moderator approving a community image)
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
