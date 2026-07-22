import { registerJob } from "../worker";
import { KaggleAdapter } from "../../../../packages/core/adapters/KaggleAdapter";
import { ingestCatalogCard, CatalogCardEntity } from "../../engine/ingest-entity";
import { kaggleDatasets } from "../../registry/datasets";

registerJob("kaggle-dataset-sync", async (jobId, log) => {
  log(`[JOB:kaggle-dataset-sync] Running for job ${jobId}`);

  if (kaggleDatasets.length === 0) {
    log("No Kaggle datasets registered yet — see src/ingestion/registry/datasets.ts");
    return;
  }

  for (const config of kaggleDatasets) {
    const adapter = new KaggleAdapter(config);
    log(`Fetching Kaggle dataset: ${config.slug}`);

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
        await ingestCatalogCard(entity as unknown as CatalogCardEntity, adapter.sourceId, "KAGGLE");
        ingested++;
      }
    }

    log(`Kaggle:${config.slug} — ingested ${ingested}, skipped ${skipped} of ${entities.length} rows`);
  }
});
