import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

/**
 * Seeds the 2024 Topps Animax Naruto trading card set.
 *
 * Source: checklist text/screenshots supplied by the user. The checklist has
 * 120 base cards plus extension, Scodix, limited, tin/theme, insert, rare, and
 * tactic cards.
 */
const SET_ID = "topps-animax-naruto-2024";
const SET_NAME = "Topps Animax Naruto 2024";
// The original checklist (314) was itself incomplete — confirmed 2026-08-06
// against a real physical-collection video (#180, #186, #189, #190) and
// real packs pulled by the user (#194, #195), then 2026-08-07 against a
// written Topps Animax 2024 checklist (#176, #181, #185 — also revealing
// that #176-195 is a distinct "Holo Foil" subset, not a Character Bio
// continuation). This count is a sanity guard against accidental data
// loss/duplication on edits, not a claimed final total — #177-179/182-184/
// 187-188/191-193 and anything past #195 are still unconfirmed gaps, so
// this number will rise again once more of the real checklist is available.
const EXPECTED_CARD_COUNT = 323;

interface CardRow {
  number: string;
  subset: string;
  name: string;
  section: string;
  characters?: string[];
}

type CardTuple = readonly [number: string, name: string, characters?: string[]];

function rows(section: string, subset: string, entries: readonly CardTuple[]): CardRow[] {
  return entries.map(([number, name, characters]) => ({
    number,
    subset,
    name,
    section,
    characters,
  }));
}

