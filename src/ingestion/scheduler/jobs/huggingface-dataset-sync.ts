import { registerJob } from "../worker";
import { HuggingFaceAdapter } from "../../../../packages/core/adapters/HuggingFaceAdapter";
import { ingestCatalogCard, CatalogCardEntity } from "../../engine/ingest-entity";
import { huggingfaceDatasets } from "../../registry/datasets";

registerJob("huggingface-dataset-sync", async (jobId, log) => {
  log(`[JOB:huggingface-dataset-sync] Running for job ${jobId}`);

  if (huggingfaceDatasets.length === 0) {
    log("No HuggingFace datasets registered yet — see src/ingestion/registry/datasets.ts");
    return;
  }

  for (const config of huggingfaceDatasets) {
    const adapter = new HuggingFaceAdapter(config);
    log(`Fetching HuggingFace dataset: ${config.repo}/${config.file}`);

    const { entities } = await adapter.fetchChanges();
    let ingested = 0;
    let skipped = 0;

    for (const entity of entities) {
      const verification = adapter.verify(entity);
      if (!verification.isValid) {
        skipped++;
        continue;
      }
      if (entity.type === "CARD") {
        await ingestCatalogCard(entity as unknown as CatalogCardEntity, adapter.sourceId, "HUGGINGFACE");
        ingested++;
      }
    }

    log(`HuggingFace:${config.repo} — ingested ${ingested}, skipped ${skipped} of ${entities.length} rows`);
  }
});
