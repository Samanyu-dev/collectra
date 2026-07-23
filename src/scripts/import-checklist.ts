import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";
import { ingestCatalogCard, type CatalogCardEntity } from "../ingestion/engine/ingest-entity";
import { ManualChecklistAdapter } from "../../packages/core/adapters/ManualChecklistAdapter";
import type { Entity } from "../../packages/core/adapters/SourceAdapter";

/**
 * Generic CSV checklist importer — the reusable replacement for a bespoke
 * regex script per product (see curate-topps-match-attax-*.ts, which this
 * generalizes). Runs the four explicit steps: preview (dry-run diff, no
 * writes) → validate (numbering/duplicates) → import (idempotent) →
 * provenance (DataSource + Person/Team links recorded either way).
 *
 * Usage:
 *   npx tsx src/scripts/import-checklist.ts \
 *     --file=path/to/checklist.csv \
 *     --set-id=panini-adrenalyn-xl-2025-26 --set-name="Adrenalyn XL 2025/26" \
 *     --series="Adrenalyn XL 2025/26" --franchise="Football (Soccer)" \
 *     --brand="Adrenalyn XL" --manufacturer=Panini --universe=Sports \
 *     --curator-id=curator:panini-adrenalyn-xl-2025-26 \
 *     --curator-name="Manually transcribed Adrenalyn XL 2025/26 checklist" \
 *     [--printed-total=N] [--preview]
 */

interface Args {
  file: string;
  setId: string;
  setName: string;
  series: string;
  franchise: string;
  brand: string;
  manufacturer: string;
  universe: string;
  curatorId: string;
  curatorName: string;
  printedTotal?: number;
  preview: boolean;
}