const CHECKLIST: CardRow[] = [
  ...rows("Base Cards", "Role Playing Cards", [
    ["1", "Team Kakashi", ["Kakashi Hatake", "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno"]],
    ["2", "Team Kurenai", ["Kurenai Yuhi", "Hinata Hyuga", "Kiba Inuzuka", "Shino Aburame"]],
    ["3", "Team Guy", ["Might Guy", "Rock Lee", "Neji Hyuga", "Tenten"]],
    ["4", "Team Asuma", ["Asuma Sarutobi", "Shikamaru Nara", "Choji Akimichi", "Ino Yamanaka"]],
  ]),
  ...rows("Base Cards", "Spawn Cards", [
    ["5", "Uchiha Naka Shrine"],
    ["6", "Konoha Memorial"],
    ["7", "Konoha Main Gate"],
    ["8", "The Forest of Death"],
  ]),
  ...rows("Base Cards", "Light Attack", [
    ["9", "Sasuke Uchiha"],
    ["10", "Sasuke Uchiha"],
    ["11", "Light Attack #11"],
    ["12", "Sarutobi / Lord Third"],
    ["13", "Naruto Uzumaki"],
    ["14", "Sasuke Uchiha"],
    ["15", "Naruto Uzumaki"],
    ["16", "Hinata Hyuga"],
    ["17", "Tsunade Senju"],
    ["18", "Kabuto Yakushi"],
    ["19", "Gaara"],
    ["20", "Sasuke Uchiha"],
    ["21", "Asuma Sarutobi"],
    ["22", "Asuma Sarutobi"],
    ["23", "Naruto Uzumaki"],
    ["24", "Sasuke Uchiha"],
    ["25", "Rock Lee"],
    ["26", "Naruto Uzumaki"],
    ["27", "Naruto Uzumaki"],
    ["28", "Sasuke Uchiha"],
    ["29", "Sakura Haruno"],
    ["30", "Kagari"],
    ["31", "Kabuto Yakushi"],
    ["32", "Shino Aburame"],
    ["33", "Sakura vs Ino"],
    ["34", "Hinata Hyuga"],
    ["35", "Orochimaru"],
    ["36", "Sasuke Uchiha"],
    ["37", "Sasuke Uchiha"],
    ["38", "Rock Lee"],
    ["39", "Sakura Haruno"],
    ["40", "Naruto Uzumaki"],
    ["41", "Sakura Haruno"],
    ["42", "Naruto Uzumaki"],
    ["43", "Sasuke Uchiha"],
    ["44", "Rock Lee"],
    ["45", "Sasuke Uchiha"],
    ["46", "Misumi Tsurugi"],
    ["47", "Kiba & Akamaru"],
    ["48", "Ino Yamanaka"],
    ["49", "Sakura Haruno"],
    ["50", "Temari"],
    ["51", "Kin Tsuchi"],
    ["52", "Kiba Inuzuka"],
    ["53", "Akamaru"],
    ["54", "Naruto Uzumaki"],
    ["55", "Kiba Inuzuka"],
    ["56", "Naruto Uzumaki"],
    ["57", "Neji Hyuga"],
    ["58", "Naruto Uzumaki"],
  ]),
  ...rows("Base Cards", "Live Action", [
    ["59", "Sexy Jutsu", ["Naruto Uzumaki"]],
    ["60", "Naruto's First Toad Summon"],
    ["61", "The Youthful Sensei", ["Might Guy"]],
    ["62", "Sakura vs Zaku"],
    ["63", "Team 7 Is Formed", ["Kakashi Hatake", "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno"]],
    ["64", "Fight Intervened - Neji vs Hinata"],
    ["65", "The Forbidden Jutsu"],
    ["66", "Kurenai vs Itachi"],
    ["67", "Tsunade Smacks Naruto"],
    ["68", "Internal Feud - Team 7", ["Kakashi Hatake", "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno"]],
    ["69", "Curse Sealing - Kakashi"],
    ["70", "Byakugan", ["Hinata Hyuga", "Neji Hyuga"]],
    ["71", "Sasuke Confronts Itachi"],
    ["72", "The Third Gate of Life", ["Rock Lee", "Might Guy"]],
    ["73", "Kakashi vs Sasuke"],
    ["74", "Kurama Chakra Appears", ["Naruto Uzumaki", "Kurama"]],
    ["75", "Enraged Naruto"],
    ["76", "Shukaku vs Kurama"],
    ["77", "Naruto vs Gaara"],
    ["78", "Anko vs Morphed Lion"],
    ["79", "Naruto Meets Kurama"],
    ["80", "Gaara - Half Shukaku Form"],
    ["81", "Gaara - A Change of Heart"],
    ["82", "Sasuke Sees Naruto's Power"],
    ["83", "Mysterious Peacock Jutsu"],
    ["84", "Kakashi Confronts Sasuke"],
    ["85", "Jiraiya Intervenes - Kabuto vs Tsunade"],
    ["86", "Naruto Saves Tsunade from Kabuto"],
    ["87", "Tsunade Heals Naruto"],
    ["88", "Sasuke Breaks Gaara's Sand Barrier"],
    ["89", "Sasuke Reads the Tablet at Naka Shrine"],
    ["90", "Lee Protects Team Seven", ["Rock Lee"]],
    ["91", "The Hidden Star"],
    ["92", "Chunin Exam - Final Round"],
    ["93", "Naruto Saves Sasuke"],
    ["94", "Orochimaru Applies 5-Pronged Seal"],
    ["95", "Sasuke Retrieval Team", ["Sasuke Uchiha"]],
    ["96", "Relaxing Kakashi"],
    ["97", "Zabuza Kill Spree"],
    ["98", "The Final Moment"],
  ]),
  ...rows("Base Cards", "Chakra Card", [
    ["99", "Naruto Uzumaki"],
    ["100", "Shikamaru Nara"],
    ["101", "Neji Hyuga"],
    ["102", "Orochimaru"],
    ["103", "Sasuke Uchiha"],
    ["104", "Sakura Haruno"],
    ["105", "Rock Lee"],
    ["106", "Gaara of the Sand"],
    ["107", "Kabuto Yakushi"],
    ["108", "Kakashi Hatake"],
  ]),
  ...rows("Base Cards", "Defense Card", [
    ["109", "Sand Wall - Gaara"],
    ["110", "Earth Style Wall - Hiruzen Sarutobi"],
    ["111", "8 Trigrams - Hinata Hyuga"],
    ["112", "Water Wall - Kakashi Hatake"],
    ["113", "Clone Jutsu - Zabuza Momochi"],
    ["114", "Water Clone Jutsu - Yoroi Akado"],
    ["115", "Clone Jutsu - Shino Aburame"],
    ["116", "Mitotic Regeneration - Tsunade Senju"],
    ["117", "Terra Shield - Jirobo"],
    ["118", "Genjutsu Release - Kakashi and Guy", ["Kakashi Hatake", "Might Guy"]],
    ["119", "Chakra Absorption - Yoroi"],
    ["120", "Hidden Mist Jutsu - Zabuza"],
  ]),
  ...rows("Base Cards Extension", "Action Scene", [
    ["AS1-1/4", "Naruto vs Sasuke - Final Valley 1"],
    ["AS1-2/4", "Naruto vs Sasuke - Final Valley 2"],
    ["AS1-3/4", "Naruto vs Sasuke - Final Valley 3"],
    ["AS1-4/4", "Naruto vs Sasuke - Final Valley 4"],
    ["AS2-1/4", "Orochimaru - Revival Jutsu 1"],
    ["AS2-2/4", "Orochimaru - Revival Jutsu 2"],
    ["AS2-3/4", "Orochimaru - Revival Jutsu 3"],
    ["AS2-4/4", "Orochimaru - Revival Jutsu 4"],
    ["AS3-1/4", "Third Hokage vs Orochimaru - Reaper Death Seal 1", ["Hiruzen Sarutobi", "Orochimaru"]],
    ["AS3-2/4", "Third Hokage vs Orochimaru - Reaper Death Seal 2", ["Hiruzen Sarutobi", "Orochimaru"]],
    ["AS3-3/4", "Third Hokage vs Orochimaru - Reaper Death Seal 3", ["Hiruzen Sarutobi", "Orochimaru"]],
    ["AS3-4/4", "Third Hokage vs Orochimaru - Reaper Death Seal 4", ["Hiruzen Sarutobi", "Orochimaru"]],
    ["AS4-1/4", "Naruto vs Kabuto - The First Rasengan 1"],
    ["AS4-2/4", "Naruto vs Kabuto - The First Rasengan 2"],
    ["AS4-3/4", "Naruto vs Kabuto - The First Rasengan 3"],
    ["AS4-4/4", "Naruto vs Kabuto - The First Rasengan 4"],
    ["AS5-1/4", "Naruto + Gamabunta vs Gaara + Shukaku 1"],
    ["AS5-2/4", "Naruto + Gamabunta vs Gaara + Shukaku 2"],
    ["AS5-3/4", "Naruto + Gamabunta vs Gaara + Shukaku 3"],
    ["AS5-4/4", "Naruto + Gamabunta vs Gaara + Shukaku 4"],
    ["AS6-1/4", "Sharingan vs. Sharingan 1"],
    ["AS6-2/4", "Sharingan vs. Sharingan 2"],
    ["AS6-3/4", "Sharingan vs. Sharingan 3"],
    ["AS6-4/4", "Sharingan vs. Sharingan 4"],
    ["AS7-1/4", "Drunken Lee vs Kimimaro 1", ["Rock Lee", "Kimimaro"]],
    ["AS7-2/4", "Drunken Lee vs Kimimaro 2", ["Rock Lee", "Kimimaro"]],
    ["AS7-3/4", "Drunken Lee vs Kimimaro 3", ["Rock Lee", "Kimimaro"]],
    ["AS7-4/4", "Drunken Lee vs Kimimaro 4", ["Rock Lee", "Kimimaro"]],
    ["AS8-1/4", "The Three Legendary Sannin Showdown 1", ["Jiraiya", "Tsunade Senju", "Orochimaru"]],
    ["AS8-2/4", "The Three Legendary Sannin Showdown 2", ["Jiraiya", "Tsunade Senju", "Orochimaru"]],
    ["AS8-3/4", "The Three Legendary Sannin Showdown 3", ["Jiraiya", "Tsunade Senju", "Orochimaru"]],
    ["AS8-4/4", "The Three Legendary Sannin Showdown 4", ["Jiraiya", "Tsunade Senju", "Orochimaru"]],
    ["AS9-1/4", "Brother vs. Brother 1", ["Sasuke Uchiha", "Itachi Uchiha"]],
    ["AS9-2/4", "Brother vs. Brother 2", ["Sasuke Uchiha", "Itachi Uchiha"]],
    ["AS9-3/4", "Brother vs. Brother 3", ["Sasuke Uchiha", "Itachi Uchiha"]],
    ["AS9-4/4", "Brother vs. Brother 4", ["Sasuke Uchiha", "Itachi Uchiha"]],
    ["AS10-1/4", "Naruto vs Orochimaru in Disguise 1"],
    ["AS10-2/4", "Naruto vs Orochimaru in Disguise 2"],
    ["AS10-3/4", "Naruto vs Orochimaru in Disguise 3"],
    ["AS10-4/4", "Naruto vs Orochimaru in Disguise 4"],
  ]),
  ...rows("Ultima Cards Scodix", "Trivia", [
    ["UL 1", "Master Jiraiya / Pervy Sage"],
    ["UL 2", "Sasuke Uchiha"],
    ["UL 3", "Sakura Haruno"],
    ["UL 4", "Might Guy"],
    ["UL 5", "Rock Lee"],
    ["UL 6", "The Sand Siblings", ["Gaara", "Temari", "Kankuro"]],
    ["UL 7", "The Uchiha Brothers", ["Sasuke Uchiha", "Itachi Uchiha"]],
    ["UL 8", "Team Kakashi / Team Seven", ["Kakashi Hatake", "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno"]],
    ["UL 9", "Shikamaru Nara"],
    ["UL 10", "Ichiraku Ramen"],
    ["UL 11", "Hinata Hyuga"],
    ["UL 12", "Choji Akimichi"],
    ["UL 13", "Ino Yamanaka"],
    ["UL 14", "Orochimaru"],
    ["UL 15", "1 Tail - Shukaku"],
    ["UL 16", "9 Tails - Kurama"],
    ["UL 17", "Gamabunta"],
    ["UL 18", "Tenten"],
    ["UL 19", "Kankuro"],
    ["UL 20", "Neji Hyuga"],
    ["UL 21", "Naruto Uzumaki"],
    ["UL 22", "Temari"],
    ["UL 23", "Minato Namikaze"],
    ["UL 24", "Shino Aburame"],
    ["UL 25", "Kiba & Akamaru"],
  ]),
  ...rows("Limited Edition Cards", "Heavy Attack Cards", [
    ["LE1", "Cursed Sasuke's Chidori - Sasuke"],
    ["LE2", "Chidori - Kakashi Hatake"],
    ["LE3", "Tsukuyomi - Itachi Uchiha"],
    ["LE4", "Demonic Mirroring Ice Crystals - Haku"],
    ["LE5", "Water Shark Bomb Jutsu - Kisame"],
    ["LE6", "Severe Leaf Hurricane - Might Guy"],
    ["LE7", "Mind Destruction Jutsu - Ino Yamanaka"],
    ["LE8", "Shadow Possession Jutsu - Shikamaru"],
    ["LE9", "8 Trigrams 128 Palms - Neji Hyuga"],
    ["LE10", "Demon Illusion: Fire Jutsu"],
    ["LE11", "Sand Coffin - Gaara"],
    ["LE12", "Mirror Jutsu - Haku"],
    ["LE13", "Water Style: Water Shock Wave - Tobirama Lord Second"],
    ["LE14", "Hidden Wood Style Jutsu - Hashirama Lord First"],
    ["LE15", "Thousand Years of Death Jutsu - Naruto"],
    ["LE16", "Fire Style: Fire Dragon Flame Bombs - Lord Third"],
    ["LE17", "Kujaku Chakra in Beast Form Synthesis"],
    ["LE18", "Human Bullet Tank - Choji"],
    ["LE19", "Gaara vs Rock Lee"],
    ["LE20", "Summoning Jutsu - Orochimaru"],
    ["LE21", "Rasengan - Naruto"],
  ]),
  ...rows("Red Crystal Cards", "Topps.com Exclusive", [
    ["LE RC-1", "Kakashi Hatake"],
    ["LE RC-2", "Naruto Uzumaki"],
    ["LE RC-3", "Nine Tailed Fox", ["Kurama"]],
    ["LE RC-4", "The Uchiha Brothers", ["Sasuke Uchiha", "Itachi Uchiha"]],
  ]),
  ...rows("Thunderbolt Theme Cards", "Tin Exclusive", [
    ["TB 1", "Naruto's Rasengan"],
    ["TB 2", "Jiraiya"],
    ["TB 3", "Shikamaru"],
    ["TB 4", "Sakura"],
    ["TB 5", "Kankuro"],
    ["TB 6", "Kidomaru"],
    ["TB 7", "Tayuya"],
    ["TB 8", "Jirobo"],
    ["TB 9", "Sakon"],
    ["TB 10", "Sasuke"],
  ]),
  ...rows("Jet Black Theme Cards", "Tin Exclusive", [
    ["JB 1", "Zabuza of the Mist"],
    ["JB 2", "Naruto Uzumaki"],
    ["JB 3", "Kakashi Hatake"],
    ["JB 4", "Hashirama Senju"],
    ["JB 5", "Gaara of the Sand"],
    ["JB 6", "Kakashi the Copy Ninja"],
    ["JB 7", "Naruto Uzumaki"],
    ["JB 8", "Sasuke Uchiha"],
    ["JB 9", "Naruto Uzumaki Nine Tail"],
    ["JB 10", "Kabuto Yakushi"],
    ["JB 11", "Hiruzen Sarutobi"],
    ["JB 12", "Itachi Uchiha"],
    ["JB 13", "Shikamaru Nara"],
    ["JB 14", "Neji Hyuga"],
    ["JB 15", "Sasuke"],
  ]),
  ...rows("Fire Ice Theme Cards", "Tin Exclusive", [
    ["FI 1", "Hiruzen Sarutobi"],
    ["FI 2", "Orochimaru in Disguise"],
    ["FI 3", "Gaara vs Rock Lee"],
    ["FI 4", "Sakura"],
    ["FI 5", "Neji vs Naruto"],
    ["FI 6", "Sasuke vs Naruto"],
    ["FI 7", "Naruto and Sasuke"],
    ["FI 8", "Naruto and Sasuke"],
    ["FI 9", "Naruto Uzumaki"],
    ["FI 10", "Naruto and Kiba"],
    ["FI 11", "Naruto vs Sasuke"],
    ["FI 12", "Gaara of the Sand"],
    ["FI 13", "Naruto vs Gaara"],
    ["FI 14", "Neji vs Kidomaru"],
    ["FI 15", "Itachi Uchiha"],
    ["FI 16", "Lee vs Kimimaro", ["Rock Lee", "Kimimaro"]],
    ["FI 17", "Gaara vs Kimimaro"],
    ["FI 18", "Cursed Kimimaro"],
    ["FI 19", "Kakashi"],
    ["FI 20", "Kidomaru"],
  ]),
  ...rows("Insert Cards", "Medium Attack", [
    ["121", "Chidori - Sasuke Uchiha"],
    ["122", "Mind Transfer Jutsu"],
    ["123", "Body Expansion Jutsu"],
    ["124", "Fireball Jutsu"],
    ["125", "Giant Vortex Jutsu"],
    ["126", "Kakashi - Chidori"],
    ["127", "Black Rain Jutsu"],
    ["128", "Explosive Kunai"],
    ["129", "Arm Expansion Jutsu"],
    ["130", "Puppet Bone Crusher"],
    ["131", "Primary Lotus"],
    ["132", "Phoenix Flower Jutsu"],
    ["133", "All Fours Jutsu"],
    ["134", "Summoning Jutsu"],
    ["135", "Chakra Scalpel"],
    ["136", "Head Hunter Jutsu"],
    ["137", "Beast Human Clone"],
    ["138", "Face Copying Jutsu"],
    ["139", "Summoning Rashomon"],
    ["140", "Eight Divination Signs Air Palm"],
    ["141", "Senbon Rainstorm"],
    ["142", "Headhunter Jutsu"],
    ["143", "Chakra Absorption"],
    ["144", "Fire Breath"],
    ["145", "Monstrous Sand Arm"],
    ["146", "Shadow Clone Jutsu"],
    ["147", "Multiple Shadow Clone Jutsu"],
    ["148", "Flying Leeches"],
    ["149", "Paper Bomb"],
    ["150", "Life or Death Genjutsu"],
  ]),
  ...rows("Rare Cards", "Character Bio", [
    ["151", "Choji Akimichi"],
    ["152", "Shikamaru Nara"],
    ["153", "Shizune"],
    ["154", "Tsunade Senju"],
    ["155", "Orochimaru"],
    ["156", "Konohamaru Sarutobi"],
    ["157", "Kurenai Yuhi"],
    ["158", "Minato Namikaze - The Yellow Flash of Konoha"],
    ["159", "Kankuro"],
    ["160", "Kiba Inuzuka"],
    ["161", "Kabuto Yakushi"],
    ["162", "Kakashi Hatake"],
    ["163", "Monkey King - Enma"],
    ["164", "Ino Yamanaka"],
    ["165", "Iruka Imino"],
    ["166", "Itachi Uchiha"],
    ["167", "Might Guy"],
    ["168", "Haku"],
    ["169", "Gaara of the Sand"],
    ["170", "Asuma Sarutobi"],
    ["171", "Temari"],
    ["172", "Tenten"],
    ["173", "Sasuke Uchiha"],
    ["174", "Sakura Haruno"],
    ["175", "Naruto Uzumaki"],
  ]),
  ...rows("Rare Cards", "Holo Foil", [
    // #176, 180, 181, 185 confirmed 2026-08-07 against a written Topps
    // Animax 2024 checklist supplied by the user, which labels this number
    // range as a distinct "Holo Foil" subset rather than a Character Bio
    // continuation. #177-179/182-184 remain unconfirmed gaps.
    ["176", "The Legendary Sannin", ["Jiraiya", "Tsunade Senju", "Orochimaru"]],
    ["180", "Hashirama Senju"],
    ["181", "Sasuke Uchiha"],
    ["185", "Naruto Uzumaki"],
    // #186, 189, 190 confirmed by a real physical-collection video and
    // #194, #195 by physically pulling them from real packs (2026-08-06).
    // Neither source verified their subset label — grouped here as Holo
    // Foil on the strength of falling in the same confirmed number range,
    // which is an inference, not a direct confirmation.
    ["186", "Neji Hyuga"],
    ["189", "Kiba Inuzuka"],
    ["190", "Jiraiya"],
    ["194", "Haku"],
    ["195", "Kakashi Hatake"],
  ]),
  ...rows("Tactic Cards", "Trap Cards", [
    ["T1", "Water Prison Jutsu / Technique"],
    ["T2", "Paper Bombs"],
    ["T3", "Toad Mouth Trap"],
    ["T4", "Earth Prison Dome"],
  ]),
];

