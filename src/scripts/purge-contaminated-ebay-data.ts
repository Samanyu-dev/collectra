import { prisma } from "../ingestion/engine/prisma";
import { recomputeCurrentPriceForVariant } from "../lib/pricing/recompute";

const EBAY_SOURCE_ID = "cmsdaxz6i0000fev10an7s1jb";
// The corrected sweep process (post query-matching fix) started at this
// instant — verified via `ps -p <pid> -o lstart` at the time this script was
// written, converted from local IST to UTC. Only observations written
// STRICTLY BEFORE this are pre-fix/contaminated; the sweep is actively
// writing new, correct observations under the same sourceId as this script
// runs, so a blanket delete-by-sourceId would destroy good data too.
const FIX_DEPLOYED_AT = new Date("2026-08-04T08:28:42Z");

async function main() {
  const source = await prisma.dataSource.findUnique({ where: { id: EBAY_SOURCE_ID } });
  if (!source || source.identifier !== "ebay_browse_api") {
    throw new Error(`Refusing to run — DataSource ${EBAY_SOURCE_ID} is not ebay_browse_api (found: ${source?.identifier})`);
  }

  const obsBefore = await prisma.priceObservation.count({
    where: { sourceId: EBAY_SOURCE_ID, createdAt: { lt: FIX_DEPLOYED_AT } },
  });
  const obsKept = await prisma.priceObservation.count({
    where: { sourceId: EBAY_SOURCE_ID, createdAt: { gte: FIX_DEPLOYED_AT } },
  });
  console.log(`Pre-fix eBay observations to purge (createdAt < ${FIX_DEPLOYED_AT.toISOString()}): ${obsBefore}`);
  console.log(`Post-fix eBay observations to KEEP: ${obsKept}`);

  const affected = await prisma.priceObservation.findMany({
    where: { sourceId: EBAY_SOURCE_ID, createdAt: { lt: FIX_DEPLOYED_AT } },
    select: { variantId: true },
    distinct: ["variantId"],
  });
  const affectedVariantIds = affected.map((a) => a.variantId).filter((v): v is string => v != null);
  console.log(`Distinct variants affected: ${affectedVariantIds.length}`);

  const deleted = await prisma.priceObservation.deleteMany({
    where: { sourceId: EBAY_SOURCE_ID, createdAt: { lt: FIX_DEPLOYED_AT } },
  });
  console.log(`Deleted ${deleted.count} PriceObservation rows.`);

  let recomputed = 0;
  let currentPriceDeleted = 0;
  for (const variantId of affectedVariantIds) {
    const remaining = await prisma.priceObservation.count({ where: { variantId } });
    if (remaining === 0) {
      const del = await prisma.currentPrice.deleteMany({ where: { variantId } });
      currentPriceDeleted += del.count;
    } else {
      await recomputeCurrentPriceForVariant(variantId);
      recomputed++;
    }
  }
  console.log(`CurrentPrice rows deleted (no remaining sources): ${currentPriceDeleted}`);
  console.log(`CurrentPrice rows recomputed (blended with other sources): ${recomputed}`);

  // Deliberately NOT touching MediaAttachment/Media here — Media has no
  // createdAt field, so a time-based cutoff isn't possible the way it is for
  // PriceObservation, and attachHotlinkImage() skips attaching if a Card
  // already has an EBAY_LISTING_PHOTO (confirmed in src/ingestion/engine/media.ts),
  // meaning stale pre-fix images won't self-heal on their own. Handed off
  // separately to be fixed with proper card-level correlation.

  const obsAfter = await prisma.priceObservation.count({
    where: { sourceId: EBAY_SOURCE_ID, createdAt: { lt: FIX_DEPLOYED_AT } },
  });
  console.log(`\nVerified: pre-fix eBay observations remaining = ${obsAfter} (should be 0)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
