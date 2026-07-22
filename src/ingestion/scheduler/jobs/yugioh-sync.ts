import { registerJob } from "../worker";
import { builder } from "../../engine/builder";

registerJob("yugioh-sync", async (jobId) => {
  console.log(`[JOB:yugioh-sync] Running for job ${jobId}`);
  // TODO: Fetch YGOPRODeck API
  // 1. Fetch updated sets/cards since lastSyncedAt
  // 2. Perform checksum comparison
  // 3. builder.getOrCreateSet(...) / builder.getOrCreateCard(...)
});
