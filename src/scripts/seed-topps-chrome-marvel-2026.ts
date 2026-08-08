import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2026 Topps Chrome Marvel Comics trading card collection.
 *
 * Structure:
 *  - 200-card base set (1-200), characters linked via Character, with
 *    Debut tags on the 17 first-appearance cards.
 *  - Base parallels: Refractor (1:2), Storm's Lightning Refractor (1:3),
 *    RayWave Refractor (1:4), X-Fractor (1:4), Spider-Web Refractor /399,
 *    Yellow Refractor /275, Pink Refractor /250, Aqua Refractor /199,
 *    Blue Refractor /150, Hulk Green Lazer Refractor /99, Storm's Green
 *    Lightning Refractor /99, Green RayWave Refractor /99, Green X-Fractor
 *    /99, Dazzler's Silver Rhythm Refractor /80, Purple Shimmer Refractor
 *    /75, Storm's Purple Lightning Refractor /75, Purple RayWave Refractor
 *    /75, Purple X-Fractor /75, Spider-Web Red/Blue Refractor /62, Marvel
 *    Logofractor /61, Gold Refractor /50, Gold Wave Refractor /50, Storm's
 *    Gold Lightning Refractor /50, Gold RayWave Refractor /50, Gold X-Fractor
 *    /50, Captain America's Star Refractor /41, Human Torch Refractor /39,
 *    Orange Refractor /25, Orange Wave Refractor /25, Storm's Orange
 *    Lightning Refractor /25, Orange RayWave Refractor /25, Orange X-Fractor
 *    /25, Black Refractor /10, Black Wave Refractor /10, Storm's Black
 *    Lightning Refractor /10, Black RayWave Refractor /10, Black X-Fractor
 *    /10, Red Refractor /5, Red Wave Refractor /5, Storm's Red Lightning
 *    Refractor /5, Red RayWave Refractor /5, Red X-Fractor /5, Superfractor
 *    1/1.
 *  - Clawed Chrome Variations (200 cards, same numbers, base /20) with
 *    Black Wolverine Adamantium /10, Red Wolverine Adamantium /5, and
 *    Superfractor 1/1 parallels.
 *  - Autographs: Authentic Marvel Comic Book Artist Autographs (AA, 35),
 *    Cordially Invited Autographs (CIA, 6), Varied Visage: AoA Autographs
 *    (VVA, 11), Stan Lee & Steve Ditko Superfractors (AC, 2), Marvel
 *    Facsimile Autographs (MF, 15, /50), Dual (MFD, 6, /50), Triple
 *    (MFT, 4, /50), Quad (MFQ, 2, /50).
 *  - Relics: Comic Excerpts - Spider-Man (CE, 12), all 1/1.
 *  - Inserts: Fanfare (FF, 50), Marvel Icons (MI, 20), Meanwhile (MW, 20),
 *    One World Under Doom (OW, 20), Future Stars (FS, 20), The Beyond
 *    (TB, 20), 60 Years Of Black Panther (BP, 10), 65 Fantastic Years
 *    (FY, 10), X-Force 35th Anniversary (XF, 10), Classic Comic Book Covers
 *    (CC, 10), Cordially Invited (CI, 5), Marvel Reflections (MR, 5), Topps
 *    Originals (TO, 10), Astonishing (AS, 10), Golden Anniversaries (GA, 10),
 *    The One And Only Superfractors (TO-xx, 5, /1), Varied Visage AoA
 *    (VV, 11), Topps Patrimony Refractors (TP, 5, /25).
 *  - Sketch Cards: Artist Originals (Kevin Eastman, Adi Granov) and
 *    Sketch Cards (124 artists).
 *
 * Card id scheme:
 *   Base:            `${SET_ID}-${number}`          (e.g. ...-1)
 *   Clawed Chrome:   `${SET_ID}-clawed-chrome-${number}`
 *   Everything else: `${SET_ID}-${subsetSlug}-${numberSlug}`
 * (Subset namespacing avoids the real-product collision where "TO-01" is
 *  both a Topps Originals card and a The One And Only Superfractor.)
 */
const SET_ID = "topps-chrome-marvel-2026";
const SET_NAME = "Topps Chrome Marvel Comics 2026";

interface ParallelDef {
  name: string;
  serialTo?: number;
}

