import { prisma } from "../ingestion/engine/prisma";
import { syncEbayPricesForVariants } from "../ingestion/ebay/sync-prices";

async function main() {
  const userId = "f6fc71bf-d0d7-41dd-ad1f-787e2a199a4f";
  const instances = await prisma.instance.findMany({
    where: { userId },
    select: { variantId: true, variant: { select: { cardId: true, currentPrice: { select: { marketPriceUsd: true } } } } },
  });
  const cardHasPrice = new Map<string, boolean>();
  for (const inst of instances) {
    const hasPrice = inst.variant.currentPrice?.marketPriceUsd != null;
    cardHasPrice.set(inst.variant.cardId, cardHasPrice.get(inst.variant.cardId) || hasPrice);
  }
  const missingCardIds = new Set([...cardHasPrice.entries()].filter(([, has]) => !has).map(([id]) => id));
  const variantIdByCard = new Map<string, string>();
  for (const inst of instances) {
    if (missingCardIds.has(inst.variant.cardId) && !variantIdByCard.has(inst.variant.cardId)) {
      variantIdByCard.set(inst.variant.cardId, inst.variantId);
    }
  }
  const targetVariantIds = [...variantIdByCard.values()];
  console.log(`Missing-price cards: ${missingCardIds.size}. Target variants to price: ${targetVariantIds.length}.`);

  const results = await syncEbayPricesForVariants(targetVariantIds);
  const gotPrice = results.filter((r) => r.medianPriceUsd != null).length;
  const zeroFound = results.filter((r) => r.medianPriceUsd == null && r.totalFound === 0).length;
  const foundButFiltered = results.filter((r) => r.medianPriceUsd == null && r.totalFound > 0).length;
  console.log(`\nDone. ${gotPrice} newly priced, ${zeroFound} zero eBay results, ${foundButFiltered} found-but-filtered-out.`);
  console.log("\n=== FOUND-BUT-FILTERED (worth a closer look) ===");
  for (const r of results.filter((r) => r.medianPriceUsd == null && r.totalFound > 0)) {
    console.log(`  "${r.query}" — ${r.totalFound} found, top titles: ${r.topTitles.join(" | ")}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
