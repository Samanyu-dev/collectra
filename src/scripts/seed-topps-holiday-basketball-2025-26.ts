import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

/**
 * Seeds the 2025-26 Topps Holiday Basketball checklist — user-pasted in full
 * (2026-08-07), transcribed here section by section. Filed under the
 * existing "NBA" franchise / "Topps" manufacturer (both already in the DB
 * from the 2024-25 Topps Chrome Basketball set), not a new "Basketball"
 * label, per explicit instruction.
 *
 * Data-only pass — no images, no Product/Pack/PossiblePull odds population
 * (this checklist gives only pack odds like "1:2 packs", never a serial
 * print run, so — same convention as seed-topps-chrome-basketball-2024-25.ts
 * — no parallel here carries a serialTo; the odds themselves aren't modeled
 * on Variant. Populating the Product/Pack odds graph is a natural follow-up
 * phase, not attempted in this pass).
 *
 * Structure (655 total cards):
 *  - Base Set (200, "H1"-"H200"): H161-H200 are the Rookie Class, flagged
 *    via Card.subtypes = "Rookie" (schema's own documented example value).
 *    14-name unnumbered parallel ladder applied to every base card.
 *  - Base SSP Photo Variations (25) / SSP Back Variations (25): each row is
 *    its own catalogued short-print card (own alpha code), not a parallel
 *    of an existing base row — modeled as their own Insert-like subset, no
 *    further parallel ladder (none printed for these two subsets).
 *  - Autographs (96, "BCA-"): isAuto=true, 4-tier Glitter ladder.
 *  - Player Relics (100, "PR-"): isRelic=true, 5-tier ladder.
 *  - Dual Player Relics (25, "DPR-"): isRelic=true, two Persons + up to two
 *    Teams per card (parsed from "PlayerA, TeamA/PlayerB, TeamB"), 3-tier
 *    ladder.
 *  - Player Holiday-Shaped Relics (24, "HSR-") / Holiday Relics (40, "HR-"):
 *    isRelic=true, same 3-tier ladder as Dual Player Relics.
 *  - Inserts (120 across 5 subsets: Frostbite Finishers, Hidden Elf, Making
 *    The Nice List, Evergreen, Oversized Die-Cut Ornaments): no parallels
 *    printed for any of these five.
 *
 * Judgment calls:
 *  - Four duplicate autograph codes exist in the real source text itself —
 *    "BCA-CW" (Jalen Wilson AND Cody Williams), "BCA-JW" (Jarace Walker AND
 *    Jaylen Wells), "BCA-RH" (Ron Holland II AND Rui Hachimura), "BCA-TS"
 *    (Tidjane Salaün AND Thomas Sorber). Two real, distinct players can't
 *    share one printed autograph code — rather than silently dropping the
 *    second occurrence (this codebase's usual "skip if id already exists"
 *    idempotency check would do exactly that), the driver below detects an
 *    in-run collision and suffixes the card id (not the printed number) so
 *    both real rows survive. See handleCollision().
 *  - "Washinton Wizards" (BCA-JP) normalized to "Washington Wizards" — an
 *    obvious typo of a team spelled correctly everywhere else in this same
 *    checklist, not a real alternate-name convention worth preserving.
 *  - "Stocking Stuff Metallic Stocking" (one of the 14 base parallels)
 *    normalized to "Stocking Stuffer Metallic Stocking" — same reasoning,
 *    it's the only one of five "Stocking Stuffer Metallic ___" parallels
 *    missing the "-er".
 *  - "FF-KD Kevin Durant, Phoenix Suns" — preserved exactly as printed, even
 *    though every other Durant row in this same checklist (base H125, EV-JM
 *    is a different player) says Houston Rockets. Likely a real source
 *    error, but per this codebase's established convention (see the Chrome
 *    Basketball script's own header) checklist text is transcribed
 *    verbatim, not silently corrected against outside knowledge.
 *  - "BCA-RF Rasheer Flemming" (double-m) vs the base/insert spelling
 *    "Rasheer Fleming" elsewhere — preserved verbatim, same reasoning.
 *
 * Card id scheme:
 *   Base:            `${SET_ID}-${number}`                 (number already "H1".."H200")
 *   Everything else: `${SET_ID}-${subsetSlug}-${numberSlug}` (suffixed -b/-c/... on a genuine in-source code collision)
 */
const SET_ID = "topps-holiday-basketball-2025-26";
const SET_NAME = "Topps Holiday Basketball 2025-26";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

interface BaseRow {
  number: string;
  name: string;
  team: string;
  rc?: boolean;
}

interface SubsetRow {
  number: string;
  name: string;
  team: string;
}

interface DualRow {
  number: string;
  nameA: string;
  teamA: string;
  nameB: string;
  teamB: string;
}