function parseArgs(): Args {
  const map = new Map<string, string>();
  let preview = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === "--preview") {
      preview = true;
      continue;
    }
    const match = arg.match(/^--([a-z-]+)=(.*)$/);
    if (match) map.set(match[1], match[2]);
  }

  const required = ["file", "set-id", "set-name", "series", "franchise", "brand", "manufacturer", "universe", "curator-id", "curator-name"];
  const missing = required.filter((k) => !map.has(k));
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.map((m) => `--${m}`).join(", ")}`);
  }

  return {
    file: map.get("file")!,
    setId: map.get("set-id")!,
    setName: map.get("set-name")!,
    series: map.get("series")!,
    franchise: map.get("franchise")!,
    brand: map.get("brand")!,
    manufacturer: map.get("manufacturer")!,
    universe: map.get("universe")!,
    curatorId: map.get("curator-id")!,
    curatorName: map.get("curator-name")!,
    printedTotal: map.has("printed-total") ? parseInt(map.get("printed-total")!, 10) : undefined,
    preview,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const args = parseArgs();
  const adapter = new ManualChecklistAdapter({ filePath: args.file, curatorIdentifier: args.curatorId, curatorName: args.curatorName });

  const { entities } = await adapter.fetchChanges();
  console.log(`Parsed ${entities.length} rows from ${args.file}.`);

  // --- Validate: row-level (adapter.verify) + cross-row (duplicate numbers) ---
  const invalid: { entity: Entity; issues: string[] }[] = [];
  const numberCounts = new Map<string, number>();
  for (const entity of entities) {
    const result = adapter.verify(entity);
    if (!result.isValid) invalid.push({ entity, issues: result.issues ?? [] });
    if (entity.number) numberCounts.set(entity.number, (numberCounts.get(entity.number) ?? 0) + 1);
  }
  const duplicateNumbers = [...numberCounts.entries()].filter(([, count]) => count > 1);

  if (invalid.length > 0) {
    console.error(`\n${invalid.length} row(s) failed validation:`);
    for (const { entity, issues } of invalid.slice(0, 20)) {
      console.error(`  row "${entity.id}": ${issues.join("; ")}`);
    }
    throw new Error(`Validation failed — fix the CSV and re-run. ${invalid.length} invalid row(s), ${duplicateNumbers.length} duplicate number(s) within the file.`);
  }
  if (duplicateNumbers.length > 0) {
    console.error(`\nDuplicate card numbers within the file: ${duplicateNumbers.map(([n, c]) => `${n} (x${c})`).join(", ")}`);
    throw new Error("Validation failed — duplicate numbers within the submitted file.");
  }
  console.log("Validation passed: no missing fields, no malformed numbers, no in-file duplicates.");

  // --- Preview: diff against the existing DB, no writes ---
  let newCount = 0;
  let existingCount = 0;
  const existingSetCards = await prisma.card.findMany({ where: { setId: args.setId }, select: { number: true } });
  const existingNumbers = new Set(existingSetCards.map((c) => c.number));
  for (const entity of entities) {
    if (existingNumbers.has(entity.number)) existingCount++;
    else newCount++;
  }
  console.log(`\nPreview: ${newCount} new card(s), ${existingCount} already present in Set "${args.setId}".`);
  if (args.preview) {
    console.log("--preview passed — no writes performed.");
    return;
  }

  // --- Import: idempotent, via the shared ingestCatalogCard graph writer ---
  const universeId = await builder.getOrCreateUniverse(args.universe);
  const manufacturerId = await builder.getOrCreateManufacturer(args.manufacturer);
  const franchiseId = await builder.getOrCreateFranchise(args.franchise, universeId);
  const brandId = await builder.getOrCreateBrand(args.brand, manufacturerId);
  const seriesId = await builder.getOrCreateSeries(args.series, franchiseId, brandId);
  await builder.getOrCreateSet({ id: args.setId, name: args.setName, seriesId, printedTotal: args.printedTotal });

  const dataSource = await prisma.dataSource.upsert({
    where: { identifier: args.curatorId },
    update: { lastSyncedAt: new Date() },
    create: {
      identifier: args.curatorId,
      kind: "CURATOR",
      name: args.curatorName,
      licenseType: "COMMUNITY",
      trustLevel: 50, // human-transcribed, not an official feed — same mid-trust convention as the existing Match Attax curator rows
      lastSyncedAt: new Date(),
    },
  });

  let created = 0;
  let skipped = 0;
  let personsLinked = 0;

  for (const entity of entities) {
    const cardEntity: CatalogCardEntity = {
      id: `${slugify(args.setId)}-${slugify(entity.number)}`,
      type: "CARD",
      name: entity.name,
      cardNumber: entity.number,
      universe: args.universe,
      manufacturer: args.manufacturer,
      franchise: args.franchise,
      brand: args.brand,
      series: args.series,
      setName: args.setName,
      parallel: entity.parallel,
      insert: entity.insert,
      team: entity.team,
      nationalTeam: entity.nationalTeam,
      isAuto: entity.isAuto,
      isPatch: entity.isPatch,
      isRelic: entity.isRelic,
      serialTo: entity.serialTo,
    };

    const alreadyExisted = existingNumbers.has(entity.number);
    const card = await ingestCatalogCard(cardEntity, args.curatorId, "COMMUNITY");
    await prisma.card.update({ where: { id: card.id }, data: { supertype: entity.cardType } }).catch(() => {});

    if (entity.cardType === "Player") {
      const personId = await builder.getOrCreatePerson(entity.name);
      await prisma.card.update({ where: { id: card.id }, data: { persons: { connect: { id: personId } } } }).catch(() => {});
      personsLinked++;
    }

    if (alreadyExisted) skipped++;
    else created++;
  }

  await prisma.dataSource.update({ where: { id: dataSource.id }, data: { lastSyncedAt: new Date() } });
  console.log(`\nDone. Created ${created} new card(s), skipped ${skipped} already-present, linked ${personsLinked} Person entities.`);
  console.log(`Provenance: DataSource "${args.curatorId}" (kind CURATOR, trustLevel 50).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