const CHARACTER_PATTERNS: Array<{ canonical: string; patterns: RegExp[] }> = [
  { canonical: "Naruto Uzumaki", patterns: [/\bnaruto\b/i] },
  { canonical: "Sasuke Uchiha", patterns: [/\bsasuke\b/i] },
  { canonical: "Sakura Haruno", patterns: [/\bsakura\b/i] },
  { canonical: "Kakashi Hatake", patterns: [/\bkakashi\b/i] },
  { canonical: "Hinata Hyuga", patterns: [/\bhinata\b/i] },
  { canonical: "Neji Hyuga", patterns: [/\bneji\b/i] },
  { canonical: "Rock Lee", patterns: [/\brock\s*lee\b/i, /\brocklee\b/i, /\bdrunken lee\b/i, /\blee protects\b/i, /\blee vs\b/i] },
  { canonical: "Might Guy", patterns: [/\bmight guy\b/i, /\bguy\b/i] },
  { canonical: "Tenten", patterns: [/\btenten\b/i] },
  { canonical: "Asuma Sarutobi", patterns: [/\basuma\b/i] },
  { canonical: "Shikamaru Nara", patterns: [/\bshikamaru\b/i] },
  { canonical: "Choji Akimichi", patterns: [/\bchoji\b/i] },
  { canonical: "Ino Yamanaka", patterns: [/\bino\b/i] },
  { canonical: "Kurenai Yuhi", patterns: [/\bkurenai\b/i] },
  { canonical: "Kiba Inuzuka", patterns: [/\bkiba\b/i] },
  { canonical: "Akamaru", patterns: [/\bakamaru\b/i] },
  { canonical: "Shino Aburame", patterns: [/\bshino\b/i] },
  { canonical: "Kabuto Yakushi", patterns: [/\bkabuto\b/i] },
  { canonical: "Orochimaru", patterns: [/\borochimaru\b/i] },
  { canonical: "Tsunade Senju", patterns: [/\btsunade\b/i] },
  { canonical: "Jiraiya", patterns: [/\bjiraiya\b/i, /\bpervy sage\b/i] },
  { canonical: "Gaara", patterns: [/\bgaara\b/i, /\bgara\b/i] },
  { canonical: "Temari", patterns: [/\btemari\b/i] },
  { canonical: "Kankuro", patterns: [/\bkankuro\b/i] },
  { canonical: "Kagari", patterns: [/\bkagari\b/i] },
  { canonical: "Misumi Tsurugi", patterns: [/\bmisumi\b/i] },
  { canonical: "Kin Tsuchi", patterns: [/\bkin tsuchi\b/i] },
  { canonical: "Zaku", patterns: [/\bzaku\b/i] },
  { canonical: "Anko Mitarashi", patterns: [/\banko\b/i] },
  { canonical: "Kurama", patterns: [/\bkurama\b/i, /\bnine tails?\b/i, /\bnine tailed fox\b/i, /\b9 tails?\b/i] },
  { canonical: "Shukaku", patterns: [/\bshukaku\b/i, /\b1 tail\b/i] },
  { canonical: "Zabuza Momochi", patterns: [/\bzabuza\b/i] },
  { canonical: "Yoroi Akado", patterns: [/\byoroi\b/i] },
  { canonical: "Jirobo", patterns: [/\bjirobo\b/i] },
  { canonical: "Kimimaro", patterns: [/\bkimimaro\b/i] },
  { canonical: "Haku", patterns: [/\bhaku\b/i] },
  { canonical: "Kisame", patterns: [/\bkisame\b/i] },
  { canonical: "Tobirama Senju", patterns: [/\btobirama\b/i, /\blord second\b/i] },
  { canonical: "Hashirama Senju", patterns: [/\bhashirama\b/i, /\blord first\b/i] },
  { canonical: "Hiruzen Sarutobi", patterns: [/\bhiruzen\b/i, /\blord third\b/i, /\bthird hokage\b/i] },
  { canonical: "Minato Namikaze", patterns: [/\bminato\b/i] },
  { canonical: "Konohamaru Sarutobi", patterns: [/\bkonohamaru\b/i] },
  { canonical: "Shizune", patterns: [/\bshizune\b/i] },
  { canonical: "Enma", patterns: [/\benma\b/i] },
  { canonical: "Iruka Imino", patterns: [/\biruka\b/i] },
  { canonical: "Kidomaru", patterns: [/\bkidomaru\b/i] },
  { canonical: "Tayuya", patterns: [/\btayuya\b/i] },
  { canonical: "Sakon", patterns: [/\bsakon\b/i] },
  { canonical: "Gamabunta", patterns: [/\bgamabunta\b/i] },
];

