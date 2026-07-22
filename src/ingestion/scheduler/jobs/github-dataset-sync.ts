import { registerJob } from "../worker";
import { GitHubDatasetAdapter } from "../../../../packages/core/adapters/GitHubDatasetAdapter";
import { ingestCatalogCard, CatalogCardEntity } from "../../engine/ingest-entity";
import { githubDatasets } from "../../registry/datasets";

registerJob("github-dataset-sync", async (jobId, log) => {
  log(`[JOB:github-dataset-sync] Running for job ${jobId}`);

  if (githubDatasets.length === 0) {
    log("No GitHub datasets registered yet — see src/ingestion/registry/datasets.ts");
    return;
  }

  for (const config of githubDatasets) {
    const adapter = new GitHubDatasetAdapter(config);
    log(`Fetching GitHub dataset: ${config.owner}/${config.repo}/${config.file}`);

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
        await ingestCatalogCard(entity as unknown as CatalogCardEntity, adapter.sourceId, "GITHUB");
        ingested++;
      }
    }

    log(`GitHub:${config.owner}/${config.repo} — ingested ${ingested}, skipped ${skipped} of ${entities.length} rows`);
  }
});
