import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Manual curator ingestion — see docs/adr and Phase 3 of the plan: this is
 * the "Manual Curator Adapter" path (a human transcribes/reviews a checklist
 * and it's ingested directly), one of several legal, non-scraping sources
 * alongside official APIs, licensed datasets, and community contributions.
 *
 * Source: src/ingestion/registry/curator-submissions/topps-match-attax-2025-26.txt
 * (base 315-card checklist only — the very long tail of parallels/inserts/
 * autographs/memorabilia subsets in that product was intentionally left out
 * of this pass; format is far less consistent and not worth a fragile parser
 * for a first ingestion. Extend the DataSource + this script later to cover it.)
 */
const SOURCE_IDENTIFIER = "curator:topps-match-attax-2025-26";
const SOURCE_FILE = path.join(
  __dirname,
  "../ingestion/registry/curator-submissions/topps-match-attax-2025-26.txt"
);

interface ParsedRow {
  number: string;
  name: string;
  team: string;
}

function parseChecklist(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lineRe = /^(\d+)\.\s+(.+)$/;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(lineRe);
    if (!match) continue;

    const [, number, rest] = match;
    const teamMatch = rest.match(/\(([^)]+)\)\s*$/);
    if (!teamMatch) continue; // skip malformed lines rather than guess

    const team = teamMatch[1].trim();
    const name = rest.slice(0, teamMatch.index).trim();
    if (!name) continue;

    rows.push({ number, name, team });
  }

  return rows;
}

async function main() {
  console.log(`Curator ingestion: ${SOURCE_IDENTIFIER}`);

  const text = await readFile(SOURCE_FILE, "utf-8");
  const rows = parseChecklist(text);
  console.log(`Parsed ${rows.length} rows from checklist.`);

  const dataSource = await prisma.dataSource.upsert({
    where: { identifier: SOURCE_IDENTIFIER },
    update: { lastSyncedAt: new Date() },
    create: {
      identifier: SOURCE_IDENTIFIER,
      kind: "CURATOR",
      name: "Manually transcribed Topps Match Attax 2025/26 base set checklist",
      licenseType: "COMMUNITY",
      trustLevel: 50, // human-transcribed from a fan checklist, not an official feed — mid trust
      lastSyncedAt: new Date(),
    },
  });

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Football (Soccer)", universeId);
  const brandId = await builder.getOrCreateBrand("Match Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Match Attax 2025/26", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: "topps-matchattax-2025-26",
    name: "Match Attax 2025/26",
    seriesId,
    printedTotal: 315,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  const t0 = Date.now();
  const BATCH_LOG_SIZE = 25;

  for (const [i, row] of rows.entries()) {
    if (i % BATCH_LOG_SIZE === 0) {
      console.log(
        `  [row ${i + 1}/${rows.length}] created=${created} skipped=${skipped} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    }

    const cardId = `topps-matchattax-2025-26-${row.number}`;

    // Check existence before any writes — makes resuming a partial run cheap
    // (one read) instead of redoing a team upsert for every already-done row.
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const teamId = await builder.getOrCreateTeam(row.team);
    const isTeamBadge = row.name === "Team Badge";
    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: isTeamBadge ? `${row.team} Team Badge` : row.name,
        number: row.number,
        setId: set.id,
        supertype: isTeamBadge ? "Team Badge" : "Player",
        teams: { connect: { id: teamId } },
      },
    });

    await prisma.variant.create({
      data: { cardId: card.id, printingId: basePrintingId },
    });

    created++;
  }

  await prisma.dataSource.update({
    where: { id: dataSource.id },
    data: { lastSyncedAt: new Date() },
  });

  console.log(`Done. Created ${created} cards, skipped ${skipped} already-present. Set: ${set.name} (${set.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
