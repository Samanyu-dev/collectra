import { PrismaClient } from "@prisma/client";
import { registerJob } from "../worker";

const prisma = new PrismaClient();

registerJob("image-verifier", async (jobId) => {
  console.log(`[JOB:image-verifier] Running for job ${jobId}`);

  // Only hotlinked (provider="external") Media can go dead — locally/Supabase-hosted
  // assets we control don't need link-rot checks.
  const hotlinkedMedia = await prisma.media.findMany({
    where: { provider: "external" },
    take: 100,
    orderBy: { id: "asc" },
  });

  for (const media of hotlinkedMedia) {
    try {
      const res = await fetch(media.storageKey, { method: "HEAD" });
      if (!res.ok) {
        console.warn(`[image-verifier] Dead link detected: ${media.storageKey}`);
        await prisma.media.update({
          where: { id: media.id },
          data: { status: "FAILED" },
        });
        // Future: queue a job to find/promote an alternative Media source
        // for the same entity (see hybrid Media source priority order).
      }
    } catch (e) {
      console.error(`[image-verifier] Failed to reach ${media.storageKey}`, e);
    }
  }
});
