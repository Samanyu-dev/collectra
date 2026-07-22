import { PrismaClient } from "@prisma/client";
import { registerJob } from "../worker";
import { ingestCatalogCard, CatalogCardEntity } from "../../engine/ingest-entity";

const prisma = new PrismaClient();

/**
 * Drains moderator-APPROVED Contribution rows into the graph, then marks
 * them APPLIED. Only handles new-Card proposals for now (entityId null,
 * entityType "Card") — arbitrary field edits to existing entities need
 * human-reviewed, field-specific apply logic and are intentionally not
 * auto-applied here even once approved.
 */
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
    if (contribution.entityType === "Card" && !contribution.entityId) {
      try {
        const entity = JSON.parse(contribution.payload) as CatalogCardEntity;
        await ingestCatalogCard(entity, `contribution:${contribution.id}`, "COMMUNITY");
        await prisma.contribution.update({
          where: { id: contribution.id },
          data: { status: "APPLIED" },
        });
        applied++;
      } catch (e: any) {
        log(`Failed to apply contribution ${contribution.id}: ${e.message}`);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  log(`Applied ${applied} contributions, skipped ${skipped} (unsupported type or needs manual apply).`);
});
