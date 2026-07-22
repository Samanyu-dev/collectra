import { TcdbAdapter } from "../../../../packages/core/adapters/TcdbAdapter";
import { registerJob } from "../worker";

const tcdbAdapter = new TcdbAdapter();

registerJob("external-source-sync", async (jobId: string, log: any) => {
  log("Starting External Source Sync Pipeline...");

  // Currently targeting TCDB adapter per user request
  log(`Initializing adapter: ${tcdbAdapter.sourceId}`);
  
  try {
    const batch = await tcdbAdapter.fetchChanges();
    
    log(`Fetched ${batch.entities.length} entities from ${tcdbAdapter.sourceId}.`);
    
    for (const entity of batch.entities) {
      const verification = tcdbAdapter.verify(entity);
      if (!verification.isValid) {
        log(`[WARNING] Skipping entity ${entity.id}: ${verification.issues?.join(", ")}`);
        continue;
      }

      // TODO: Map to Prisma Database (Media, Set, Card, etc.)
      log(`[SUCCESS] Staged entity: ${entity.name}`);
    }
    
    log(`Finished processing adapter: ${tcdbAdapter.sourceId}`);
  } catch (error: any) {
    log(`[ERROR] Adapter ${tcdbAdapter.sourceId} failed: ${error.message}`);
    throw error;
  }
});
