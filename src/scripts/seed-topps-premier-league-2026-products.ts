import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Populates the Product/ProductComponent/Pack/Evidence graph for Topps
 * Premier League 2025/26 — previously fully unpopulated (this schema has
 * existed since ADR-era work but zero rows for any set until now; see
 * src/app/products/[id]/page.tsx and src/app/pack-simulator/page.tsx, both
 * built against it and rendering empty states before this).
 *
 * Deliberately does NOT use PossiblePull for the insert-subset odds found
 * (Chrome King 1:4 hobby, Gold Lion 1:12 hobby, etc.) — PossiblePull.variantId
 * is a required link to ONE specific variant, and pinning a subset-level
 * "1 in 4 packs contains a card from this 20-card pool" odds to a single
 * arbitrarily-chosen card would misrepresent that one card as 20x rarer
 * than it actually is. Those go on ProductComponent as a guaranteed count
 * per box instead (a box-level fact, not a per-card one), sourced the same
 * way. See the final report for what's cited OFFICIAL vs. COMMUNITY.
 *
 * Source: checklistinsider.com's 2025-26 Topps Premier League Soccer
 * checklist summary (fetched 2026-08-07), cross-validated against the
 * release-schedule text the user pasted earlier in this conversation
 * (exact match on retail/hobby dates and pack configuration).
 */
const SET_ID = "topps-premier-league-2026";
const SOURCE_URL = "https://www.checklistinsider.com/2025-26-topps-premier-league";

async function main() {
  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  const evidenceId = await builder.getOrCreateEvidence("COMMUNITY", SOURCE_URL, false);

  // ---- Hobby Box ----
  const hobbyBoxId = await builder.getOrCreateProduct("Topps Premier League 2025/26 Hobby Box", SET_ID, 159.99);
  const existingHobbyRelease = await prisma.release.findFirst({ where: { productId: hobbyBoxId } });
  if (!existingHobbyRelease) {
    await prisma.release.create({ data: { productId: hobbyBoxId, date: new Date("2025-09-17"), status: "AVAILABLE" } });
  }

  const hobbyPackId = await builder.getOrCreatePack("Premier League 2025/26 Hobby Pack (25 cards)");
  const hobbyComponents: Array<{ type: string; name: string; quantity: number }> = [
    { type: "PACK", name: "Hobby Pack (25 cards)", quantity: 8 },
    { type: "PACK", name: "Black Edge Bonus Pack (3 cards)", quantity: 1 },
    { type: "GUARANTEED_HIT", name: "Autograph (guaranteed minimum)", quantity: 1 },
    { type: "GUARANTEED_HIT", name: "Additional autograph or relic hit", quantity: 2 },
    { type: "GUARANTEED_HIT", name: "Numbered parallel", quantity: 4 },
    { type: "GUARANTEED_HIT", name: "Chrome King insert (subset-level; source also states 1:4 hobby pack odds)", quantity: 2 },
  ];
  for (const c of hobbyComponents) {
    const existing = await prisma.productComponent.findFirst({ where: { productId: hobbyBoxId, name: c.name } });
    if (!existing) {
      await prisma.productComponent.create({
        data: {
          productId: hobbyBoxId,
          type: c.type,
          name: c.name,
          quantity: c.quantity,
          packId: c.type === "PACK" ? hobbyPackId : undefined,
        },
      });
    }
  }

  // Hobby-exclusive insert subset odds (pack-level, not per-variant — see file doc comment).
  const hobbyOddsNotes = [
    "Chrome King: 1:4 hobby pack odds (1:10 retail)",
    "Gold Lion: 1:12 hobby pack odds (1:28 retail)",
    "Premier Pull Ultra Limited Edition: 1:45 hobby pack odds (1:100 retail)",
    "Diamond Rookie: 1:135 hobby pack odds (1:500 retail)",
    "Heat Vision, Home Advantage, Perfect Storm: hobby-exclusive case hits (1:1 case each)",
  ];
  for (const note of hobbyOddsNotes) {
    const existing = await prisma.productComponent.findFirst({ where: { productId: hobbyBoxId, name: note } });
    if (!existing) {
      await prisma.productComponent.create({ data: { productId: hobbyBoxId, type: "INSERT_ODDS", name: note, quantity: 1 } });
    }
  }

  // ---- Retail Box ----
  const retailBoxId = await builder.getOrCreateProduct("Topps Premier League 2025/26 Retail Box (Booster Box)", SET_ID);
  const existingRetailReleaseUK = await prisma.release.findFirst({ where: { productId: retailBoxId, country: "United Kingdom" } });
  if (!existingRetailReleaseUK) {
    await prisma.release.create({ data: { productId: retailBoxId, date: new Date("2025-08-07"), country: "United Kingdom", status: "AVAILABLE" } });
  }
  const existingRetailReleaseIntl = await prisma.release.findFirst({ where: { productId: retailBoxId, country: "Worldwide" } });
  if (!existingRetailReleaseIntl) {
    await prisma.release.create({ data: { productId: retailBoxId, date: new Date("2025-08-21"), country: "Worldwide", status: "AVAILABLE" } });
  }

  const retailPackId = await builder.getOrCreatePack("Premier League 2025/26 Retail Packet (10 cards)");
  const retailComponents: Array<{ type: string; name: string; quantity: number }> = [
    { type: "PACK", name: "Retail Packet (10 cards: 6-7 base + 3-4 insert)", quantity: 28 },
  ];
  for (const c of retailComponents) {
    const existing = await prisma.productComponent.findFirst({ where: { productId: retailBoxId, name: c.name } });
    if (!existing) {
      await prisma.productComponent.create({ data: { productId: retailBoxId, type: c.type, name: c.name, quantity: c.quantity, packId: retailPackId } });
    }
  }

  // Retail packet-level parallel odds (Blue 1:2, Yellow 1:4, Green 1:8) are
  // already documented in the original seed script's EVERYWHERE_BASE_PARALLELS
  // comment — not duplicated here to avoid two sources of truth for the same fact.

  console.log("Hobby Box product:", hobbyBoxId);
  console.log("Retail Box product:", retailBoxId);
  console.log("Evidence:", evidenceId);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../ingestion/engine/prisma");
    await prisma.$disconnect();
  });