interface InsertRow {
  subset: string; // insert / subset set name (becomes an Insert entity + Card supertype)
  number: string;
  name: string;
  characters?: string[];
  persons?: string[];
  artists?: string[];
  auto?: boolean;
  relic?: boolean;
  serialTo?: number; // catalog print-run on the base version of the card itself
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------------------
// BASE SET (200 cards, 1-200). Debut markers are tracked separately so the
// name list stays clean.
// ---------------------------------------------------------------------------
const BASE_NAMES: string[] = [
  "Abomination", "Adam Warlock", "Agatha Harkness", "Amaranth", "America Chavez",
  "Ant-Man", "Apocalypse", "Ares", "Baron Zemo", "Beast",
  "Beta Ray Bill", "Black Bolt", "Black Cat", "Black Knight", "Black Panther",
  "Black Widow", "Blade", "Blink", "Captain America", "Captain Britain",
  "Captain Marvel", "Carnage", "Colossus", "Cyclops", "Daredevil",
  "Dazzler", "Dark Gwenpool", "Doctor Doom", "Doctor Octopus", "Domino",
  "Doomasaur", "Dormammu", "Dragonfire", "Emma Frost", "Enchantress",
  "Eternity", "Forge", "Galactus", "Gambit", "Gamora",
  "Ghost Rider", "Ghost-Spider", "Glob", "Goblin Queen", "Green Goblin",
  "Groot", "Hawkeye", "Hercules", "Hope Summers", "Hulk",
  "Human Torch", "Iceman", "Ikaris", "Infernal Hulk", "Invisible Woman",
  "Iron Fist", "Iron Man", "Ironheart", "Jean Grey", "Jeff the Land Shark",
  "Jubilee", "Juggernaut", "Kate Bishop", "Kid Juggernaut", "Kingpin",
  "Kitty Pryde", "Kraven the Hunter", "Leader", "Lizard", "Lockjaw",
  "Longshot", "Luke Cage", "M.O.D.O.K.", "Magneto", "Man-Thing",
  "Mantis", "Mephisto", "Miles Morales", "Mister Fantastic", "Mister Sinister",
  "Moon Knight", "Moonstar", "Ms. Marvel", "Mutina", "Mysterio",
  "Mystique", "Nightcrawler", "Nightdrifter", "Nova", "Omega Red",
  "Professor X", "Psylocke", "Quicksilver", "Rasputin IV", "Rek-Rap",
  "Revelation", "Rhino", "Rocket Raccoon", "Rogue", "Sleeper Agent",
  "Angela", "Anti-Venom", "Arachnix", "Arcade", "Archangel",
  "Chameleon", "Clea", "Cosmic Ghost Rider", "Deathlok", "Devil Dinosaur",
  "Doctor Strange", "Doom 2099", "Doyle Dormammu", "Elbecca Voss", "Electro",
  "Elektra", "Evangeline", "Exodus", "Glitch", "Grandmaster",
  "Gwenpool", "Hallows' Eve", "Hellcat", "Hellgate", "Hellverine",
  "Hobgoblin", "Iron Cat", "Kid Venom", "Knull", "Lady Henrietta",
  "Loki", "Luna Snow", "Maestro", "Magik", "Mar-Vell",
  "Mary Jane", "Misery", "Moon Girl", "Nimrod", "SP//dr",
  "Rachel Summers", "Raelith", "Rapid", "Sabretooth", "Scarlet Witch",
  "Scarlet Spider", "Scorpion", "Scream", "Sentry", "Shang-Chi",
  "She-Hulk", "She-Venom", "Shocker", "Shuri", "Silence",
  "Silk", "Silver Surfer", "Silver Sable", "Sister Sorrow", "Spider-Boy",
  "Spider-Girl", "Spider-Ham", "Spider-Man", "Spider-Man 2099", "Spider-Man Noir",
  "Spider-Punk", "Spider-Woman", "Star-Lord", "Storm", "Strong Guy",
  "Stryfe", "Sunspot", "Taskmaster", "Thanos", "The Thing",
  "Thena", "Thor", "Throg", "Tigra", "Tombstone",
  "Toxin", "U.S. Agent", "Ultimate Daredevil", "Ultimate Wolverine", "Ultron",
  "Valeria Richards", "Venom", "Venomizer", "Venomouse", "Vision",
  "Vulcan", "Vulture", "War Machine", "Wasp", "Werewolf by Night",
  "White Fox", "White Tiger", "Wiccan", "Wolverine", "X-23",
];

/** 17 first-appearance cards marked "(Debut)" on the checklist. */
const DEBUT_NUMBERS = new Set([
  "27", "33", "54", "84", "88", "103", "114", "117", "119",
  "124", "130", "142", "143", "159", "183", "188", "189",
]);

// ---------------------------------------------------------------------------
// BASE PARALLELS (applied to every base card, with catalog print-runs).
// ---------------------------------------------------------------------------
const BASE_PARALLELS: ParallelDef[] = [
  { name: "Refractor" },
  { name: "Storm's Lightning Refractor" },
  { name: "RayWave Refractor" },
  { name: "X-Fractor" },
  { name: "Spider-Web Refractor", serialTo: 399 },
  { name: "Yellow Refractor", serialTo: 275 },
  { name: "Pink Refractor", serialTo: 250 },
  { name: "Aqua Refractor", serialTo: 199 },
  { name: "Blue Refractor", serialTo: 150 },
  { name: "Hulk Green Lazer Refractor", serialTo: 99 },
  { name: "Storm's Green Lightning Refractor", serialTo: 99 },
  { name: "Green RayWave Refractor", serialTo: 99 },
  { name: "Green X-Fractor", serialTo: 99 },
  { name: "Dazzler's Silver Rhythm Refractor", serialTo: 80 },
  { name: "Purple Shimmer Refractor", serialTo: 75 },
  { name: "Storm's Purple Lightning Refractor", serialTo: 75 },
  { name: "Purple RayWave Refractor", serialTo: 75 },
  { name: "Purple X-Fractor", serialTo: 75 },
  { name: "Spider-Web Red/Blue Refractor", serialTo: 62 },
  { name: "Marvel Logofractor", serialTo: 61 },
  { name: "Gold Refractor", serialTo: 50 },
  { name: "Gold Wave Refractor", serialTo: 50 },
  { name: "Storm's Gold Lightning Refractor", serialTo: 50 },
  { name: "Gold RayWave Refractor", serialTo: 50 },
  { name: "Gold X-Fractor", serialTo: 50 },
  { name: "Captain America's Star Refractor", serialTo: 41 },
  { name: "Human Torch Refractor", serialTo: 39 },
  { name: "Orange Refractor", serialTo: 25 },
  { name: "Orange Wave Refractor", serialTo: 25 },
  { name: "Storm's Orange Lightning Refractor", serialTo: 25 },
  { name: "Orange RayWave Refractor", serialTo: 25 },
  { name: "Orange X-Fractor", serialTo: 25 },
  { name: "Black Refractor", serialTo: 10 },
  { name: "Black Wave Refractor", serialTo: 10 },
  { name: "Storm's Black Lightning Refractor", serialTo: 10 },
  { name: "Black RayWave Refractor", serialTo: 10 },
  { name: "Black X-Fractor", serialTo: 10 },
  { name: "Red Refractor", serialTo: 5 },
  { name: "Red Wave Refractor", serialTo: 5 },
  { name: "Storm's Red Lightning Refractor", serialTo: 5 },
  { name: "Red RayWave Refractor", serialTo: 5 },
  { name: "Red X-Fractor", serialTo: 5 },
  { name: "Superfractor", serialTo: 1 },
];

/** Clawed Chrome variation parallels (base /20 plus three rarer tiers). */
const CLAWED_CHROME_PARALLELS: ParallelDef[] = [
  { name: "Clawed Chrome", serialTo: 20 },
  { name: "Black Wolverine Adamantium", serialTo: 10 },
  { name: "Red Wolverine Adamantium", serialTo: 5 },
  { name: "Superfractor", serialTo: 1 },
];

// ---------------------------------------------------------------------------
// AUTOGRAPH PARALLEL TIERS BY SUBSET — keeps each hit's color/foil run catalogued.
// ---------------------------------------------------------------------------
const SUBSET_PARALLELS: Record<string, ParallelDef[]> = {
  "Authentic Marvel Comic Book Artist Autograph": [
    { name: "Green Refractor", serialTo: 99 },
    { name: "Purple Refractor", serialTo: 75 },
    { name: "Gold Refractor", serialTo: 50 },
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Cordially Invited Autograph": [
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Varied Visage: AoA Autograph": [
    { name: "Gold Wave Refractor", serialTo: 50 },
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marvel Facsimile Autograph": [
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marvel Dual Facsimile Autograph": [
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marvel Triple Facsimile Autograph": [
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marvel Quad Facsimile Autograph": [
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  Fanfare: [
    { name: "Green Speckle Refractor", serialTo: 99 },
    { name: "Purple Speckle Refractor", serialTo: 75 },
    { name: "Gold Speckle Refractor", serialTo: 50 },
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marvel Icons": [
    { name: "Gold Refractor", serialTo: 50 },
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Meanwhile": [
    { name: "Gold Refractor", serialTo: 50 },
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "One World Under Doom": [
    { name: "Gold Refractor", serialTo: 50 },
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Future Stars": [
    { name: "Gold Refractor", serialTo: 50 },
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "The Beyond": [
    { name: "Gold Refractor", serialTo: 50 },
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "60 Years Of Black Panther": [
    { name: "Gold Wave Refractor", serialTo: 50 },
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "65 Fantastic Years": [
    { name: "Gold Wave Refractor", serialTo: 50 },
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "X-Force 35th Anniversary": [
    { name: "Gold Wave Refractor", serialTo: 50 },
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Classic Comic Book Covers": [
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Cordially Invited": [
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marvel Reflections": [{ name: "Superfractor", serialTo: 1 }],
  "Topps Originals": [
    { name: "Orange Refractor", serialTo: 25 },
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  Astonishing: [
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Golden Anniversaries": [{ name: "Superfractor", serialTo: 1 }],
  "Varied Visage AoA": [
    { name: "Orange Wave Refractor", serialTo: 25 },
    { name: "Black Wave Refractor", serialTo: 10 },
    { name: "Red Wave Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Topps Patrimony Refractor": [
    { name: "Black Refractor", serialTo: 10 },
    { name: "Red Refractor", serialTo: 5 },
    { name: "Superfractor", serialTo: 1 },
  ],
};

// ---------------------------------------------------------------------------
// AUTOGRAPHS, RELICS, INSERTS, AND SKETCH CARDS
// ---------------------------------------------------------------------------
const AUTO_AND_INSERT_CARDS: InsertRow[] = [
  // ---- Authentic Marvel Comic Book Artist Autographs (AA, 35) ----
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-AA", name: "Arthur Adams", artists: ["Arthur Adams"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-ADI", name: "Adi Granov", artists: ["Adi Granov"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-AG", name: "Artgerm", artists: ["Artgerm"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-AK", name: "Andy Kubert", artists: ["Andy Kubert"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-AT", name: "Adam Kubert", artists: ["Adam Kubert"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-AZ", name: "Ariel Diaz", artists: ["Ariel Diaz"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-BS", name: "Bill Sienkiewicz", artists: ["Bill Sienkiewicz"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-DC", name: "Derrick Chew", artists: ["Derrick Chew"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-EM", name: "Ed McGuinness", artists: ["Ed McGuinness"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-EMG", name: "E.M. Gist", artists: ["E.M. Gist"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-ER", name: "Esad Ribic", artists: ["Esad Ribic"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-FM", name: "Frank Miller", artists: ["Frank Miller"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-GC", name: "Greg Capullo", artists: ["Greg Capullo"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-GH", name: "Greg Horn", artists: ["Greg Horn"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-IL", name: "InHyuk Lee", artists: ["InHyuk Lee"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-IT", name: "Ivan Talavera", artists: ["Ivan Talavera"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-JA", name: "Joshua Cassara", artists: ["Joshua Cassara"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-JC", name: "Jim Cheung", artists: ["Jim Cheung"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-KE", name: "Kevin Eastman", artists: ["Kevin Eastman"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-LP", name: "Lucio Parrillo", artists: ["Lucio Parrillo"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-MB", name: "Mark Brooks", artists: ["Mark Brooks"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-MH", name: "Mike Mayhew", artists: ["Mike Mayhew"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-MM", name: "Mike McKone", artists: ["Mike McKone"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-MS", name: "Marc Silvestri", artists: ["Marc Silvestri"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-MY", name: "Mark Bagley", artists: ["Mark Bagley"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-MZ", name: "Mike Zeck", artists: ["Mike Zeck"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-PM", name: "Paco Medina", artists: ["Paco Medina"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-PP", name: "Paul Pelletier", artists: ["Paul Pelletier"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-RB", name: "Ryan Brown", artists: ["Ryan Brown"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-RL", name: "Ron Lim", artists: ["Ron Lim"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-RS", name: "Ryan Stegman", artists: ["Ryan Stegman"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-SE", name: "Steve Epting", artists: ["Steve Epting"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-SM", name: "Steve McNiven", artists: ["Steve McNiven"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-SW", name: "Scott Williams", artists: ["Scott Williams"], auto: true },
  { subset: "Authentic Marvel Comic Book Artist Autograph", number: "AA-WP", name: "Whilce Portacio", artists: ["Whilce Portacio"], auto: true },

  // ---- Cordially Invited Autographs (CIA, 6) ----
  { subset: "Cordially Invited Autograph", number: "CIA-AJ", name: "Aaron Judge", persons: ["Aaron Judge"], auto: true },
  { subset: "Cordially Invited Autograph", number: "CIA-KF", name: "Kevin Feige", persons: ["Kevin Feige"], auto: true },
  { subset: "Cordially Invited Autograph", number: "CIA-PA", name: "Pete Alonso", persons: ["Pete Alonso"], auto: true },
  { subset: "Cordially Invited Autograph", number: "CIA-PO", name: "Patton Oswalt", persons: ["Patton Oswalt"], auto: true },
  { subset: "Cordially Invited Autograph", number: "CIA-SA", name: "Steve Aoki", persons: ["Steve Aoki"], auto: true },
  { subset: "Cordially Invited Autograph", number: "CIA-SM", name: "Seth Meyers", persons: ["Seth Meyers"], auto: true },

  // ---- Varied Visage: AoA Autographs (VVA, 11) ----
  { subset: "Varied Visage: AoA Autograph", number: "VVA-01", name: "Emma Frost", characters: ["Emma Frost"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-02", name: "Psylocke", characters: ["Psylocke"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-03", name: "Weapon X", characters: ["Weapon X"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-04", name: "Jean Grey", characters: ["Jean Grey"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-05", name: "Cyclops", characters: ["Cyclops"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-06", name: "Apocalypse", characters: ["Apocalypse"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-07", name: "Magneto", characters: ["Magneto"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-08", name: "Rogue", characters: ["Rogue"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-09", name: "Gambit", characters: ["Gambit"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-10", name: "Storm", characters: ["Storm"], auto: true },
  { subset: "Varied Visage: AoA Autograph", number: "VVA-11", name: "Scarlet Witch", characters: ["Scarlet Witch"], auto: true },

  // ---- The One and Only: Stan Lee & Steve Ditko Superfractors (AC, 2, /1) ----
  { subset: "The One and Only: Stan Lee & Steve Ditko Superfractor", number: "AC-01", name: "Stan Lee", persons: ["Stan Lee"], auto: true, serialTo: 1 },
  { subset: "The One and Only: Stan Lee & Steve Ditko Superfractor", number: "AC-02", name: "Steve Ditko", persons: ["Steve Ditko"], auto: true, serialTo: 1 },

  // ---- Marvel Facsimile Autographs (MF, 15, /50) ----
  { subset: "Marvel Facsimile Autograph", number: "MF-BB", name: "Captain Britain", characters: ["Captain Britain"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-CY", name: "Cyclops", characters: ["Cyclops"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-DO", name: "Doctor Octopus", characters: ["Doctor Octopus"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-GA", name: "Galactus", characters: ["Galactus"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-GG", name: "Green Goblin", characters: ["Green Goblin"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-GR", name: "Ghost Rider", characters: ["Ghost Rider"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-JU", name: "Juggernaut", characters: ["Juggernaut"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-MJ", name: "Mary Jane", characters: ["Mary Jane"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-NA", name: "Namor", characters: ["Namor"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-NF", name: "Nick Fury", characters: ["Nick Fury"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-NI", name: "Nightcrawler", characters: ["Nightcrawler"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-ST", name: "Storm", characters: ["Storm"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-VE", name: "Venom", characters: ["Venom"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-VI", name: "Vision", characters: ["Vision"], auto: true, serialTo: 50 },
  { subset: "Marvel Facsimile Autograph", number: "MF-WM", name: "War Machine", characters: ["War Machine"], auto: true, serialTo: 50 },

  // ---- Marvel Dual Facsimile Autographs (MFD, 6, /50) ----
  { subset: "Marvel Dual Facsimile Autograph", number: "MFD-BP", name: "Psylocke/Captain Britain", characters: ["Psylocke", "Captain Britain"], auto: true, serialTo: 50 },
  { subset: "Marvel Dual Facsimile Autograph", number: "MFD-GH", name: "Green Goblin/Harry Osborn", characters: ["Green Goblin", "Harry Osborn"], auto: true, serialTo: 50 },
  { subset: "Marvel Dual Facsimile Autograph", number: "MFD-MG", name: "Gwen Stacy/Mary Jane", characters: ["Gwen Stacy", "Mary Jane"], auto: true, serialTo: 50 },
  { subset: "Marvel Dual Facsimile Autograph", number: "MFD-VS", name: "Spider-Man/Venom", characters: ["Spider-Man", "Venom"], auto: true, serialTo: 50 },
  { subset: "Marvel Dual Facsimile Autograph", number: "MFD-VW", name: "Scarlet Witch/Vision", characters: ["Scarlet Witch", "Vision"], auto: true, serialTo: 50 },
  { subset: "Marvel Dual Facsimile Autograph", number: "MFD-WI", name: "Iron Man/War Machine", characters: ["Iron Man", "War Machine"], auto: true, serialTo: 50 },

  // ---- Marvel Triple Facsimile Autographs (MFT, 4, /50) ----
  { subset: "Marvel Triple Facsimile Autograph", number: "MFT-AVS", name: "Vision/Agatha Harkness/Scarlet Witch", characters: ["Vision", "Agatha Harkness", "Scarlet Witch"], auto: true, serialTo: 50 },
  { subset: "Marvel Triple Facsimile Autograph", number: "MFT-IWN", name: "Nick Fury/Iron Man/War Machine", characters: ["Nick Fury", "Iron Man", "War Machine"], auto: true, serialTo: 50 },
  { subset: "Marvel Triple Facsimile Autograph", number: "MFT-PMG", name: "Gwen Stacy/Peter Parker/Mary Jane", characters: ["Gwen Stacy", "Peter Parker", "Mary Jane"], auto: true, serialTo: 50 },
  { subset: "Marvel Triple Facsimile Autograph", number: "MFT-SCN", name: "Cyclops/Storm/Nightcrawler", characters: ["Cyclops", "Storm", "Nightcrawler"], auto: true, serialTo: 50 },

  // ---- Marvel Quad Facsimile Autographs (MFQ, 2, /50) ----
  { subset: "Marvel Quad Facsimile Autograph", number: "MFQ-DNSG", name: "Doctor Doom/Silver Surfer/Galactus/Namor", characters: ["Doctor Doom", "Silver Surfer", "Galactus", "Namor"], auto: true, serialTo: 50 },
  { subset: "Marvel Quad Facsimile Autograph", number: "MFQ-SGDV", name: "Venom/Doctor Octopus/Green Goblin/Spider-Man", characters: ["Venom", "Doctor Octopus", "Green Goblin", "Spider-Man"], auto: true, serialTo: 50 },

  // ---- Comic Excerpts – Spider-Man relics (CE, 12, all 1/1) ----
  { subset: "Comic Excerpts – Spider-Man", number: "CE-01", name: "Web of Spider-Man #1 1985", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-02", name: "Web of Spider-Man #32 1987", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-03", name: "Amazing Spider-Man #48 1967", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-04", name: "Amazing Spider-Man #51 1967", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-05", name: "Amazing Spider-Man #55 1967", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-06", name: "Amazing Spider-Man #56 1968", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-07", name: "Amazing Spider-Man #66 1968", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-08", name: "Amazing Spider-Man #258 1984", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-09", name: "Amazing Spider-Man #299 1988", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-10", name: "Amazing Spider-Man #301 1988", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-11", name: "Amazing Spider-Man #329 1990", relic: true, serialTo: 1 },
  { subset: "Comic Excerpts – Spider-Man", number: "CE-12", name: "Amazing Spider-Man #375 1993", relic: true, serialTo: 1 },

  // ---- Fanfare (FF, 50) ----
  { subset: "Fanfare", number: "FF-01", name: "Adam Warlock", characters: ["Adam Warlock"] },
  { subset: "Fanfare", number: "FF-02", name: "Apocalypse", characters: ["Apocalypse"] },
  { subset: "Fanfare", number: "FF-03", name: "Black Cat", characters: ["Black Cat"] },
  { subset: "Fanfare", number: "FF-04", name: "Black Knight", characters: ["Black Knight"] },
  { subset: "Fanfare", number: "FF-05", name: "Black Panther", characters: ["Black Panther"] },
  { subset: "Fanfare", number: "FF-06", name: "Black Widow", characters: ["Black Widow"] },
  { subset: "Fanfare", number: "FF-07", name: "Captain Marvel", characters: ["Captain Marvel"] },
  { subset: "Fanfare", number: "FF-08", name: "Carnage", characters: ["Carnage"] },
  { subset: "Fanfare", number: "FF-09", name: "Clea", characters: ["Clea"] },
  { subset: "Fanfare", number: "FF-10", name: "Cyclops", characters: ["Cyclops"] },
  { subset: "Fanfare", number: "FF-11", name: "Daredevil", characters: ["Daredevil"] },
  { subset: "Fanfare", number: "FF-12", name: "Dazzler", characters: ["Dazzler"] },
  { subset: "Fanfare", number: "FF-13", name: "Doctor Doom", characters: ["Doctor Doom"] },
  { subset: "Fanfare", number: "FF-14", name: "Emma Frost", characters: ["Emma Frost"] },
  { subset: "Fanfare", number: "FF-15", name: "Forge", characters: ["Forge"] },
  { subset: "Fanfare", number: "FF-16", name: "Ghost Rider", characters: ["Ghost Rider"] },
  { subset: "Fanfare", number: "FF-17", name: "Ghost-Spider", characters: ["Ghost-Spider"] },
  { subset: "Fanfare", number: "FF-18", name: "Gwenpool", characters: ["Gwenpool"] },
  { subset: "Fanfare", number: "FF-19", name: "Hellverine", characters: ["Hellverine"] },
  { subset: "Fanfare", number: "FF-20", name: "Hulk", characters: ["Hulk"] },
  { subset: "Fanfare", number: "FF-21", name: "Dark Phoenix", characters: ["Dark Phoenix"] },
  { subset: "Fanfare", number: "FF-22", name: "Iron Man", characters: ["Iron Man"] },
  { subset: "Fanfare", number: "FF-23", name: "Knull", characters: ["Knull"] },
  { subset: "Fanfare", number: "FF-24", name: "Loki", characters: ["Loki"] },
  { subset: "Fanfare", number: "FF-25", name: "Magik", characters: ["Magik"] },
  { subset: "Fanfare", number: "FF-26", name: "Magneto", characters: ["Magneto"] },
  { subset: "Fanfare", number: "FF-27", name: "Man-Wolf", characters: ["Man-Wolf"] },
  { subset: "Fanfare", number: "FF-28", name: "Mary Jane", characters: ["Mary Jane"] },
  { subset: "Fanfare", number: "FF-29", name: "Miles Morales", characters: ["Miles Morales"] },
  { subset: "Fanfare", number: "FF-30", name: "Moon Knight", characters: ["Moon Knight"] },
  { subset: "Fanfare", number: "FF-31", name: "Namor", characters: ["Namor"] },
  { subset: "Fanfare", number: "FF-32", name: "Nightcrawler", characters: ["Nightcrawler"] },
  { subset: "Fanfare", number: "FF-33", name: "Psylocke", characters: ["Psylocke"] },
  { subset: "Fanfare", number: "FF-34", name: "Red Goblin", characters: ["Red Goblin"] },
  { subset: "Fanfare", number: "FF-35", name: "Sabretooth", characters: ["Sabretooth"] },
  { subset: "Fanfare", number: "FF-36", name: "Scarlet Witch", characters: ["Scarlet Witch"] },
  { subset: "Fanfare", number: "FF-37", name: "She-Hulk", characters: ["She-Hulk"] },
  { subset: "Fanfare", number: "FF-38", name: "Silk", characters: ["Silk"] },
  { subset: "Fanfare", number: "FF-39", name: "Spider-Man", characters: ["Spider-Man"] },
  { subset: "Fanfare", number: "FF-40", name: "Spider-Man 2099", characters: ["Spider-Man 2099"] },
  { subset: "Fanfare", number: "FF-41", name: "Spider-Man Noir", characters: ["Spider-Man Noir"] },
  { subset: "Fanfare", number: "FF-42", name: "Spider-Woman", characters: ["Spider-Woman"] },
  { subset: "Fanfare", number: "FF-43", name: "Thanos", characters: ["Thanos"] },
  { subset: "Fanfare", number: "FF-44", name: "Thor", characters: ["Thor"] },
  { subset: "Fanfare", number: "FF-45", name: "U.S. Agent", characters: ["U.S. Agent"] },
  { subset: "Fanfare", number: "FF-46", name: "Venom", characters: ["Venom"] },
  { subset: "Fanfare", number: "FF-47", name: "Werewolf by Night", characters: ["Werewolf by Night"] },
  { subset: "Fanfare", number: "FF-48", name: "White Widow", characters: ["White Widow"] },
  { subset: "Fanfare", number: "FF-49", name: "Wolverine", characters: ["Wolverine"] },
  { subset: "Fanfare", number: "FF-50", name: "X-23", characters: ["X-23"] },

  // ---- Marvel Icons (MI, 20) ----
  { subset: "Marvel Icons", number: "MI-01", name: "Black Cat", characters: ["Black Cat"] },
  { subset: "Marvel Icons", number: "MI-02", name: "Carnage", characters: ["Carnage"] },
  { subset: "Marvel Icons", number: "MI-03", name: "Daredevil", characters: ["Daredevil"] },
  { subset: "Marvel Icons", number: "MI-04", name: "Dazzler", characters: ["Dazzler"] },
  { subset: "Marvel Icons", number: "MI-05", name: "Elektra", characters: ["Elektra"] },
  { subset: "Marvel Icons", number: "MI-06", name: "Gamora", characters: ["Gamora"] },
  { subset: "Marvel Icons", number: "MI-07", name: "Ghost-Spider", characters: ["Ghost-Spider"] },
  { subset: "Marvel Icons", number: "MI-08", name: "Gwenpool", characters: ["Gwenpool"] },
  { subset: "Marvel Icons", number: "MI-09", name: "Jeff the Land Shark", characters: ["Jeff the Land Shark"] },
  { subset: "Marvel Icons", number: "MI-10", name: "Kingpin", characters: ["Kingpin"] },
  { subset: "Marvel Icons", number: "MI-11", name: "Mary Jane", characters: ["Mary Jane"] },
  { subset: "Marvel Icons", number: "MI-12", name: "Medusa", characters: ["Medusa"] },
  { subset: "Marvel Icons", number: "MI-13", name: "Miles Morales", characters: ["Miles Morales"] },
  { subset: "Marvel Icons", number: "MI-14", name: "Moon Knight", characters: ["Moon Knight"] },
  { subset: "Marvel Icons", number: "MI-15", name: "Ms. Marvel", characters: ["Ms. Marvel"] },
  { subset: "Marvel Icons", number: "MI-16", name: "Beast", characters: ["Beast"] },
  { subset: "Marvel Icons", number: "MI-17", name: "Silk", characters: ["Silk"] },
  { subset: "Marvel Icons", number: "MI-18", name: "Scarlet Witch", characters: ["Scarlet Witch"] },
  { subset: "Marvel Icons", number: "MI-19", name: "Spider-Woman", characters: ["Spider-Woman"] },
  { subset: "Marvel Icons", number: "MI-20", name: "Wolverine", characters: ["Wolverine"] },

  // ---- Meanwhile (MW, 20) ----
  { subset: "Meanwhile", number: "MW-01", name: "The Newest Avengers Team" },
  { subset: "Meanwhile", number: "MW-02", name: "Radioactive Spider-Man", characters: ["Spider-Man"] },
  { subset: "Meanwhile", number: "MW-03", name: "Eddie Brock as Carnage", characters: ["Eddie Brock", "Carnage"] },
  { subset: "Meanwhile", number: "MW-04", name: "Ghost Riders Unite", characters: ["Ghost Rider"] },
  { subset: "Meanwhile", number: "MW-05", name: "A New Gwenpool", characters: ["Gwenpool"] },
  { subset: "Meanwhile", number: "MW-06", name: "Magik on her Own", characters: ["Magik"] },
  { subset: "Meanwhile", number: "MW-07", name: "New Avengers Assemble Again" },
  { subset: "Meanwhile", number: "MW-08", name: "Wiccan and the Witches' Road", characters: ["Wiccan"] },
  { subset: "Meanwhile", number: "MW-09", name: "The Captain Transformed", characters: ["Captain America"] },
  { subset: "Meanwhile", number: "MW-10", name: "X-Men of Apocalypse Arrive", characters: ["Apocalypse"] },
  { subset: "Meanwhile", number: "MW-11", name: "Spidey Goes Cosmic", characters: ["Spider-Man"] },
  { subset: "Meanwhile", number: "MW-12", name: "A New Journey for Doctor Strange", characters: ["Doctor Strange"] },
  { subset: "Meanwhile", number: "MW-13", name: "Rand Rises Again as Iron Fist", characters: ["Iron Fist"] },
  { subset: "Meanwhile", number: "MW-14", name: "Reunited Loves" },
  { subset: "Meanwhile", number: "MW-15", name: "Rogue vs. Storm", characters: ["Rogue", "Storm"] },
  { subset: "Meanwhile", number: "MW-16", name: "Laura Kinney is Sabretooth", characters: ["X-23", "Sabretooth"] },
  { subset: "Meanwhile", number: "MW-17", name: "Hell Hulk's 1st Appearance", characters: ["Infernal Hulk"] },
  { subset: "Meanwhile", number: "MW-18", name: "The Unstoppable Infernal Hulk", characters: ["Infernal Hulk"] },
  { subset: "Meanwhile", number: "MW-19", name: "Binary and the Phoenix Force", characters: ["Binary", "Dark Phoenix"] },
  { subset: "Meanwhile", number: "MW-20", name: "Wendigo is the Last Wolverine", characters: ["Wendigo", "Wolverine"] },

  // ---- One World Under Doom (OW, 20) ----
  { subset: "One World Under Doom", number: "OW-01", name: "One World Under Doom #1", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-02", name: "One World Under Doom #2", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-03", name: "One World Under Doom #3", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-04", name: "One World Under Doom #4", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-05", name: "One World Under Doom #5", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-06", name: "One World Under Doom #6", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-07", name: "One World Under Doom #7", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-08", name: "One World Under Doom #8", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-09", name: "One World Under Doom #9", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-10", name: "One World Under Doom #10", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-11", name: "One World Under Doom #11", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-12", name: "One World Under Doom #12", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-13", name: "One World Under Doom #13", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-14", name: "One World Under Doom #14", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-15", name: "One World Under Doom #15", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-16", name: "One World Under Doom #16", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-17", name: "One World Under Doom #17", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-18", name: "One World Under Doom #18", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-19", name: "One World Under Doom #19", characters: ["Doctor Doom"] },
  { subset: "One World Under Doom", number: "OW-20", name: "One World Under Doom #20", characters: ["Doctor Doom"] },

  // ---- Future Stars (FS, 20) ----
  { subset: "Future Stars", number: "FS-01", name: "Angela", characters: ["Angela"] },
  { subset: "Future Stars", number: "FS-02", name: "Moonstar", characters: ["Moonstar"] },
  { subset: "Future Stars", number: "FS-03", name: "Dark Gwenpool", characters: ["Dark Gwenpool"] },
  { subset: "Future Stars", number: "FS-04", name: "Glob", characters: ["Glob"] },
  { subset: "Future Stars", number: "FS-05", name: "Echo", characters: ["Echo"] },
  { subset: "Future Stars", number: "FS-06", name: "Hellverine", characters: ["Hellverine"] },
  { subset: "Future Stars", number: "FS-07", name: "Inari", characters: ["Inari"] },
  { subset: "Future Stars", number: "FS-08", name: "Jia Jing", characters: ["Jia Jing"] },
  { subset: "Future Stars", number: "FS-09", name: "Kid Venom", characters: ["Kid Venom"] },
  { subset: "Future Stars", number: "FS-10", name: "Kid Juggernaut", characters: ["Kid Juggernaut"] },
  { subset: "Future Stars", number: "FS-11", name: "Luna Snow", characters: ["Luna Snow"] },
  { subset: "Future Stars", number: "FS-12", name: "Myrddin", characters: ["Myrddin"] },
  { subset: "Future Stars", number: "FS-13", name: "Peni Parker", characters: ["Peni Parker"] },
  { subset: "Future Stars", number: "FS-14", name: "Rachel Summers", characters: ["Rachel Summers"] },
  { subset: "Future Stars", number: "FS-15", name: "Revelation", characters: ["Revelation"] },
  { subset: "Future Stars", number: "FS-16", name: "Weapon VIII", characters: ["Weapon VIII"] },
  { subset: "Future Stars", number: "FS-17", name: "Web-Weaver", characters: ["Web-Weaver"] },
  { subset: "Future Stars", number: "FS-18", name: "White Fox", characters: ["White Fox"] },
  { subset: "Future Stars", number: "FS-19", name: "White Tiger", characters: ["White Tiger"] },
  { subset: "Future Stars", number: "FS-20", name: "Wonderful Wolverine", characters: ["Wolverine"] },

  // ---- The Beyond (TB, 20) ----
  { subset: "The Beyond", number: "TB-01", name: "Beyonder", characters: ["Beyonder"] },
  { subset: "The Beyond", number: "TB-02", name: "Molecule Man", characters: ["Molecule Man"] },
  { subset: "The Beyond", number: "TB-03", name: "Thor", characters: ["Thor"] },
  { subset: "The Beyond", number: "TB-04", name: "Hulk", characters: ["Hulk"] },
  { subset: "The Beyond", number: "TB-05", name: "Miles Morales", characters: ["Miles Morales"] },
  { subset: "The Beyond", number: "TB-06", name: "Silver Surfer", characters: ["Silver Surfer"] },
  { subset: "The Beyond", number: "TB-07", name: "Doctor Strange", characters: ["Doctor Strange"] },
  { subset: "The Beyond", number: "TB-08", name: "Captain Marvel", characters: ["Captain Marvel"] },
  { subset: "The Beyond", number: "TB-09", name: "Black Panther", characters: ["Black Panther"] },
  { subset: "The Beyond", number: "TB-10", name: "Invisible Woman", characters: ["Invisible Woman"] },
  { subset: "The Beyond", number: "TB-11", name: "Mister Fantastic", characters: ["Mister Fantastic"] },
  { subset: "The Beyond", number: "TB-12", name: "Doctor Doom", characters: ["Doctor Doom"] },
  { subset: "The Beyond", number: "TB-13", name: "Maker", characters: ["Maker"] },
  { subset: "The Beyond", number: "TB-14", name: "Thanos", characters: ["Thanos"] },
  { subset: "The Beyond", number: "TB-15", name: "Star-Lord", characters: ["Star-Lord"] },
  { subset: "The Beyond", number: "TB-16", name: "Mister Sinister", characters: ["Mister Sinister"] },
  { subset: "The Beyond", number: "TB-17", name: "She-Hulk", characters: ["She-Hulk"] },
  { subset: "The Beyond", number: "TB-18", name: "Phoenix", characters: ["Phoenix"] },
  { subset: "The Beyond", number: "TB-19", name: "Knull", characters: ["Knull"] },
  { subset: "The Beyond", number: "TB-20", name: "Death", characters: ["Death"] },

  // ---- 60 Years Of Black Panther (BP, 10) ----
  { subset: "60 Years Of Black Panther", number: "BP-01", name: "60 Years of Black Panther #1", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-02", name: "60 Years of Black Panther #2", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-03", name: "60 Years of Black Panther #3", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-04", name: "60 Years of Black Panther #4", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-05", name: "60 Years of Black Panther #5", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-06", name: "60 Years of Black Panther #6", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-07", name: "60 Years of Black Panther #7", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-08", name: "60 Years of Black Panther #8", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-09", name: "60 Years of Black Panther #9", characters: ["Black Panther"] },
  { subset: "60 Years Of Black Panther", number: "BP-10", name: "60 Years of Black Panther #10", characters: ["Black Panther"] },

  // ---- 65 Fantastic Years (FY, 10) ----
  { subset: "65 Fantastic Years", number: "FY-01", name: "Mister Fantastic", characters: ["Mister Fantastic"] },
  { subset: "65 Fantastic Years", number: "FY-02", name: "Invisible Woman", characters: ["Invisible Woman"] },
  { subset: "65 Fantastic Years", number: "FY-03", name: "Human Torch", characters: ["Human Torch"] },
  { subset: "65 Fantastic Years", number: "FY-04", name: "The Thing", characters: ["The Thing"] },
  { subset: "65 Fantastic Years", number: "FY-05", name: "Doctor Doom", characters: ["Doctor Doom"] },
  { subset: "65 Fantastic Years", number: "FY-06", name: "Galactus", characters: ["Galactus"] },
  { subset: "65 Fantastic Years", number: "FY-07", name: "Silver Surfer", characters: ["Silver Surfer"] },
  { subset: "65 Fantastic Years", number: "FY-08", name: "Franklin Richards", characters: ["Franklin Richards"] },
  { subset: "65 Fantastic Years", number: "FY-09", name: "Valeria Richards", characters: ["Valeria Richards"] },
  { subset: "65 Fantastic Years", number: "FY-10", name: "She-Hulk", characters: ["She-Hulk"] },

  // ---- X-Force 35th Anniversary (XF, 10) ----
  { subset: "X-Force 35th Anniversary", number: "XF-01", name: "Cable", characters: ["Cable"] },
  { subset: "X-Force 35th Anniversary", number: "XF-02", name: "Caliban", characters: ["Caliban"] },
  { subset: "X-Force 35th Anniversary", number: "XF-03", name: "Boom Boom", characters: ["Boom Boom"] },
  { subset: "X-Force 35th Anniversary", number: "XF-04", name: "Cannonball", characters: ["Cannonball"] },
  { subset: "X-Force 35th Anniversary", number: "XF-05", name: "Domino", characters: ["Domino"] },
  { subset: "X-Force 35th Anniversary", number: "XF-06", name: "Feral", characters: ["Feral"] },
  { subset: "X-Force 35th Anniversary", number: "XF-07", name: "Rictor", characters: ["Rictor"] },
  { subset: "X-Force 35th Anniversary", number: "XF-08", name: "Shatterstar", characters: ["Shatterstar"] },
  { subset: "X-Force 35th Anniversary", number: "XF-09", name: "Sunspot", characters: ["Sunspot"] },
  { subset: "X-Force 35th Anniversary", number: "XF-10", name: "Warpath", characters: ["Warpath"] },

  // ---- Classic Comic Book Covers (CC, 10) ----
  { subset: "Classic Comic Book Covers", number: "CC-01", name: "X-Men #31" },
  { subset: "Classic Comic Book Covers", number: "CC-02", name: "Fantastic Four #72" },
  { subset: "Classic Comic Book Covers", number: "CC-03", name: "Iron Man #300", characters: ["Iron Man"] },
  { subset: "Classic Comic Book Covers", number: "CC-04", name: "The X-Men #39" },
  { subset: "Classic Comic Book Covers", number: "CC-05", name: "Spider-Man #36", characters: ["Spider-Man"] },
  { subset: "Classic Comic Book Covers", number: "CC-06", name: "Avengers #16" },
  { subset: "Classic Comic Book Covers", number: "CC-07", name: "Uncanny X-Men #200" },
  { subset: "Classic Comic Book Covers", number: "CC-08", name: "Defenders #67" },
  { subset: "Classic Comic Book Covers", number: "CC-09", name: "Captain America #110", characters: ["Captain America"] },
  { subset: "Classic Comic Book Covers", number: "CC-10", name: "Peter Parker, The Spectacular Spider-Man #107", characters: ["Spider-Man"] },

  // ---- Cordially Invited (CI, 5) ----
  { subset: "Cordially Invited", number: "CI-01", name: "Kevin Feige", persons: ["Kevin Feige"] },
  { subset: "Cordially Invited", number: "CI-02", name: "Aaron Judge", persons: ["Aaron Judge"] },
  { subset: "Cordially Invited", number: "CI-03", name: "Seth Meyers", persons: ["Seth Meyers"] },
  { subset: "Cordially Invited", number: "CI-04", name: "Pete Alonso", persons: ["Pete Alonso"] },
  { subset: "Cordially Invited", number: "CI-05", name: "Steve Aoki", persons: ["Steve Aoki"] },

  // ---- Marvel Reflections (MR, 5) ----
  { subset: "Marvel Reflections", number: "MR-01", name: "Blade & Mephisto", characters: ["Blade", "Mephisto"] },
  { subset: "Marvel Reflections", number: "MR-02", name: "Bruce Banner & Hulk", characters: ["Bruce Banner", "Hulk"] },
  { subset: "Marvel Reflections", number: "MR-03", name: "Venom & Carnage", characters: ["Venom", "Carnage"] },
  { subset: "Marvel Reflections", number: "MR-04", name: "X-23 & Sentinel", characters: ["X-23", "Sentinel"] },
  { subset: "Marvel Reflections", number: "MR-05", name: "Iron Man & Fin Fang Foom", characters: ["Iron Man", "Fin Fang Foom"] },

  // ---- Topps Originals (TO, 10) ----
  { subset: "Topps Originals", number: "TO-01", name: "Black Cat", characters: ["Black Cat"], artists: ["Lucio Parrillo"] },
  { subset: "Topps Originals", number: "TO-02", name: "Green Goblin", characters: ["Green Goblin"], artists: ["Lucio Parrillo"] },
  { subset: "Topps Originals", number: "TO-03", name: "Darkhawk", characters: ["Darkhawk"], artists: ["Ken Steacy"] },
  { subset: "Topps Originals", number: "TO-04", name: "Iron Man", characters: ["Iron Man"], artists: ["Ken Steacy"] },
  { subset: "Topps Originals", number: "TO-05", name: "Ghost Rider", characters: ["Ghost Rider"], artists: ["Nelson"] },
  { subset: "Topps Originals", number: "TO-06", name: "Venom", characters: ["Venom"], artists: ["Nelson"] },
  { subset: "Topps Originals", number: "TO-07", name: "Captain America", characters: ["Captain America"], artists: ["Marc Sasso"] },
  { subset: "Topps Originals", number: "TO-08", name: "Cable", characters: ["Cable"], artists: ["Marc Sasso"] },
  { subset: "Topps Originals", number: "TO-09", name: "Nightcrawler", characters: ["Nightcrawler"], artists: ["Dan Brereton"] },
  { subset: "Topps Originals", number: "TO-10", name: "Apocalypse", characters: ["Apocalypse"], artists: ["Dan Brereton"] },

  // ---- Astonishing (AS, 10) ----
  { subset: "Astonishing", number: "AS-01", name: "Black Widow", characters: ["Black Widow"] },
  { subset: "Astonishing", number: "AS-02", name: "Captain America", characters: ["Captain America"] },
  { subset: "Astonishing", number: "AS-03", name: "Daredevil", characters: ["Daredevil"] },
  { subset: "Astonishing", number: "AS-04", name: "Doctor Strange", characters: ["Doctor Strange"] },
  { subset: "Astonishing", number: "AS-05", name: "Hulk", characters: ["Hulk"] },
  { subset: "Astonishing", number: "AS-06", name: "Iron Man", characters: ["Iron Man"] },
  { subset: "Astonishing", number: "AS-07", name: "Spider-Man", characters: ["Spider-Man"] },
  { subset: "Astonishing", number: "AS-08", name: "Thanos", characters: ["Thanos"] },
  { subset: "Astonishing", number: "AS-09", name: "Thor", characters: ["Thor"] },
  { subset: "Astonishing", number: "AS-10", name: "Venom", characters: ["Venom"] },

  // ---- Golden Anniversaries (GA, 10) ----
  { subset: "Golden Anniversaries", number: "GA-01", name: "Ajak", characters: ["Ajak"] },
  { subset: "Golden Anniversaries", number: "GA-02", name: "Arishem", characters: ["Arishem"] },
  { subset: "Golden Anniversaries", number: "GA-03", name: "Psylocke", characters: ["Psylocke"] },
  { subset: "Golden Anniversaries", number: "GA-04", name: "Tom Cassidy", characters: ["Tom Cassidy"] },
  { subset: "Golden Anniversaries", number: "GA-05", name: "Captain Britain", characters: ["Captain Britain"] },
  { subset: "Golden Anniversaries", number: "GA-06", name: "Darkstar", characters: ["Darkstar"] },
  { subset: "Golden Anniversaries", number: "GA-07", name: "Ikaris", characters: ["Ikaris"] },
  { subset: "Golden Anniversaries", number: "GA-08", name: "Jack of Hearts", characters: ["Jack of Hearts"] },
  { subset: "Golden Anniversaries", number: "GA-09", name: "Nova", characters: ["Nova"] },
  { subset: "Golden Anniversaries", number: "GA-10", name: "Star-Lord", characters: ["Star-Lord"] },

  // ---- The One And Only Superfractors (TO-xx, 5, /1) ----
  { subset: "The One And Only Superfractor", number: "TO-01", name: "Sam Wilson", characters: ["Sam Wilson"], serialTo: 1 },
  { subset: "The One And Only Superfractor", number: "TO-02", name: "Morbius", characters: ["Morbius"], serialTo: 1 },
  { subset: "The One And Only Superfractor", number: "TO-03", name: "Mighty Thor", characters: ["Thor"], serialTo: 1 },
  { subset: "The One And Only Superfractor", number: "TO-04", name: "Kang", characters: ["Kang"], serialTo: 1 },
  { subset: "The One And Only Superfractor", number: "TO-05", name: "Union Jack", characters: ["Union Jack"], serialTo: 1 },

  // ---- Varied Visage AoA (VV, 11) ----
  { subset: "Varied Visage AoA", number: "VV-01", name: "Emma Frost", characters: ["Emma Frost"] },
  { subset: "Varied Visage AoA", number: "VV-02", name: "Psylocke", characters: ["Psylocke"] },
  { subset: "Varied Visage AoA", number: "VV-03", name: "Weapon X", characters: ["Weapon X"] },
  { subset: "Varied Visage AoA", number: "VV-04", name: "Jean Grey", characters: ["Jean Grey"] },
  { subset: "Varied Visage AoA", number: "VV-05", name: "Cyclops", characters: ["Cyclops"] },
  { subset: "Varied Visage AoA", number: "VV-06", name: "Apocalypse", characters: ["Apocalypse"] },
  { subset: "Varied Visage AoA", number: "VV-07", name: "Magneto", characters: ["Magneto"] },
  { subset: "Varied Visage AoA", number: "VV-08", name: "Rogue", characters: ["Rogue"] },
  { subset: "Varied Visage AoA", number: "VV-09", name: "Gambit", characters: ["Gambit"] },
  { subset: "Varied Visage AoA", number: "VV-10", name: "Storm", characters: ["Storm"] },
  { subset: "Varied Visage AoA", number: "VV-11", name: "Scarlet Witch", characters: ["Scarlet Witch"] },

  // ---- Topps Patrimony Refractors (TP, 5, /25) ----
  { subset: "Topps Patrimony Refractor", number: "TP-01", name: "Human Torch 1961", characters: ["Human Torch"], serialTo: 25 },
  { subset: "Topps Patrimony Refractor", number: "TP-02", name: "The Thing 1961", characters: ["The Thing"], serialTo: 25 },
  { subset: "Topps Patrimony Refractor", number: "TP-03", name: "Drax 1973", characters: ["Drax"], serialTo: 25 },
  { subset: "Topps Patrimony Refractor", number: "TP-04", name: "Quasar 1978", characters: ["Quasar"], serialTo: 25 },
  { subset: "Topps Patrimony Refractor", number: "TP-05", name: "Rocket Raccoon 1982", characters: ["Rocket Raccoon"], serialTo: 25 },

  // ---- Sketch Cards: Artist Originals ----
  { subset: "Sketch Card – Artist Original", number: "AO-01", name: "Kevin Eastman", artists: ["Kevin Eastman"], serialTo: 1 },
  { subset: "Sketch Card – Artist Original", number: "AO-02", name: "Adi Granov", artists: ["Adi Granov"], serialTo: 1 },
];

/** 124 Sketch Card artists (subset "Sketch Card"). */
const SKETCH_ARTISTS: string[] = [
  "A jhay", "Adam Fields", "Aditya Chandra", "Al Stefano", "Alcione Silva",
  "Alessandro Micelli", "Alex Mines", "Allen Geneta", "Allenser", "Andrew Fernandes",
  "ANDY TIU", "Angel Aviles", "Angelo De Capua", "Ariel Aguire", "Ariel Mamani",
  "Ash", "Benjamin Lombart", "Bete Rodrigues", "BLANCAS", "Brent Ragland",
  "Carlo Allen Victoria", "Carlton", "Chao", "Chenduz", "Chris Foreman",
  "Chris Meeks", "Cisco Rivera", "Clark", "Court", "Cyrus Sherkat",
  "Daniel Farruggia", "Daniel M Chavez", "Daniel Riveron", "Danny", "Darrin Pepe",
  "Debora Centeio", "Dexter Wee", "DMN", "Dove McHargue", "DRE",
  "Duke", "DYJ", "Dylan Riley", "Elvin A Hernandez", "Emmanuel Villafana \"EMMVILL\"",
  "Emrah Cildir", "Eric", "Eric Lehtonen", "Ernest Romero", "Fabio Ramacci",
  "FEDZZ", "Frank A. Kadar", "Franklim Teixeira", "Fresia", "Gabriel Tardivo",
  "Gary Shipman", "Gerry Garcia Jr", "Getatom", "Gilbert Perez Art", "Greg Kirkpatrick",
  "Greg Treize", "Hector Barros", "Hugh Vogt", "IQ", "Isiah Xavier Bradley",
  "Jason Christner", "Jason Queen", "Jason Rodriguez", "Jason Saldajeno", "Jason Sobol",
  "Jay Peteranetz", "Jessica Hickman", "Jezreel L Rojales", "Jiaxin \"YinShan\" Sun", "Jim Dickson",
  "Jim O'Riley", "John Pleak", "John-Paul Howard", "JohnruzelJimenez", "Jojo Hilario",
  "Keith Farnum", "Kenny Calderon", "Kevin Norman", "Larry Santiago", "Lee Lightfoot",
  "Leon Braojos", "Loc Nguyen", "Louis Womble", "Lucas", "Marcia Dye",
  "Marco Carrillo", "Marcus D. Newsome", "Marlo Martos", "marservicio", "Matt Stewart",
  "Matthew Lopez", "Matthew Warlick", "Michael Mastermaker", "Mike Dalzell", "Mirko Di Noia",
  "Mohammad Jilani", "Nathanna Erica", "NerP", "Nick Gribbon", "Noval Hernawan",
  "Patricio Carrasco", "Percival Kholoma", "Rafael Dante", "Rich Hennemann", "Richard E. Valbuena a.k.a. Richval",
  "Rob Demers", "Rodel Martin", "Ronel Gravo", "Roy Cover", "Rustico Limosinero",
  "Ryan Finley", "Sherwin Santiago", "Stephane Leonardi", "Steve Alce", "Sturdy",
  "Takkun", "Tim Shinn", "TOMA", "Jason (Japanese)",
];

async function main() {
  const totalOthers =
    AUTO_AND_INSERT_CARDS.length + SKETCH_ARTISTS.length;
  console.log(
    `Seeding: ${SET_NAME} (${BASE_NAMES.length} base + ${BASE_NAMES.length} Clawed Chrome + ${totalOthers} autos/relics/inserts/sketches)`
  );

  const universeId = await builder.getOrCreateUniverse("Non-Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Marvel", universeId);
  const brandId = await builder.getOrCreateBrand("Topps Chrome", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Chrome Marvel Comics 2026", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: BASE_NAMES.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  let variants = 0;
  const t0 = Date.now();

  // Pre-fetch existing card ids once — a cheap idempotent resume check
  // instead of one findUnique per row (which dominated runtime before).
  const existingIds = new Set<string>(
    (await prisma.card.findMany({ where: { setId: set.id }, select: { id: true } })).map((c) => c.id)
  );

  // ---- Base set (1-200) with all base parallels ----
  const baseParallelIds = new Map<string, string>();
  for (const p of BASE_PARALLELS) {
    baseParallelIds.set(p.name, await builder.getOrCreateParallel(p.name));
  }
  const baseVariantRows = BASE_PARALLELS.map((p) => ({
    printingId: basePrintingId,
    parallelId: baseParallelIds.get(p.name)!,
    serialTo: p.serialTo,
  }));

  for (const [i, name] of BASE_NAMES.entries()) {
    const number = String(i + 1);
    const cardId = `${SET_ID}-${number}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const charId = await builder.getOrCreateCharacter(name);
    const isDebut = DEBUT_NUMBERS.has(number);

    await prisma.card.create({
      data: {
        id: cardId,
        name,
        number,
        setId: set.id,
        supertype: isDebut ? "Debut" : "Character",
        subtypes: isDebut ? "Debut" : undefined,
        characters: { connect: { id: charId } },
      },
    });
    existingIds.add(cardId);

    // Base printing + every base parallel in a single batched insert.
    await prisma.variant.createMany({
      data: [{ cardId, printingId: basePrintingId }, ...baseVariantRows.map((v) => ({ cardId, ...v }))],
    });
    variants += 1 + baseVariantRows.length;

    created++;
    if ((i + 1) % 50 === 0) {
      console.log(
        `  base [${i + 1}/${BASE_NAMES.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    }
  }

  console.log(`Base set done. Created ${created}, skipped ${skipped}.`);

  // ---- Clawed Chrome Variations (200, same numbers) ----
  const clawedInsertId = await builder.getOrCreateInsert("Clawed Chrome", set.id);
  const clawedParallelIds = new Map<string, string>();
  for (const p of CLAWED_CHROME_PARALLELS) {
    clawedParallelIds.set(p.name, await builder.getOrCreateParallel(p.name));
  }
  const clawedVariantRows = CLAWED_CHROME_PARALLELS.map((p) => ({
    printingId: basePrintingId,
    insertId: clawedInsertId,
    parallelId: clawedParallelIds.get(p.name)!,
    serialTo: p.serialTo,
  }));

  for (const [i, name] of BASE_NAMES.entries()) {
    const number = String(i + 1);
    const cardId = `${SET_ID}-clawed-chrome-${number}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const charId = await builder.getOrCreateCharacter(name);

    await prisma.card.create({
      data: {
        id: cardId,
        name,
        number,
        setId: set.id,
        supertype: "Clawed Chrome",
        subtypes: "Variation",
        characters: { connect: { id: charId } },
      },
    });
    existingIds.add(cardId);

    // Base Clawed Chrome version (/20) + the three rarer tiers, batched.
    await prisma.variant.createMany({
      data: clawedVariantRows.map((v) => ({ cardId, ...v })),
    });
    variants += clawedVariantRows.length;

    created++;
    if ((i + 1) % 50 === 0) {
      console.log(
        `  clawed [${i + 1}/${BASE_NAMES.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    }
  }

  console.log(`Clawed Chrome done. Created ${created}, skipped ${skipped}.`);

  // ---- Autographs, relics, inserts, artist-original sketches ----
  const subsetParallelIds = new Map<string, Map<string, string>>();
  for (const [subset, defs] of Object.entries(SUBSET_PARALLELS)) {
    const inner = new Map<string, string>();
    for (const p of defs) inner.set(p.name, await builder.getOrCreateParallel(p.name));
    subsetParallelIds.set(subset, inner);
  }

  for (const [i, row] of AUTO_AND_INSERT_CARDS.entries()) {
    const cardId = `${SET_ID}-${slug(row.subset)}-${slug(row.number)}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const charIds: string[] = [];
    if (row.characters) {
      for (const c of row.characters) charIds.push(await builder.getOrCreateCharacter(c));
    }
    const personIds: string[] = [];
    if (row.persons) {
      for (const p of row.persons) personIds.push(await builder.getOrCreatePerson(p));
    }
    const artistIds: string[] = [];
    if (row.artists) {
      for (const a of row.artists) artistIds.push(await builder.getOrCreateArtist(a));
    }

    const insertId = await builder.getOrCreateInsert(row.subset, set.id);

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: row.subset,
        characters: charIds.length ? { connect: charIds.map((id) => ({ id })) } : undefined,
        persons: personIds.length ? { connect: personIds.map((id) => ({ id })) } : undefined,
        artists: artistIds.length ? { connect: artistIds.map((id) => ({ id })) } : undefined,
      },
    });
    existingIds.add(cardId);

    // Base variant + subset-specific color/foil parallels, batched.
    const variantData: any[] = [
      {
        cardId,
        printingId: basePrintingId,
        insertId,
        isAuto: row.auto ?? false,
        isRelic: row.relic ?? false,
        serialTo: row.serialTo,
      },
    ];
    const inner = subsetParallelIds.get(row.subset);
    if (inner) {
      for (const p of SUBSET_PARALLELS[row.subset]) {
        variantData.push({
          cardId,
          printingId: basePrintingId,
          insertId,
          parallelId: inner.get(p.name)!,
          isAuto: row.auto ?? false,
          isRelic: row.relic ?? false,
          serialTo: p.serialTo,
        });
      }
    }

    await prisma.variant.createMany({ data: variantData });
    variants += variantData.length;

    created++;
    if ((i + 1) % 50 === 0) {
      console.log(
        `  inserts [${i + 1}/${AUTO_AND_INSERT_CARDS.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    }
  }

  // ---- Sketch Cards (124 artists) ----
  for (const [i, artistName] of SKETCH_ARTISTS.entries()) {
    const number = `SK-${String(i + 1).padStart(3, "0")}`;
    const cardId = `${SET_ID}-sketch-card-${slug(number)}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const artistId = await builder.getOrCreateArtist(artistName);
    const insertId = await builder.getOrCreateInsert("Sketch Card", set.id);

    await prisma.card.create({
      data: {
        id: cardId,
        name: artistName,
        number,
        setId: set.id,
        supertype: "Sketch Card",
        artists: { connect: { id: artistId } },
      },
    });
    existingIds.add(cardId);

    await prisma.variant.create({ data: { cardId, printingId: basePrintingId, insertId } });
    variants++;

    created++;
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

