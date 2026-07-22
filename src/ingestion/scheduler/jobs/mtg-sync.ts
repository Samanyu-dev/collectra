import { registerJob } from "../worker";
import { builder } from "../../engine/builder";

registerJob("mtg-sync", async (jobId) => {
  console.log(`[JOB:mtg-sync] Running for job ${jobId}`);
  // TODO: Fetch Scryfall API
  // 1. Fetch updated sets/cards since lastSyncedAt
  // 2. Perform checksum comparison
  // 3. builder.getOrCreateSet(...) / builder.getOrCreateCard(...)
});
