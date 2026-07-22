import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Extends the Match Attax 2025/26 curator ingestion (see
 * curate-topps-match-attax-2025-26.ts) with the parallel/insert/limited-edition
 * sections that were intentionally left out of the first pass — same manual
 * curator pathway, just a more general parser that also handles lettered
 * card codes (BE 1, LE 03, CA 10) alongside the plain numeric base-set style.
 */
const SOURCE_IDENTIFIER = "curator:topps-match-attax-2025-26";
const SET_ID = "topps-matchattax-2025-26";
const FILES = [
  "topps-match-attax-2025-26-inserts.txt",
  "topps-match-attax-2025-26-coded.txt",
];

interface ParsedRow {
  number: string;
  name: string;
  team: string;
  sectionName: string;
  parallel?: string;
}

function parseChecklist(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lineRe = /^(\S+(?:\s+\d+)?)\.\s+(.+)$/;
  const countRe = /^\d+\s+cards?$/i;

  const lines = text.split("\n").map((l) => l.trim());
  let sectionName = "Base";
  let parallel: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Section header: a non-numbered line immediately followed by an "N cards" line.
    if (!lineRe.test(line) && countRe.test(lines[i + 1] || "")) {
      const headerMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (headerMatch) {
        sectionName = headerMatch[1].trim();
        parallel = headerMatch[2].trim();
      } else {
        sectionName = line.trim();
        parallel = undefined;
      }
      continue;
    }

    const match = line.match(lineRe);
    if (!match) continue;

    const [, number, rest] = match;
    const teamMatch = rest.match(/\(([^)]+)\)\s*$/);
    if (!teamMatch) continue; // skip malformed/team-less lines (e.g. "Tactic Card")

    const team = teamMatch[1].trim();
    const name = rest.slice(0, teamMatch.index).trim();
    if (!name) continue;

    rows.push({ number, name, team, sectionName, parallel });
  }

  return rows;
}

async function main() {
  console.log(`Curator ingestion (inserts): ${SOURCE_IDENTIFIER}`);

  let allRows: ParsedRow[] = [];
  for (const file of FILES) {
    const filePath = path.join(__dirname, "../ingestion/registry/curator-submissions", file);
    const text = await readFile(filePath, "utf-8");
    const rows = parseChecklist(text);
    console.log(`  ${file}: parsed ${rows.length} rows`);
    allRows = allRows.concat(rows);
  }
  console.log(`Total: ${allRows.length} rows`);

  const dataSource = await prisma.dataSource.upsert({
    where: { identifier: SOURCE_IDENTIFIER },
    update: { lastSyncedAt: new Date() },
    create: {
      identifier: SOURCE_IDENTIFIER,
      kind: "CURATOR",
      name: "Manually transcribed Topps Match Attax 2025/26 base set checklist",
      licenseType: "COMMUNITY",
      trustLevel: 50,
      lastSyncedAt: new Date(),
    },
  });

  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  const t0 = Date.now();
  const BATCH_LOG_SIZE = 25;

  for (const [i, row] of allRows.entries()) {
    if (i % BATCH_LOG_SIZE === 0) {
      console.log(
        `  [row ${i + 1}/${allRows.length}] created=${created} skipped=${skipped} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    }

    const slug = row.number.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const cardId = `topps-matchattax-2025-26-${slug}`;

    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const teamId = await builder.getOrCreateTeam(row.team);
    const parallelId = row.parallel ? await builder.getOrCreateParallel(row.parallel) : undefined;

    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: SET_ID,
        supertype: "Player",
        subtypes: row.sectionName,
        teams: { connect: { id: teamId } },
      },
    });

    await prisma.variant.create({
      data: {
        cardId: card.id,
        printingId: basePrintingId,
        parallelId,
        isFoil: !!row.parallel,
      },
    });

    created++;
  }

  await prisma.dataSource.update({ where: { id: dataSource.id }, data: { lastSyncedAt: new Date() } });

  console.log(`Done. Created ${created} cards, skipped ${skipped} already-present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