// ---------------------------------------------------------------------------
// BASE SET (200 cards, H1-H200; H161-H200 = Rookie Class)
// ---------------------------------------------------------------------------
const BASE_CARDS: BaseRow[] = [
  { number: "H1", name: "Jayson Tatum", team: "Boston Celtics" },
  { number: "H2", name: "Jaylen Brown", team: "Boston Celtics" },
  { number: "H3", name: "Kristaps Porzingis", team: "Boston Celtics" },
  { number: "H4", name: "Payton Pritchard", team: "Boston Celtics" },
  { number: "H5", name: "Baylor Scheierman", team: "Boston Celtics" },
  { number: "H6", name: "Derrick White", team: "Boston Celtics" },
  { number: "H7", name: "D’Angelo Russell", team: "Brooklyn Nets" },
  { number: "H8", name: "Ziaire Williams", team: "Brooklyn Nets" },
  { number: "H9", name: "Nic Claxton", team: "Brooklyn Nets" },
  { number: "H10", name: "Cam Thomas", team: "Brooklyn Nets" },
  { number: "H11", name: "Jalen Wilson", team: "Brooklyn Nets" },
  { number: "H12", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "H13", name: "OG Anunoby", team: "New York Knicks" },
  { number: "H14", name: "Josh Hart", team: "New York Knicks" },
  { number: "H15", name: "Miles McBride", team: "New York Knicks" },
  { number: "H16", name: "Karl-Anthony Towns", team: "New York Knicks" },
  { number: "H17", name: "Tyrese Maxey", team: "Philadelphia 76ers" },
  { number: "H18", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { number: "H19", name: "Paul George", team: "Philadelphia 76ers" },
  { number: "H20", name: "Jared McCain", team: "Philadelphia 76ers" },
  { number: "H21", name: "Quentin Grimes", team: "Philadelphia 76ers" },
  { number: "H22", name: "Gradey Dick", team: "Toronto Raptors" },
  { number: "H23", name: "Jonathan Mogbo", team: "Toronto Raptors" },
  { number: "H24", name: "Brandon Ingram", team: "Toronto Raptors" },
  { number: "H25", name: "Scottie Barnes", team: "Toronto Raptors" },
  { number: "H26", name: "Immanuel Quickley", team: "Toronto Raptors" },
  { number: "H27", name: "Coby White", team: "Chicago Bulls" },
  { number: "H28", name: "Josh Giddey", team: "Chicago Bulls" },
  { number: "H29", name: "Nikola Vučević", team: "Chicago Bulls" },
  { number: "H30", name: "Matas Buzelis", team: "Chicago Bulls" },
  { number: "H31", name: "Patrick Williams", team: "Chicago Bulls" },
  { number: "H32", name: "Cade Cunningham", team: "Detroit Pistons" },
  { number: "H33", name: "Jalen Duren", team: "Detroit Pistons" },
  { number: "H34", name: "Ron Holland II", team: "Detroit Pistons" },
  { number: "H35", name: "Malik Beasley", team: "Detroit Pistons" },
  { number: "H36", name: "Ausar Thompson", team: "Detroit Pistons" },
  { number: "H37", name: "Jaden Ivey", team: "Detroit Pistons" },
  { number: "H38", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { number: "H39", name: "Bennedict Mathurin", team: "Indiana Pacers" },
  { number: "H40", name: "Myles Turner", team: "Indiana Pacers" },
  { number: "H41", name: "Jarace Walker", team: "Indiana Pacers" },
  { number: "H42", name: "Andrew Nembhard", team: "Indiana Pacers" },
  { number: "H43", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { number: "H44", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { number: "H45", name: "Kyle Kuzma", team: "Milwaukee Bucks" },
  { number: "H46", name: "AJ Green", team: "Milwaukee Bucks" },
  { number: "H47", name: "Brook Lopez", team: "Milwaukee Bucks" },
  { number: "H48", name: "Trae Young", team: "Atlanta Hawks" },
  { number: "H49", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { number: "H50", name: "Clint Capela", team: "Atlanta Hawks" },
  { number: "H51", name: "Dyson Daniels", team: "Atlanta Hawks" },
  { number: "H52", name: "Jalen Johnson", team: "Atlanta Hawks" },
  { number: "H53", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "H54", name: "Brandon Miller", team: "Charlotte Hornets" },
  { number: "H55", name: "Miles Bridges", team: "Charlotte Hornets" },
  { number: "H56", name: "Nick Smith Jr.", team: "Charlotte Hornets" },
  { number: "H57", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { number: "H58", name: "Tyler Herro", team: "Miami Heat" },
  { number: "H59", name: "Kel’el Ware", team: "Miami Heat" },
  { number: "H60", name: "Bam Adebayo", team: "Miami Heat" },
  { number: "H61", name: "Nikola Jović", team: "Miami Heat" },
  { number: "H62", name: "Andrew Wiggins", team: "Miami Heat" },
  { number: "H63", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { number: "H64", name: "Darius Garland", team: "Cleveland Cavaliers" },
  { number: "H65", name: "Evan Mobley", team: "Cleveland Cavaliers" },
  { number: "H66", name: "Ty Jerome", team: "Cleveland Cavaliers" },
  { number: "H67", name: "Max Strus", team: "Cleveland Cavaliers" },
  { number: "H68", name: "Paolo Banchero", team: "Orlando Magic" },
  { number: "H69", name: "Franz Wagner", team: "Orlando Magic" },
  { number: "H70", name: "Anthony Black", team: "Orlando Magic" },
  { number: "H71", name: "Wendell Carter Jr.", team: "Orlando Magic" },
  { number: "H72", name: "Jalen Suggs", team: "Orlando Magic" },
  { number: "H73", name: "Jordan Poole", team: "Washington Wizards" },
  { number: "H74", name: "Bilal Coulibaly", team: "Washington Wizards" },
  { number: "H75", name: "Alex Sarr", team: "Washington Wizards" },
  { number: "H76", name: "Bub Carrington", team: "Washington Wizards" },
  { number: "H77", name: "Kyshawn George", team: "Washington Wizards" },
  { number: "H78", name: "Nikola Jokić", team: "Denver Nuggets" },
  { number: "H79", name: "Christian Braun", team: "Denver Nuggets" },
  { number: "H80", name: "Jamal Murray", team: "Denver Nuggets" },
  { number: "H81", name: "Russell Westbrook", team: "Denver Nuggets" },
  { number: "H82", name: "Michael Porter Jr.", team: "Denver Nuggets" },
  { number: "H83", name: "Peyton Watson", team: "Denver Nuggets" },
  { number: "H84", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { number: "H85", name: "Naz Reid", team: "Minnesota Timberwolves" },
  { number: "H86", name: "Julius Randle", team: "Minnesota Timberwolves" },
  { number: "H87", name: "Rudy Gobert", team: "Minnesota Timberwolves" },
  { number: "H88", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves" },
  { number: "H89", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { number: "H90", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder" },
  { number: "H91", name: "Jalen Williams", team: "Oklahoma City Thunder" },
  { number: "H92", name: "Luguentz Dort", team: "Oklahoma City Thunder" },
  { number: "H93", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { number: "H94", name: "Cason Wallace", team: "Oklahoma City Thunder" },
  { number: "H95", name: "Isaiah Hartenstein", team: "Oklahoma City Thunder" },
  { number: "H96", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { number: "H97", name: "Anfernee Simons", team: "Portland Trail Blazers" },
  { number: "H98", name: "Shaedon Sharpe", team: "Portland Trail Blazers" },
  { number: "H99", name: "Deni Avdija", team: "Portland Trail Blazers" },
  { number: "H100", name: "Donovan Clingan", team: "Portland Trail Blazers" },
  { number: "H101", name: "Lauri Markkanen", team: "Utah Jazz" },
  { number: "H102", name: "Cody Williams", team: "Utah Jazz" },
  { number: "H103", name: "Keyonte George", team: "Utah Jazz" },
  { number: "H104", name: "Kyle Filipowski", team: "Utah Jazz" },
  { number: "H105", name: "Isaiah Collier", team: "Utah Jazz" },
  { number: "H106", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "H107", name: "Jimmy Butler III", team: "Golden State Warriors" },
  { number: "H108", name: "Draymond Green", team: "Golden State Warriors" },
  { number: "H109", name: "Jonathan Kuminga", team: "Golden State Warriors" },
  { number: "H110", name: "Quinten Post", team: "Golden State Warriors" },
  { number: "H111", name: "Moses Moody", team: "Golden State Warriors" },
  { number: "H112", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { number: "H113", name: "James Harden", team: "Los Angeles Clippers" },
  { number: "H114", name: "Norman Powell", team: "Los Angeles Clippers" },
  { number: "H115", name: "Ivica Zubac", team: "Los Angeles Clippers" },
  { number: "H116", name: "Nicolas Batum", team: "Los Angeles Clippers" },
  { number: "H117", name: "Derrick Jones Jr.", team: "Los Angeles Clippers" },
  { number: "H118", name: "Dorian Finney-Smith", team: "Los Angeles Lakers" },
  { number: "H119", name: "LeBron James", team: "Los Angeles Lakers" },
  { number: "H120", name: "Austin Reaves", team: "Los Angeles Lakers" },
  { number: "H121", name: "Bronny James Jr.", team: "Los Angeles Lakers" },
  { number: "H122", name: "Dalton Knecht", team: "Los Angeles Lakers" },
  { number: "H123", name: "Rui Hachimura", team: "Los Angeles Lakers" },
  { number: "H124", name: "Devin Booker", team: "Phoenix Suns" },
  { number: "H125", name: "Kevin Durant", team: "Houston Rockets" },
  { number: "H126", name: "Bradley Beal", team: "Phoenix Suns" },
  { number: "H127", name: "Ryan Dunn", team: "Phoenix Suns" },
  { number: "H128", name: "Oso Ighodaro", team: "Phoenix Suns" },
  { number: "H129", name: "DeMar DeRozan", team: "Sacramento Kings" },
  { number: "H130", name: "Zach LaVine", team: "Sacramento Kings" },
  { number: "H131", name: "Malik Monk", team: "Sacramento Kings" },
  { number: "H132", name: "Devin Carter", team: "Sacramento Kings" },
  { number: "H133", name: "Keegan Murray", team: "Sacramento Kings" },
  { number: "H134", name: "Domantas Sabonis", team: "Sacramento Kings" },
  { number: "H135", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { number: "H136", name: "Anthony Davis", team: "Dallas Mavericks" },
  { number: "H137", name: "Klay Thompson", team: "Dallas Mavericks" },
  { number: "H138", name: "Brandon Williams", team: "Dallas Mavericks" },
  { number: "H139", name: "Dereck Lively II", team: "Dallas Mavericks" },
  { number: "H140", name: "Jalen Green", team: "Houston Rockets" },
  { number: "H141", name: "Amen Thompson", team: "Houston Rockets" },
  { number: "H142", name: "Jabari Smith Jr.", team: "Houston Rockets" },
  { number: "H143", name: "Reed Sheppard", team: "Houston Rockets" },
  { number: "H144", name: "Tari Eason", team: "Houston Rockets" },
  { number: "H145", name: "Alperen Sengun", team: "Houston Rockets" },
  { number: "H146", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "H147", name: "Jaylen Wells", team: "Memphis Grizzlies" },
  { number: "H148", name: "Jaren Jackson Jr.", team: "Memphis Grizzlies" },
  { number: "H149", name: "Desmond Bane", team: "Memphis Grizzlies" },
  { number: "H150", name: "Zach Edey", team: "Memphis Grizzlies" },
  { number: "H151", name: "Jordan Hawkins", team: "New Orleans Pelicans" },
  { number: "H152", name: "Trey Murphy III", team: "New Orleans Pelicans" },
  { number: "H153", name: "Yves Missi", team: "New Orleans Pelicans" },
  { number: "H154", name: "Dejounte Murray", team: "New Orleans Pelicans" },
  { number: "H155", name: "CJ McCollum", team: "New Orleans Pelicans" },
  { number: "H156", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { number: "H157", name: "De’Aaron Fox", team: "San Antonio Spurs" },
  { number: "H158", name: "Stephon Castle", team: "San Antonio Spurs" },
  { number: "H159", name: "Chris Paul", team: "San Antonio Spurs" },
  { number: "H160", name: "Jeremy Sochan", team: "San Antonio Spurs" },
  { number: "H161", name: "Cooper Flagg", team: "Dallas Mavericks", rc: true },
  { number: "H162", name: "Dylan Harper", team: "San Antonio Spurs", rc: true },
  { number: "H163", name: "VJ Edgecombe", team: "Philadelphia 76ers", rc: true },
  { number: "H164", name: "Kon Knueppel", team: "Charlotte Hornets", rc: true },
  { number: "H165", name: "Ace Bailey", team: "Utah Jazz", rc: true },
  { number: "H166", name: "Tre Johnson III", team: "Washington Wizards", rc: true },
  { number: "H167", name: "Jeremiah Fears", team: "New Orleans Pelicans", rc: true },
  { number: "H168", name: "Egor Dëmin", team: "Brooklyn Nets", rc: true },
  { number: "H169", name: "Collin Murray-Boyles", team: "Toronto Raptors", rc: true },
  { number: "H170", name: "Khaman Maluach", team: "Phoenix Suns", rc: true },
  { number: "H171", name: "Cedric Coward", team: "Memphis Grizzlies", rc: true },
  { number: "H172", name: "Noa Essengue", team: "Chicago Bulls", rc: true },
  { number: "H173", name: "Derik Queen", team: "New Orleans Pelicans", rc: true },
  { number: "H174", name: "Carter Bryant", team: "San Antonio Spurs", rc: true },
  { number: "H175", name: "Thomas Sorber", team: "Oklahoma City Thunder", rc: true },
  { number: "H176", name: "Yang Hansen", team: "Portland Trail Blazers", rc: true },
  { number: "H177", name: "Joan Beringer", team: "Minnesota Timberwolves", rc: true },
  { number: "H178", name: "Walter Clayton Jr.", team: "Utah Jazz", rc: true },
  { number: "H179", name: "Nolan Traore", team: "Brooklyn Nets", rc: true },
  { number: "H180", name: "Kasparas Jakučionis", team: "Miami Heat", rc: true },
  { number: "H181", name: "Will Riley", team: "Washington Wizards", rc: true },
  { number: "H182", name: "Drake Powell", team: "Brooklyn Nets", rc: true },
  { number: "H183", name: "Asa Newell", team: "Atlanta Hawks", rc: true },
  { number: "H184", name: "Nique Clifford", team: "Sacramento Kings", rc: true },
  { number: "H185", name: "Jase Richardson", team: "Orlando Magic", rc: true },
  { number: "H186", name: "Ben Saraf", team: "Brooklyn Nets", rc: true },
  { number: "H187", name: "Danny Wolf", team: "Brooklyn Nets", rc: true },
  { number: "H188", name: "Hugo Gonzáles", team: "Boston Celtics", rc: true },
  { number: "H189", name: "Liam McNeeley", team: "Charlotte Hornets", rc: true },
  { number: "H190", name: "Yanic Konan-Niederhäuser", team: "Los Angeles Clippers", rc: true },
  { number: "H191", name: "Rasheer Fleming", team: "Phoenix Suns", rc: true },
  { number: "H192", name: "Noah Penda", team: "Orlando Magic", rc: true },
  { number: "H193", name: "Sion James", team: "Charlotte Hornets", rc: true },
  { number: "H194", name: "Ryan Kalkbrenner", team: "Charlotte Hornets", rc: true },
  { number: "H195", name: "Johni Broome", team: "Philadelphia 76ers", rc: true },
  { number: "H196", name: "Adou Thiero", team: "Los Angeles Lakers", rc: true },
  { number: "H197", name: "Chaz Lanier", team: "Detroit Pistons", rc: true },
  { number: "H198", name: "Kam Jones", team: "Indiana Pacers", rc: true },
  { number: "H199", name: "Alijah Martin", team: "Toronto Raptors", rc: true },
  { number: "H200", name: "Tyrese Proctor", team: "Cleveland Cavaliers", rc: true },
];

const BASE_PARALLELS: string[] = [
  "Plaid",
  "Glitter Holiday",
  "Blue Metallic Glitter Holiday",
  "Light Blue and White Glitter Holiday",
  "Purple Glitter Holiday",
  "Orange Metallic Glitter Holiday",
  "Red Metallic Glitter Holiday",
  "Stocking Stuffer Metallic Santa Bag",
  "Stocking Stuffer Metallic Candy Cane",
  "Stocking Stuffer Metallic Ornament",
  "Stocking Stuffer Metallic Stocking",
  "Stocking Stuffer Metallic Holly",
  "Green Glitter Holiday",
  "Golden Glitter Holiday",
];

// ---------------------------------------------------------------------------
// BASE - SSP PHOTO / BACK VARIATIONS (25 + 25, no parallels)
// ---------------------------------------------------------------------------
const SSP_PHOTO: SubsetRow[] = [
  { number: "SSV-AE", name: "James Harden", team: "Los Angeles Clippers" },
  { number: "SSV-AT", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { number: "SSV-CB", name: "Carter Bryant", team: "San Antonio Spurs" },
  { number: "SSV-CC", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { number: "SSV-CO", name: "Cedric Coward", team: "Memphis Grizzlies" },
  { number: "SSV-DM", name: "Jalen Williams", team: "Oklahoma City Thunder" },
  { number: "SSV-DQ", name: "Derik Queen", team: "New Orleans Pelicans" },
  { number: "SSV-FW", name: "Franz Wagner", team: "Orlando Magic" },
  { number: "SSV-GA", name: "Alex Sarr", team: "Washington Wizards" },
  { number: "SSV-JB", name: "Joan Beringer", team: "Minnesota Timberwolves" },
  { number: "SSV-JM", name: "Kevin Durant", team: "Houston Rockets" },
  { number: "SSV-JT", name: "Jaylen Brown", team: "Boston Celtics" },
  { number: "SSV-KJ", name: "Kasparas Jakučionis", team: "Miami Heat" },
  { number: "SSV-LB", name: "Nikola Jokić", team: "Denver Nuggets" },
  { number: "SSV-LBJ", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { number: "SSV-NE", name: "Noa Essengue", team: "Chicago Bulls" },
  { number: "SSV-NJ", name: "Jimmy Butler III", team: "Golden State Warriors" },
  { number: "SSV-NT", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "SSV-SA", name: "Stephon Castle", team: "San Antonio Spurs" },
  { number: "SSV-SC", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "SSV-TM", name: "Tyler Herro", team: "Miami Heat" },
  { number: "SSV-TS", name: "Thomas Sorber", team: "Oklahoma City Thunder" },
  { number: "SSV-VW", name: "Trae Young", team: "Atlanta Hawks" },
  { number: "SSV-WC", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "SSV-YH", name: "Yang Hansen", team: "Portland Trail Blazers" },
];

const SSP_BACK: SubsetRow[] = [
  { number: "SSB-AB", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "SSB-AE", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { number: "SSB-AT", name: "Amen Thompson", team: "Houston Rockets" },
  { number: "SSB-CC", name: "Cade Cunningham", team: "Detroit Pistons" },
  { number: "SSB-CF", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "SSB-CM", name: "Collin Murray-Boyles", team: "Toronto Raptors" },
  { number: "SSB-DB", name: "Devin Booker", team: "Phoenix Suns" },
  { number: "SSB-DH", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "SSB-DM", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { number: "SSB-ED", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "SSB-GA", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { number: "SSB-JB", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "SSB-JF", name: "Jeremiah Fears", team: "New Orleans Pelicans" },
  { number: "SSB-JM", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "SSB-JT", name: "Jayson Tatum", team: "Boston Celtics" },
  { number: "SSB-KK", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "SSB-KM", name: "Khaman Maluach", team: "Phoenix Suns" },
  { number: "SSB-LB", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "SSB-LBJ", name: "LeBron James", team: "Los Angeles Lakers" },
  { number: "SSB-PB", name: "Paolo Banchero", team: "Orlando Magic" },
  { number: "SSB-SC", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "SSB-SGA", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder" },
  { number: "SSB-TJ", name: "Tre Johnson III", team: "Washington Wizards" },
  { number: "SSB-VE", name: "VJ Edgecombe", team: "Philadelphia 76ers" },
  { number: "SSB-VW", name: "Victor Wembanyama", team: "San Antonio Spurs" },
];

// ---------------------------------------------------------------------------
// AUTOGRAPHS (96, "BCA-", isAuto)
// ---------------------------------------------------------------------------
const AUTO_PARALLELS = ["Glitter", "Red Glitter", "Green Glitter", "Golden Glitter"];
const AUTO_CARDS: SubsetRow[] = [
  { number: "BCA-ABL", name: "Anthony Black", team: "Orlando Magic" },
  { number: "BCA-AN", name: "Andrew Nembhard", team: "Indiana Pacers" },
  { number: "BCA-AS", name: "Alex Sarr", team: "Washington Wizards" },
  { number: "BCA-AW", name: "Andrew Wiggins", team: "Miami Heat" },
  { number: "BCA-BS", name: "Baylor Scheierman", team: "Boston Celtics" },
  { number: "BCA-CB", name: "Christian Braun", team: "Denver Nuggets" },
  { number: "BCA-CH", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { number: "BCA-CW", name: "Jalen Wilson", team: "Brooklyn Nets" },
  { number: "BCA-DR", name: "D’Angelo Russell", team: "Brooklyn Nets" },
  { number: "BCA-FW", name: "Franz Wagner", team: "Orlando Magic" },
  { number: "BCA-GD", name: "Gradey Dick", team: "Toronto Raptors" },
  { number: "BCA-IM", name: "Immanuel Quickley", team: "Toronto Raptors" },
  { number: "BCA-JB", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "BCA-JHR", name: "Josh Hart", team: "New York Knicks" },
  { number: "BCA-JM", name: "Jamal Murray", team: "Denver Nuggets" },
  { number: "BCA-JP", name: "Jordan Poole", team: "Washington Wizards" },
  { number: "BCA-JT", name: "Jayson Tatum", team: "Boston Celtics" },
  { number: "BCA-JW", name: "Jarace Walker", team: "Indiana Pacers" },
  { number: "BCA-KAT", name: "Karl-Anthony Towns", team: "New York Knicks" },
  { number: "BCA-KG", name: "Kyshawn George", team: "Washington Wizards" },
  { number: "BCA-KK", name: "Kyle Kuzma", team: "Milwaukee Bucks" },
  { number: "BCA-KP", name: "Kristaps Porzingis", team: "Boston Celtics" },
  { number: "BCA-KW", name: "Kel’el Ware", team: "Miami Heat" },
  { number: "BCA-MT", name: "Myles Turner", team: "Indiana Pacers" },
  { number: "BCA-NC", name: "Nic Claxton", team: "Brooklyn Nets" },
  { number: "BCA-NM", name: "Nick Smith Jr.", team: "Charlotte Hornets" },
  { number: "BCA-PB", name: "Paolo Banchero", team: "Orlando Magic" },
  { number: "BCA-PP", name: "Payton Pritchard", team: "Boston Celtics" },
  { number: "BCA-RD", name: "Rob Dillingham", team: "Minnesota Timberwolves" },
  { number: "BCA-RH", name: "Ron Holland II", team: "Detroit Pistons" },
  { number: "BCA-SH", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { number: "BCA-TH", name: "Tyler Herro", team: "Miami Heat" },
  { number: "BCA-THA", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { number: "BCA-TS", name: "Tidjane Salaün", team: "Charlotte Hornets" },
  { number: "BCA-TSJ", name: "Terrence Shannon Jr.", team: "Minnesota Timberwolves" },
  { number: "BCA-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
  { number: "BCA-OA", name: "OG Anunoby", team: "New York Knicks" },
  { number: "BCA-MS", name: "Max Strus", team: "Cleveland Cavaliers" },
  { number: "BCA-AI", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "BCA-AL", name: "Asa Newell", team: "Atlanta Hawks" },
  { number: "BCA-AM", name: "Alijah Martin", team: "Toronto Raptors" },
  { number: "BCA-AT", name: "Adou Thiero", team: "Los Angeles Lakers" },
  { number: "BCA-BA", name: "Ben Saraf", team: "Brooklyn Nets" },
  { number: "BCA-BB", name: "Bradley Beal", team: "Phoenix Suns" },
  { number: "BCA-BM", name: "Tyrese Proctor", team: "Cleveland Cavaliers" },
  { number: "BCA-CA", name: "Chaz Lanier", team: "Detroit Pistons" },
  { number: "BCA-CF", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "BCA-CJM", name: "CJ McCollum", team: "New Orleans Pelicans" },
  { number: "BCA-CMB", name: "Collin Murray-Boyles", team: "Toronto Raptors" },
  { number: "BCA-CO", name: "Cedric Coward", team: "Memphis Grizzlies" },
  { number: "BCA-CW", name: "Cody Williams", team: "Utah Jazz" },
  { number: "BCA-DA", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "BCA-DAF", name: "De’Aaron Fox", team: "San Antonio Spurs" },
  { number: "BCA-DB", name: "Desmond Bane", team: "Memphis Grizzlies" },
  { number: "BCA-DC", name: "Devin Carter", team: "Sacramento Kings" },
  { number: "BCA-DL", name: "Dereck Lively II", team: "Dallas Mavericks" },
  { number: "BCA-DP", name: "Drake Powell", team: "Brooklyn Nets" },
  { number: "BCA-DQ", name: "Derik Queen", team: "New Orleans Pelicans" },
  { number: "BCA-DW", name: "Danny Wolf", team: "Brooklyn Nets" },
  { number: "BCA-ED", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "BCA-IC", name: "Isaiah Collier", team: "Utah Jazz" },
  { number: "BCA-JE", name: "Joan Beringer", team: "Minnesota Timberwolves" },
  { number: "BCA-JG", name: "Jalen Green", team: "Houston Rockets" },
  { number: "BCA-JH", name: "James Harden", team: "Los Angeles Clippers" },
  { number: "BCA-JI", name: "Jase Richardson", team: "Orlando Magic" },
  { number: "BCA-JO", name: "Johni Broome", team: "Philadelphia 76ers" },
  { number: "BCA-JS", name: "Jeremy Sochan", team: "San Antonio Spurs" },
  { number: "BCA-JW", name: "Jaylen Wells", team: "Memphis Grizzlies" },
  { number: "BCA-KF", name: "Kyle Filipowski", team: "Utah Jazz" },
  { number: "BCA-KJ", name: "Kasparas Jakučionis", team: "Miami Heat" },
  { number: "BCA-KL", name: "Khaman Maluach", team: "Phoenix Suns" },
  { number: "BCA-KO", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "BCA-KS", name: "Kam Jones", team: "Indiana Pacers" },
  { number: "BCA-LC", name: "Liam McNeeley", team: "Charlotte Hornets" },
  { number: "BCA-LM", name: "Lauri Markkanen", team: "Utah Jazz" },
  { number: "BCA-NE", name: "Noa Essengue", team: "Chicago Bulls" },
  { number: "BCA-NL", name: "Nique Clifford", team: "Sacramento Kings" },
  { number: "BCA-NP", name: "Noah Penda", team: "Orlando Magic" },
  { number: "BCA-NT", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "BCA-QP", name: "Quinten Post", team: "Golden State Warriors" },
  { number: "BCA-RDU", name: "Ryan Dunn", team: "Phoenix Suns" },
  { number: "BCA-RF", name: "Rasheer Flemming", team: "Phoenix Suns" },
  { number: "BCA-RH", name: "Rui Hachimura", team: "Los Angeles Lakers" },
  { number: "BCA-RK", name: "Ryan Kalkbrenner", team: "Charlotte Hornets" },
  { number: "BCA-SC", name: "Stephon Castle", team: "San Antonio Spurs" },
  { number: "BCA-SCU", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "BCA-SJ", name: "Sion James", team: "Charlotte Hornets" },
  { number: "BCA-TS", name: "Thomas Sorber", team: "Oklahoma City Thunder" },
  { number: "BCA-VW", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { number: "BCA-WC", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "BCA-WR", name: "Will Riley", team: "Washington Wizards" },
  { number: "BCA-YH", name: "Yang Hansen", team: "Portland Trail Blazers" },
  { number: "BCA-YK", name: "Yanic Konan-Niederhäuser", team: "Los Angeles Clippers" },
  { number: "BCA-ZE", name: "Zach Edey", team: "Memphis Grizzlies" },
  { number: "BCA-ZL", name: "Zach LaVine", team: "Sacramento Kings" },
  { number: "BCA-JJ", name: "Jaren Jackson Jr.", team: "Memphis Grizzlies" },
];

// ---------------------------------------------------------------------------
// RELICS
// ---------------------------------------------------------------------------
const PLAYER_RELIC_PARALLELS = ["Blue Metallic Glitter", "Purple Metallic Glitter", "Glitter", "Red Glitter", "Golden Glitter"];
const PLAYER_RELIC_CARDS: SubsetRow[] = [
  { number: "PR-AB", name: "Anthony Black", team: "Orlando Magic" },
  { number: "PR-AG", name: "Aaron Gordon", team: "Denver Nuggets" },
  { number: "PR-AI", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "PR-AM", name: "Alijah Martin", team: "Toronto Raptors" },
  { number: "PR-AN", name: "Asa Newell", team: "Atlanta Hawks" },
  { number: "PR-AR", name: "Adou Thiero", team: "Los Angeles Lakers" },
  { number: "PR-AT", name: "Ausar Thompson", team: "Detroit Pistons" },
  { number: "PR-BA", name: "Brooks Barnhizer", team: "Oklahoma City Thunder" },
  { number: "PR-BB", name: "Bradley Beal", team: "Phoenix Suns" },
  { number: "PR-BC", name: "Bilal Coulibaly", team: "Washington Wizards" },
  { number: "PR-BL", name: "Brook Lopez", team: "Milwaukee Bucks" },
  { number: "PR-BM", name: "Brandon Miller", team: "Charlotte Hornets" },
  { number: "PR-BMA", name: "Bennedict Mathurin", team: "Indiana Pacers" },
  { number: "PR-BP", name: "Brandin Podziemski", team: "Golden State Warriors" },
  { number: "PR-BS", name: "Ben Saraf", team: "Brooklyn Nets" },
  { number: "PR-CB", name: "Collin Murray-Boyles", team: "Toronto Raptors" },
  { number: "PR-CC", name: "Clint Capela", team: "Atlanta Hawks" },
  { number: "PR-CF", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "PR-CJ", name: "Cameron Johnson", team: "Brooklyn Nets" },
  { number: "PR-CL", name: "Chaz Lanier", team: "Detroit Pistons" },
  { number: "PR-CM", name: "CJ McCollum", team: "New Orleans Pelicans" },
  { number: "PR-CO", name: "Cedric Coward", team: "Memphis Grizzlies" },
  { number: "PR-CW", name: "Cody Williams", team: "Utah Jazz" },
  { number: "PR-DA", name: "Deandre Ayton", team: "Portland Trail Blazers" },
  { number: "PR-DG", name: "Draymond Green", team: "Golden State Warriors" },
  { number: "PR-DH", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "PR-DJ", name: "Dillon Jones", team: "Oklahoma City Thunder" },
  { number: "PR-DK", name: "Dalton Knecht", team: "Los Angeles Lakers" },
  { number: "PR-DL", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { number: "PR-DLI", name: "Dereck Lively II", team: "Dallas Mavericks" },
  { number: "PR-DM", name: "Dejounte Murray", team: "New Orleans Pelicans" },
  { number: "PR-DO", name: "Danny Wolf", team: "Brooklyn Nets" },
  { number: "PR-DP", name: "Drake Powell", team: "Brooklyn Nets" },
  { number: "PR-DQ", name: "Derik Queen", team: "New Orleans Pelicans" },
  { number: "PR-DR", name: "Duncan Robinson", team: "Miami Heat" },
  { number: "PR-DS", name: "Domantas Sabonis", team: "Sacramento Kings" },
  { number: "PR-DV", name: "Devin Vassell", team: "San Antonio Spurs" },
  { number: "PR-DW", name: "Derrick White", team: "Boston Celtics" },
  { number: "PR-ED", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "PR-HB", name: "Harrison Barnes", team: "San Antonio Spurs" },
  { number: "PR-JA", name: "Jarrett Allen", team: "Cleveland Cavaliers" },
  { number: "PR-JB", name: "Jaylen Brown", team: "Boston Celtics" },
  { number: "PR-JC", name: "Jordan Clarkson", team: "Utah Jazz" },
  { number: "PR-JE", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { number: "PR-JH", name: "Josh Hart", team: "New York Knicks" },
  { number: "PR-JHA", name: "James Harden", team: "Los Angeles Clippers" },
  { number: "PR-JHO", name: "Jrue Holiday", team: "Boston Celtics" },
  { number: "PR-JI", name: "Joan Beringer", team: "Minnesota Timberwolves" },
  { number: "PR-JJ", name: "Jaime Jaquez Jr.", team: "Miami Heat" },
  { number: "PR-JJJ", name: "Jalen Johnson", team: "Atlanta Hawks" },
  { number: "PR-JM", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "PR-JO", name: "Johni Broome", team: "Philadelphia 76ers" },
  { number: "PR-JP", name: "Jordan Poole", team: "Washington Wizards" },
  { number: "PR-JR", name: "Jase Richardson", team: "Orlando Magic" },
  { number: "PR-JS", name: "Jeremy Sochan", team: "San Antonio Spurs" },
  { number: "PR-JSU", name: "Jalen Suggs", team: "Orlando Magic" },
  { number: "PR-JW", name: "Jamir Watkins", team: "Washington Wizards" },
  { number: "PR-KB", name: "Koby Brea", team: "Phoenix Suns" },
  { number: "PR-KG", name: "Keyonte George", team: "Utah Jazz" },
  { number: "PR-KJ", name: "Kasparas Jakučionis", team: "Miami Heat" },
  { number: "PR-KK", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "PR-KM", name: "Khaman Maluach", team: "Phoenix Suns" },
  { number: "PR-KO", name: "Kam Jones", team: "Indiana Pacers" },
  { number: "PR-LB", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "PR-LM", name: "Liam McNeeley", team: "Charlotte Hornets" },
  { number: "PR-MC", name: "Mike Conley", team: "Minnesota Timberwolves" },
  { number: "PR-MP", name: "Micah Peavy", team: "New Orleans Pelicans" },
  { number: "PR-MPJ", name: "Michael Porter Jr.", team: "Denver Nuggets" },
  { number: "PR-MR", name: "Maxime Raynaud", team: "Sacramento Kings" },
  { number: "PR-MT", name: "Myles Turner", team: "Indiana Pacers" },
  { number: "PR-NB", name: "Nicolas Batum", team: "Los Angeles Clippers" },
  { number: "PR-NC", name: "Noah Clowney", team: "Brooklyn Nets" },
  { number: "PR-NCL", name: "Nic Claxton", team: "Brooklyn Nets" },
  { number: "PR-ND", name: "Noah Penda", team: "Orlando Magic" },
  { number: "PR-NE", name: "Noa Essengue", team: "Chicago Bulls" },
  { number: "PR-NI", name: "Nique Clifford", team: "Sacramento Kings" },
  { number: "PR-NP", name: "Norman Powell", team: "Los Angeles Clippers" },
  { number: "PR-NT", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "PR-OO", name: "Onyeka Okongwu", team: "Atlanta Hawks" },
  { number: "PR-OT", name: "Obi Toppin", team: "Indiana Pacers" },
  { number: "PR-PG", name: "Paul George", team: "Philadelphia 76ers" },
  { number: "PR-PW", name: "Patrick Williams", team: "Chicago Bulls" },
  { number: "PR-RB", name: "RJ Barrett", team: "Toronto Raptors" },
  { number: "PR-RF", name: "Rasheer Fleming", team: "Phoenix Suns" },
  { number: "PR-RG", name: "Rudy Gobert", team: "Minnesota Timberwolves" },
  { number: "PR-RK", name: "Ryan Kalkbrenner", team: "Charlotte Hornets" },
  { number: "PR-SH", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { number: "PR-SJ", name: "Sion James", team: "Charlotte Hornets" },
  { number: "PR-TE", name: "Tari Eason", team: "Houston Rockets" },
  { number: "PR-TH", name: "Tobias Harris", team: "Detroit Pistons" },
  { number: "PR-THE", name: "Tyler Herro", team: "Miami Heat" },
  { number: "PR-TO", name: "Tyrese Proctor", team: "Cleveland Cavaliers" },
  { number: "PR-TS", name: "Thomas Sorber", team: "Oklahoma City Thunder" },
  { number: "PR-TY", name: "Trae Young", team: "Atlanta Hawks" },
  { number: "PR-WC", name: "Wendell Carter Jr.", team: "Orlando Magic" },
  { number: "PR-WJ", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "PR-WR", name: "Will Riley", team: "Washington Wizards" },
  { number: "PR-YH", name: "Yang Hansen", team: "Portland Trail Blazers" },
  { number: "PR-YK", name: "Yanic Konan-Niederhäuser", team: "Los Angeles Clippers" },
  { number: "PR-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
];

const DUAL_RELIC_PARALLELS = ["Glitter", "Red Glitter", "Golden Glitter"];
const DUAL_RELIC_CARDS: DualRow[] = [
  { number: "DPR-BS", nameA: "Danny Wolf", teamA: "Brooklyn Nets", nameB: "Ben Saraf", teamB: "Brooklyn Nets" },
  { number: "DPR-CC", nameA: "Cedric Coward", teamA: "Memphis Grizzlies", nameB: "Drake Powell", teamB: "Brooklyn Nets" },
  { number: "DPR-CF", nameA: "Dylan Harper", teamA: "San Antonio Spurs", nameB: "Cooper Flagg", teamB: "Dallas Mavericks" },
  { number: "DPR-CM", nameA: "Collin Murray-Boyles", teamA: "Toronto Raptors", nameB: "Khaman Maluach", teamB: "Phoenix Suns" },
  { number: "DPR-DH", nameA: "Ace Bailey", teamA: "Utah Jazz", nameB: "Dylan Harper", teamB: "San Antonio Spurs" },
  { number: "DPR-DV", nameA: "Devin Vassell", teamA: "San Antonio Spurs", nameB: "Jeremy Sochan", teamB: "San Antonio Spurs" },
  { number: "DPR-ED", nameA: "Egor Dëmin", teamA: "Brooklyn Nets", nameB: "Nolan Traore", teamB: "Brooklyn Nets" },
  { number: "DPR-JB", nameA: "Jaylen Brown", teamA: "Boston Celtics", nameB: "Jayson Tatum", teamB: "Boston Celtics" },
  { number: "DPR-JE", nameA: "Joel Embiid", teamA: "Philadelphia 76ers", nameB: "Paul George", teamB: "Philadelphia 76ers" },
  { number: "DPR-JH", nameA: "James Harden", teamA: "Los Angeles Clippers", nameB: "Kawhi Leonard", teamB: "Los Angeles Clippers" },
  { number: "DPR-JJ", nameA: "Jaren Jackson Jr.", teamA: "Memphis Grizzlies", nameB: "Ja Morant", teamB: "Memphis Grizzlies" },
  { number: "DPR-KJ", nameA: "Kasparas Jakučionis", teamA: "Miami Heat", nameB: "Will Riley", teamB: "Washington Wizards" },
  { number: "DPR-KK", nameA: "Cooper Flagg", teamA: "Dallas Mavericks", nameB: "Kon Knueppel", teamB: "Charlotte Hornets" },
  { number: "DPR-KM", nameA: "Kon Knueppel", teamA: "Charlotte Hornets", nameB: "Khaman Maluach", teamB: "Phoenix Suns" },
  { number: "DPR-LM", nameA: "Liam McNeeley", teamA: "Charlotte Hornets", nameB: "Yanic Konan-Niederhäuser", teamB: "Los Angeles Clippers" },
  { number: "DPR-MB", nameA: "OG Anunoby", teamA: "New York Knicks", nameB: "Mikal Bridges", teamB: "New York Knicks" },
  { number: "DPR-NC", nameA: "Nic Claxton", teamA: "Brooklyn Nets", nameB: "Noah Clowney", teamB: "Brooklyn Nets" },
  { number: "DPR-NE", nameA: "Noa Essengue", teamA: "Chicago Bulls", nameB: "Derik Queen", teamB: "New Orleans Pelicans" },
  { number: "DPR-NL", nameA: "Jase Richardson", teamA: "Orlando Magic", nameB: "Nique Clifford", teamB: "Sacramento Kings" },
  { number: "DPR-PB", nameA: "Paolo Banchero", teamA: "Orlando Magic", nameB: "Franz Wagner", teamB: "Orlando Magic" },
  { number: "DPR-SH", nameA: "Deandre Ayton", teamA: "Portland Trail Blazers", nameB: "Scoot Henderson", teamB: "Portland Trail Blazers" },
  { number: "DPR-TS", nameA: "Thomas Sorber", teamA: "Oklahoma City Thunder", nameB: "Yang Hansen", teamB: "Portland Trail Blazers" },
  { number: "DPR-WC", nameA: "Walter Clayton Jr.", teamA: "Utah Jazz", nameB: "Ace Bailey", teamB: "Utah Jazz" },
  { number: "DPR-YH", nameA: "Yang Hansen", teamA: "Portland Trail Blazers", nameB: "Joan Beringer", teamB: "Minnesota Timberwolves" },
  { number: "DPR-ZR", nameA: "Trae Young", teamA: "Atlanta Hawks", nameB: "Zaccharie Risacher", teamB: "Atlanta Hawks" },
];

const HOLIDAY_SHAPED_RELIC_CARDS: SubsetRow[] = [
  { number: "HSR-2", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "HSR-3", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "HSR-4", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "HSR-5", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "HSR-6", name: "Collin Murray-Boyles", team: "Toronto Raptors" },
  { number: "HSR-7", name: "Khaman Maluach", team: "Phoenix Suns" },
  { number: "HSR-8", name: "Cedric Coward", team: "Memphis Grizzlies" },
  { number: "HSR-9", name: "Noa Essengue", team: "Chicago Bulls" },
  { number: "HSR-10", name: "Derik Queen", team: "New Orleans Pelicans" },
  { number: "HSR-11", name: "Thomas Sorber", team: "Oklahoma City Thunder" },
  { number: "HSR-12", name: "Yang Hansen", team: "Portland Trail Blazers" },
  { number: "HSR-13", name: "Joan Beringer", team: "Minnesota Timberwolves" },
  { number: "HSR-14", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "HSR-15", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "HSR-16", name: "Kasparas Jakučionis", team: "Miami Heat" },
  { number: "HSR-17", name: "Will Riley", team: "Washington Wizards" },
  { number: "HSR-18", name: "Drake Powell", team: "Brooklyn Nets" },
  { number: "HSR-19", name: "Asa Newell", team: "Atlanta Hawks" },
  { number: "HSR-20", name: "Nique Clifford", team: "Sacramento Kings" },
  { number: "HSR-21", name: "Jase Richardson", team: "Orlando Magic" },
  { number: "HSR-22", name: "Ben Saraf", team: "Brooklyn Nets" },
  { number: "HSR-23", name: "Danny Wolf", team: "Brooklyn Nets" },
  { number: "HSR-24", name: "Liam McNeeley", team: "Charlotte Hornets" },
  { number: "HSR-25", name: "Yanic Konan-Niederhäuser", team: "Los Angeles Clippers" },
];

const HOLIDAY_RELIC_CARDS: SubsetRow[] = [
  { number: "HR-1", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "HR-2", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "HR-3", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "HR-4", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "HR-5", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "HR-6", name: "Collin Murray-Boyles", team: "Toronto Raptors" },
  { number: "HR-7", name: "Khaman Maluach", team: "Phoenix Suns" },
  { number: "HR-8", name: "Cedric Coward", team: "Memphis Grizzlies" },
  { number: "HR-9", name: "Noa Essengue", team: "Chicago Bulls" },
  { number: "HR-10", name: "Derik Queen", team: "New Orleans Pelicans" },
  { number: "HR-11", name: "Thomas Sorber", team: "Oklahoma City Thunder" },
  { number: "HR-12", name: "Yang Hansen", team: "Portland Trail Blazers" },
  { number: "HR-13", name: "Joan Beringer", team: "Minnesota Timberwolves" },
  { number: "HR-14", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "HR-15", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "HR-16", name: "Kasparas Jakučionis", team: "Miami Heat" },
  { number: "HR-17", name: "Will Riley", team: "Washington Wizards" },
  { number: "HR-18", name: "Drake Powell", team: "Brooklyn Nets" },
  { number: "HR-19", name: "Asa Newell", team: "Atlanta Hawks" },
  { number: "HR-20", name: "Nique Clifford", team: "Sacramento Kings" },
  { number: "HR-21", name: "Jase Richardson", team: "Orlando Magic" },
  { number: "HR-22", name: "Ben Saraf", team: "Brooklyn Nets" },
  { number: "HR-23", name: "Danny Wolf", team: "Brooklyn Nets" },
  { number: "HR-24", name: "Liam McNeeley", team: "Charlotte Hornets" },
  { number: "HR-25", name: "Yanic Konan-Niederhäuser", team: "Los Angeles Clippers" },
  { number: "HR-26", name: "Rasheer Fleming", team: "Phoenix Suns" },
  { number: "HR-27", name: "Noah Penda", team: "Orlando Magic" },
  { number: "HR-28", name: "Sion James", team: "Charlotte Hornets" },
  { number: "HR-29", name: "Ryan Kalkbrenner", team: "Charlotte Hornets" },
  { number: "HR-30", name: "Johni Broome", team: "Philadelphia 76ers" },
  { number: "HR-31", name: "Adou Thiero", team: "Los Angeles Lakers" },
  { number: "HR-32", name: "Chaz Lanier", team: "Detroit Pistons" },
  { number: "HR-33", name: "Kam Jones", team: "Indiana Pacers" },
  { number: "HR-34", name: "Alijah Martin", team: "Toronto Raptors" },
  { number: "HR-35", name: "Micah Peavy", team: "New Orleans Pelicans" },
  { number: "HR-36", name: "Koby Brea", team: "Phoenix Suns" },
  { number: "HR-37", name: "Maxime Raynaud", team: "Sacramento Kings" },
  { number: "HR-38", name: "Jamir Watkins", team: "Washington Wizards" },
  { number: "HR-39", name: "Brooks Barnhizer", team: "Oklahoma City Thunder" },
  { number: "HR-40", name: "Tyrese Proctor", team: "Cleveland Cavaliers" },
];

// ---------------------------------------------------------------------------
// INSERTS (no parallels printed for any of these five subsets)
// ---------------------------------------------------------------------------
const FROSTBITE_FINISHERS: SubsetRow[] = [
  { number: "FF-AB", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "FF-BM", name: "Brandon Miller", team: "Charlotte Hornets" },
  { number: "FF-CF", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "FF-CH", name: "Chet Holmgren", team: "Oklahoma City Thunder" },
  { number: "FF-DH", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "FF-ED", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "FF-EM", name: "Evan Mobley", team: "Cleveland Cavaliers" },
  { number: "FF-GA", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { number: "FF-JB", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "FF-JF", name: "Jeremiah Fears", team: "New Orleans Pelicans" },
  { number: "FF-JM", name: "Jamal Murray", team: "Denver Nuggets" },
  { number: "FF-JO", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "FF-KD", name: "Kevin Durant", team: "Phoenix Suns" },
  { number: "FF-KK", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "FF-LB", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "FF-NT", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "FF-PB", name: "Paolo Banchero", team: "Orlando Magic" },
  { number: "FF-RS", name: "Reed Sheppard", team: "Houston Rockets" },
  { number: "FF-SC", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "FF-TH", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { number: "FF-TJ", name: "Tre Johnson III", team: "Washington Wizards" },
  { number: "FF-TM", name: "Tyrese Maxey", team: "Philadelphia 76ers" },
  { number: "FF-VE", name: "VJ Edgecombe", team: "Philadelphia 76ers" },
  { number: "FF-WC", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "FF-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
];

const HIDDEN_ELF: SubsetRow[] = [
  { number: "HE-AE", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { number: "HE-AS", name: "Alex Sarr", team: "Washington Wizards" },
  { number: "HE-CC", name: "Cade Cunningham", team: "Detroit Pistons" },
  { number: "HE-CT", name: "Cam Thomas", team: "Brooklyn Nets" },
  { number: "HE-DB", name: "Devin Booker", team: "Phoenix Suns" },
  { number: "HE-DM", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { number: "HE-FW", name: "Franz Wagner", team: "Orlando Magic" },
  { number: "HE-GA", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { number: "HE-JB", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "HE-JE", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { number: "HE-JG", name: "Jalen Green", team: "Houston Rockets" },
  { number: "HE-JM", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "HE-JT", name: "Jayson Tatum", team: "Boston Celtics" },
  { number: "HE-KI", name: "Kyrie Irving", team: "Dallas Mavericks" },
  { number: "HE-KL", name: "Kawhi Leonard", team: "Los Angeles Clippers" },
  { number: "HE-LB", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "HE-LBJ", name: "LeBron James", team: "Los Angeles Lakers" },
  { number: "HE-MB", name: "Matas Buzelis", team: "Chicago Bulls" },
  { number: "HE-NJ", name: "Nikola Jokić", team: "Denver Nuggets" },
  { number: "HE-SB", name: "Scottie Barnes", team: "Toronto Raptors" },
  { number: "HE-SC", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "HE-SH", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { number: "HE-TH", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { number: "HE-TY", name: "Trae Young", team: "Atlanta Hawks" },
  { number: "HE-ZL", name: "Zach LaVine", team: "Sacramento Kings" },
];

const MAKING_THE_NICE_LIST: SubsetRow[] = [
  { number: "ML-1", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "ML-2", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "ML-3", name: "VJ Edgecombe", team: "Philadelphia 76ers" },
  { number: "ML-4", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "ML-5", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "ML-6", name: "Tre Johnson III", team: "Washington Wizards" },
  { number: "ML-7", name: "Jeremiah Fears", team: "New Orleans Pelicans" },
  { number: "ML-8", name: "Egor Dëmin", team: "Brooklyn Nets" },
  { number: "ML-9", name: "Collin Murray-Boyles", team: "Toronto Raptors" },
  { number: "ML-10", name: "Khaman Maluach", team: "Phoenix Suns" },
  { number: "ML-11", name: "Cedric Coward", team: "Memphis Grizzlies" },
  { number: "ML-12", name: "Noa Essengue", team: "Chicago Bulls" },
  { number: "ML-13", name: "Derik Queen", team: "New Orleans Pelicans" },
  { number: "ML-14", name: "Carter Bryant", team: "San Antonio Spurs" },
  { number: "ML-15", name: "Thomas Sorber", team: "Oklahoma City Thunder" },
  { number: "ML-16", name: "Yang Hansen", team: "Portland Trail Blazers" },
  { number: "ML-17", name: "Joan Beringer", team: "Minnesota Timberwolves" },
  { number: "ML-18", name: "Walter Clayton Jr.", team: "Utah Jazz" },
  { number: "ML-19", name: "Nolan Traore", team: "Brooklyn Nets" },
  { number: "ML-20", name: "Kasparas Jakučionis", team: "Miami Heat" },
  { number: "ML-21", name: "Will Riley", team: "Washington Wizards" },
  { number: "ML-22", name: "Drake Powell", team: "Brooklyn Nets" },
  { number: "ML-23", name: "Asa Newell", team: "Atlanta Hawks" },
  { number: "ML-24", name: "Nique Clifford", team: "Sacramento Kings" },
  { number: "ML-25", name: "Jase Richardson", team: "Orlando Magic" },
];

const EVERGREEN: SubsetRow[] = [
  { number: "EV-AD", name: "Anthony Davis", team: "Dallas Mavericks" },
  { number: "EV-AE", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { number: "EV-AT", name: "Amen Thompson", team: "Houston Rockets" },
  { number: "EV-ATO", name: "Ausar Thompson", team: "Detroit Pistons" },
  { number: "EV-BC", name: "Bub Carrington", team: "Washington Wizards" },
  { number: "EV-BM", name: "Brandon Miller", team: "Charlotte Hornets" },
  { number: "EV-DB", name: "Devin Booker", team: "Phoenix Suns" },
  { number: "EV-DG", name: "Darius Garland", team: "Cleveland Cavaliers" },
  { number: "EV-DL", name: "Damian Lillard", team: "Milwaukee Bucks" },
  { number: "EV-JB", name: "Jimmy Butler III", team: "Golden State Warriors" },
  { number: "EV-JE", name: "Joel Embiid", team: "Philadelphia 76ers" },
  { number: "EV-JG", name: "Josh Giddey", team: "Chicago Bulls" },
  { number: "EV-JH", name: "James Harden", team: "Los Angeles Clippers" },
  { number: "EV-JM", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "EV-JW", name: "Jalen Williams", team: "Oklahoma City Thunder" },
  { number: "EV-KT", name: "Karl-Anthony Towns", team: "New York Knicks" },
  { number: "EV-LM", name: "Lauri Markkanen", team: "Utah Jazz" },
  { number: "EV-NJ", name: "Nikola Jokić", team: "Denver Nuggets" },
  { number: "EV-PB", name: "Paolo Banchero", team: "Orlando Magic" },
  { number: "EV-SH", name: "Scoot Henderson", team: "Portland Trail Blazers" },
  { number: "EV-TH", name: "Tyler Herro", team: "Miami Heat" },
  { number: "EV-THA", name: "Tyrese Haliburton", team: "Indiana Pacers" },
  { number: "EV-VW", name: "Victor Wembanyama", team: "San Antonio Spurs" },
  { number: "EV-ZE", name: "Zach Edey", team: "Memphis Grizzlies" },
  { number: "EV-ZR", name: "Zaccharie Risacher", team: "Atlanta Hawks" },
];

const OVERSIZED_DIE_CUT_ORNAMENTS: SubsetRow[] = [
  { number: "DCO-AB", name: "Ace Bailey", team: "Utah Jazz" },
  { number: "DCO-AE", name: "Anthony Edwards", team: "Minnesota Timberwolves" },
  { number: "DCO-AT", name: "Amen Thompson", team: "Houston Rockets" },
  { number: "DCO-CC", name: "Cade Cunningham", team: "Detroit Pistons" },
  { number: "DCO-CF", name: "Cooper Flagg", team: "Dallas Mavericks" },
  { number: "DCO-DB", name: "Devin Booker", team: "Phoenix Suns" },
  { number: "DCO-DH", name: "Dylan Harper", team: "San Antonio Spurs" },
  { number: "DCO-DM", name: "Donovan Mitchell", team: "Cleveland Cavaliers" },
  { number: "DCO-GA", name: "Giannis Antetokounmpo", team: "Milwaukee Bucks" },
  { number: "DCO-JB", name: "Jalen Brunson", team: "New York Knicks" },
  { number: "DCO-JM", name: "Ja Morant", team: "Memphis Grizzlies" },
  { number: "DCO-JT", name: "Jayson Tatum", team: "Boston Celtics" },
  { number: "DCO-KK", name: "Kon Knueppel", team: "Charlotte Hornets" },
  { number: "DCO-LB", name: "LaMelo Ball", team: "Charlotte Hornets" },
  { number: "DCO-LBJ", name: "LeBron James", team: "Los Angeles Lakers" },
  { number: "DCO-NJ", name: "Nikola Jokić", team: "Denver Nuggets" },
  { number: "DCO-SC", name: "Stephen Curry", team: "Golden State Warriors" },
  { number: "DCO-SGA", name: "Shai Gilgeous-Alexander", team: "Oklahoma City Thunder" },
  { number: "DCO-VE", name: "VJ Edgecombe", team: "Philadelphia 76ers" },
  { number: "DCO-VW", name: "Victor Wembanyama", team: "San Antonio Spurs" },
];

// Expected row counts — a cheap safety net against a dropped/duplicated row
// during hand transcription of ~655 cards from pasted text.
const EXPECTED_COUNTS: Array<[string, number]> = [
  ["BASE_CARDS", 200],
  ["SSP_PHOTO", 25],
  ["SSP_BACK", 25],
  ["AUTO_CARDS", 96],
  ["PLAYER_RELIC_CARDS", 100],
  ["DUAL_RELIC_CARDS", 25],
  ["HOLIDAY_SHAPED_RELIC_CARDS", 24],
  ["HOLIDAY_RELIC_CARDS", 40],
  ["FROSTBITE_FINISHERS", 25],
  ["HIDDEN_ELF", 25],
  ["MAKING_THE_NICE_LIST", 25],
  ["EVERGREEN", 25],
  ["OVERSIZED_DIE_CUT_ORNAMENTS", 20],
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [{ prisma }, { builder }] = await Promise.all([
    import("../ingestion/engine/prisma"),
    import("../ingestion/engine/builder"),
  ]);

  const actualCounts: Record<string, number> = {
    BASE_CARDS: BASE_CARDS.length,
    SSP_PHOTO: SSP_PHOTO.length,
    SSP_BACK: SSP_BACK.length,
    AUTO_CARDS: AUTO_CARDS.length,
    PLAYER_RELIC_CARDS: PLAYER_RELIC_CARDS.length,
    DUAL_RELIC_CARDS: DUAL_RELIC_CARDS.length,
    HOLIDAY_SHAPED_RELIC_CARDS: HOLIDAY_SHAPED_RELIC_CARDS.length,
    HOLIDAY_RELIC_CARDS: HOLIDAY_RELIC_CARDS.length,
    FROSTBITE_FINISHERS: FROSTBITE_FINISHERS.length,
    HIDDEN_ELF: HIDDEN_ELF.length,
    MAKING_THE_NICE_LIST: MAKING_THE_NICE_LIST.length,
    EVERGREEN: EVERGREEN.length,
    OVERSIZED_DIE_CUT_ORNAMENTS: OVERSIZED_DIE_CUT_ORNAMENTS.length,
  };
  let countsOk = true;
  for (const [key, expected] of EXPECTED_COUNTS) {
    const actual = actualCounts[key];
    if (actual !== expected) {
      countsOk = false;
      console.error(`COUNT MISMATCH: ${key} expected ${expected}, got ${actual}`);
    }
  }
  if (!countsOk) {
    throw new Error("Row count mismatch detected — aborting before any writes. Fix the transcription first.");
  }
  console.log("All section row counts verified against the source checklist.");

  const expectedVariants =
    BASE_CARDS.length * (1 + BASE_PARALLELS.length) +
    SSP_PHOTO.length +
    SSP_BACK.length +
    FROSTBITE_FINISHERS.length +
    HIDDEN_ELF.length +
    MAKING_THE_NICE_LIST.length +
    EVERGREEN.length +
    OVERSIZED_DIE_CUT_ORNAMENTS.length +
    AUTO_CARDS.length * (1 + AUTO_PARALLELS.length) +
    PLAYER_RELIC_CARDS.length * (1 + PLAYER_RELIC_PARALLELS.length) +
    HOLIDAY_SHAPED_RELIC_CARDS.length * (1 + DUAL_RELIC_PARALLELS.length) +
    HOLIDAY_RELIC_CARDS.length * (1 + DUAL_RELIC_PARALLELS.length) +
    DUAL_RELIC_CARDS.length * (1 + DUAL_RELIC_PARALLELS.length);
  const totalCards = Object.values(actualCounts).reduce((a, b) => a + b, 0);
  console.log(`Would create ${totalCards} cards, ${expectedVariants} variants.`);
  if (dryRun) {
    console.log("Dry run — not writing.");
    return;
  }

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("NBA", universeId);
  const brandId = await builder.getOrCreateBrand("Topps Holiday", manufacturerId);
  const seriesId = await builder.getOrCreateSeries(SET_NAME, franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: BASE_CARDS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const existingRows = await prisma.card.findMany({ where: { setId: set.id }, select: { id: true } });
  const existingIds = new Set(existingRows.map((c) => c.id)); // idempotency across reruns
  const usedIds = new Set(existingIds); // idempotency + in-run collision detection

  let skipped = 0;
  let collisionsResolved = 0;
  const t0 = Date.now();

  function resolveCardId(baseId: string): { cardId: string; isNew: boolean } {
    if (existingIds.has(baseId)) return { cardId: baseId, isNew: false }; // already seeded in a prior run
    if (!usedIds.has(baseId)) return { cardId: baseId, isNew: true };
    // Genuine in-source duplicate code (see file header) — find the next free suffix.
    let n = 2;
    let candidate = `${baseId}-${String.fromCharCode(96 + n)}`; // -b, -c, ...
    while (usedIds.has(candidate) || existingIds.has(candidate)) {
      n++;
      candidate = `${baseId}-${String.fromCharCode(96 + n)}`;
    }
    collisionsResolved++;
    console.warn(`  duplicate source code "${baseId}" — disambiguated as "${candidate}"`);
    return { cardId: candidate, isNew: true };
  }

  // ---------------------------------------------------------------------
  // PLANNING PASS — pure in-memory, zero DB calls. Every earlier attempt at
  // this script was slow because it made ~2,000+ sequential awaited Prisma
  // calls (one person lookup + one team lookup + one card create per row,
  // fully serial); the DB's own retry wrapper (src/ingestion/engine/
  // prisma.ts) backs off up to 30s per failed call, so a handful of
  // transient blips across that many calls is enough to eat 40+ minutes for
  // 33 cards (confirmed — a real run was killed at exactly that point).
  // This rewrite builds the entire card/variant plan here first, then
  // executes it in three bulk phases below: (1) resolve every distinct
  // Person/Team in ~6 total calls via findMany+createMany+refetch instead
  // of one upsert per name, (2) create Cards concurrently in batches
  // (Promise.all chunks — createMany can't carry the Person/Team m2m
  // connects), (3) createMany the Variants in batches of 500 (the pattern
  // already proven fast earlier this session: 17,256 rows in 138s).
  // ---------------------------------------------------------------------
  interface PlannedCard {
    cardId: string;
    name: string;
    number: string;
    supertype: string;
    subtypes?: string;
    personNames: string[];
    teamNames: string[];
    insertSubset?: string;
    parallelNames: string[];
    isAuto?: boolean;
    isRelic?: boolean;
  }
  const plannedCards: PlannedCard[] = [];

  for (const row of BASE_CARDS) {
    const { cardId, isNew } = resolveCardId(`${SET_ID}-${row.number}`);
    if (!isNew) {
      skipped++;
      continue;
    }
    usedIds.add(cardId);
    plannedCards.push({
      cardId,
      name: row.name,
      number: row.number,
      supertype: "Player",
      subtypes: row.rc ? "Rookie" : undefined,
      personNames: [row.name],
      teamNames: [row.team],
      parallelNames: BASE_PARALLELS,
    });
  }

  const noParallelGroups: Array<{ subset: string; rows: SubsetRow[] }> = [
    { subset: "SSP Photo Variations", rows: SSP_PHOTO },
    { subset: "SSP Back Variations", rows: SSP_BACK },
    { subset: "Frostbite Finishers", rows: FROSTBITE_FINISHERS },
    { subset: "Hidden Elf", rows: HIDDEN_ELF },
    { subset: "Making The Nice List", rows: MAKING_THE_NICE_LIST },
    { subset: "Evergreen", rows: EVERGREEN },
    { subset: "Oversized Die-Cut Ornaments", rows: OVERSIZED_DIE_CUT_ORNAMENTS },
  ];
  for (const group of noParallelGroups) {
    for (const row of group.rows) {
      const { cardId, isNew } = resolveCardId(`${SET_ID}-${slug(group.subset)}-${slug(row.number)}`);
      if (!isNew) {
        skipped++;
        continue;
      }
      usedIds.add(cardId);
      plannedCards.push({
        cardId,
        name: row.name,
        number: row.number,
        supertype: group.subset,
        personNames: [row.name],
        teamNames: [row.team],
        insertSubset: group.subset,
        parallelNames: [],
      });
    }
  }

  const parallelGroups: Array<{ subset: string; rows: SubsetRow[]; parallels: string[]; isAuto?: boolean; isRelic?: boolean }> = [
    { subset: "Autographs", rows: AUTO_CARDS, parallels: AUTO_PARALLELS, isAuto: true },
    { subset: "Player Relics", rows: PLAYER_RELIC_CARDS, parallels: PLAYER_RELIC_PARALLELS, isRelic: true },
    { subset: "Player Holiday-Shaped Relics", rows: HOLIDAY_SHAPED_RELIC_CARDS, parallels: DUAL_RELIC_PARALLELS, isRelic: true },
    { subset: "Holiday Relics", rows: HOLIDAY_RELIC_CARDS, parallels: DUAL_RELIC_PARALLELS, isRelic: true },
  ];
  for (const group of parallelGroups) {
    for (const row of group.rows) {
      const { cardId, isNew } = resolveCardId(`${SET_ID}-${slug(group.subset)}-${slug(row.number)}`);
      if (!isNew) {
        skipped++;
        continue;
      }
      usedIds.add(cardId);
      plannedCards.push({
        cardId,
        name: row.name,
        number: row.number,
        supertype: group.subset,
        personNames: [row.name],
        teamNames: [row.team],
        insertSubset: group.subset,
        parallelNames: group.parallels.map((n) => `${group.subset} - ${n}`),
        isAuto: group.isAuto,
        isRelic: group.isRelic,
      });
    }
  }

  {
    const subset = "Dual Player Relics";
    for (const row of DUAL_RELIC_CARDS) {
      const { cardId, isNew } = resolveCardId(`${SET_ID}-${slug(subset)}-${slug(row.number)}`);
      if (!isNew) {
        skipped++;
        continue;
      }
      usedIds.add(cardId);
      plannedCards.push({
        cardId,
        name: `${row.nameA} & ${row.nameB}`,
        number: row.number,
        supertype: subset,
        personNames: [row.nameA, row.nameB],
        teamNames: [row.teamA, row.teamB],
        insertSubset: subset,
        parallelNames: DUAL_RELIC_PARALLELS.map((n) => `${subset} - ${n}`),
        isRelic: true,
      });
    }
  }

  console.log(`Planned ${plannedCards.length} new card(s) in memory, ${skipped} already existed, ${collisionsResolved} duplicate code(s) disambiguated.`);

  // ---- Bulk-resolve Persons and Teams (findMany + createMany + refetch, chunked) ----
  async function bulkResolveByName(model: "person" | "team", names: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (names.length === 0) return map;
    const CHUNK = 500;
    const findChunk = (chunk: string[]) =>
      model === "person"
        ? prisma.person.findMany({ where: { name: { in: chunk } }, select: { id: true, name: true } })
        : prisma.team.findMany({ where: { name: { in: chunk } }, select: { id: true, name: true } });

    for (let i = 0; i < names.length; i += CHUNK) {
      const rows = await findChunk(names.slice(i, i + CHUNK));
      for (const row of rows) map.set(row.name, row.id);
    }
    const missing = names.filter((n) => !map.has(n));
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      if (model === "person") await prisma.person.createMany({ data: chunk.map((name) => ({ name })), skipDuplicates: true });
      else await prisma.team.createMany({ data: chunk.map((name) => ({ name })), skipDuplicates: true });
    }
    for (let i = 0; i < missing.length; i += CHUNK) {
      const rows = await findChunk(missing.slice(i, i + CHUNK));
      for (const row of rows) map.set(row.name, row.id);
    }
    return map;
  }

  const allPersonNames = [...new Set(plannedCards.flatMap((c) => c.personNames))];
  const allTeamNames = [...new Set(plannedCards.flatMap((c) => c.teamNames))];
  const [personIdByName, teamIdByName] = await Promise.all([
    bulkResolveByName("person", allPersonNames),
    bulkResolveByName("team", allTeamNames),
  ]);
  console.log(`Resolved ${personIdByName.size} distinct Person(s), ${teamIdByName.size} distinct Team(s) — elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ---- Resolve Inserts + Parallels (small fixed counts — builder's in-memory cache is fine here) ----
  const insertIdBySubset = new Map<string, string>();
  for (const subset of new Set(plannedCards.map((c) => c.insertSubset).filter((s): s is string => !!s))) {
    insertIdBySubset.set(subset, await builder.getOrCreateInsert(subset, set.id));
  }
  const parallelIdByName: Record<string, string> = {};
  for (const name of new Set([...BASE_PARALLELS, ...plannedCards.flatMap((c) => c.parallelNames)])) {
    parallelIdByName[name] = await builder.getOrCreateParallel(name);
  }
  console.log(`Resolved ${insertIdBySubset.size} Insert subset(s), ${Object.keys(parallelIdByName).length} Parallel(s) — elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ---- Create Cards concurrently in batches (createMany can't carry m2m connects) ----
  // The retry wrapper (src/ingestion/engine/prisma.ts) retries on transient
  // connection errors — but create() isn't idempotent: if a write actually
  // commits and only the ACK is lost to a connection reset, the retry hits a
  // real, correct Unique constraint violation on our own id (confirmed live
  // this session — a real run failed exactly this way at card 361/655).
  // Since resolveCardId() already guarantees every id in plannedCards is
  // unique, a P2002 on Card.id here can only mean "the earlier attempt
  // actually succeeded" — safe to swallow, not a real conflict.
  const CARD_CONCURRENCY = 40;
  for (let i = 0; i < plannedCards.length; i += CARD_CONCURRENCY) {
    const chunk = plannedCards.slice(i, i + CARD_CONCURRENCY);
    await Promise.all(
      chunk.map(async (c) => {
        const teamIds = [...new Set(c.teamNames.map((n) => teamIdByName.get(n)!))];
        try {
          await prisma.card.create({
            data: {
              id: c.cardId,
              name: c.name,
              number: c.number,
              setId: set.id,
              supertype: c.supertype,
              subtypes: c.subtypes,
              persons: { connect: c.personNames.map((n) => ({ id: personIdByName.get(n)! })) },
              teams: { connect: teamIds.map((id) => ({ id })) },
            },
          });
        } catch (e: unknown) {
          const err = e as { code?: string; meta?: { target?: string[] } };
          if (err.code === "P2002" && err.meta?.target?.includes("id")) {
            console.warn(`  card "${c.cardId}" already exists (retry-after-lost-ack) — treating as already created.`);
            return;
          }
          throw e;
        }
      })
    );
    console.log(`  cards [${Math.min(i + CARD_CONCURRENCY, plannedCards.length)}/${plannedCards.length}] elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ---- Variants: build the full flat list, then createMany in batches of 500 ----
  interface VariantRow {
    cardId: string;
    printingId: string;
    parallelId?: string;
    insertId?: string;
    isAuto?: boolean;
    isRelic?: boolean;
  }
  const variantRows: VariantRow[] = [];
  for (const c of plannedCards) {
    const insertId = c.insertSubset ? insertIdBySubset.get(c.insertSubset) : undefined;
    variantRows.push({ cardId: c.cardId, printingId: basePrintingId, insertId, isAuto: c.isAuto, isRelic: c.isRelic });
    for (const pName of c.parallelNames) {
      variantRows.push({ cardId: c.cardId, printingId: basePrintingId, insertId, parallelId: parallelIdByName[pName], isAuto: c.isAuto, isRelic: c.isRelic });
    }
  }
  const VBATCH = 500;
  for (let i = 0; i < variantRows.length; i += VBATCH) {
    await prisma.variant.createMany({ data: variantRows.slice(i, i + VBATCH) });
    console.log(`  variants [${Math.min(i + VBATCH, variantRows.length)}/${variantRows.length}] elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // ---- Dedup safety net ----
  // Variant has no @@unique constraint (confirmed in schema.prisma), so
  // unlike Card, a retry-after-lost-ack race on one of the createMany
  // batches above wouldn't throw — it would silently double an entire
  // 500-row batch. createMany batches are each a single atomic statement,
  // so the only possible duplication is a whole batch, keyed identically on
  // (cardId, parallelId) — cheap and safe to detect and clean up here
  // rather than trust the network never blips across ~10 batch calls.
  const allVariantsForSet = await prisma.variant.findMany({
    where: { card: { setId: set.id } },
    select: { id: true, cardId: true, parallelId: true },
  });
  const seenVariantKeys = new Map<string, string>();
  const duplicateVariantIds: string[] = [];
  for (const v of allVariantsForSet) {
    const key = `${v.cardId}::${v.parallelId ?? "base"}`;
    if (seenVariantKeys.has(key)) duplicateVariantIds.push(v.id);
    else seenVariantKeys.set(key, v.id);
  }
  if (duplicateVariantIds.length > 0) {
    console.warn(`Found ${duplicateVariantIds.length} duplicate variant row(s) (retry race) — cleaning up.`);
    for (let i = 0; i < duplicateVariantIds.length; i += VBATCH) {
      await prisma.variant.deleteMany({ where: { id: { in: duplicateVariantIds.slice(i, i + VBATCH) } } });
    }
  }
  console.log(
    `Variant dedup check: ${allVariantsForSet.length - duplicateVariantIds.length} unique variant(s), ${duplicateVariantIds.length} duplicate(s) removed.`
  );

  console.log(
    `\nDone. Created ${plannedCards.length} cards, skipped ${skipped} (already existed), ${collisionsResolved} in-source duplicate code(s) disambiguated, ${variantRows.length} variants. Set: ${SET_NAME} (${set.id}) — ${((Date.now() - t0) / 1000).toFixed(1)}s`
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
