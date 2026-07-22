import { PrismaClient } from "@prisma/client";
import { builder } from "../ingestion/engine/builder";

const prisma = new PrismaClient();

/**
 * Seeds the manufacturer/brand taxonomy for the "universal collector database"
 * goal — sports & non-sports trading cards, independent of any single
 * ingestion source. Modeled by actual corporate history, not collapsed into
 * one row, so a line that changed ownership (e.g. Donruss/Score/Fleer/Bowman)
 * stays traceable via ProductRelationship rather than silently merged.
 */
async function main() {
  console.log("Seeding Sports/Non-Sports Universe and Manufacturer taxonomy...");

  const sportsUniverseId = await builder.getOrCreateUniverse("Sports");
  const nonSportsUniverseId = await builder.getOrCreateUniverse("Non-Sports");

  // Independent manufacturers (some now operate under license/ownership of
  // Topps or Panini, but are modeled as their own Manufacturer for history).
  const manufacturers = [
    "Topps",
    "Panini",
    "Upper Deck",
    "Leaf",
    "Futera",
    "Donruss",
    "Score",
    "Fleer",
    "SkyBox",
    "Press Pass",
    "Wild Card",
  ];

  const manufacturerIds: Record<string, string> = {};
  for (const name of manufacturers) {
    manufacturerIds[name] = await builder.getOrCreateManufacturer(name);
    console.log(`  Manufacturer: ${name}`);
  }

  // Bowman is a Topps-owned brand, not an independent manufacturer.
  await builder.getOrCreateBrand("Bowman", manufacturerIds["Topps"]);
  await builder.getOrCreateBrand("Topps Chrome", manufacturerIds["Topps"]);
  await builder.getOrCreateBrand("Panini Prizm", manufacturerIds["Panini"]);
  await builder.getOrCreateBrand("Donruss Optic", manufacturerIds["Panini"]); // Panini-licensed today

  // Franchises this pass anticipates (sports leagues + non-sports licensed IP).
  // Franchise rows are created lazily by ingestion, but seeding the common
  // ones now means Phase 4 ingestion/curation has stable ids to target.
  const sportsFranchises = [
    "Football (Soccer)",
    "NBA",
    "NFL",
    "MLB",
    "NHL",
    "Formula 1",
    "UFC",
    "Cricket",
    "Tennis",
    "Golf",
    "WWE",
    "Olympics",
    "MLS",
    "NWSL",
  ];
  const nonSportsFranchises = [
    "Marvel",
    "Star Wars",
    "Disney",
    "Pixar",
    "Naruto",
    "One Piece",
    "Dragon Ball",
    "Harry Potter",
    "Garbage Pail Kids",
    "Stranger Things",
    "The Walking Dead",
    "Game of Thrones",
  ];

  for (const name of sportsFranchises) {
    await builder.getOrCreateFranchise(name, sportsUniverseId);
    console.log(`  Franchise (Sports): ${name}`);
  }
  for (const name of nonSportsFranchises) {
    await builder.getOrCreateFranchise(name, nonSportsUniverseId);
    console.log(`  Franchise (Non-Sports): ${name}`);
  }

  console.log("Done. Note: this seeds taxonomy shells only — no Cards/Sets are created here. Those come from Phase 4 ingestion (official APIs, vetted datasets, curator imports, community contributions).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
