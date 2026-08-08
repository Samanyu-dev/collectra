import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2024-25 Topps Chrome Basketball trading card collection.
 *
 * Data-only pass — images are a later phase, left empty here like the
 * other recent seed scripts (Marvel 2026, Premier League 2026).
 *
 * Parallel odds ratios (e.g. "1:2 hobby, 4:1 breaker") from the source
 * checklist are NOT modeled — this codebase's seed scripts only track
 * parallel name + serial print-run where one is printed, not pack odds.
 * This checklist gives no serial print-runs (odds only), so parallels
 * here carry no serialTo.
 *
 * Structure:
 *  - Base Set: 200 numbered player cards, Person + Team per player, with
 *    the full 30-name base parallel ladder attached to every base card.
 *  - Autographs: 1973 Topps Autographs (40), Chromographs (100), Future
 *    Stars Autographs (29), Next Stop Signatures (30), Sky-Light
 *    Signatures (50), Topps Certified Autograph Issue (70), Topps
 *    Certified Autograph Issue Rookies (30), Topps Chrome Autographs (50).
 *  - Inserts: 451 (20), Advisory (25), Ball of Duty (25), Countdown
 *    Complete (25), Dippers (25), Destiny (25), Film Study (20), Fresh
 *    Start (15), Helix (20), Instinct (30), Let's Go! (15), Lock It Up
 *    (10), Radiating Rookies (10), Rock Stars (20), Show and Tell (15),
 *    Test Drive (20), Ultra Violet All-Stars (15), Youthquake (15).
 *
 * Judgment calls (see report at end of run for the full list):
 *  - "Next Stop Signatures" row "MSS-CC" (checklist typo for "NSS-CC")
 *    normalized to "NSS-CC" for consistency with its siblings.
 *  - Several insert subsets reuse the same numeric prefix across
 *    different subsets (e.g. "D-" for both Dippers and Destiny, "FS-"
 *    for both Future Stars Autographs and Fresh Start) — this is fine in
 *    the source product and is fine here too: card ids are namespaced by
 *    `${SET_ID}-${subsetSlug}-${numberSlug}`, so no collision occurs.
 *  - Team names are preserved exactly as printed in the checklist, even
 *    where historically inexact or ambiguous (e.g. "Seattle" for Shawn
 *    Kemp, "Los Angeles" with no franchise suffix for Mo Bamba / LeBron
 *    James on a couple of insert rows, "New Jersey Nets" for a 1973
 *    Topps Autograph). No reconciliation to modern franchise names.
 *  - Player/code mismatches on some Chromographs rows (e.g. "C-AR Logan
 *    Johnson", "C-BC Jacob Toppin") are preserved verbatim — that's how
 *    the real product's alpha codes are printed, not a transcription bug.
 *
 * Card id scheme:
 *   Base:            `${SET_ID}-${number}`
 *   Everything else: `${SET_ID}-${subsetSlug}-${numberSlug}`
 */
const SET_ID = "topps-chrome-basketball-2024-25";
const SET_NAME = "Topps Chrome Basketball 2024-25";

interface CardRow {
  number: string;
  name: string;
  team: string;
}

interface SubsetRow {
  subset: string;
  number: string;
  name: string;
  team?: string;
  auto?: boolean;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------------------
// BASE SET (200 cards, 1-200)
// ---------------------------------------------------------------------------
const BASE_CARDS: CardRow[] = [
  { number: "1", name: "Jett Howard", team: "Orlando Magic" },
  { number: "2", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { number: "3", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "4", name: "Latrell Sprewell", team: "New York Knicks" },
  { number: "5", name: "Tobias Harris", team: "Detroit Pistons" },
  { number: "6", name: "Alex Caruso", team: "Oklahoma City Thunder" },
  { number: "7", name: "Brandin Podziemski", team: "Golden State Warriors" },
  { number: "8", name: "Jordan Poole", team: "Washington Wizards" },
  { number: "9", name: "Alonzo Mourning", team: "Miami Heat" },
  { number: "10", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { number: "11", name: "Bilal Coulibaly", team: "Washington Wizards" },
  { number: "12", name: "Michael Porter Jr.", team: "Denver Nuggets" },
  { number: "13", name: "Dwyane Wade", team: "Miami Heat" },
  { number: "14", name: "Lenny Wilkens", team: "Cleveland Cavaliers" },
  { number: "15", name: "Kyle Kuzma", team: "Washington Wizards" },
  { number: "16", name: "Jimmy Butler", team: "Miami Heat" },
  { number: "17", name: "Jarrett Allen", team: "Cleveland Cavaliers" },
  { number: "18", name: "Cade Cunningham", team: "Detroit Pistons" },
  { number: "19", name: "Nick Smith Jr.", team: "Charlotte Hornets" },
  { number: "20", name: "Donte DiVincenzo", team: "Minnesota Timberwolves" },
  { number: "21", name: "Aaron Nesmith", team: "Indiana Pacers" },
  { number: "22", name: "LeBron James", team: "Los Angeles Lakers" },
  { number: "23", name: "Rasheed Wallace", team: "Detroit Pistons" },
  { number: "24", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { number: "25", name: "Shaedon Sharpe", team: "Portland Trail Blazers" },
  { number: "26", name: "Eric Gordon", team: "Philadelphia 76ers" },
  { number: "27", name: "Jarred Vanderbilt", team: "Los Angeles Lakers" },
  { number: "28", name: "Jaylen Brown", team: "Boston Celtics" },
  { number: "29", name: "Kobe Bufkin", team: "Atlanta Hawks" },
  { number: "30", name: "Clyde Drexler", team: "Portland Trail Blazers" },
  { number: "31", name: "Taylor Hendricks", team: "Utah Jazz" },
  { number: "32", name: "Larry Bird", team: "Boston Celtics" },
  { number: "33", name: "Bam Adebayo", team: "Miami Heat" },
  { number: "34", name: "Jamal Murray", team: "Denver Nuggets" },
  { number: "35", name: "Collin Sexton", team: "Utah Jazz" },
  { number: "36", name: "Jaime Jaquez Jr.", team: "Miami Heat" },
  { number: "37", name: "Lauri Markkanen", team: "Utah Jazz" },
  { number: "38", name: "Myles Turner", team: "Indiana Pacers" },
  { number: "39", name: "Dominique Wilkins", team: "Atlanta Hawks" },
  { number: "40", name: "Tyrese Maxey", team: "Philadelphia 76ers" },
  { number: "41", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { number: "42", name: "Tracy McGrady", team: "Orlando Magic" },
  { number: "43", name: "Naz Reid", team: "Minnesota Timberwolves" },
  { number: "44", name: "Kevin Garnett", team: "Minnesota Timberwolves" },
  { number: "45", name: "Derrick White", team: "Boston Celtics" },
  { number: "46", name: "John Stockton", team: "Utah Jazz" },
  { number: "47", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "48", name: "Anthony Black", team: "Orlando Magic" },
  { number: "49", name: "Marcus Sasser", team: "Detroit Pistons" },
  { number: "50", name: "Nikola Jokić", team: "Denver Nuggets" },
  { number: "51", name: "Jayson Tatum", team: "Boston Celtics" },
  { number: "52", name: "Karl-Anthony Towns", team: "New York Knicks" },
  { number: "53", name: "Anfernee Simons", team: "Portland Trail Blazers" },
  { number: "54", name: "Vince Carter", team: "Toronto Raptors" },
  { number: "55", name: "DeMar DeRozan", team: "Sacramento Kings" },
  { number: "56", name: "Caris LeVert", team: "Cleveland Cavaliers" },
  { number: "57", name: "Immanuel Quickley", team: "Toronto Raptors" },
  { number: "58", name: "Ayo Dosunmu", team: "Chicago Bulls" },
  { number: "59", name: "Magic Johnson", team: "Los Angeles Lakers" },
  { number: "60", name: "OG Anunoby", team: "New York Knicks" },
  { number: "61", name: "Brandon Miller", team: "Charlotte Hornets" },
  { number: "62", name: "Aaron Gordon", team: "Denver Nuggets" },
  { number: "63", name: "Jalen Williams", team: "Oklahoma City Thunder" },
  { number: "64", name: "Pascal Siakam", team: "Indiana Pacers" },
  { number: "65", name: "Rip Hamilton", team: "Detroit Pistons" },
  { number: "66", name: "Walker Kessler", team: "Utah Jazz" },
  { number: "67", name: "Jabari Walker", team: "Portland Trail Blazers" },
  { number: "68", name: "Anfernee Hardaway", team: "Orlando Magic" },
  { number: "69", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { number: "70", name: "Chris Livingston", team: "Milwaukee Bucks" },
  { number: "71", name: "Josh Hart", team: "New York Knicks" },
  { number: "72", name: "Corey Kispert", team: "Washington Wizards" },
  { number: "73", name: "Dejounte Murray", team: "New Orleans Pelicans" },
  { number: "74", name: "Luguentz Dort", team: "Oklahoma City Thunder" },
  { number: "75", name: "Khris Middleton", team: "Milwaukee Bucks" },
  { number: "76", name: "Josh Giddey", team: "Chicago Bulls" },
  { number: "77", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { number: "78", name: "Mark Williams", team: "Charlotte Hornets" },
  { number: "79", name: "Tyler Herro", team: "Miami Heat" },
  { number: "80", name: "Jarace Walker", team: "Indiana Pacers" },
  { number: "81", name: "Gary Trent Jr.", team: "Milwaukee Bucks" },
  { number: "82", name: "Trae Young", team: "Atlanta Hawks" },
  { number: "83", name: "Carmelo Anthony", team: "New York Knicks" },
  { number: "84", name: "Zach Lavine", team: "Chicago Bulls" },
  { number: "85", name: "Elvin Hayes", team: "Washington Wizards" },
  { number: "86", name: "Anthony Davis", team: "Los Angeles Lakers" },
  { number: "87", name: "Austin Reaves", team: "Los Angeles Lakers" },
  { number: "88", name: "Paul Pierce", team: "Boston Celtics" },
  { number: "89", name: "Scottie Barnes", team: "Toronto Raptors" },
  { number: "90", name: "Rudy Gobert", team: "Minnesota Timberwolves" },
  { number: "91", name: "Jonas Valančiūnas", team: "Washington Wizards" },
  { number: "92", name: "Gradey Dick", team: "Toronto Raptors" },
  { number: "93", name: "Franz Wagner", team: "Orlando Magic" },
  { number: "94", name: "Allen Iverson", team: "Philadelphia 76ers" },
  { number: "95", name: "Dennis Rodman", team: "Chicago Bulls" },
  { number: "96", name: "Bennedict Mathurin", team: "Indiana Pacers" },
  { number: "97", name: "Nikola Vučević", team: "Chicago Bulls" },
  { number: "98", name: "Larry Johnson", team: "Charlotte Hornets" },
  { number: "99", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { number: "100", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { number: "101", name: "Kevin Durant", team: "Phoenix Suns" },
  { number: "102", name: "KJ Simpson", team: "Charlotte Hornets" },
  { number: "103", name: "Kel'el Ware", team: "Miami Heat" },
  { number: "104", name: "Jake LaRavia", team: "Memphis Grizzlies" },
  { number: "105", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves" },
  { number: "106", name: "Alperen Sengun", team: "Houston Rockets" },
  { number: "107", name: "Anton Watson", team: "Boston Celtics" },
  { number: "108", name: "Tristen Newton", team: "Minnesota Timberwolves" },
  { number: "109", name: "De'Aaron Fox", team: "Sacramento Kings" },
  { number: "110", name: "Payton Pritchard", team: "Boston Celtics" },
  { number: "111", name: "Enrique Freeman", team: "Indiana Pacers" },
  { number: "112", name: "Isaiah Collier", team: "Utah Jazz" },
  { number: "113", name: "Desmond Bane", team: "Memphis Grizzlies" },
  { number: "114", name: "Dereck Lively II", team: "Dallas Mavericks" },
  { number: "115", name: "Hakeem Olajuwon", team: "Houston Rockets" },
  { number: "116", name: "Isaiah Stewart", team: "Detroit Pistons" },
  { number: "117", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { number: "118", name: "Noah Clowney", team: "Brooklyn Nets" },
  { number: "119", name: "Nikola Topić", team: "Oklahoma City Thunder" },
  { number: "120", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { number: "121", name: "Quinten Post", team: "Golden State Warriors" },
  { number: "122", name: "Stephon Castle", team: "San Antonio Spurs" },
  { number: "123", name: "Draymond Green", team: "Golden State Warriors" },
  { number: "124", name: "Tristan da Silva", team: "Orlando Magic" },
  { number: "125", name: "Russell Westbrook", team: "Denver Nuggets" },
  { number: "126", name: "Olivier-Maxence Prosper", team: "Dallas Mavericks" },
  { number: "127", name: "Kyle Filipowski", team: "Utah Jazz" },
  { number: "128", name: "Davion Mitchell", team: "Toronto Raptors" },
  { number: "129", name: "Jason Kidd", team: "Dallas Mavericks" },
  { number: "130", name: "Cam Spencer", team: "Memphis Grizzlies" },
  { number: "131", name: "Antonio Reeves", team: "New Orleans Pelicans" },
  { number: "132", name: "Ajay Mitchell", team: "Oklahoma City Thunder" },
  { number: "133", name: "Ron Holland II", team: "Detroit Pistons" },
  { number: "134", name: "Devin Carter", team: "Sacramento Kings" },
  { number: "135", name: "Paul George", team: "Philadelphia 76ers" },
  { number: "136", name: "Alexandre Sarr", team: "Washington Wizards" },
  { number: "137", name: "Fred VanVleet", team: "Houston Rockets" },
  { number: "138", name: "Tony Parker", team: "San Antonio Spurs" },
  { number: "139", name: "Johnny Furphy", team: "Indiana Pacers" },
  { number: "140", name: "Cam Whitmore", team: "Houston Rockets" },
  { number: "141", name: "Malik Monk", team: "Sacramento Kings" },
  { number: "142", name: "Calvin Murphy", team: "Houston Rockets" },
  { number: "143", name: "Baylor Scheierman", team: "Boston Celtics" },
  { number: "144", name: "Trey Murphy III", team: "New Orleans Pelicans" },
  { number: "145", name: "AJ Johnson", team: "Milwaukee Bucks" },
  { number: "146", name: "Jalen Bridges", team: "Phoenix Suns" },
  { number: "147", name: "Marcus Smart", team: "Memphis Grizzlies" },
  { number: "148", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { number: "149", name: "Bronny James Jr.", team: "Los Angeles Lakers" },
  { number: "150", name: "Kevin McCullar Jr.", team: "New York Knicks" },
  { number: "151", name: "Cam Christie", team: "Los Angeles Clippers" },
  { number: "152", name: "Zach Edey", team: "Memphis Grizzlies" },
  { number: "153", name: "Domantas Sabonis", team: "Sacramento Kings" },
  { number: "154", name: "Brandon Ingram", team: "New Orleans Pelicans" },
  { number: "155", name: "Andrew Wiggins", team: "Golden State Warriors" },
  { number: "156", name: "Yves Missi", team: "New Orleans Pelicans" },
  { number: "157", name: "CJ McCollum", team: "New Orleans Pelicans" },
  { number: "158", name: "Kyshawn George", team: "Washington Wizards" },
  { number: "159", name: "Cam Johnson", team: "Brooklyn Nets" },
  { number: "160", name: "Cody Williams", team: "Utah Jazz" },
  { number: "161", name: "Justin Edwards", team: "Philadelphia 76ers" },
  { number: "162", name: "Chris Paul", team: "San Antonio Spurs" },
  { number: "163", name: "Quentin Grimes", team: "Dallas Mavericks" },
  { number: "164", name: "Devin Booker", team: "Phoenix Suns" },
  { number: "165", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { number: "166", name: "Pelle Larsson", team: "Miami Heat" },
  { number: "167", name: "Tyler Kolek", team: "New York Knicks" },
  { number: "168", name: "Jaylon Tyson", team: "Cleveland Cavaliers" },
  { number: "169", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { number: "170", name: "Bradley Beal", team: "Phoenix Suns" },
  { number: "171", name: "Shaquille O'Neal", team: "Los Angeles Lakers" },
  { number: "172", name: "Pacôme Dadiet", team: "New York Knicks" },
  { number: "173", name: "Jaren Jackson Jr.", team: "Memphis Grizzlies" },
  { number: "174", name: "Jamal Shead", team: "Toronto Raptors" },
  { number: "175", name: "Spencer Dinwiddie", team: "Dallas Mavericks" },
  { number: "176", name: "Norman Powell", team: "Los Angeles Clippers" },
  { number: "177", name: "Derrick Jones Jr.", team: "Los Angeles Clippers" },
  { number: "178", name: "Klay Thompson", team: "Dallas Mavericks" },
  { number: "179", name: "Harrison Ingram", team: "San Antonio Spurs" },
  { number: "180", name: "Lonnie Walker IV", team: "Brooklyn Nets" },
  { number: "181", name: "Jeremy Sochan", team: "San Antonio Spurs" },
  { number: "182", name: "Ryan Dunn", team: "Phoenix Suns" },
  { number: "183", name: "Adem Bona", team: "Philadelphia 76ers" },
  { number: "184", name: "Oso Ighodaro", team: "Phoenix Suns" },
  { number: "185", name: "Jaylen Wells", team: "Memphis Grizzlies" },
  { number: "186", name: "Sandro Mamukelashvili", team: "San Antonio Spurs" },
  { number: "187", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "188", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "189", name: "Dillon Jones", team: "Oklahoma City Thunder" },
  { number: "190", name: "Mikal Bridges", team: "New York Knicks" },
  { number: "191", name: "Ulrich Chomche", team: "Toronto Raptors" },
  { number: "192", name: "Colby Jones", team: "Sacramento Kings" },
  { number: "193", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { number: "194", name: "Jonathan Mogbo", team: "Toronto Raptors" },
  { number: "195", name: "DaRon Holmes II", team: "Denver Nuggets" },
  { number: "196", name: "Tyler Smith", team: "Milwaukee Bucks" },
  { number: "197", name: "Dirk Nowitzki", team: "Dallas Mavericks" },
  { number: "198", name: "James Harden", team: "Los Angeles Clippers" },
  { number: "199", name: "Jalen Green", team: "Houston Rockets" },
  { number: "200", name: "Jordan Hawkins", team: "New Orleans Pelicans" },
];

// ---------------------------------------------------------------------------
// BASE PARALLELS (30 names, applied to every base card; no serial numbers
// are printed in the source checklist, only pack odds — not modeled).
// ---------------------------------------------------------------------------
const BASE_PARALLELS: string[] = [
  "Refractors",
  "Blue Basketball Refractors",
  "Magenta Refractors",
  "Negative Refractors",
  "Pink Refractors",
  "Pink Basketball Refractors",
  "Prism Refractors",
  "Purple Refractors",
  "Topps Green Refractors",
  "Aqua Refractors",
  "Magenta Speckle Refractors",
  "Purple Geometric Refractors",
  "Purple Sonar Refractors",
  "Purple Speckle Refractors",
  "Green Refractors",
  "Blue Refractors",
  "Blue Sonar Refractors",
  "Blue Lava Refractors",
  "Green Geometric Refractors",
  "Green Wave Refractors",
  "Gold Refractors",
  "Gold Geometric Refractors",
  "Orange Refractors",
  "Orange Geometric Refractors",
  "White Geometric Refractors",
  "Black Refractors",
  "Frozenfractors",
  "Red Refractors",
  "Red Geometric Refractors",
  "Black Geometric Refractors",
  "Superfractors",
];

// ---------------------------------------------------------------------------
// SHARED PARALLEL TIERS (reused across autograph/insert subsets that print
// the identical parallel list, just at different odds — odds not modeled).
// ---------------------------------------------------------------------------
const TIER_SF_ONLY = ["Superfractors"];
const TIER_PINK_BLUE_BASKETBALL = ["Pink Basketball", "Blue Basketball"];
const TIER_REF_GEO = [
  "Refractors",
  "Gold Refractors",
  "Black Refractors",
  "Red Refractors",
  "Superfractors",
  "Purple Geometric Refractors",
  "Gold Geometric Refractors",
  "Orange Geometric Refractors",
  "Red Geometric Refractors",
  "Black Geometric Refractors",
];
const TIER_BOD = [
  "Refractors",
  "Topps Green Refractors",
  "Pink Refractors",
  "Pink Basketball Refractors",
  "Blue Basketball Refractors",
  "Superfractors",
];
const TIER_DESTINY = [
  "Refractors",
  "Green Refractors",
  "Gold Refractors",
  "Orange Refractors",
  "Red Refractors",
  "Superfractors",
  "Purple Geometric Refractors",
  "Gold Geometric Refractors",
  "Orange Geometric Refractors",
  "White Geometric Refractors",
  "Red Geometric Refractors",
  "Black Geometric Refractors",
];

// Subset name -> parallel tier. Applies to both Autograph and Insert subsets.
const SUBSET_PARALLELS: Record<string, string[]> = {
  "1973 Topps Autographs": TIER_REF_GEO,
  Chromographs: TIER_PINK_BLUE_BASKETBALL,
  "Future Stars Autographs": TIER_PINK_BLUE_BASKETBALL,
  "Next Stop Signatures": TIER_REF_GEO,
  "Sky-Light Signatures": TIER_REF_GEO,
  "Topps Certified Autograph Issue": TIER_PINK_BLUE_BASKETBALL,
  "Topps Certified Autograph Issue Rookies": TIER_REF_GEO,
  "Topps Chrome Autographs": TIER_REF_GEO,
  "451": TIER_SF_ONLY,
  Advisory: [],
  "Ball of Duty": TIER_BOD,
  "Countdown Complete": TIER_BOD,
  Dippers: [],
  Destiny: TIER_DESTINY,
  "Film Study": TIER_BOD,
  "Fresh Start": TIER_BOD,
  Helix: TIER_SF_ONLY,
  Instinct: TIER_DESTINY,
  "Let's Go!": TIER_SF_ONLY,
  "Lock It Up": TIER_DESTINY,
  "Radiating Rookies": TIER_SF_ONLY,
  "Rock Stars": TIER_SF_ONLY,
  "Show and Tell": TIER_BOD,
  "Test Drive": TIER_DESTINY,
  "Ultra Violet All-Stars": TIER_SF_ONLY,
  Youthquake: TIER_DESTINY,
};

// ---------------------------------------------------------------------------
// AUTOGRAPHS
// ---------------------------------------------------------------------------
const AUTO_CARDS: SubsetRow[] = [
  // ---- 1973 Topps Autographs (40) ----
  { subset: "1973 Topps Autographs", number: "73TA-AI", name: "Allen Iverson", team: "Philadelphia 76ers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-AJ", name: "Andre Jackson Jr.", team: "Milwaukee Bucks", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-AS", name: "Anfernee Simons", team: "Portland Trail Blazers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-BB", name: "Bradley Beal", team: "Phoenix Suns", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-BS", name: "Ben Sheppard", team: "Indiana Pacers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-BW", name: "Ben Wallace", team: "Detroit Pistons", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-CH", name: "Chet Holmgren", team: "Oklahoma City Thunder", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-CJ", name: "Colby Jones", team: "Sacramento Kings", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-CM", name: "CJ McCollum", team: "New Orleans Pelicans", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-CS", name: "Collin Sexton", team: "Utah Jazz", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-DB", name: "Dillon Brooks", team: "Houston Rockets", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-DF", name: "De'Aaron Fox", team: "Sacramento Kings", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-DM", name: "Dejounte Murray", team: "New Orleans Pelicans", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-DR", name: "D'Angelo Russell", team: "Los Angeles Lakers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-JK", name: "Jason Kidd", team: "New Jersey Nets", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-JM", name: "Jamal Murray", team: "Denver Nuggets", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-JS", name: "Julian Strawther", team: "Denver Nuggets", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-JTA", name: "Jae'Sean Tate", team: "Houston Rockets", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-KL", name: "Kevin Love", team: "Miami Heat", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-KP", name: "Kristaps Porzingis", team: "Boston Celtics", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-KT", name: "Karl-Anthony Towns", team: "New York Knicks", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-LB", name: "Larry Bird", team: "Boston Celtics", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-LM", name: "Leonard Miller", team: "Minnesota Timberwolves", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-MJ", name: "Magic Johnson", team: "Los Angeles Lakers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-ML", name: "Maxwell Lewis", team: "Los Angeles Lakers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-OP", name: "Olivier-Maxence Prosper", team: "Dallas Mavericks", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-PMI", name: "Patty Mills", team: "Utah Jazz", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-PS", name: "Peja Stojakovic", team: "Sacramento Kings", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-RA", name: "Ray Allen", team: "Milwaukee Bucks", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-RJ", name: "Richard Jefferson", team: "New Jersey Nets", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-RW", name: "Rasheed Wallace", team: "Detroit Pistons", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-SC", name: "Stephen Curry", team: "Golden State Warriors", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-SCI", name: "Sidy Cissoko", team: "San Antonio Spurs", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-SH", name: "Scoot Henderson", team: "Portland Trail Blazers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-SO", name: "Shaquille O'Neal", team: "Orlando Magic", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-TH", name: "Tyrese Haliburton", team: "Indiana Pacers", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-TM", name: "Tracy McGrady", team: "Orlando Magic", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-TP", name: "Tony Parker", team: "San Antonio Spurs", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-VC", name: "Vince Carter", team: "Toronto Raptors", auto: true },
  { subset: "1973 Topps Autographs", number: "73TA-WK", name: "Walker Kessler", team: "Utah Jazz", auto: true },

  // ---- Chromographs (100) ----
  { subset: "Chromographs", number: "C-AE", name: "Alex English", team: "Denver Nuggets", auto: true },
  { subset: "Chromographs", number: "C-AG", name: "Aaron Gordon", team: "Denver Nuggets", auto: true },
  { subset: "Chromographs", number: "C-AH", name: "Al Horford", team: "Boston Celtics", auto: true },
  { subset: "Chromographs", number: "C-AM", name: "Alonzo Mourning", team: "Miami Heat", auto: true },
  { subset: "Chromographs", number: "C-AN", name: "Aaron Nesmith", team: "Indiana Pacers", auto: true },
  { subset: "Chromographs", number: "C-AR", name: "Logan Johnson", team: "Oklahoma City Thunder", auto: true },
  { subset: "Chromographs", number: "C-AS", name: "Anfernee Simons", team: "Portland Trail Blazers", auto: true },
  { subset: "Chromographs", number: "C-AW", name: "Andrew Wiggins", team: "Golden State Warriors", auto: true },
  { subset: "Chromographs", number: "C-BB", name: "Bradley Beal", team: "Phoenix Suns", auto: true },
  { subset: "Chromographs", number: "C-BBO", name: "Bogdan Bogdanović", team: "Atlanta Hawks", auto: true },
  { subset: "Chromographs", number: "C-BC", name: "Jacob Toppin", team: "New York Knicks", auto: true },
  { subset: "Chromographs", number: "C-BM", name: "Brandon Miller", team: "Charlotte Hornets", auto: true },
  { subset: "Chromographs", number: "C-BS", name: "Brice Sensabaugh", team: "Utah Jazz", auto: true },
  { subset: "Chromographs", number: "C-BW", name: "Blake Wesley", team: "San Antonio Spurs", auto: true },
  { subset: "Chromographs", number: "C-CA", name: "Cole Anthony", team: "Orlando Magic", auto: true },
  { subset: "Chromographs", number: "C-CB", name: "Leonard Miller", team: "Minnesota Timberwolves", auto: true },
  { subset: "Chromographs", number: "C-CD", name: "Clyde Drexler", team: "Portland Trail Blazers", auto: true },
  { subset: "Chromographs", number: "C-CH", name: "Chet Holmgren", team: "Oklahoma City Thunder", auto: true },
  { subset: "Chromographs", number: "C-CJ", name: "Cameron Johnson", team: "Brooklyn Nets", auto: true },
  { subset: "Chromographs", number: "C-CL", name: "Chris Livingston", team: "Milwaukee Bucks", auto: true },
  { subset: "Chromographs", number: "C-CLA", name: "Christian Laettner", team: "Minnesota Timberwolves", auto: true },
  { subset: "Chromographs", number: "C-CM", name: "CJ McCollum", team: "New Orleans Pelicans", auto: true },
  { subset: "Chromographs", number: "C-CMU", name: "Calvin Murphy", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-CS", name: "Collin Sexton", team: "Utah Jazz", auto: true },
  { subset: "Chromographs", number: "C-DB", name: "Desmond Bane", team: "Memphis Grizzlies", auto: true },
  { subset: "Chromographs", number: "C-DBR", name: "Dillon Brooks", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-DER", name: "Dennis Rodman", team: "Chicago Bulls", auto: true },
  { subset: "Chromographs", number: "C-DG", name: "Daniel Gafford", team: "Dallas Mavericks", auto: true },
  { subset: "Chromographs", number: "C-DM", name: "Donovan Mitchell", team: "Cleveland Cavaliers", auto: true },
  { subset: "Chromographs", number: "C-DR", name: "D'Angelo Russell", team: "Los Angeles Lakers", auto: true },
  { subset: "Chromographs", number: "C-DRO", name: "David Robinson", team: "San Antonio Spurs", auto: true },
  { subset: "Chromographs", number: "C-DS", name: "Domantas Sabonis", team: "Sacramento Kings", auto: true },
  { subset: "Chromographs", number: "C-DT", name: "David Thompson", team: "Denver Nuggets", auto: true },
  { subset: "Chromographs", number: "C-DV", name: "Andre Jackson Jr.", team: "Milwaukee Bucks", auto: true },
  { subset: "Chromographs", number: "C-EH", name: "Elvin Hayes", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-FW", name: "Franz Wagner", team: "Orlando Magic", auto: true },
  { subset: "Chromographs", number: "C-GG", name: "George Gervin", team: "San Antonio Spurs", auto: true },
  { subset: "Chromographs", number: "C-GHI", name: "Grant Hill", team: "Orlando Magic", auto: true },
  { subset: "Chromographs", number: "C-GWI", name: "Grant Williams", team: "Charlotte Hornets", auto: true },
  { subset: "Chromographs", number: "C-HA", name: "Hakeem Olajuwon", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-IH", name: "Jabari Walker", team: "Portland Trail Blazers", auto: true },
  { subset: "Chromographs", number: "C-IW", name: "Isaiah Wong", team: "Indiana Pacers", auto: true },
  { subset: "Chromographs", number: "C-JA", name: "Jarrett Allen", team: "Cleveland Cavaliers", auto: true },
  { subset: "Chromographs", number: "C-JAW", name: "Jason Williams", team: "Memphis Grizzlies", auto: true },
  { subset: "Chromographs", number: "C-JC", name: "Jordan Clarkson", team: "Utah Jazz", auto: true },
  { subset: "Chromographs", number: "C-JG", name: "Jalen Green", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-JGR", name: "Jeff Green", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-JH", name: "Jordan Hawkins", team: "New Orleans Pelicans", auto: true },
  { subset: "Chromographs", number: "C-JHO", name: "Juwan Howard", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-JK", name: "Jason Kidd", team: "Dallas Mavericks", auto: true },
  { subset: "Chromographs", number: "C-JL", name: "Jake LaRavia", team: "Memphis Grizzlies", auto: true },
  { subset: "Chromographs", number: "C-JM", name: "Jamal Murray", team: "Denver Nuggets", auto: true },
  { subset: "Chromographs", number: "C-JOW", name: "Jordan Walsh", team: "Boston Celtics", auto: true },
  { subset: "Chromographs", number: "C-JP", name: "Julian Phillips", team: "Chicago Bulls", auto: true },
  { subset: "Chromographs", number: "C-JS", name: "Leaky Black", team: "Charlotte Hornets", auto: true },
  { subset: "Chromographs", number: "C-JST", name: "John Stockton", team: "Utah Jazz", auto: true },
  { subset: "Chromographs", number: "C-JTA", name: "Jae'Sean Tate", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-JW", name: "Jalen Wilson", team: "Brooklyn Nets", auto: true },
  { subset: "Chromographs", number: "C-JWA", name: "Jarace Walker", team: "Indiana Pacers", auto: true },
  { subset: "Chromographs", number: "C-JWE", name: "Jerry West", team: "Los Angeles Lakers", auto: true },
  { subset: "Chromographs", number: "C-JWI", name: "Jamaal Wilkes", team: "Los Angeles Lakers", auto: true },
  { subset: "Chromographs", number: "C-KB", name: "Kobe Bufkin", team: "Atlanta Hawks", auto: true },
  { subset: "Chromographs", number: "C-KBR", name: "Kobe Brown", team: "Los Angeles Clippers", auto: true },
  { subset: "Chromographs", number: "C-KC", name: "Kentavious Caldwell-Pope", team: "Orlando Magic", auto: true },
  { subset: "Chromographs", number: "C-KG", name: "Kevin Garnett", team: "Boston Celtics", auto: true },
  { subset: "Chromographs", number: "C-KK", name: "Kyle Kuzma", team: "Washington Wizards", auto: true },
  { subset: "Chromographs", number: "C-KL", name: "Kevon Looney", team: "Golden State Warriors", auto: true },
  { subset: "Chromographs", number: "C-KM", name: "GG Jackson II", team: "Memphis Grizzlies", auto: true },
  { subset: "Chromographs", number: "C-KP", name: "Kristaps Porzingis", team: "Boston Celtics", auto: true },
  { subset: "Chromographs", number: "C-KT", name: "Karl-Anthony Towns", team: "New York Knicks", auto: true },
  { subset: "Chromographs", number: "C-LD", name: "Luguentz Dort", team: "Oklahoma City Thunder", auto: true },
  { subset: "Chromographs", number: "C-LJ", name: "Larry Johnson", team: "Charlotte Hornets", auto: true },
  { subset: "Chromographs", number: "C-LM", name: "Lauri Markkanen", team: "Utah Jazz", auto: true },
  { subset: "Chromographs", number: "C-MB", name: "Mikal Bridges", team: "New York Knicks", auto: true },
  { subset: "Chromographs", number: "C-MG", name: "Manu Ginobili", team: "San Antonio Spurs", auto: true },
  { subset: "Chromographs", number: "C-MM", name: "Malik Monk", team: "Sacramento Kings", auto: true },
  { subset: "Chromographs", number: "C-MS", name: "Trey Murphy III", team: "New Orleans Pelicans", auto: true },
  { subset: "Chromographs", number: "C-MW", name: "Metta World Peace", team: "Indiana Pacers", auto: true },
  { subset: "Chromographs", number: "C-NB", name: "Nicolas Batum", team: "Los Angeles Clippers", auto: true },
  { subset: "Chromographs", number: "C-NC", name: "Nic Claxton", team: "Brooklyn Nets", auto: true },
  { subset: "Chromographs", number: "C-NR", name: "Naz Reid", team: "Minnesota Timberwolves", auto: true },
  { subset: "Chromographs", number: "C-NS", name: "Nick Smith Jr.", team: "Charlotte Hornets", auto: true },
  { subset: "Chromographs", number: "C-OA", name: "Bruce Brown Jr.", team: "Toronto Raptors", auto: true },
  { subset: "Chromographs", number: "C-OO", name: "Onyeka Okongwu", team: "Atlanta Hawks", auto: true },
  { subset: "Chromographs", number: "C-OP", name: "Olivier-Maxence Prosper", team: "Dallas Mavericks", auto: true },
  { subset: "Chromographs", number: "C-PG", name: "Pau Gasol", team: "Los Angeles Lakers", auto: true },
  { subset: "Chromographs", number: "C-PS", name: "Pascal Siakam", team: "Indiana Pacers", auto: true },
  { subset: "Chromographs", number: "C-PST", name: "Peja Stojakovic", team: "Sacramento Kings", auto: true },
  { subset: "Chromographs", number: "C-RA", name: "Ray Allen", team: "Boston Celtics", auto: true },
  { subset: "Chromographs", number: "C-RJ", name: "Richard Jefferson", team: "New Jersey Nets", auto: true },
  { subset: "Chromographs", number: "C-RJA", name: "Reggie Jackson", team: "Philadelphia 76ers", auto: true },
  { subset: "Chromographs", number: "C-RR", name: "Rayan Rupert", team: "Portland Trail Blazers", auto: true },
  { subset: "Chromographs", number: "C-SA", name: "Steven Adams", team: "Houston Rockets", auto: true },
  { subset: "Chromographs", number: "C-SC", name: "Seth Curry", team: "Charlotte Hornets", auto: true },
  { subset: "Chromographs", number: "C-SCI", name: "Sidy Cissoko", team: "San Antonio Spurs", auto: true },
  { subset: "Chromographs", number: "C-SD", name: "Jonas Valančiūnas", team: "Washington Wizards", auto: true },
  { subset: "Chromographs", number: "C-SH", name: "Scoot Henderson", team: "Portland Trail Blazers", auto: true },
  { subset: "Chromographs", number: "C-SO", name: "Shaquille O'Neal", team: "Los Angeles Lakers", auto: true },
  { subset: "Chromographs", number: "C-TH", name: "Tyler Herro", team: "Miami Heat", auto: true },
  { subset: "Chromographs", number: "C-TM", name: "Tyrese Maxey", team: "Philadelphia 76ers", auto: true },

  // ---- Future Stars Autographs (29) ----
  { subset: "Future Stars Autographs", number: "FSA-AJ", name: "AJ Johnson", team: "Milwaukee Bucks", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-AR", name: "Antonio Reeves", team: "New Orleans Pelicans", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-AS", name: "Alexandre Sarr", team: "Washington Wizards", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-AW", name: "Anton Watson", team: "Boston Celtics", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-BJ", name: "Bronny James Jr.", team: "Los Angeles Lakers", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-CC", name: "Cam Christie", team: "Los Angeles Lakers", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-CS", name: "Cam Spencer", team: "Memphis Grizzlies", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-CW", name: "Cody Williams", team: "Utah Jazz", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-DC", name: "Devin Carter", team: "Sacramento Kings", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-DJ", name: "Dillon Jones", team: "Oklahoma City Thunder", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-EF", name: "Enrique Freeman", team: "Indiana Pacers", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-JF", name: "Johnny Furphy", team: "Indiana Pacers", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-JM", name: "Jonathan Mogbo", team: "Toronto Raptors", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-JS", name: "Jamal Shead", team: "Toronto Raptors", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-KF", name: "Kyle Filipowski", team: "Utah Jazz", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-NT", name: "Nikola Topić", team: "Oklahoma City Thunder", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-OI", name: "Oso Ighodaro", team: "Phoenix Suns", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-PL", name: "Pelle Larsson", team: "Miami Heat", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-RD", name: "Rob Dillingham", team: "Minnesota Timberwolves", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-RH", name: "Ron Holland II", team: "Detroit Pistons", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-SC", name: "Stephon Castle", team: "San Antonio Spurs", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-TK", name: "Tyler Kolek", team: "New York Knicks", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-TN", name: "Tristen Newton", team: "Indiana Pacers", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-TS", name: "Tidjane Salaün", team: "Charlotte Hornets", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-TSM", name: "Tyler Smith", team: "Milwaukee Bucks", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-Td", name: "Tristan da Silva", team: "Orlando Magic", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-UC", name: "Ulrich Chomche", team: "Toronto Raptors", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-ZE", name: "Zach Edey", team: "Memphis Grizzlies", auto: true },
  { subset: "Future Stars Autographs", number: "FSA-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks", auto: true },

  // ---- Next Stop Signatures (30) — "MSS-CC" checklist typo normalized to "NSS-CC" ----
  { subset: "Next Stop Signatures", number: "NSS-AB", name: "Adem Bona", team: "Philadelphia 76ers", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-AJ", name: "AJ Johnson", team: "Milwaukee Bucks", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-AM", name: "Ajay Mitchell", team: "Oklahoma City Thunder", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-AS", name: "Alexandre Sarr", team: "Washington Wizards", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-BJ", name: "Bronny James Jr.", team: "Los Angeles Lakers", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-BS", name: "Baylor Scheierman", team: "Boston Celtics", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-CC", name: "Cam Christie", team: "Los Angeles Clippers", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-CW", name: "Cody Williams", team: "Utah Jazz", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-DC", name: "Devin Carter", team: "Sacramento Kings", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-DH", name: "DaRon Holmes II", team: "Denver Nuggets", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-HI", name: "Harrison Ingram", team: "San Antonio Spurs", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-IC", name: "Isaiah Collier", team: "Utah Jazz", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-JT", name: "Jaylon Tyson", team: "Cleveland Cavaliers", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-JW", name: "Jaylen Wells", team: "Memphis Grizzlies", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-KG", name: "Kyshawn George", team: "Washington Wizards", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-KM", name: "Kevin McCullar Jr.", team: "New York Knicks", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-KS", name: "KJ Simpson Jr.", team: "Charlotte Hornets", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-KW", name: "Kel'el Ware", team: "Miami Heat", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-NT", name: "Nikola Topić", team: "Oklahoma City Thunder", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-PD", name: "Pacôme Dadiet", team: "New York Knicks", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-PL", name: "Pelle Larsson", team: "Miami Heat", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-RD", name: "Rob Dillingham", team: "Minnesota Timberwolves", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-RDU", name: "Ryan Dunn", team: "Phoenix Suns", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-RH", name: "Ron Holland II", team: "Detroit Pistons", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-SC", name: "Stephon Castle", team: "San Antonio Spurs", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-TS", name: "Tidjane Salaün", team: "Charlotte Hornets", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-TSH", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-YM", name: "Yves Missi", team: "New Orleans Pelicans", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-ZE", name: "Zach Edey", team: "Memphis Grizzlies", auto: true },
  { subset: "Next Stop Signatures", number: "NSS-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks", auto: true },

  // ---- Sky-Light Signatures (50) ----
  { subset: "Sky-Light Signatures", number: "SLS-AE", name: "Alex English", team: "Denver Nuggets", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-AH", name: "Anfernee Hardaway", team: "Orlando Magic", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-ARE", name: "Antonio Reeves", team: "New Orleans Pelicans", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-AWA", name: "Anton Watson", team: "Boston Celtics", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-BM", name: "Brandon Miller", team: "Charlotte Hornets", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-BS", name: "Brice Sensabaugh", team: "Utah Jazz", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DB", name: "Desmond Bane", team: "Memphis Grizzlies", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DM", name: "Donovan Mitchell", team: "Cleveland Cavaliers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DMI", name: "Davion Mitchell", team: "Toronto Raptors", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DN", name: "Dirk Nowitzki", team: "Dallas Mavericks", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DR", name: "David Robinson", team: "San Antonio Spurs", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DRO", name: "Dennis Rodman", team: "Chicago Bulls", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DS", name: "Domantas Sabonis", team: "Sacramento Kings", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-DW", name: "Dominique Wilkins", team: "Atlanta Hawks", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-FW", name: "Franz Wagner", team: "Orlando Magic", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-GG", name: "George Gervin", team: "San Antonio Spurs", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-GW", name: "Grant Williams", team: "Charlotte Hornets", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JC", name: "John Collins", team: "Utah Jazz", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JED", name: "Justin Edwards", team: "Philadelphia 76ers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JG", name: "Jalen Green", team: "Houston Rockets", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JH", name: "Jett Howard", team: "Orlando Magic", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JHD", name: "James Harden", team: "Los Angeles Clippers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JJ", name: "Jaime Jaquez Jr.", team: "Miami Heat", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JJJ", name: "Jaren Jackson Jr.", team: "Memphis Grizzlies", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JK", name: "Jonathan Kuminga", team: "Golden State Warriors", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JLA", name: "Jock Landale", team: "Houston Rockets", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JP", name: "Jordan Poole", team: "Washington Wizards", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JSH", name: "Jamal Shead", team: "Toronto Raptors", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JT", name: "Jayson Tatum", team: "Boston Celtics", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-JWE", name: "Jaylen Wells", team: "Memphis Grizzlies", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-KC", name: "Kentavious Caldwell-Pope", team: "Orlando Magic", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-KD", name: "Kevin Durant", team: "Phoenix Suns", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-KG", name: "Kevin Garnett", team: "Minnesota Timberwolves", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-LB", name: "Larry Bird", team: "Boston Celtics", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-LBJ", name: "Lebron James", team: "Los Angeles Lakers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-LD", name: "Luguentz Dort", team: "Oklahoma City Thunder", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-LM", name: "Lauri Markkanen", team: "Utah Jazz", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-MB", name: "Mikal Bridges", team: "New York Knicks", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-MW", name: "Metta World Peace", team: "Indiana Pacers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-OO", name: "Onyeka Okongwu", team: "Atlanta Hawks", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-OT", name: "Obi Toppin", team: "Indiana Pacers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-PAC", name: "Precious Achiuwa", team: "New York Knicks", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-SK", name: "Shawn Kemp", team: "Seattle", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-SO", name: "Shaquille O'Neal", team: "Los Angeles Lakers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-THA", name: "Tyrese Haliburton", team: "Indiana Pacers", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-THE", name: "Tyler Herro", team: "Miami Heat", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-TJ", name: "Trayce Jackson-Davis", team: "Golden State Warriors", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-UCH", name: "Ulrich Chomche", team: "Toronto Raptors", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-VC", name: "Vince Carter", team: "Toronto Raptors", auto: true },
  { subset: "Sky-Light Signatures", number: "SLS-VW", name: "Victor Wembanyama", team: "San Antonio Spurs", auto: true },

  // ---- Topps Certified Autograph Issue (70) ----
  { subset: "Topps Certified Autograph Issue", number: "TCAI-AB", name: "Anthony Black", team: "Orlando Magic", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-AG", name: "Artis Gilmore", team: "Chicago Bulls", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-AS", name: "Alperen Sengun", team: "Houston Rockets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-BB", name: "Bruce Brown Jr.", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-BBO", name: "Bogdan Bogdanović", team: "Atlanta Hawks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-BC", name: "Bilal Coulibaly", team: "Washington Wizards", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-BCL", name: "Brandon Clarke", team: "Memphis Grizzlies", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-BH", name: "Bones Hyland", team: "Los Angeles Clippers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-BP", name: "Brandin Podziemski", team: "Golden State Warriors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-CA", name: "Carmelo Anthony", team: "Denver Nuggets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-CC", name: "Clint Capela", team: "Atlanta Hawks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-CL", name: "Christian Laettner", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-CW", name: "Cam Whitmore", team: "Houston Rockets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DD", name: "Donte DiVincenzo", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DG", name: "Daniel Gafford", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DH", name: "De'Andre Hunter", team: "Atlanta Hawks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DL", name: "Dereck Lively II", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DN", name: "Dirk Nowitzki", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DSH", name: "Day'ron Sharpe", team: "Brooklyn Nets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DT", name: "David Thompson", team: "Houston Rockets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DW", name: "Dwyane Wade", team: "Miami Heat", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-DWI", name: "Deron Williams", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-GD", name: "Gradey Dick", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-GJ", name: "GG Jackson II", team: "Memphis Grizzlies", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-GTJ", name: "Gary Trent Jr.", team: "Milwaukee Bucks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-GW", name: "Grant Williams", team: "Charlotte Hornets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-IQ", name: "Immanuel Quickley", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JB", name: "Jalen Brunson", team: "New York Knicks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JC", name: "Jaylen Clark", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JCO", name: "John Collins", team: "Utah Jazz", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JH", name: "Jalen Hood-Schifino", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JHO", name: "Jett Howard", team: "Orlando Magic", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JP", name: "Jakob Poeltl", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JS", name: "Jerry Stackhouse", team: "Detroit Pistons", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JT", name: "Jayson Tatum", team: "Boston Celtics", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JVA", name: "Jarred Vanderbilt", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-JWI", name: "Jason Williams", team: "Memphis Grizzlies", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-KD", name: "Kevin Durant", team: "Phoenix Suns", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-LBJ", name: "Lebron James", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-LJ", name: "Larry Johnson", team: "Charlotte Hornets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-LS", name: "Latrell Sprewell", team: "New York Knicks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-LW", name: "Lonnie Walker IV", team: "Brooklyn Nets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-MB", name: "Mo Bamba", team: "Los Angeles", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-MF", name: "Markelle Fultz", team: "Orlando Magic", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-MG", name: "Manu Ginobili", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-MJ", name: "Magic Johnson", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-MST", name: "Max Strus", team: "Cleveland Cavaliers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-NB", name: "Nicolas Batum", team: "Philadelphia 76ers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-NC", name: "Noah Clowney", team: "Brooklyn Nets", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-NR", name: "Naz Reid", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-OO", name: "Onyeka Okongwu", team: "Atlanta Hawks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-PMI", name: "Patty Mills", team: "Utah Jazz", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-PP", name: "Paul Pierce", team: "Boston Celtics", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-PW", name: "Patrick Williams", team: "Chicago Bulls", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-QG", name: "Quentin Grimes", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-RB", name: "Rick Barry", team: "Golden State Warriors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-RH", name: "Rui Hachimura", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-RJA", name: "Reggie Jackson", team: "Philadelphia 76ers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-RP", name: "Robert Parish", team: "Boston Celtics", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-SB", name: "Saddiq Bey", team: "Washington Wizards", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-SC", name: "Stephen Curry", team: "Golden State Warriors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-SK", name: "Shawn Kemp", team: "Seattle", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-SMA", name: "Sandro Mamukelashvili", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-SS", name: "Shaedon Sharpe", team: "Portland Trail Blazers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-TH", name: "Taylor Hendricks", team: "Utah Jazz", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-TM", name: "Trey Murphy III", team: "New Orleans Pelicans", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-TMA", name: "Terance Mann", team: "Los Angeles Clippers", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-VC", name: "Vince Carter", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-VW", name: "Victor Wembanyama", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Certified Autograph Issue", number: "TCAI-ZR", name: "Zach Randolph", team: "Memphis Grizzlies", auto: true },

  // ---- Topps Certified Autograph Issue Rookies (30) ----
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-AJ", name: "AJ Johnson", team: "Milwaukee Bucks", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-AS", name: "Alexandre Sarr", team: "Washington Wizards", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-BJ", name: "Bronny James Jr.", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-BS", name: "Baylor Scheierman", team: "Boston Celtics", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-CW", name: "Cody Williams", team: "Utah Jazz", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-DH", name: "DaRon Holmes II", team: "Denver Nuggets", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-DJ", name: "Dillon Jones", team: "Oklahoma City Thunder", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-IC", name: "Isaiah Collier", team: "Utah Jazz", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-JB", name: "Jalen Bridges", team: "Phoenix Suns", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-JE", name: "Justin Edwards", team: "Philadelphia 76ers", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-JF", name: "Johnny Furphy", team: "Indiana Pacers", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-JM", name: "Jonathan Mogbo", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-JS", name: "Jamal Shead", team: "Toronto Raptors", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-JT", name: "Jaylon Tyson", team: "Cleveland Cavaliers", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-KF", name: "Kyle Filipowski", team: "Utah Jazz", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-KG", name: "Kyshawn George", team: "Washington Wizards", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-KW", name: "Kel'el Ware", team: "Miami Heat", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-NT", name: "Nikola Topić", team: "Oklahoma City Thunder", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-OI", name: "Oso Ighodaro", team: "Phoenix Suns", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-RD", name: "Rob Dillingham", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-RDU", name: "Ryan Dunn", team: "Phoenix Suns", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-RH", name: "Ron Holland II", team: "Detroit Pistons", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-SC", name: "Stephon Castle", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-TD", name: "Tristan da Silva", team: "Orlando Magic", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-TK", name: "Tyler Kolek", team: "New York Knicks", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-TS", name: "Tidjane Salaün", team: "Charlotte Hornets", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-TSH", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-TSM", name: "Tyler Smith", team: "Milwaukee Bucks", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-YM", name: "Yves Missi", team: "New Orleans Pelicans", auto: true },
  { subset: "Topps Certified Autograph Issue Rookies", number: "TCRA-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks", auto: true },

  // ---- Topps Chrome Autographs (50) ----
  { subset: "Topps Chrome Autographs", number: "TCA-ADO", name: "Ayo Dosunmu", team: "Chicago Bulls", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-AG", name: "Aaron Gordon", team: "Denver Nuggets", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-AI", name: "Allen Iverson", team: "Philadelphia 76ers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-AM", name: "Alonzo Mourning", team: "Miami Heat", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-ANE", name: "Aaron Nesmith", team: "Indiana Pacers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-ASA", name: "Alexandre Sarr", team: "Washington Wizards", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-AW", name: "Andrew Wiggins", team: "Golden State Warriors", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-BB", name: "Bradley Beal", team: "Phoenix Suns", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-BC", name: "Bilal Coulibaly", team: "Washington Wizards", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-BJJ", name: "Bronny James Jr.", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-BM", name: "Brandon Miller", team: "Charlotte Hornets", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-BP", name: "Brandin Podziemski", team: "Golden State Warriors", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-CA", name: "Carmelo Anthony", team: "New York Knicks", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-CD", name: "Clyde Drexler", team: "Portland Trail Blazers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-CH", name: "Chet Holmgren", team: "Oklahoma City Thunder", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-CWI", name: "Cody Williams", team: "Utah Jazz", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-DF", name: "De'Aaron Fox", team: "Sacramento Kings", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-DL", name: "Dereck Lively II", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-DW", name: "Dwyane Wade", team: "Miami Heat", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-EG", name: "Eric Gordon", team: "Philadelphia 76ers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-FV", name: "Fred VanVleet", team: "Houston Rockets", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-GT", name: "Gary Trent Jr.", team: "Milwaukee Bucks", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-HO", name: "Hakeem Olajuwon", team: "Houston Rockets", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-IST", name: "Isaiah Stewart", team: "Detroit Pistons", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JA", name: "Jarrett Allen", team: "Cleveland Cavaliers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JAV", name: "Jarred Vanderbilt", team: "Los Angeles Lakers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JB", name: "Jalen Brunson", team: "New York Knicks", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JJ", name: "Jaime Jaquez Jr.", team: "Miami Heat", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JLA", name: "Jake LaRavia", team: "Memphis Grizzlies", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JS", name: "John Stockton", team: "Utah Jazz", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JVA", name: "Jonas Valančiūnas", team: "Washington Wizards", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-JWA", name: "Jabari Walker", team: "Portland Trail Blazers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-KK", name: "Kyle Kuzma", team: "Washington Wizards", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-KM", name: "Khris Middleton", team: "Milwaukee Bucks", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-LWI", name: "Lenny Wilkens", team: "Cleveland Cavaliers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-NC", name: "Noah Clowney", team: "Brooklyn Nets", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-NS", name: "Nick Smith Jr.", team: "Charlotte Hornets", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-PP", name: "Paul Pierce", team: "Boston Celtics", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-QG", name: "Quentin Grimes", team: "Dallas Mavericks", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-RG", name: "Rudy Gobert", team: "Minnesota Timberwolves", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-RH", name: "Rip Hamilton", team: "Detroit Pistons", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-RHO", name: "Ron Holland II", team: "Detroit Pistons", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-SCA", name: "Stephon Castle", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-SMA", name: "Sandro Mamukelashvili", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-TM", name: "Tyrese Maxey", team: "Philadelphia 76ers", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-TMC", name: "Tracy McGrady", team: "Orlando Magic", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-VW", name: "Victor Wembanyama", team: "San Antonio Spurs", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-ZED", name: "Zach Edey", team: "Memphis Grizzlies", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-ZL", name: "Zach LAVine", team: "Chicago Bulls", auto: true },
  { subset: "Topps Chrome Autographs", number: "TCA-ZRI", name: "Zaccharie Risacher", team: "Atlanta Hawks", auto: true },
];

// ---------------------------------------------------------------------------
// INSERTS
// ---------------------------------------------------------------------------
const INSERT_CARDS: SubsetRow[] = [
  // ---- 451 (20) ----
  { subset: "451", number: "451-1", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "451", number: "451-2", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { subset: "451", number: "451-3", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "451", number: "451-4", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "451", number: "451-5", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "451", number: "451-6", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "451", number: "451-7", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "451", number: "451-8", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "451", number: "451-9", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "451", number: "451-10", name: "Jimmy Butler", team: "Miami Heat" },
  { subset: "451", number: "451-11", name: "Karl-Anthony Towns", team: "New York Knicks" },
  { subset: "451", number: "451-12", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "451", number: "451-13", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { subset: "451", number: "451-14", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "451", number: "451-15", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { subset: "451", number: "451-16", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "451", number: "451-17", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "451", number: "451-18", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "451", number: "451-19", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "451", number: "451-20", name: "Rob Dillingham", team: "Minnesota Timberwolves" },

  // ---- Advisory (25) ----
  { subset: "Advisory", number: "A-1", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Advisory", number: "A-2", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Advisory", number: "A-3", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Advisory", number: "A-4", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Advisory", number: "A-5", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Advisory", number: "A-6", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Advisory", number: "A-7", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Advisory", number: "A-8", name: "Cody Williams", team: "Utah Jazz" },
  { subset: "Advisory", number: "A-9", name: "Nikola Topić", team: "Oklahoma City Thunder" },
  { subset: "Advisory", number: "A-10", name: "Devin Carter", team: "Sacramento Kings" },
  { subset: "Advisory", number: "A-11", name: "Kel'el Ware", team: "Miami Heat" },
  { subset: "Advisory", number: "A-12", name: "Tristan da Silva", team: "Orlando Magic" },
  { subset: "Advisory", number: "A-13", name: "Jaylon Tyson", team: "Cleveland Cavaliers" },
  { subset: "Advisory", number: "A-14", name: "Yves Missi", team: "New Orleans Pelicans" },
  { subset: "Advisory", number: "A-15", name: "DaRon Holmes II", team: "Denver Nuggets" },
  { subset: "Advisory", number: "A-16", name: "AJ Johnson", team: "Milwaukee Bucks" },
  { subset: "Advisory", number: "A-17", name: "Kyshawn George", team: "Washington Wizards" },
  { subset: "Advisory", number: "A-18", name: "Dillon Jones", team: "Oklahoma City Thunder" },
  { subset: "Advisory", number: "A-19", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves" },
  { subset: "Advisory", number: "A-20", name: "Ryan Dunn", team: "Phoenix Suns" },
  { subset: "Advisory", number: "A-21", name: "Isaiah Collier", team: "Utah Jazz" },
  { subset: "Advisory", number: "A-22", name: "Baylor Scheierman", team: "Boston Celtics" },
  { subset: "Advisory", number: "A-23", name: "Bronny James Jr.", team: "Los Angeles Lakers" },
  { subset: "Advisory", number: "A-24", name: "Tyler Smith", team: "Milwaukee Bucks" },
  { subset: "Advisory", number: "A-25", name: "Johnny Furphy", team: "Indiana Pacers" },

  // ---- Ball of Duty (25) ----
  { subset: "Ball of Duty", number: "BOD-1", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Ball of Duty", number: "BOD-2", name: "Devin Booker", team: "Phoenix Suns" },
  { subset: "Ball of Duty", number: "BOD-3", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Ball of Duty", number: "BOD-4", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Ball of Duty", number: "BOD-5", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Ball of Duty", number: "BOD-6", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Ball of Duty", number: "BOD-7", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Ball of Duty", number: "BOD-8", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { subset: "Ball of Duty", number: "BOD-9", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Ball of Duty", number: "BOD-10", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { subset: "Ball of Duty", number: "BOD-11", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "Ball of Duty", number: "BOD-12", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Ball of Duty", number: "BOD-13", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Ball of Duty", number: "BOD-14", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Ball of Duty", number: "BOD-15", name: "Jimmy Butler", team: "Miami Heat" },
  { subset: "Ball of Duty", number: "BOD-16", name: "Dominique Wilkins", team: "Atlanta Hawks" },
  { subset: "Ball of Duty", number: "BOD-17", name: "Paul Pierce", team: "Boston Celtics" },
  { subset: "Ball of Duty", number: "BOD-18", name: "Dennis Rodman", team: "Chicago Bulls" },
  { subset: "Ball of Duty", number: "BOD-19", name: "Carmelo Anthony", team: "Denver Nuggets" },
  { subset: "Ball of Duty", number: "BOD-20", name: "Ben Wallace", team: "Detroit Pistons" },
  { subset: "Ball of Duty", number: "BOD-21", name: "Hakeem Olajuwan", team: "Houston Rockets" },
  { subset: "Ball of Duty", number: "BOD-22", name: "Shaquille O'Neal", team: "Los Angeles Lakers" },
  { subset: "Ball of Duty", number: "BOD-23", name: "Dwyane Wade", team: "Miami Heat" },
  { subset: "Ball of Duty", number: "BOD-24", name: "Kevin Garnett", team: "Minnesota Timberwolves" },
  { subset: "Ball of Duty", number: "BOD-25", name: "David Robinson", team: "San Antonio Spurs" },

  // ---- Countdown Complete (25) ----
  { subset: "Countdown Complete", number: "CC-1", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Countdown Complete", number: "CC-2", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "Countdown Complete", number: "CC-3", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Countdown Complete", number: "CC-4", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { subset: "Countdown Complete", number: "CC-5", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Countdown Complete", number: "CC-6", name: "Jaime Jaquez Jr", team: "Miami Heat" },
  { subset: "Countdown Complete", number: "CC-7", name: "Brandin Podziemski", team: "Golden State Warriors" },
  { subset: "Countdown Complete", number: "CC-8", name: "Jalen Green", team: "Houston Rockets" },
  { subset: "Countdown Complete", number: "CC-9", name: "Tyrese Maxey", team: "Philadelphia 76ers" },
  { subset: "Countdown Complete", number: "CC-10", name: "Cade Cunningham", team: "Detroit Pistons" },
  { subset: "Countdown Complete", number: "CC-11", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Countdown Complete", number: "CC-12", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Countdown Complete", number: "CC-13", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Countdown Complete", number: "CC-14", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Countdown Complete", number: "CC-15", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Countdown Complete", number: "CC-16", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Countdown Complete", number: "CC-17", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Countdown Complete", number: "CC-18", name: "Cody Williams", team: "Utah Jazz" },
  { subset: "Countdown Complete", number: "CC-19", name: "Nikola Topić", team: "Oklahoma City Thunder" },
  { subset: "Countdown Complete", number: "CC-20", name: "Devin Carter", team: "Sacramento Kings" },
  { subset: "Countdown Complete", number: "CC-21", name: "Tristan da Silva", team: "Orlando Magic" },
  { subset: "Countdown Complete", number: "CC-22", name: "AJ Johnson", team: "Milwaukee Bucks" },
  { subset: "Countdown Complete", number: "CC-23", name: "Isaiah Collier", team: "Utah Jazz" },
  { subset: "Countdown Complete", number: "CC-24", name: "Baylor Scheierman", team: "Boston Celtics" },
  { subset: "Countdown Complete", number: "CC-25", name: "Bronny James Jr.", team: "Los Angeles Lakers" },

  // ---- Dippers (25) ----
  { subset: "Dippers", number: "D-1", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Dippers", number: "D-2", name: "Zach Lavine", team: "Chicago Bulls" },
  { subset: "Dippers", number: "D-3", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "Dippers", number: "D-4", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Dippers", number: "D-5", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Dippers", number: "D-6", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Dippers", number: "D-7", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Dippers", number: "D-8", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Dippers", number: "D-9", name: "Paul George", team: "Philadelphia 76ers" },
  { subset: "Dippers", number: "D-10", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Dippers", number: "D-11", name: "Jaylen Brown", team: "Boston Celtics" },
  { subset: "Dippers", number: "D-12", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Dippers", number: "D-13", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { subset: "Dippers", number: "D-14", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Dippers", number: "D-15", name: "Jimmy Butler", team: "Miami Heat" },
  { subset: "Dippers", number: "D-16", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { subset: "Dippers", number: "D-17", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Dippers", number: "D-18", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Dippers", number: "D-19", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { subset: "Dippers", number: "D-20", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { subset: "Dippers", number: "D-21", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Dippers", number: "D-22", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Dippers", number: "D-23", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Dippers", number: "D-24", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Dippers", number: "D-25", name: "Cody Williams", team: "Utah Jazz" },

  // ---- Destiny (25) — distinct from Dippers despite matching "D-" numbers; namespaced by subset ----
  { subset: "Destiny", number: "D-1", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Destiny", number: "D-2", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Destiny", number: "D-3", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Destiny", number: "D-4", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Destiny", number: "D-5", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Destiny", number: "D-6", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Destiny", number: "D-7", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Destiny", number: "D-8", name: "Cody Williams", team: "Utah Jazz" },
  { subset: "Destiny", number: "D-9", name: "Nikola Topić", team: "Oklahoma City Thunder" },
  { subset: "Destiny", number: "D-10", name: "Devin Carter", team: "Sacramento Kings" },
  { subset: "Destiny", number: "D-11", name: "Kel'el Ware", team: "Miami Heat" },
  { subset: "Destiny", number: "D-12", name: "Tristan da Silva", team: "Orlando Magic" },
  { subset: "Destiny", number: "D-13", name: "Jaylon Tyson", team: "Cleveland Cavaliers" },
  { subset: "Destiny", number: "D-14", name: "Yves Missi", team: "New Orleans Pelicans" },
  { subset: "Destiny", number: "D-15", name: "DaRon Holmes II", team: "Denver Nuggets" },
  { subset: "Destiny", number: "D-16", name: "AJ Johnson", team: "Milwaukee Bucks" },
  { subset: "Destiny", number: "D-17", name: "Kyshawn George", team: "Washington Wizards" },
  { subset: "Destiny", number: "D-18", name: "Dillon Jones", team: "Oklahoma City Thunder" },
  { subset: "Destiny", number: "D-19", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves" },
  { subset: "Destiny", number: "D-20", name: "Ryan Dunn", team: "Phoenix Suns" },
  { subset: "Destiny", number: "D-21", name: "Isaiah Collier", team: "Utah Jazz" },
  { subset: "Destiny", number: "D-22", name: "Baylor Scheierman", team: "Boston Celtics" },
  { subset: "Destiny", number: "D-23", name: "Tyler Kolek", team: "New York Knicks" },
  { subset: "Destiny", number: "D-24", name: "Bronny James Jr.", team: "Los Angeles Lakers" },
  { subset: "Destiny", number: "D-25", name: "Johnny Furphy", team: "Indiana Pacers" },

  // ---- Film Study (20) ----
  { subset: "Film Study", number: "FS-1", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { subset: "Film Study", number: "FS-2", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Film Study", number: "FS-3", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Film Study", number: "FS-4", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Film Study", number: "FS-5", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Film Study", number: "FS-6", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Film Study", number: "FS-7", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Film Study", number: "FS-8", name: "Devin Booker", team: "Phoenix Suns" },
  { subset: "Film Study", number: "FS-9", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "Film Study", number: "FS-10", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "Film Study", number: "FS-11", name: "Cade Cunningham", team: "Detroit Pistons" },
  { subset: "Film Study", number: "FS-12", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { subset: "Film Study", number: "FS-13", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Film Study", number: "FS-14", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Film Study", number: "FS-15", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { subset: "Film Study", number: "FS-16", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Film Study", number: "FS-17", name: "Jimmy Butler", team: "Miami Heat" },
  { subset: "Film Study", number: "FS-18", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { subset: "Film Study", number: "FS-19", name: "Jalen Green", team: "Houston Rockets" },
  { subset: "Film Study", number: "FS-20", name: "Jayson Tatum", team: "Boston Celtics" },

  // ---- Fresh Start (15) — distinct from Film Study despite matching "FS-" numbers ----
  { subset: "Fresh Start", number: "FS-1", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Fresh Start", number: "FS-2", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Fresh Start", number: "FS-3", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Fresh Start", number: "FS-4", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Fresh Start", number: "FS-5", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Fresh Start", number: "FS-6", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Fresh Start", number: "FS-7", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Fresh Start", number: "FS-8", name: "Cody Williams", team: "Utah Jazz" },
  { subset: "Fresh Start", number: "FS-9", name: "Nikola Topić", team: "Oklahoma City Thunder" },
  { subset: "Fresh Start", number: "FS-10", name: "Devin Carter", team: "Sacramento Kings" },
  { subset: "Fresh Start", number: "FS-11", name: "Tristan da Silva", team: "Orlando Magic" },
  { subset: "Fresh Start", number: "FS-12", name: "DaRon Holmes II", team: "Denver Nuggets" },
  { subset: "Fresh Start", number: "FS-13", name: "AJ Johnson", team: "Milwaukee Bucks" },
  { subset: "Fresh Start", number: "FS-14", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves" },
  { subset: "Fresh Start", number: "FS-15", name: "Bronny James Jr.", team: "Los Angeles Lakers" },

  // ---- Helix (20) ----
  { subset: "Helix", number: "H-1", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Helix", number: "H-2", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Helix", number: "H-3", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Helix", number: "H-4", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Helix", number: "H-5", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Helix", number: "H-6", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Helix", number: "H-7", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Helix", number: "H-8", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { subset: "Helix", number: "H-9", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Helix", number: "H-10", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "Helix", number: "H-11", name: "Shaquille O'Neal", team: "Los Angeles Lakers" },
  { subset: "Helix", number: "H-12", name: "Dirk Nowitzki", team: "Dallas Mavericks" },
  { subset: "Helix", number: "H-13", name: "Allen Iverson", team: "Philadelphia 76ers" },
  { subset: "Helix", number: "H-14", name: "Larry Bird", team: "Boston Celtics" },
  { subset: "Helix", number: "H-15", name: "Magic Johnson", team: "Los Angeles Lakers" },
  { subset: "Helix", number: "H-16", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Helix", number: "H-17", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Helix", number: "H-18", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Helix", number: "H-19", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Helix", number: "H-20", name: "Rob Dillingham", team: "Minnesota Timberwolves" },

  // ---- Instinct (30) ----
  { subset: "Instinct", number: "INS-1", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { subset: "Instinct", number: "INS-2", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Instinct", number: "INS-3", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { subset: "Instinct", number: "INS-4", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Instinct", number: "INS-5", name: "Trae Young", team: "Atlanta Hawks" },
  { subset: "Instinct", number: "INS-6", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Instinct", number: "INS-7", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { subset: "Instinct", number: "INS-8", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Instinct", number: "INS-9", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Instinct", number: "INS-10", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Instinct", number: "INS-11", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { subset: "Instinct", number: "INS-12", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Instinct", number: "INS-13", name: "Zach Lavine", team: "Chicago Bulls" },
  { subset: "Instinct", number: "INS-14", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Instinct", number: "INS-15", name: "Cade Cunningham", team: "Detroit Pistons" },
  { subset: "Instinct", number: "INS-16", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Instinct", number: "INS-17", name: "Jalen Green", team: "Houston Rockets" },
  { subset: "Instinct", number: "INS-18", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Instinct", number: "INS-19", name: "Jimmy Butler", team: "Miami Heat" },
  { subset: "Instinct", number: "INS-20", name: "Jaylen Brown", team: "Boston Celtics" },
  { subset: "Instinct", number: "INS-21", name: "Tyrese Maxey", team: "Philadelphia 76ers" },
  { subset: "Instinct", number: "INS-22", name: "De'Aaron Fox", team: "Sacramento Kings" },
  { subset: "Instinct", number: "INS-23", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "Instinct", number: "INS-24", name: "Anthony Davis", team: "Los Angeles Lakers" },
  { subset: "Instinct", number: "INS-25", name: "Devin Booker", team: "Phoenix Suns" },
  { subset: "Instinct", number: "INS-26", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Instinct", number: "INS-27", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Instinct", number: "INS-28", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Instinct", number: "INS-29", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Instinct", number: "INS-30", name: "Rob Dillingham", team: "Minnesota Timberwolves" },

  // ---- Let's Go! (15) ----
  { subset: "Let's Go!", number: "LG-1", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Let's Go!", number: "LG-2", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Let's Go!", number: "LG-3", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Let's Go!", number: "LG-4", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Let's Go!", number: "LG-5", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Let's Go!", number: "LG-6", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Let's Go!", number: "LG-7", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Let's Go!", number: "LG-8", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Let's Go!", number: "LG-9", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "Let's Go!", number: "LG-10", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Let's Go!", number: "LG-11", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Let's Go!", number: "LG-12", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Let's Go!", number: "LG-13", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Let's Go!", number: "LG-14", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Let's Go!", number: "LG-15", name: "Bronny James Jr.", team: "Los Angeles Lakers" },

  // ---- Lock It Up (10) ----
  { subset: "Lock It Up", number: "LIU-1", name: "Jaylen Brown", team: "Boston Celtics" },
  { subset: "Lock It Up", number: "LIU-2", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Lock It Up", number: "LIU-3", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { subset: "Lock It Up", number: "LIU-4", name: "Anthony Davis", team: "Los Angeles Lakers" },
  { subset: "Lock It Up", number: "LIU-5", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Lock It Up", number: "LIU-6", name: "Karl-Anthony Towns", team: "New York Knicks" },
  { subset: "Lock It Up", number: "LIU-7", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { subset: "Lock It Up", number: "LIU-8", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Lock It Up", number: "LIU-9", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Lock It Up", number: "LIU-10", name: "Kevin Durant", team: "Phoenix Suns" },

  // ---- Radiating Rookies (10) ----
  { subset: "Radiating Rookies", number: "RR-1", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Radiating Rookies", number: "RR-2", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Radiating Rookies", number: "RR-3", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Radiating Rookies", number: "RR-4", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Radiating Rookies", number: "RR-5", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Radiating Rookies", number: "RR-6", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Radiating Rookies", number: "RR-7", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Radiating Rookies", number: "RR-8", name: "Tristan da Silva", team: "Orlando Magic" },
  { subset: "Radiating Rookies", number: "RR-9", name: "Ryan Dunn", team: "Phoenix Suns" },
  { subset: "Radiating Rookies", number: "RR-10", name: "Jonathan Mogbo", team: "Toronto Raptors" },

  // ---- Rock Stars (20) ----
  { subset: "Rock Stars", number: "RS-1", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Rock Stars", number: "RS-2", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Rock Stars", number: "RS-3", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { subset: "Rock Stars", number: "RS-4", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Rock Stars", number: "RS-5", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Rock Stars", number: "RS-6", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Rock Stars", number: "RS-7", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Rock Stars", number: "RS-8", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Rock Stars", number: "RS-9", name: "Devin Booker", team: "Phoenix Suns" },
  { subset: "Rock Stars", number: "RS-10", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "Rock Stars", number: "RS-11", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Rock Stars", number: "RS-12", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Rock Stars", number: "RS-13", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Rock Stars", number: "RS-14", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Rock Stars", number: "RS-15", name: "Cody Williams", team: "Utah Jazz" },
  { subset: "Rock Stars", number: "RS-16", name: "David Robinson", team: "San Antonio Spurs" },
  { subset: "Rock Stars", number: "RS-17", name: "Hakeem Olajuwon", team: "Houston Rockets" },
  { subset: "Rock Stars", number: "RS-18", name: "Shaquille O'Neal", team: "Los Angeles Lakers" },
  { subset: "Rock Stars", number: "RS-19", name: "Vince Carter", team: "Toronto Raptors" },
  { subset: "Rock Stars", number: "RS-20", name: "Allen Iverson", team: "Philadelphia 76ers" },

  // ---- Show and Tell (15) ----
  { subset: "Show and Tell", number: "ST-1", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Show and Tell", number: "ST-2", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Show and Tell", number: "ST-3", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Show and Tell", number: "ST-4", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { subset: "Show and Tell", number: "ST-5", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Show and Tell", number: "ST-6", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Show and Tell", number: "ST-7", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Show and Tell", number: "ST-8", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "Show and Tell", number: "ST-9", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Show and Tell", number: "ST-10", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Show and Tell", number: "ST-11", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Show and Tell", number: "ST-12", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Show and Tell", number: "ST-13", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Show and Tell", number: "ST-14", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Show and Tell", number: "ST-15", name: "Rob Dillingham", team: "Minnesota Timberwolves" },

  // ---- Test Drive (20) ----
  { subset: "Test Drive", number: "TD-1", name: "Trae Young", team: "Atlanta Hawks" },
  { subset: "Test Drive", number: "TD-2", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Test Drive", number: "TD-3", name: "Mikal Bridges", team: "New York Knicks" },
  { subset: "Test Drive", number: "TD-4", name: "Brandon Miller", team: "Charlotte Hornets" },
  { subset: "Test Drive", number: "TD-5", name: "Zach Lavine", team: "Chicago Bulls" },
  { subset: "Test Drive", number: "TD-6", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { subset: "Test Drive", number: "TD-7", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { subset: "Test Drive", number: "TD-8", name: "Jamal Murray", team: "Denver Nuggets" },
  { subset: "Test Drive", number: "TD-9", name: "Cade Cunningham", team: "Detroit Pistons" },
  { subset: "Test Drive", number: "TD-10", name: "Jalen Green", team: "Houston Rockets" },
  { subset: "Test Drive", number: "TD-11", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Test Drive", number: "TD-12", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { subset: "Test Drive", number: "TD-13", name: "Paul George", team: "Philadelphia 76ers" },
  { subset: "Test Drive", number: "TD-14", name: "LeBron James", team: "Los Angeles" },
  { subset: "Test Drive", number: "TD-15", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Test Drive", number: "TD-16", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { subset: "Test Drive", number: "TD-17", name: "Tyrese Maxey", team: "Philadelphia 76ers" },
  { subset: "Test Drive", number: "TD-18", name: "Devin Booker", team: "Phoenix Suns" },
  { subset: "Test Drive", number: "TD-19", name: "De'Aaron Fox", team: "Sacramento Kings" },
  { subset: "Test Drive", number: "TD-20", name: "Scoot Henderson", team: "Portland Trail Blazers" },

  // ---- Ultra Violet All-Stars (15) ----
  { subset: "Ultra Violet All-Stars", number: "UVAS-1", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-2", name: "Kevin Durant", team: "Phoenix Suns" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-3", name: "Stephen Curry", team: "Golden State Warriors" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-4", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-5", name: "Jalen Brunson", team: "New York Knicks" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-6", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-7", name: "Nikola Jokić", team: "Denver Nuggets" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-8", name: "Jayson Tatum", team: "Boston Celtics" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-9", name: "LeBron James", team: "Los Angeles Lakers" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-10", name: "Ja Morant", team: "Memphis Grizzlies" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-11", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-12", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-13", name: "De'Aaron Fox", team: "Sacramento Kings" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-14", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { subset: "Ultra Violet All-Stars", number: "UVAS-15", name: "Kyrie Irving", team: "Dallas Mavericks" },

  // ---- Youthquake (15) ----
  { subset: "Youthquake", number: "YQ-1", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { subset: "Youthquake", number: "YQ-2", name: "Alexandre Sarr", team: "Washington Wizards" },
  { subset: "Youthquake", number: "YQ-3", name: "Stephon Castle", team: "San Antonio Spurs" },
  { subset: "Youthquake", number: "YQ-4", name: "Ron Holland II", team: "Detroit Pistons" },
  { subset: "Youthquake", number: "YQ-5", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { subset: "Youthquake", number: "YQ-6", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { subset: "Youthquake", number: "YQ-7", name: "Zach Edey", team: "Memphis Grizzlies" },
  { subset: "Youthquake", number: "YQ-8", name: "Cody Williams", team: "Utah Jazz" },
  { subset: "Youthquake", number: "YQ-9", name: "Nikola Topić", team: "Oklahoma City Thunder" },
  { subset: "Youthquake", number: "YQ-10", name: "Devin Carter", team: "Sacramento Kings" },
  { subset: "Youthquake", number: "YQ-11", name: "Kel'el Ware", team: "Miami Heat" },
  { subset: "Youthquake", number: "YQ-12", name: "Tristan da Silva", team: "Orlando Magic" },
  { subset: "Youthquake", number: "YQ-13", name: "Jaylon Tyson", team: "Cleveland Cavaliers" },
  { subset: "Youthquake", number: "YQ-14", name: "Bronny James Jr.", team: "Los Angeles Lakers" },
  { subset: "Youthquake", number: "YQ-15", name: "DaRon Holmes II", team: "Denver Nuggets" },
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log(
    `Seeding: ${SET_NAME} (${BASE_CARDS.length} base + ${AUTO_CARDS.length} autos + ${INSERT_CARDS.length} inserts)`
  );

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("NBA", universeId);
  const brandId = await builder.getOrCreateBrand("Topps Chrome", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Topps Chrome Basketball 2024-25", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: BASE_CARDS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const existing = await prisma.card.findMany({ where: { setId: set.id }, select: { id: true } });
  const existingIds = new Set(existing.map((c) => c.id));

  let created = 0;
  let skipped = 0;
  let variants = 0;
  const t0 = Date.now();

  // ---- Base parallel lookup, up-front ----
  const baseParallelIds: Record<string, string> = {};
  for (const name of BASE_PARALLELS) baseParallelIds[name] = await builder.getOrCreateParallel(name);

  // ---- Base set ----
  for (const [i, row] of BASE_CARDS.entries()) {
    const cardId = `${SET_ID}-${row.number}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const personId = await builder.getOrCreatePerson(row.name);
    const teamId = await builder.getOrCreateTeam(row.team);

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: "Player",
        persons: { connect: { id: personId } },
        teams: { connect: { id: teamId } },
      },
    });
    existingIds.add(cardId);

    const variantData = [
      { cardId, printingId: basePrintingId },
      ...BASE_PARALLELS.map((name) => ({ cardId, printingId: basePrintingId, parallelId: baseParallelIds[name] })),
    ];
    await prisma.variant.createMany({ data: variantData });
    variants += variantData.length;

    created++;
    if ((i + 1) % 50 === 0) {
      console.log(`  base [${i + 1}/${BASE_CARDS.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }
  console.log(`Base set done. Created ${created} cards, skipped ${skipped}.`);

  // ---- Subset parallel lookup, up-front ----
  const subsetParallelIds = new Map<string, Map<string, string>>();
  for (const [subset, names] of Object.entries(SUBSET_PARALLELS)) {
    const inner = new Map<string, string>();
    for (const name of names) inner.set(name, await builder.getOrCreateParallel(name));
    subsetParallelIds.set(subset, inner);
  }

  // ---- Autographs + Inserts (same shape, both SubsetRow[]) ----
  const allSubsetRows = [...AUTO_CARDS, ...INSERT_CARDS];
  for (const [i, row] of allSubsetRows.entries()) {
    const cardId = `${SET_ID}-${slug(row.subset)}-${slug(row.number)}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const personId = await builder.getOrCreatePerson(row.name);
    const teamId = row.team ? await builder.getOrCreateTeam(row.team) : null;
    const insertId = await builder.getOrCreateInsert(row.subset, set.id);

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: row.subset,
        persons: { connect: { id: personId } },
        teams: teamId ? { connect: { id: teamId } } : undefined,
      },
    });
    existingIds.add(cardId);

    const variantData: any[] = [
      { cardId, printingId: basePrintingId, insertId, isAuto: row.auto ?? false },
    ];
    const inner = subsetParallelIds.get(row.subset);
    const names = SUBSET_PARALLELS[row.subset] ?? [];
    if (inner) {
      for (const name of names) {
        variantData.push({
          cardId,
          printingId: basePrintingId,
          insertId,
          parallelId: inner.get(name)!,
          isAuto: row.auto ?? false,
        });
      }
    }
    await prisma.variant.createMany({ data: variantData });
    variants += variantData.length;

    created++;
    if ((i + 1) % 100 === 0) {
      console.log(
        `  autos+inserts [${i + 1}/${allSubsetRows.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    }
  }

  console.log(
    `Done. Created ${created} cards, skipped ${skipped}, ${variants} variants. Set: ${SET_NAME} (${set.id}) — ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
