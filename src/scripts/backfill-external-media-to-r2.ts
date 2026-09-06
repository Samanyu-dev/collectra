import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { processMediaRow } from "@/ingestion/engine/process-media";

// Usage: npx tsx src/scripts/backfill-external-media-to-r2.ts <sourceName-contains-filter>
// e.g. "centraldacopa", "pokemontcg-api", "mtg-api" — matches Media.sourceName.
const sourceFilter = process.argv[2];
if (!sourceFilter) {
  console.error("Usage: backfill-external-media-to-r2.ts <sourceName-contains-filter>");
  process.exit(1);
}

async function main() {
  let processed = 0,
    duplicates = 0,
    failed = 0,
    total = 0;

  while (true) {
    const batch = await prisma.media.findMany({
      where: { provider: "external", perceptualHash: null, status: "READY", sourceName: { contains: sourceFilter } },
      take: 20,
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) break;

    for (const media of batch) {
      total++;
      const result = await processMediaRow(media.id);
      if (result.status === "processed") processed++;
      else if (result.status === "duplicate") duplicates++;
      else failed++;
      if (total % 50 === 0) console.log(`progress: ${total} done (processed=${processed} dup=${duplicates} failed=${failed})`);
    }
  }

  console.log(`DONE. total=${total} processed=${processed} duplicates=${duplicates} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
