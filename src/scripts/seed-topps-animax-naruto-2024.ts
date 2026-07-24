import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2024 Topps Animax Naruto trading card set.
 * 175-card checklist featuring characters and locations from Naruto Shippuden.
 */
const SET_ID = "topps-animax-naruto-2024";
const SET_NAME = "Topps Animax Naruto 2024";

interface CardRow {
  number: string;
  name: string;
  type?: string;
  characters?: string[];
}

const ALL_CARDS: CardRow[] = [
  // Team Cards and Locations (1-8)
  { number: "1", name: "Team Kakashi", type: "Team" },
  { number: "2", name: "Team Kurenai", type: "Team" },
  { number: "3", name: "Team Guy", type: "Team" },
  { number: "4", name: "Team Asuma", type: "Team" },
  { number: "5", name: "Uchiha Naka Shrine", type: "Location" },
  { number: "6", name: "Konoha Memorial", type: "Location" },
  { number: "7", name: "Konoha Main Gate", type: "Location" },
  { number: "8", name: "The Forest Of Death", type: "Location" },

  // Character Cards (9-175)
  { number: "9", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "10", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "12", name: "Sarutobi / Lord Third", characters: ["Sarutobi", "Lord Third"] },
  { number: "13", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "14", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "15", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "16", name: "Hunata Hyuga", characters: ["Hunata Hyuga"] },
  { number: "17", name: "Tsunade Senju", characters: ["Tsunade Senju"] },
  { number: "18", name: "Kabuto Yakushi", characters: ["Kabuto Yakushi"] },
  { number: "19", name: "Gaara", characters: ["Gaara"] },
  { number: "20", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "21", name: "Asuma Sarutobi", characters: ["Asuma Sarutobi"] },
  { number: "22", name: "Asuma Sarutobi", characters: ["Asuma Sarutobi"] },
  { number: "23", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "24", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "25", name: "Rock Lee", characters: ["Rock Lee"] },
  { number: "26", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "27", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "28", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "29", name: "Sakura Haruno", characters: ["Sakura Haruno"] },
  { number: "30", name: "Kagari", characters: ["Kagari"] },
  { number: "31", name: "Kabuto Yakushi", characters: ["Kabuto Yakushi"] },
  { number: "32", name: "Shino Aburame", characters: ["Shino Aburame"] },
  { number: "33", name: "Sakura vs Ino", type: "Battle", characters: ["Sakura Haruno", "Ino Yamanaka"] },
  { number: "34", name: "Hunata Hyuga", characters: ["Hunata Hyuga"] },
  { number: "35", name: "Orochimaru", characters: ["Orochimaru"] },
  { number: "36", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "37", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "38", name: "Rock Lee", characters: ["Rock Lee"] },
  { number: "39", name: "Sakura Haruno", characters: ["Sakura Haruno"] },
  { number: "40", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "41", name: "Sakura Haruno", characters: ["Sakura Haruno"] },
  { number: "42", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "43", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "44", name: "Rock Lee", characters: ["Rock Lee"] },
  { number: "45", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "46", name: "Misumi Tsurugi", characters: ["Misumi Tsurugi"] },
  { number: "47", name: "Kiba & Akamaru", characters: ["Kiba Inuzuka", "Akamaru"] },
  { number: "48", name: "Ino Yamanaka", characters: ["Ino Yamanaka"] },
  { number: "49", name: "Sakura Haruno", characters: ["Sakura Haruno"] },
  { number: "50", name: "Temari", characters: ["Temari"] },
  { number: "51", name: "Kin Tsuchi", characters: ["Kin Tsuchi"] },
  { number: "52", name: "Kiba Inuzuka", characters: ["Kiba Inuzuka"] },
  { number: "53", name: "Akamaru", characters: ["Akamaru"] },
  { number: "54", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "55", name: "Kiba Inuzuka", characters: ["Kiba Inuzuka"] },
  { number: "56", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "57", name: "Neji Hyuga", characters: ["Neji Hyuga"] },
  { number: "58", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "59", name: "Sexy Jutsu", type: "Jutsu" },
  { number: "60", name: "Naruto's First toad summon", type: "Summoning", characters: ["Naruto Uzumaki"] },
  { number: "61", name: "The Youthful Sensei", type: "Character", characters: ["Might Guy"] },
  { number: "62", name: "Sakura vs Zaku", type: "Battle", characters: ["Sakura Haruno", "Zaku"] },
  { number: "63", name: "Team 7 is formed", type: "Event" },
  { number: "64", name: "Fight intervened-Neji vs Hinata", type: "Battle", characters: ["Neji Hyuga", "Hinata Hyuga"] },
  { number: "65", name: "The Forbidden Jutsu", type: "Jutsu" },
  { number: "66", name: "Kurenai vs Itachi", type: "Battle", characters: ["Kurenai Yuhi", "Itachi Uchiha"] },
  { number: "67", name: "Tsunade smacks Naruto", type: "Event", characters: ["Tsunade Senju", "Naruto Uzumaki"] },
  { number: "68", name: "Internal fued - Team 7", type: "Event", characters: ["Team 7"] },
  { number: "69", name: "Curse sealing - Kakashi", type: "Event", characters: ["Kakashi Hatake"] },
  { number: "70", name: "Byakugan", type: "Jutsu", characters: ["Neji Hyuga", "Hinata Hyuga"] },
  { number: "71", name: "Sasuke confronts Itachi", type: "Event", characters: ["Sasuke Uchiha", "Itachi Uchiha"] },
  { number: "72", name: "The third gate of life", type: "Jutsu", characters: ["Rock Lee", "Might Guy"] },
  { number: "73", name: "Kakashi vs Sasuke", type: "Battle", characters: ["Kakashi Hatake", "Sasuke Uchiha"] },
  { number: "74", name: "Kurama chakra appears", type: "Event", characters: ["Naruto Uzumaki", "Kurama"] },
  { number: "75", name: "Enraged Naruto", type: "Event", characters: ["Naruto Uzumaki"] },
  { number: "76", name: "Shukaku vs Kurama", type: "Battle", characters: ["Shukaku", "Kurama"] },
  { number: "77", name: "Naruto vs Gaara", type: "Battle", characters: ["Naruto Uzumaki", "Gaara"] },
  { number: "78", name: "Anko vs morphed lion", type: "Battle", characters: ["Anko Mitarashi"] },
  { number: "79", name: "Naruto meets Kurama", type: "Event", characters: ["Naruto Uzumaki", "Kurama"] },
  { number: "80", name: "Gaara - Half shukaku form", type: "Transformation", characters: ["Gaara", "Shukaku"] },
  { number: "81", name: "Gaara - A Change of Heart", type: "Event", characters: ["Gaara"] },
  { number: "82", name: "Sasuke see's Naruto's Power", type: "Event", characters: ["Sasuke Uchiha", "Naruto Uzumaki"] },
  { number: "83", name: "Mysterious Peacock jutsu", type: "Jutsu" },
  { number: "84", name: "Kakashi confronts Sasuke", type: "Event", characters: ["Kakashi Hatake", "Sasuke Uchiha"] },
  { number: "85", name: "Jiraiya intervenes-Kabuto vs Tsunade", type: "Battle", characters: ["Jiraiya", "Kabuto Yakushi", "Tsunade Senju"] },
  { number: "86", name: "Naruto saves Tsunade from Kabuto", type: "Event", characters: ["Naruto Uzumaki", "Tsunade Senju", "Kabuto Yakushi"] },
  { number: "87", name: "Tsunade heals Naruto", type: "Event", characters: ["Tsunade Senju", "Naruto Uzumaki"] },
  { number: "88", name: "Sasuke breaks Gaara's sand barrier", type: "Event", characters: ["Sasuke Uchiha", "Gaara"] },
  { number: "89", name: "Sasuke reads the tablet at Naka Shrine", type: "Event", characters: ["Sasuke Uchiha"] },
  { number: "90", name: "Lee protects Team Seven", type: "Event", characters: ["Rock Lee", "Team 7"] },
  { number: "91", name: "The Hidden Star", type: "Jutsu" },
  { number: "92", name: "Chunin exam - Final Round", type: "Event" },
  { number: "93", name: "Naruto saves Sasuke", type: "Event", characters: ["Naruto Uzumaki", "Sasuke Uchiha"] },
  { number: "94", name: "Orochimaru applies 5 pronged seal", type: "Event", characters: ["Orochimaru", "Sasuke Uchiha"] },
  { number: "95", name: "Sasuke Retrieval Team", type: "Team" },
  { number: "96", name: "Relaxing Kakashi", type: "Character", characters: ["Kakashi Hatake"] },
  { number: "97", name: "Zabuza-kill spree", type: "Event", characters: ["Zabuza Momochi"] },
  { number: "98", name: "The Final Moment", type: "Event" },
  { number: "99", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
  { number: "100", name: "Shikamaru Nara", characters: ["Shikamaru Nara"] },
  { number: "101", name: "Neji Hyuga", characters: ["Neji Hyuga"] },
  { number: "102", name: "Orochimaru", characters: ["Orochimaru"] },
  { number: "103", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "104", name: "Sakura Haruno", characters: ["Sakura Haruno"] },
  { number: "105", name: "Rock Lee", characters: ["Rock Lee"] },
  { number: "106", name: "Gaara of the Sand", characters: ["Gaara"] },
  { number: "107", name: "Kabuto Yakushi", characters: ["Kabuto Yakushi"] },
  { number: "108", name: "Kakshi Hatake", characters: ["Kakashi Hatake"] },
  { number: "109", name: "Sand Wall - Gaara", type: "Jutsu", characters: ["Gaara"] },
  { number: "110", name: "Earth style wall - Hiruzen Sarutobi", type: "Jutsu", characters: ["Hiruzen Sarutobi"] },
  { number: "111", name: "8 Trigrams - Hinata Hyuga", type: "Jutsu", characters: ["Hinata Hyuga"] },
  { number: "112", name: "Water Wall - Kakashi Hatake", type: "Jutsu", characters: ["Kakashi Hatake"] },
  { number: "113", name: "Clone Jutsu - Zabuza Momochi", type: "Jutsu", characters: ["Zabuza Momochi"] },
  { number: "114", name: "Water Clone Jutsu - Yoroi Akado", type: "Jutsu", characters: ["Yoroi Akado"] },
  { number: "115", name: "Clone Jutsu - Shino Aburame", type: "Jutsu", characters: ["Shino Aburame"] },
  { number: "116", name: "Mitotic Regeneration - Tsunade Senju", type: "Jutsu", characters: ["Tsunade Senju"] },
  { number: "117", name: "Terra Shield - Jirobo", type: "Jutsu", characters: ["Jirobo"] },
  { number: "118", name: "Genjutsu Release - Kakashi and Guy", type: "Jutsu", characters: ["Kakashi Hatake", "Might Guy"] },
  { number: "119", name: "Chakra Absorption - Yoroi", type: "Jutsu", characters: ["Yoroi Akado"] },
  { number: "120", name: "Hidden Mist Jutsu - Zabuza", type: "Jutsu", characters: ["Zabuza Momochi"] },
  { number: "121", name: "Chidori - Sasuke Uchiha", type: "Jutsu", characters: ["Sasuke Uchiha"] },
  { number: "122", name: "Mind Transfer Jutsu", type: "Jutsu" },
  { number: "123", name: "Body Expansion Jutsu", type: "Jutsu" },
  { number: "124", name: "Fireball Jutsu", type: "Jutsu" },
  { number: "125", name: "Giant Vortex Jutsu", type: "Jutsu" },
  { number: "126", name: "Kakashi - Chidori", type: "Jutsu", characters: ["Kakashi Hatake"] },
  { number: "127", name: "Black Rain Jutsu", type: "Jutsu" },
  { number: "128", name: "Explosive Kunai", type: "Weapon" },
  { number: "129", name: "Arm Expansion Jutsu", type: "Jutsu" },
  { number: "130", name: "Puppet Bone Crusher", type: "Jutsu" },
  { number: "131", name: "Primary Lotus", type: "Jutsu", characters: ["Rock Lee"] },
  { number: "132", name: "Phoenix Flower Jutsu", type: "Jutsu" },
  { number: "133", name: "All Fours Jutsu", type: "Jutsu" },
  { number: "134", name: "Sommoning Jutsu", type: "Jutsu" },
  { number: "135", name: "Chakra Scalpel", type: "Jutsu" },
  { number: "136", name: "Head Hunter Jutsu", type: "Jutsu" },
  { number: "137", name: "Beast Human Clone", type: "Jutsu" },
  { number: "138", name: "Face Copying Jutsu", type: "Jutsu", characters: ["Kabuto Yakushi"] },
  { number: "139", name: "Summoning Rashomon", type: "Jutsu" },
  { number: "140", name: "Eight Divination Signs Air Palm", type: "Jutsu", characters: ["Neji Hyuga"] },
  { number: "141", name: "Senbon Rainstorm", type: "Jutsu" },
  { number: "142", name: "Headhunter Jutsu", type: "Jutsu" },
  { number: "143", name: "Chakra Absorption", type: "Jutsu" },
  { number: "144", name: "Fire Breath", type: "Jutsu" },
  { number: "145", name: "Monstrous Sand Arm", type: "Jutsu", characters: ["Gaara"] },
  { number: "146", name: "Shadow Clone Jutsu", type: "Jutsu", characters: ["Naruto Uzumaki"] },
  { number: "147", name: "Multiple Shadow Clone Jutsu", type: "Jutsu", characters: ["Naruto Uzumaki"] },
  { number: "148", name: "Flying Leeches", type: "Jutsu" },
  { number: "149", name: "Paper Bomb", type: "Weapon" },
  { number: "150", name: "Life or Death Genjutsu", type: "Jutsu" },
  { number: "151", name: "Choji Akimichi", characters: ["Choji Akimichi"] },
  { number: "152", name: "Shikamaru Nara", characters: ["Shikamaru Nara"] },
  { number: "153", name: "Shizune", characters: ["Shizune"] },
  { number: "154", name: "Tsunade Senju", characters: ["Tsunade Senju"] },
  { number: "155", name: "Orochimaru", characters: ["Orochimaru"] },
  { number: "156", name: "Konohamaru Sarutobi", characters: ["Konohamaru Sarutobi"] },
  { number: "157", name: "Kurenai Yuhi", characters: ["Kurenai Yuhi"] },
  { number: "158", name: "Minato Namikaze - The Yellow Flash of Konoha", characters: ["Minato Namikaze"] },
  { number: "159", name: "Kankuro", characters: ["Kankuro"] },
  { number: "160", name: "Kiba Inuzuka", characters: ["Kiba Inuzuka"] },
  { number: "161", name: "Kabuto Yakushi", characters: ["Kabuto Yakushi"] },
  { number: "162", name: "Kakashi Hatake", characters: ["Kakashi Hatake"] },
  { number: "163", name: "Monkey King - Enma", characters: ["Enma"] },
  { number: "164", name: "Ino Yamanaka", characters: ["Ino Yamanaka"] },
  { number: "165", name: "Iruka Imino", characters: ["Iruka Imino"] },
  { number: "166", name: "Itachi Uchiha", characters: ["Itachi Uchiha"] },
  { number: "167", name: "Might Guy", characters: ["Might Guy"] },
  { number: "168", name: "Haku", characters: ["Haku"] },
  { number: "169", name: "Gaara of the Sand", characters: ["Gaara"] },
  { number: "170", name: "Asuma Sarutobi", characters: ["Asuma Sarutobi"] },
  { number: "171", name: "Temari", characters: ["Temari"] },
  { number: "172", name: "Tenten", characters: ["Tenten"] },
  { number: "173", name: "Sasuke Uchiha", characters: ["Sasuke Uchiha"] },
  { number: "174", name: "Sakura Haruno", characters: ["Sakura Haruno"] },
  { number: "175", name: "Naruto Uzumaki", characters: ["Naruto Uzumaki"] },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Non-Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Naruto", universeId);
  const brandId = await builder.getOrCreateBrand("Animax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Naruto 2024", franchiseId, brandId);
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

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: String(row.number),
        setId: set.id,
        supertype: row.type ?? "Character",
        characters: characterIds.length > 0 ? { connect: characterIds.map((id) => ({ id })) } : undefined,
      },
    });

    created++;
    if ((i + 1) % 25 === 0) console.log(`  [${i + 1}/${ALL_CARDS.length}] created=${created}`);
  }

  console.log(`Done. Created ${created} cards, skipped ${skipped}. Set: ${SET_NAME} (${(Date.now() - t0) / 1000}s)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });