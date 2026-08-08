/**
 * Seeds the Japanese-exclusive Pokémon set "MEGA Dream ex" (released
 * 2025-11-28, 193 numbered cards + 57 secret cards = 250 total) from the two
 * scraped JSON caches under src/scripts/data/:
 *  - mega-dream-ex-pokellector.json              — canonical checklist + card scans
 *  - mega-dream-ex-getcollectr-catalog.json       — current prices, variants, rarity
 *  - mega-dream-ex-getcollectr-products.json      — full price_history per product
 *  - mega-dream-ex-getcollectr-grading-scales.json — grade_id -> {company, label} lookup
 *
 * Known gap (as of this run): 12 of the rarest/priciest secret cards
 * (238/193–250/193, all Special Art Rare / Mega Ultra Rare — includes Mega
 * Gengar ex 240/193) don't have a getcollectr product-detail record yet; the
 * scraper hit a WAF cooldown on those specific requests. This script still
 * seeds them (name/image from pokellector + current price from the catalog
 * snapshot), just without historical/graded price series until
 * `scrape-getcollectr-mega-dream-ex.ts` is re-run to fill them in — it's
 * checkpointed, so re-running only retries what's still missing.
 *
 * Idempotent/resumable like the other seed scripts: skips any Card that
 * already has Variants.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";
import { attachHotlinkImage, getOrCreateDataSource } from "../ingestion/engine/media";
import { processMediaRow } from "../ingestion/engine/process-media";
import { writePriceObservationsBatch } from "../lib/pricing/write-observation";
import { writeGradedPriceObservationsBatch } from "../lib/pricing/write-graded-observation";
import { recomputeCurrentPricesForVariants } from "../lib/pricing/recompute";
import type { RawPriceObservation } from "../lib/pricing/types";
import type { RawGradedPriceObservation } from "../lib/pricing/write-graded-observation";
import type { PokellectorCard } from "./scrape-pokellector-mega-dream-ex";
import type { CatalogRow, ProductDetail, GradingScaleEntry } from "./scrape-getcollectr-mega-dream-ex";

const DATA_DIR = join(__dirname, "data");
const SET_ID = "pkmn-jp-mega-dream-ex";
const SET_NAME = "MEGA Dream ex";
const SET_SOURCE_URL = "https://app.getcollectr.com/sets/category/3/mega-dream-ex?groupId=24499&cardType=cards";

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractHp(descriptionHtml: string): string | undefined {
  const match = descriptionHtml.match(/HP:\s*<\/span>\s*(\d+)/i);
  return match?.[1];
}

function inferSupertype(name: string, descriptionHtml: string | undefined): string {
  if (descriptionHtml && /HP:\s*<\/span>/i.test(descriptionHtml)) return "Pokémon";
  if (/energy/i.test(name)) return "Energy";
  return "Trainer";
}

async function main() {
  const t0 = Date.now();

  const pokellector = loadJson<Record<string, PokellectorCard>>("mega-dream-ex-pokellector.json");
  const catalog = loadJson<CatalogRow[]>("mega-dream-ex-getcollectr-catalog.json");
  const products = loadJson<Record<string, ProductDetail>>("mega-dream-ex-getcollectr-products.json");
  const gradingScales = loadJson<GradingScaleEntry[]>("mega-dream-ex-getcollectr-grading-scales.json");

  const gradeById = new Map(gradingScales.map((g) => [g.id, { company: g.company_symbol, grade: g.label }]));

  const catalogByNumber = new Map<string, CatalogRow[]>();
  for (const row of catalog) {
    const list = catalogByNumber.get(row.card_number) ?? [];
    list.push(row);
    catalogByNumber.set(row.card_number, list);
  }

  // 1. Taxonomy — reuses the same rows fetch-all.ts already created for the official Pokémon API sets.
  const universeId = await builder.getOrCreateUniverse("TCG");
  const manufacturerId = await builder.getOrCreateManufacturer("Nintendo");
  const franchiseId = await builder.getOrCreateFranchise("Pokémon", universeId);
  const brandId = await builder.getOrCreateBrand("Pokémon TCG", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Mega Series", franchiseId, brandId);
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    releaseDate: new Date("2025-11-28"),
    releaseCountry: "Japan",
    printedTotal: 193,
  });

  // 2. Provenance
  const pokellectorSourceId = await getOrCreateDataSource("pokellector:mega-dream-ex", "SCRAPED");
  const getcollectrSourceId = await getOrCreateDataSource("getcollectr:mega-dream-ex", "SCRAPED");

  let cardsCreated = 0;
  let cardsSkipped = 0;
  let variantsCreated = 0;
  let imagesProcessed = 0;
  let ungradedObsWritten = 0;
  let gradedObsWritten = 0;
  const touchedVariantIds: string[] = [];
  const missingFromCatalog: string[] = [];
  const missingProductDetail: string[] = [];

  const numbers = Object.keys(pokellector).sort();
  for (let i = 0; i < numbers.length; i++) {
    const number = numbers[i];
    const pk = pokellector[number];
    const rows = catalogByNumber.get(number) ?? [];
    if (rows.length === 0) {
      missingFromCatalog.push(number);
      continue;
    }

    const cardId = `${SET_ID}-${number.replace("/", "-")}`;

    const existingVariantCount = await prisma.variant.count({ where: { cardId } });
    if (existingVariantCount > 0) {
      cardsSkipped++;
      continue;
    }

    // Prefer product-detail description (has HP/attacks) when we have it for any subtype of this number.
    const detailForCard = rows.map((r) => products[r.product_id]).find((d) => d?.description);
    const rarity = rows.find((r) => r.rarity)?.rarity || detailForCard?.rarity || "Common";

    const card = await prisma.card.upsert({
      where: { id: cardId },
      update: {},
      create: {
        id: cardId,
        name: pk.name,
        number,
        setId: set.id,
        supertype: inferSupertype(pk.name, detailForCard?.description),
        hp: detailForCard?.description ? extractHp(detailForCard.description) : undefined,
        rules: detailForCard?.description ? stripHtml(detailForCard.description) : undefined,
      },
    });

    // Image: pokellector's original scan, downloaded/dedupe'd/rehosted immediately — never left hotlinked.
    const attachment = await attachHotlinkImage({
      url: pk.imageUrl,
      entityType: "Card",
      entityId: card.id,
      usage: "OFFICIAL_ARTWORK",
      sourceIdentifier: "pokellector:mega-dream-ex",
      sourceKind: "COMMUNITY",
    });
    if (attachment) {
      const result = await processMediaRow(attachment.mediaId);
      if (result.status !== "failed") imagesProcessed++;
    }

    // Variants: one per distinct product_sub_type actually present for this card — data-driven, not hardcoded Normal/Holofoil.
    const ungradedRows: RawPriceObservation[] = [];
    const gradedRows: RawGradedPriceObservation[] = [];

    for (const row of rows) {
      const parallelId = await builder.getOrCreateParallel(row.product_sub_type);
      const variant = await prisma.variant.create({
        data: {
          cardId: card.id,
          printingId: basePrintingId,
          parallelId,
          isFoil: /holo/i.test(row.product_sub_type),
        },
      });
      variantsCreated++;
      touchedVariantIds.push(variant.id);

      const detail = products[row.product_id];
      if (!detail) {
        missingProductDetail.push(`${number} (${row.product_sub_type})`);
        // Still write today's snapshot price from the catalog row so this
        // variant isn't left with zero pricing data until the backfill re-run.
        const price = parseFloat(row.latest_price);
        if (!Number.isNaN(price)) {
          ungradedRows.push({
            variantId: variant.id,
            kind: "LISTING",
            price,
            currency: "USD",
            observedAt: new Date(),
            sourceUrl: SET_SOURCE_URL,
            externalRef: `${row.product_id}:snapshot`,
          });
        }
        continue;
      }

      for (const point of detail.price_history) {
        if (point.product_sub_type !== row.product_sub_type) continue; // a product's history is already scoped to its own sub_type, but guard anyway
        const price = parseFloat(point.price);
        if (Number.isNaN(price)) continue;
        const observedAt = new Date(point.insertion_date);
        const scale = gradeById.get(point.grade_id);
        if (scale) {
          gradedRows.push({
            variantId: variant.id,
            company: scale.company,
            grade: scale.grade,
            price,
            currency: "USD",
            observedAt,
            sourceUrl: SET_SOURCE_URL,
            externalRef: `${row.product_id}:${point.grade_id}`,
          });
        } else {
          // grade_id absent from the grading-scales lookup == ungraded (never hardcode "52" — see scraper header comment).
          ungradedRows.push({
            variantId: variant.id,
            kind: "LISTING",
            price,
            currency: "USD",
            observedAt,
            sourceUrl: SET_SOURCE_URL,
            externalRef: `${row.product_id}:${point.grade_id}`,
          });
        }
      }
    }

    if (ungradedRows.length > 0) {
      ungradedObsWritten += await writePriceObservationsBatch(
        ungradedRows.map((r) => ({ ...r, sourceId: getcollectrSourceId })),
        prisma
      );
    }
    if (gradedRows.length > 0) {
      gradedObsWritten += await writeGradedPriceObservationsBatch(gradedRows, getcollectrSourceId, prisma);
    }

    cardsCreated++;
    if ((i + 1) % 25 === 0) console.log(`  [${i + 1}/${numbers.length}] cards created=${cardsCreated} skipped=${cardsSkipped} variants=${variantsCreated}`);
  }

  // Recompute CurrentPrice for every variant touched this run (batched, one query instead of N).
  if (touchedVariantIds.length > 0) {
    await recomputeCurrentPricesForVariants(touchedVariantIds, new Date(), prisma);
  }

  console.log(`\nDone in ${(Date.now() - t0) / 1000}s.`);
  console.log(`Cards: ${cardsCreated} created, ${cardsSkipped} skipped (already seeded).`);
  console.log(`Variants: ${variantsCreated} created.`);
  console.log(`Images processed (downloaded/rehosted): ${imagesProcessed}.`);
  console.log(`Price observations: ${ungradedObsWritten} ungraded, ${gradedObsWritten} graded.`);
  if (missingFromCatalog.length > 0) {
    console.log(`\n${missingFromCatalog.length} pokellector cards had no getcollectr catalog match: ${missingFromCatalog.join(", ")}`);
  }
  if (missingProductDetail.length > 0) {
    console.log(`\n${missingProductDetail.length} variants seeded with only a current-price snapshot (no product-detail history yet — re-run the getcollectr scraper, then re-run this seed, once the WAF cooldown clears):`);
    console.log(`  ${missingProductDetail.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
