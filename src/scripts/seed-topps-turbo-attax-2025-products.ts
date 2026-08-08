import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Populates the Product/ProductComponent/Pack/Evidence graph for Topps
 * Turbo Attax 2025 (India) — same previously-unpopulated schema lit up for
 * Premier League 2025/26 in seed-topps-premier-league-2026-products.ts.
 *
 * Deliberately does NOT use PossiblePull for the Bright Yellow Foil 1/1 odds
 * (1:30 Champions Box / 1:15 Jumbo Pack) — like Premier League's Chrome King,
 * this is a box-level "1 in N boxes contains a Bright Yellow Foil 1/1 of
 * SOME card" fact, not a single-variant fact (Bright Yellow Foil applies
 * per-card across the base checklist, see seed-turbo-attax-2025-india-parallels.ts).
 * PossiblePull.variantId requires pinning to one specific card+parallel,
 * which would misrepresent that one arbitrary card as far rarer than it is.
 * Goes on ProductComponent (type INSERT_ODDS) instead, same as the PL script.
 *
 * Sources:
 *  - Jumbo Pack Box: https://gridcards.co.uk/products/jumbo-box-topps-india-f1-turbo-attax-2025
 *    (fetched directly 2026-08-07 — full page content confirmed: price,
 *    pack/card counts, guaranteed numbered-parallel counts, 1:15 box odds).
 *  - Champions Box: https://gridcards.co.uk/products/champions-box-topps-india-f1-turbo-attax-2025
 *    — could NOT be fetched directly this session (consistent 404 via the
 *    fetch tool despite being indexed/live), so figures below are taken from
 *    two independent web-search result summaries of that same page's content
 *    (2026-08-07), which agreed on every figure used here. Treated as
 *    COMMUNITY-tier, page-content-unverified-firsthand — flagged in the
 *    final report. The 177-card total does not arithmetically reconcile
 *    with the individual component counts as summarized (120 pack cards +
 *    13 LE + 6 Sig + 5 Diamond Pull + 7 Giant + 7 Numbered = 158, not 177) —
 *    recorded as-stated rather than adjusted, since I can't tell which
 *    individual figure (if any) is wrong without the source page itself.
 */
const SET_ID = "topps-turbo-attax-2025";

async function main() {
  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  const jumboEvidenceId = await builder.getOrCreateEvidence(
    "COMMUNITY",
    "https://gridcards.co.uk/products/jumbo-box-topps-india-f1-turbo-attax-2025",
    false
  );
  const championsEvidenceId = await builder.getOrCreateEvidence(
    "COMMUNITY",
    "https://gridcards.co.uk/products/champions-box-topps-india-f1-turbo-attax-2025",
    false
  );

  // ---- Jumbo Pack Box ----
  const jumboBoxId = await builder.getOrCreateProduct("Topps Turbo Attax 2025 India Jumbo Pack Box", SET_ID);
  const existingJumboRelease = await prisma.release.findFirst({ where: { productId: jumboBoxId, setId: SET_ID } });
  if (!existingJumboRelease) {
    await prisma.release.create({ data: { productId: jumboBoxId, setId: SET_ID, country: "India", status: "AVAILABLE" } });
  }

  const jumboPackId = await builder.getOrCreatePack("Turbo Attax 2025 India Jumbo Packet (10 cards)");
  const jumboComponents: Array<{ type: string; name: string; quantity: number; packId?: string }> = [
    { type: "PACK", name: "Jumbo Packet (10 cards)", quantity: 14, packId: jumboPackId },
    { type: "GUARANTEED_HIT", name: "Black Edge card (UK-printed)", quantity: 2 },
    { type: "GUARANTEED_HIT", name: "Cranberry Foil Numbered Parallel #/99", quantity: 2 },
    { type: "GUARANTEED_HIT", name: "Aquamarine Foil Numbered Parallel #/79", quantity: 4 },
    { type: "GUARANTEED_HIT", name: "Diamond Grey Foil Numbered Parallel #/49", quantity: 2 },
  ];
  for (const c of jumboComponents) {
    const existing = await prisma.productComponent.findFirst({ where: { productId: jumboBoxId, name: c.name } });
    if (!existing) {
      await prisma.productComponent.create({
        data: { productId: jumboBoxId, type: c.type, name: c.name, quantity: c.quantity, packId: c.packId },
      });
    }
  }
  const jumboOddsName = "Bright Yellow Foil 1/1: 1:15 box odds";
  const existingJumboOdds = await prisma.productComponent.findFirst({ where: { productId: jumboBoxId, name: jumboOddsName } });
  if (!existingJumboOdds) {
    await prisma.productComponent.create({ data: { productId: jumboBoxId, type: "INSERT_ODDS", name: jumboOddsName, quantity: 1 } });
  }

  // ---- Champions Box ----
  const championsBoxId = await builder.getOrCreateProduct("Topps Turbo Attax 2025 India Champions Box", SET_ID);
  const existingChampionsRelease = await prisma.release.findFirst({ where: { productId: championsBoxId, setId: SET_ID } });
  if (!existingChampionsRelease) {
    await prisma.release.create({ data: { productId: championsBoxId, setId: SET_ID, country: "India", status: "AVAILABLE" } });
  }

  const championsPackId = await builder.getOrCreatePack("Turbo Attax 2025 India Champions Packet (10 cards)");
  const championsComponents: Array<{ type: string; name: string; quantity: number; packId?: string }> = [
    { type: "PACK", name: "Champions Packet (10 cards)", quantity: 12, packId: championsPackId },
    { type: "GUARANTEED_HIT", name: "Numbered Parallel (minimum)", quantity: 7 },
    { type: "GUARANTEED_HIT", name: "Limited Edition card", quantity: 13 },
    { type: "GUARANTEED_HIT", name: "Signature Style card", quantity: 6 },
    { type: "GUARANTEED_HIT", name: "Diamond Pull card", quantity: 5 },
    { type: "GUARANTEED_HIT", name: "Giant Card", quantity: 7 },
    { type: "CHASE_CARD", name: "LE35 Kimi Antonelli Gold Limited Edition (box-exclusive chase card)", quantity: 1 },
  ];
  for (const c of championsComponents) {
    const existing = await prisma.productComponent.findFirst({ where: { productId: championsBoxId, name: c.name } });
    if (!existing) {
      await prisma.productComponent.create({
        data: { productId: championsBoxId, type: c.type, name: c.name, quantity: c.quantity, packId: c.packId },
      });
    }
  }
  const championsOddsName = "Bright Yellow Foil 1/1: 1:30 box odds";
  const existingChampionsOdds = await prisma.productComponent.findFirst({ where: { productId: championsBoxId, name: championsOddsName } });
  if (!existingChampionsOdds) {
    await prisma.productComponent.create({ data: { productId: championsBoxId, type: "INSERT_ODDS", name: championsOddsName, quantity: 1 } });
  }

  console.log("Jumbo Pack Box product:", jumboBoxId, "evidence:", jumboEvidenceId);
  console.log("Champions Box product:", championsBoxId, "evidence:", championsEvidenceId);
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