function inferCharacters(row: CardRow): string[] {
  const inferred = CHARACTER_PATTERNS.filter(({ patterns }) =>
    patterns.some((pattern) => pattern.test(row.name))
  ).map(({ canonical }) => canonical);

  return Array.from(new Set([...(row.characters ?? []), ...inferred]));
}

function cardIdFor(number: string): string {
  const normalizedNumber = number
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${SET_ID}-${normalizedNumber}`;
}

function validateChecklist() {
  if (CHECKLIST.length !== EXPECTED_CARD_COUNT) {
    throw new Error(`Expected ${EXPECTED_CARD_COUNT} cards, found ${CHECKLIST.length}`);
  }

  const seenNumbers = new Set<string>();
  const seenIds = new Set<string>();

  for (const row of CHECKLIST) {
    if (seenNumbers.has(row.number)) throw new Error(`Duplicate card number: ${row.number}`);
    seenNumbers.add(row.number);

    const cardId = cardIdFor(row.number);
    if (seenIds.has(cardId)) throw new Error(`Duplicate card id: ${cardId}`);
    seenIds.add(cardId);
  }
}

async function main() {
  validateChecklist();

  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  console.log(`Seeding: ${SET_NAME} (${CHECKLIST.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Non-Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Naruto", universeId);
  const brandId = await builder.getOrCreateBrand("Animax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Naruto 2024", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: CHECKLIST.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let updated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;
  const t0 = Date.now();

  for (const [i, row] of CHECKLIST.entries()) {
    const cardId = cardIdFor(row.number);
    const characterIds: string[] = [];
    const characterNames = inferCharacters(row);

    for (const characterName of characterNames) {
      characterIds.push(await builder.getOrCreateCharacter(characterName));
    }

    const insertId = await builder.getOrCreateInsert(row.subset, set.id);
    const existing = await prisma.card.findUnique({ where: { id: cardId } });

    await prisma.card.upsert({
      where: { id: cardId },
      update: {
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: row.subset,
        subtypes: row.section,
        characters: { set: characterIds.map((id) => ({ id })) },
      },
      create: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: row.subset,
        subtypes: row.section,
        characters: characterIds.length > 0 ? { connect: characterIds.map((id) => ({ id })) } : undefined,
      },
    });

    if (existing) updated++;
    else created++;

    const baseVariant = await prisma.variant.findFirst({
      where: { cardId, printingId: basePrintingId },
    });

    if (baseVariant) {
      await prisma.variant.update({
        where: { id: baseVariant.id },
        data: { insertId, printingId: basePrintingId },
      });
      variantsUpdated++;
    } else {
      await prisma.variant.create({
        data: { cardId, printingId: basePrintingId, insertId },
      });
      variantsCreated++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  [${i + 1}/${CHECKLIST.length}] created=${created} updated=${updated}`);
    }
  }

  console.log(
    `Done. Created ${created} cards, updated ${updated} cards, created ${variantsCreated} variants, updated ${variantsUpdated} variants. Set: ${SET_NAME} (${((Date.now() - t0) / 1000).toFixed(1)}s)`
  );
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
