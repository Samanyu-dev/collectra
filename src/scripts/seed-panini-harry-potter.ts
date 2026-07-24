import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the Panini Harry Potter trading card collection.
 * Features characters from the Harry Potter universe across all films.
 */
const SET_ID = "panini-harry-potter-2024";
const SET_NAME = "Harry Potter Collection 2024";

interface CardRow {
  number: string;
  name: string;
  type?: string;
  characters?: string[];
}

const ALL_CARDS: CardRow[] = [
  // Main Characters
  { number: "1", name: "Harry Potter", characters: ["Harry Potter"] },
  { number: "2", name: "Ron Weasley", characters: ["Ron Weasley"] },
  { number: "3", name: "Hermione Granger", characters: ["Hermione Granger"] },
  { number: "4", name: "The Golden Trio", characters: ["Harry Potter", "Ron Weasley", "Hermione Granger"] },

  // Hogwarts Staff
  { number: "5", name: "Albus Dumbledore", characters: ["Albus Dumbledore"] },
  { number: "6", name: "Minerva McGonagall", characters: ["Minerva McGonagall"] },
  { number: "7", name: "Severus Snape", characters: ["Severus Snape"] },
  { number: "8", name: "Rubeus Hagrid", characters: ["Rubeus Hagrid"] },
  { number: "9", name: "Filius Flitwick", characters: ["Filius Flitwick"] },
  { number: "10", name: "Pomona Sprout", characters: ["Pomona Sprout"] },
  { number: "11", name: "Sybill Trelawney", characters: ["Sybill Trelawney"] },
  { number: "12", name: "Dolores Umbridge", characters: ["Dolores Umbridge"] },

  // Gryffindor Students
  { number: "13", name: "Neville Longbottom", characters: ["Neville Longbottom"] },
  { number: "14", name: "Ginny Weasley", characters: ["Ginny Weasley"] },
  { number: "15", name: "Fred Weasley", characters: ["Fred Weasley"] },
  { number: "16", name: "George Weasley", characters: ["George Weasley"] },
  { number: "17", name: "Seamus Finnigan", characters: ["Seamus Finnigan"] },
  { number: "18", name: "Dean Thomas", characters: ["Dean Thomas"] },
  { number: "19", name: "Lavender Brown", characters: ["Lavender Brown"] },
  { number: "20", name: "Parvati Patil", characters: ["Parvati Patil"] },

  // Slytherin
  { number: "21", name: "Draco Malfoy", characters: ["Draco Malfoy"] },
  { number: "22", name: "Vincent Crabbe", characters: ["Vincent Crabbe"] },
  { number: "23", name: "Gregory Goyle", characters: ["Gregory Goyle"] },
  { number: "24", name: "Pansy Parkinson", characters: ["Pansy Parkinson"] },
  { number: "25", name: "Blaise Zabini", characters: ["Blaise Zabini"] },
  { number: "26", name: "Tom Riddle", characters: ["Tom Riddle"] },

  // Hufflepuff & Ravenclaw
  { number: "27", name: "Cedric Diggory", characters: ["Cedric Diggory"] },
  { number: "28", name: "Luna Lovegood", characters: ["Luna Lovegood"] },
  { number: "29", name: "Cho Chang", characters: ["Cho Chang"] },
  { number: "30", name: "Padma Patil", characters: ["Padma Patil"] },

  // The Order of the Phoenix
  { number: "31", name: "Sirius Black", characters: ["Sirius Black"] },
  { number: "32", name: "Remus Lupin", characters: ["Remus Lupin"] },
  { number: "33", name: "Nymphadora Tonks", characters: ["Nymphadora Tonks"] },
  { number: "34", name: "Alastor Moody", characters: ["Alastor Moody"] },
  { number: "35", name: "Kingsley Shacklebolt", characters: ["Kingsley Shacklebolt"] },
  { number: "36", name: "Molly Weasley", characters: ["Molly Weasley"] },
  { number: "37", name: "Arthur Weasley", characters: ["Arthur Weasley"] },
  { number: "38", name: "Bill Weasley", characters: ["Bill Weasley"] },
  { number: "39", name: "Charlie Weasley", characters: ["Charlie Weasley"] },

  // Death Eaters
  { number: "40", name: "Lord Voldemort", characters: ["Lord Voldemort"] },
  { number: "41", name: "Bellatrix Lestrange", characters: ["Bellatrix Lestrange"] },
  { number: "42", name: "Lucius Malfoy", characters: ["Lucius Malfoy"] },
  { number: "43", name: "Narcissa Malfoy", characters: ["Narcissa Malfoy"] },
  { number: "44", name: "Peter Pettigrew", characters: ["Peter Pettigrew"] },
  { number: "45", name: "Fenrir Greyback", characters: ["Fenrir Greyback"] },

  // Magical Creatures
  { number: "46", name: "Dobby", characters: ["Dobby"] },
  { number: "47", name: "Kreacher", characters: ["Kreacher"] },
  { number: "48", name: "Buckbeak", characters: ["Buckbeak"] },
  { number: "49", name: "Fawkes", characters: ["Fawkes"] },
  { number: "50", name: "Hedwig", characters: ["Hedwig"] },
  { number: "51", name: "Nagini", characters: ["Nagini"] },
  { number: "52", name: "Aragog", characters: ["Aragog"] },

  // Ministry of Magic
  { number: "53", name: "Cornelius Fudge", characters: ["Cornelius Fudge"] },
  { number: "54", name: "Rufus Scrimgeour", characters: ["Rufus Scrimgeour"] },
  { number: "55", name: "Barty Crouch Sr.", characters: ["Barty Crouch Sr."] },
  { number: "56", name: "Amelia Bones", characters: ["Amelia Bones"] },

  // Triwizard Tournament
  { number: "57", name: "Viktor Krum", characters: ["Viktor Krum"] },
  { number: "58", name: "Fleur Delacour", characters: ["Fleur Delacour"] },
  { number: "59", name: "The Triwizard Cup", type: "Artifact" },
  { number: "60", name: "The Goblet of Fire", type: "Artifact" },

  // Magical Objects
  { number: "61", name: "The Elder Wand", type: "Artifact" },
  { number: "62", name: "The Resurrection Stone", type: "Artifact" },
  { number: "63", name: "The Invisibility Cloak", type: "Artifact" },
  { number: "64", name: "The Sorcerer's Stone", type: "Artifact" },
  { number: "65", name: "The Sword of Gryffindor", type: "Artifact" },
  { number: "66", name: "The Marauder's Map", type: "Artifact" },
  { number: "67", name: "The Time-Turner", type: "Artifact" },
  { number: "68", name: "The Pensieve", type: "Artifact" },
  { number: "69", name: "Horcrux: Tom Riddle's Diary", type: "Artifact" },
  { number: "70", name: "Horcrux: Marvolo Gaunt's Ring", type: "Artifact" },
  { number: "71", name: "Horcrux: Slytherin's Locket", type: "Artifact" },
  { number: "72", name: "Horcrux: Hufflepuff's Cup", type: "Artifact" },
  { number: "73", name: "Horcrux: Ravenclaw's Diadem", type: "Artifact" },
  { number: "74", name: "Horcrux: Nagini", type: "Artifact" },
  { number: "75", name: "Horcrux: Harry Potter", type: "Artifact" },

  // Quidditch
  { number: "76", name: "Oliver Wood", characters: ["Oliver Wood"] },
  { number: "77", name: "The Golden Snitch", type: "Artifact" },
  { number: "78", name: "The Quaffle", type: "Artifact" },
  { number: "79", name: "The Bludger", type: "Artifact" },
  { number: "80", name: "Nimbus 2000", type: "Artifact" },
  { number: "81", name: "Firebolt", type: "Artifact" },

  // The Weasley Family
  { number: "82", name: "The Burrow", type: "Location" },
  { number: "83", name: "Percy Weasley", characters: ["Percy Weasley"] },

  // Hogwarts Houses
  { number: "84", name: "Gryffindor Crest", type: "House Crest" },
  { number: "85", name: "Slytherin Crest", type: "House Crest" },
  { number: "86", name: "Hufflepuff Crest", type: "House Crest" },
  { number: "87", name: "Ravenclaw Crest", type: "House Crest" },

  // Hogwarts Locations
  { number: "88", name: "Hogwarts Castle", type: "Location" },
  { number: "89", name: "The Great Hall", type: "Location" },
  { number: "90", name: "The Forbidden Forest", type: "Location" },
  { number: "91", name: "Diagon Alley", type: "Location" },
  { number: "92", name: "Hogsmeade", type: "Location" },
  { number: "93", name: "The Chamber of Secrets", type: "Location" },
  { number: "94", name: "The Room of Requirement", type: "Location" },
  { number: "95", name: "The Astronomy Tower", type: "Location" },

  // Special Edition
  { number: "SE1", name: "Harry Potter", type: "Special Edition", characters: ["Harry Potter"] },
  { number: "SE2", name: "Lord Voldemort", type: "Special Edition", characters: ["Lord Voldemort"] },
  { number: "SE3", name: "Albus Dumbledore", type: "Special Edition", characters: ["Albus Dumbledore"] },
  { number: "SE4", name: "Severus Snape", type: "Special Edition", characters: ["Severus Snape"] },
  { number: "SE5", name: "Sirius Black", type: "Special Edition", characters: ["Sirius Black"] },
  { number: "SE6", name: "Hermione Granger", type: "Special Edition", characters: ["Hermione Granger"] },
  { number: "SE7", name: "Ron Weasley", type: "Special Edition", characters: ["Ron Weasley"] },
  { number: "SE8", name: "Draco Malfoy", type: "Special Edition", characters: ["Draco Malfoy"] },
  { number: "SE9", name: "Luna Lovegood", type: "Special Edition", characters: ["Luna Lovegood"] },
  { number: "SE10", name: "The Hogwarts Express", type: "Special Edition" },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Non-Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Panini");
  const franchiseId = await builder.getOrCreateFranchise("Harry Potter", universeId);
  const brandId = await builder.getOrCreateBrand("Panini", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Harry Potter Collection 2024", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: ALL_CARDS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  const t0 = Date.now();

  for (const [i, row] of ALL_CARDS.entries()) {
    const cardId = `${SET_ID}-${String(row.number).toLowerCase()}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) { skipped++; continue; }

    const characterIds: string[] = [];
    if (row.characters) {
      for (const charName of row.characters) {
        characterIds.push(await builder.getOrCreateCharacter(charName));
      }
    }

    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: String(row.number),
        setId: set.id,
        supertype: row.type ?? "Character",
        characters: characterIds.length > 0 ? { connect: characterIds.map((id) => ({ id })) } : undefined,
      },
    });

    await prisma.variant.create({ data: { cardId: card.id, printingId: basePrintingId } });

    created++;
    if ((i + 1) % 20 === 0) console.log(`  [${i + 1}/${ALL_CARDS.length}] created=${created}`);
  }

  console.log(`Done. Created ${created} cards, skipped ${skipped}. Set: ${SET_NAME} (${(Date.now() - t0) / 1000}s)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });