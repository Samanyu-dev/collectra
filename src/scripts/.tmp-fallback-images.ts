/**
 * Fallback image backfill for cards whose pokellector image never
 * downloaded (pokellector is now blocking us domain-wide at the TLS layer).
 * Uses getcollectr's own re-hosted card images (public.getcollectr.com —
 * separate, currently-reachable CDN) instead, only for cards still stuck
 * on a FAILED pokellector Media row. Uses attachHotlinkImage's
 * replaceExisting so the stale failed attachment is cleanly swapped, not
 * left dangling alongside a second one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../ingestion/engine/prisma";
import { attachHotlinkImage } from "../ingestion/engine/media";
import { processMediaRow } from "../ingestion/engine/process-media";
import type { CatalogRow } from "./scrape-getcollectr-mega-dream-ex";

async function main() {
  const catalog: CatalogRow[] = JSON.parse(readFileSync(join(__dirname, "data", "mega-dream-ex-getcollectr-catalog.json"), "utf-8"));
  const imageByNumber = new Map<string, string>();
  for (const row of catalog) {
    if (row.image_url && !imageByNumber.has(row.card_number)) imageByNumber.set(row.card_number, row.image_url);
  }

  const cards = await prisma.card.findMany({ where: { setId: "pkmn-jp-mega-dream-ex" }, select: { id: true, number: true } });
  const atts = await prisma.mediaAttachment.findMany({
    where: { entityType: "Card", entityId: { in: cards.map((c) => c.id) }, usage: "OFFICIAL_ARTWORK" },
    include: { media: { select: { status: true } } },
  });
  const failedCardIds = new Set(atts.filter((a) => a.media.status === "FAILED").map((a) => a.entityId));
  const targets = cards.filter((c) => failedCardIds.has(c.id));
  console.log(`${targets.length} cards need the getcollectr fallback image.`);

  let ok = 0;
  let stillFailed = 0;
  let noImage = 0;
  for (let i = 0; i < targets.length; i++) {
    const card = targets[i];
    const url = imageByNumber.get(card.number);
    if (!url) {
      noImage++;
      continue;
    }
    const attachment = await attachHotlinkImage({
      url,
      entityType: "Card",
      entityId: card.id,
      usage: "OFFICIAL_ARTWORK",
      sourceIdentifier: "getcollectr:mega-dream-ex",
      sourceKind: "COMMUNITY",
      replaceExisting: true,
    });
    if (attachment) {
      const result = await processMediaRow(attachment.mediaId);
      if (result.status === "failed") stillFailed++;
      else ok++;
    } else {
      noImage++;
    }
    if ((i + 1) % 25 === 0) console.log(`  [${i + 1}/${targets.length}] ok=${ok} stillFailed=${stillFailed} noImage=${noImage}`);
  }
  console.log(`\nDone. ok=${ok} stillFailed=${stillFailed} noImage=${noImage}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
