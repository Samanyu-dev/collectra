import { registerJob } from "../worker";
import { builder } from "../../engine/builder";

registerJob("pokemon-sync", async (jobId) => {
  console.log(`[JOB:pokemon-sync] Running for job ${jobId}`);
  // TODO: Fetch Pokemon TCG API
  // 1. Fetch updated sets/cards since lastSyncedAt
  // 2. Perform checksum comparison
  // 3. builder.getOrCreateSet(...) / builder.getOrCreateCard(...)
});
