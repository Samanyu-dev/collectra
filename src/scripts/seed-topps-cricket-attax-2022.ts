import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds "Topps Cricket Attax 2022" — 344 cards: #1-328 numbered checklist +
 * LE1-LE16 Limited Edition rows, covering The Hundred (2022 season, all 8
 * franchises, men's and women's squads in one checklist).
 *
 * Column mapping (source: No. | Title | Section | Type | Need | Offer | Hold
 * | Need/Offer ratio — Need/Offer/Hold/ratio are community trade-demand
 * stats, not catalog data, and are deliberately not seeded, per this
 * project's established precedent for this exact checklist shape, see
 * HANDOFF_turbo-attax-2020.md):
 *  - Title -> Card.name (player name, or team name for Team Logos rows)
 *  - Section -> Team (via Card.teams), not an Insert — this differs from the
 *    Turbo Attax 2020 precedent where "Section" held insert-like subset
 *    names; here it's a plain team affiliation, exactly the same shape
 *    football sets already use Card.teams for.
 *  - Type -> "Heroes" is the base checklist type (~176 of 328 rows, no
 *    Insert record); every other Type value (Captain Fantastic, New
 *    Signing, Super Boosters, Team Logos, Future Legends, Matchwinners,
 *    Gone For 4, Hit For 6, 100 Club, Centurion, Limited Edition) becomes
 *    its own Insert.
 *
 * Franchise placement: reuses the existing "Cricket" Franchise (under the
 * "Sports" Universe) rather than creating a narrower "The Hundred"
 * Franchise — matches the "Formula 1" Franchise precedent, which holds
 * every F1-branded Attax set regardless of specific competition.
 * Brand = new "Cricket Attax" (product line, not year-scoped) under
 * manufacturer Topps, matching the Match Attax / Turbo Attax brand
 * convention already in this DB (one Brand per product line, one Series per
 * year under it).
 *
 * Name normalizations applied (each backed by an in-list spelling conflict
 * for the same evident person — not an outside-knowledge correction):
 *  - "Heath Knight" (row 42) -> "Heather Knight" (matches rows 180/317/326)
 *  - "Saquib Mahmood" (row 97) -> "Saqib Mahmood" (matches row 269)
 *  - "Tamale Mills" (row 120) -> "Tymal Mills" (matches row 236)
 *  - "Nat Scriver" (rows 152, 311) -> "Nat Sciver" (matches row 190)
 *  - "Meg Planning" (row 220) -> "Meg Lanning" (matches rows 145, 295)
 *  - "Sophie Eccleston" (row 324) -> "Sophie Ecclestone" (matches rows 66, 291)
 *
 * No pricing data was supplied for this checklist (unlike Turbo Attax
 * 2020) — none seeded.
 */
const SET_ID = "topps-cricket-attax-2022";
const SET_NAME = "Cricket Attax 2022";

interface CardRow {
  number: string;
  name: string;
  team: string;
  type: string;
  isTeamCard?: boolean; // Team Logos rows: no Person, just the Team itself
}

const ROWS: CardRow[] = [
  // ---- Heroes: Birmingham Phoenix (1-22) ----
  { number: "1", name: "Adam Milne", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "2", name: "Tom Abell", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "3", name: "Chris Woakes", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "4", name: "Matthew Wade", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "5", name: "Benny Howell", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "6", name: "Jack Leach", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "7", name: "Olly Stone", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "8", name: "Liam Livingstone", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "9", name: "Miles Hammond", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "10", name: "Moeen Ali", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "11", name: "Will Smeed", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "12", name: "Abtaha Maqsood", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "13", name: "Amy Jones", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "14", name: "Emily Arlott", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "15", name: "Ellyse Perry", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "16", name: "Evelyn Jones", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "17", name: "Georgia Elwiss", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "18", name: "Gwen Davies", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "19", name: "Issy Wong", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "20", name: "Sophie Devine", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "21", name: "Kirstie Gordon", team: "Birmingham Phoenix", type: "Heroes" },
  { number: "22", name: "Sophie Molineux", team: "Birmingham Phoenix", type: "Heroes" },

  // ---- Heroes: London Spirit (23-44) ----
  { number: "23", name: "Adam Rossington", team: "London Spirit", type: "Heroes" },
  { number: "24", name: "Dan Lawrence", team: "London Spirit", type: "Heroes" },
  { number: "25", name: "Eoin Morgan", team: "London Spirit", type: "Heroes" },
  { number: "26", name: "Mark Wood", team: "London Spirit", type: "Heroes" },
  { number: "27", name: "Glenn Maxwell", team: "London Spirit", type: "Heroes" },
  { number: "28", name: "Mason Crane", team: "London Spirit", type: "Heroes" },
  { number: "29", name: "Riley Meredith", team: "London Spirit", type: "Heroes" },
  { number: "30", name: "Ravi Bopara", team: "London Spirit", type: "Heroes" },
  { number: "31", name: "Brad Wheal", team: "London Spirit", type: "Heroes" },
  { number: "32", name: "Zak Crawley", team: "London Spirit", type: "Heroes" },
  { number: "33", name: "Daniel Bell-Drummond", team: "London Spirit", type: "Heroes" },
  { number: "34", name: "Alice Monaghan", team: "London Spirit", type: "Heroes" },
  { number: "35", name: "Amara Carr", team: "London Spirit", type: "Heroes" },
  { number: "36", name: "Charlie Dean", team: "London Spirit", type: "Heroes" },
  { number: "37", name: "Beth Mooney", team: "London Spirit", type: "Heroes" },
  { number: "38", name: "Danielle Gibson", team: "London Spirit", type: "Heroes" },
  { number: "39", name: "Amelia Kerr", team: "London Spirit", type: "Heroes" },
  { number: "40", name: "Megan Schutt", team: "London Spirit", type: "Heroes" },
  { number: "41", name: "Freya Davies", team: "London Spirit", type: "Heroes" },
  { number: "42", name: "Heather Knight", team: "London Spirit", type: "Heroes" }, // source: "Heath Knight"
  { number: "43", name: "Naomi Dattani", team: "London Spirit", type: "Heroes" },
  { number: "44", name: "Grace Scrivens", team: "London Spirit", type: "Heroes" },

  // ---- Heroes: Manchester Originals (45-66) ----
  { number: "45", name: "Jamie Overton", team: "Manchester Originals", type: "Heroes" },
  { number: "46", name: "Colin Ackermann", team: "Manchester Originals", type: "Heroes" },
  { number: "47", name: "Tom Lammonby", team: "Manchester Originals", type: "Heroes" },
  { number: "48", name: "Wanindu Hasaranga", team: "Manchester Originals", type: "Heroes" },
  { number: "49", name: "Jos Buttler", team: "Manchester Originals", type: "Heroes" },
  { number: "50", name: "Matt Parkinson", team: "Manchester Originals", type: "Heroes" },
  { number: "51", name: "Sean Abbott", team: "Manchester Originals", type: "Heroes" },
  { number: "52", name: "Phil Salt", team: "Manchester Originals", type: "Heroes" },
  { number: "53", name: "Calvin Harrison", team: "Manchester Originals", type: "Heroes" },
  { number: "54", name: "Daniel Worrall", team: "Manchester Originals", type: "Heroes" },
  { number: "55", name: "Ollie Robinson", team: "Manchester Originals", type: "Heroes" },
  { number: "56", name: "Amy Satterthwaite", team: "Manchester Originals", type: "Heroes" },
  { number: "57", name: "Laura Jackson", team: "Manchester Originals", type: "Heroes" },
  { number: "58", name: "Cordelia Griffith", team: "Manchester Originals", type: "Heroes" },
  { number: "59", name: "Ellie Threlkeld", team: "Manchester Originals", type: "Heroes" },
  { number: "60", name: "Emma Lamb", team: "Manchester Originals", type: "Heroes" },
  { number: "61", name: "Georgie Boyce", team: "Manchester Originals", type: "Heroes" },
  { number: "62", name: "Hannah Jones", team: "Manchester Originals", type: "Heroes" },
  { number: "63", name: "Deandra Dottin", team: "Manchester Originals", type: "Heroes" },
  { number: "64", name: "Kate Cross", team: "Manchester Originals", type: "Heroes" },
  { number: "65", name: "Lizelle Lee", team: "Manchester Originals", type: "Heroes" },
  { number: "66", name: "Sophie Ecclestone", team: "Manchester Originals", type: "Heroes" },

  // ---- Heroes: Northern Superchargers (67-88) ----
  { number: "67", name: "Adil Rashid", team: "Northern Superchargers", type: "Heroes" },
  { number: "68", name: "Faf Du Plessis", team: "Northern Superchargers", type: "Heroes" },
  { number: "69", name: "Ben Stokes", team: "Northern Superchargers", type: "Heroes" },
  { number: "70", name: "Brydon Carse", team: "Northern Superchargers", type: "Heroes" },
  { number: "71", name: "David Willey", team: "Northern Superchargers", type: "Heroes" },
  { number: "72", name: "Adam Lyth", team: "Northern Superchargers", type: "Heroes" },
  { number: "73", name: "Harry Brook", team: "Northern Superchargers", type: "Heroes" },
  { number: "74", name: "John Simpson", team: "Northern Superchargers", type: "Heroes" },
  { number: "75", name: "Matthew Potts", team: "Northern Superchargers", type: "Heroes" },
  { number: "76", name: "Roelof Van Der Merwe", team: "Northern Superchargers", type: "Heroes" },
  { number: "77", name: "Wahab Riaz", team: "Northern Superchargers", type: "Heroes" },
  { number: "78", name: "Alice Davidson-Richards", team: "Northern Superchargers", type: "Heroes" },
  { number: "79", name: "Bess Heath", team: "Northern Superchargers", type: "Heroes" },
  { number: "80", name: "Hollie Armitage", team: "Northern Superchargers", type: "Heroes" },
  { number: "81", name: "Jemimah Rodrigues", team: "Northern Superchargers", type: "Heroes" },
  { number: "82", name: "Katie Levick", team: "Northern Superchargers", type: "Heroes" },
  { number: "83", name: "Lucy Higham", team: "Northern Superchargers", type: "Heroes" },
  { number: "84", name: "Laura Wolvaardt", team: "Northern Superchargers", type: "Heroes" },
  { number: "85", name: "Linsey Smith", team: "Northern Superchargers", type: "Heroes" },
  { number: "86", name: "Beth Langston", team: "Northern Superchargers", type: "Heroes" },
  { number: "87", name: "Alyssa Healy", team: "Northern Superchargers", type: "Heroes" },
  { number: "88", name: "Kalea Moore", team: "Northern Superchargers", type: "Heroes" },

  // ---- Heroes: Oval Invincibles (89-110) ----
  { number: "89", name: "Danny Briggs", team: "Oval Invincibles", type: "Heroes" },
  { number: "90", name: "Jason Roy", team: "Oval Invincibles", type: "Heroes" },
  { number: "91", name: "Riley Rossouw", team: "Oval Invincibles", type: "Heroes" },
  { number: "92", name: "Sunil Narine", team: "Oval Invincibles", type: "Heroes" },
  { number: "93", name: "Reece Topley", team: "Oval Invincibles", type: "Heroes" },
  { number: "94", name: "Rory Burns", team: "Oval Invincibles", type: "Heroes" },
  { number: "95", name: "Sam Billings", team: "Oval Invincibles", type: "Heroes" },
  { number: "96", name: "Sam Curran", team: "Oval Invincibles", type: "Heroes" },
  { number: "97", name: "Saqib Mahmood", team: "Oval Invincibles", type: "Heroes" }, // source: "Saquib Mahmood"
  { number: "98", name: "Tom Curran", team: "Oval Invincibles", type: "Heroes" },
  { number: "99", name: "Will Jacks", team: "Oval Invincibles", type: "Heroes" },
  { number: "100", name: "Dane Van Niekerk", team: "Oval Invincibles", type: "Heroes" },
  { number: "101", name: "Alice Capsey", team: "Oval Invincibles", type: "Heroes" },
  { number: "102", name: "Danielle Gregory", team: "Oval Invincibles", type: "Heroes" },
  { number: "103", name: "Eva Gray", team: "Oval Invincibles", type: "Heroes" },
  { number: "104", name: "Lauren Winfield-Hill", team: "Oval Invincibles", type: "Heroes" },
  { number: "105", name: "Grace Gibbs", team: "Oval Invincibles", type: "Heroes" },
  { number: "106", name: "Aylish Cranstone", team: "Oval Invincibles", type: "Heroes" },
  { number: "107", name: "Mady Villiers", team: "Oval Invincibles", type: "Heroes" },
  { number: "108", name: "Marianne Kapp", team: "Oval Invincibles", type: "Heroes" },
  { number: "109", name: "Shabnim Ismail", team: "Oval Invincibles", type: "Heroes" },
  { number: "110", name: "Tash Farrant", team: "Oval Invincibles", type: "Heroes" },

  // ---- Heroes: Southern Brave (111-132) ----
  { number: "111", name: "Alex Davies", team: "Southern Brave", type: "Heroes" },
  { number: "112", name: "Chris Jordan", team: "Southern Brave", type: "Heroes" },
  { number: "113", name: "Marcus Stones", team: "Southern Brave", type: "Heroes" },
  { number: "114", name: "Tim David", team: "Southern Brave", type: "Heroes" },
  { number: "115", name: "Jake Lintott", team: "Southern Brave", type: "Heroes" },
  { number: "116", name: "James Vince", team: "Southern Brave", type: "Heroes" },
  { number: "117", name: "Jofra Archer", team: "Southern Brave", type: "Heroes" },
  { number: "118", name: "Quinton De Kock", team: "Southern Brave", type: "Heroes" },
  { number: "119", name: "Craig Overton", team: "Southern Brave", type: "Heroes" },
  { number: "120", name: "Tymal Mills", team: "Southern Brave", type: "Heroes" }, // source: "Tamale Mills"
  { number: "121", name: "George Garton", team: "Southern Brave", type: "Heroes" },
  { number: "122", name: "Amanda-Jade Wellington", team: "Southern Brave", type: "Heroes" },
  { number: "123", name: "Anya Shrubsole", team: "Southern Brave", type: "Heroes" },
  { number: "124", name: "Carla Rudd", team: "Southern Brave", type: "Heroes" },
  { number: "125", name: "Paige Scholfield", team: "Southern Brave", type: "Heroes" },
  { number: "126", name: "Danni Wyatt", team: "Southern Brave", type: "Heroes" },
  { number: "127", name: "Ella Mccaughan", team: "Southern Brave", type: "Heroes" },
  { number: "128", name: "Lauren Bell", team: "Southern Brave", type: "Heroes" },
  { number: "129", name: "Maia Bouchier", team: "Southern Brave", type: "Heroes" },
  { number: "130", name: "Smriti Mandhana", team: "Southern Brave", type: "Heroes" },
  { number: "131", name: "Sophia Dunkley", team: "Southern Brave", type: "Heroes" },
  { number: "132", name: "Tara Norris", team: "Southern Brave", type: "Heroes" },

  // ---- Heroes: Trent Rockets (133-154) ----
  { number: "133", name: "Alex Hales", team: "Trent Rockets", type: "Heroes" },
  { number: "134", name: "Colin Munro", team: "Trent Rockets", type: "Heroes" },
  { number: "135", name: "Dawid Malan", team: "Trent Rockets", type: "Heroes" },
  { number: "136", name: "Joe Root", team: "Trent Rockets", type: "Heroes" },
  { number: "137", name: "Lewis Gregory", team: "Trent Rockets", type: "Heroes" },
  { number: "138", name: "Marchant De Lange", team: "Trent Rockets", type: "Heroes" },
  { number: "139", name: "Rashid Khan", team: "Trent Rockets", type: "Heroes" },
  { number: "140", name: "Samit Patel", team: "Trent Rockets", type: "Heroes" },
  { number: "141", name: "Steven Mullaney", team: "Trent Rockets", type: "Heroes" },
  { number: "142", name: "Matthew Carter", team: "Trent Rockets", type: "Heroes" },
  { number: "143", name: "Luke Wood", team: "Trent Rockets", type: "Heroes" },
  { number: "144", name: "Abbey Freeborn", team: "Trent Rockets", type: "Heroes" },
  { number: "145", name: "Meg Lanning", team: "Trent Rockets", type: "Heroes" },
  { number: "146", name: "Alana King", team: "Trent Rockets", type: "Heroes" },
  { number: "147", name: "Mignon Du Preez", team: "Trent Rockets", type: "Heroes" },
  { number: "148", name: "Katherine Brunt", team: "Trent Rockets", type: "Heroes" },
  { number: "149", name: "Kathryn Bryce", team: "Trent Rockets", type: "Heroes" },
  { number: "150", name: "Bryony Smith", team: "Trent Rockets", type: "Heroes" },
  { number: "151", name: "Marie Kelly", team: "Trent Rockets", type: "Heroes" },
  { number: "152", name: "Nat Sciver", team: "Trent Rockets", type: "Heroes" }, // source: "Nat Scriver"
  { number: "153", name: "Sophie Munro", team: "Trent Rockets", type: "Heroes" },
  { number: "154", name: "Sarah Glenn", team: "Trent Rockets", type: "Heroes" },

  // ---- Heroes: Welsh Fire (155-176) ----
  { number: "155", name: "Ben Duckett", team: "Welsh Fire", type: "Heroes" },
  { number: "156", name: "David Payne", team: "Welsh Fire", type: "Heroes" },
  { number: "157", name: "Adam Zampa", team: "Welsh Fire", type: "Heroes" },
  { number: "158", name: "Naseem Shah", team: "Welsh Fire", type: "Heroes" },
  { number: "159", name: "Jonny Bairstow", team: "Welsh Fire", type: "Heroes" },
  { number: "160", name: "David Miller", team: "Welsh Fire", type: "Heroes" },
  { number: "161", name: "Tom Banton", team: "Welsh Fire", type: "Heroes" },
  { number: "162", name: "Joe Clarke", team: "Welsh Fire", type: "Heroes" },
  { number: "163", name: "Ollie Pope", team: "Welsh Fire", type: "Heroes" },
  { number: "164", name: "Sam Hain", team: "Welsh Fire", type: "Heroes" },
  { number: "165", name: "Jake Ball", team: "Welsh Fire", type: "Heroes" },
  { number: "166", name: "Alex Griffiths", team: "Welsh Fire", type: "Heroes" },
  { number: "167", name: "Hannah Baker", team: "Welsh Fire", type: "Heroes" },
  { number: "168", name: "Georgia Hennessy", team: "Welsh Fire", type: "Heroes" },
  { number: "169", name: "Fran Wilson", team: "Welsh Fire", type: "Heroes" },
  { number: "170", name: "Hayley Matthews", team: "Welsh Fire", type: "Heroes" },
  { number: "171", name: "Katie George", team: "Welsh Fire", type: "Heroes" },
  { number: "172", name: "Lauren Filer", team: "Welsh Fire", type: "Heroes" },
  { number: "173", name: "Annabel Sutherland", team: "Welsh Fire", type: "Heroes" },
  { number: "174", name: "Alex Hartley", team: "Welsh Fire", type: "Heroes" },
  { number: "175", name: "Fi Morris", team: "Welsh Fire", type: "Heroes" },
  { number: "176", name: "Sarah Bryce", team: "Welsh Fire", type: "Heroes" },

  // ---- Captain Fantastic (177-192) ----
  { number: "177", name: "Moeen Ali", team: "Birmingham Phoenix", type: "Captain Fantastic" },
  { number: "178", name: "Sophie Devine", team: "Birmingham Phoenix", type: "Captain Fantastic" },
  { number: "179", name: "Eoin Morgan", team: "London Spirit", type: "Captain Fantastic" },
  { number: "180", name: "Heather Knight", team: "London Spirit", type: "Captain Fantastic" },
  { number: "181", name: "Jos Buttler", team: "Manchester Originals", type: "Captain Fantastic" },
  { number: "182", name: "Kate Cross", team: "Manchester Originals", type: "Captain Fantastic" },
  { number: "183", name: "Faf Du Plessis", team: "Northern Superchargers", type: "Captain Fantastic" },
  { number: "184", name: "Hollie Armitage", team: "Northern Superchargers", type: "Captain Fantastic" },
  { number: "185", name: "Sam Billings", team: "Oval Invincibles", type: "Captain Fantastic" },
  { number: "186", name: "Dane Van Niekerk", team: "Oval Invincibles", type: "Captain Fantastic" },
  { number: "187", name: "James Vince", team: "Southern Brave", type: "Captain Fantastic" },
  { number: "188", name: "Anya Shrubsole", team: "Southern Brave", type: "Captain Fantastic" },
  { number: "189", name: "Lewis Gregory", team: "Trent Rockets", type: "Captain Fantastic" },
  { number: "190", name: "Nat Sciver", team: "Trent Rockets", type: "Captain Fantastic" },
  { number: "191", name: "Jonny Bairstow", team: "Welsh Fire", type: "Captain Fantastic" },
  { number: "192", name: "Tammy Beaumont", team: "Welsh Fire", type: "Captain Fantastic" },

  // ---- New Signing (193-224) ----
  { number: "193", name: "Graeme Van Buuren", team: "Birmingham Phoenix", type: "New Signing" },
  { number: "194", name: "Kane Richardson", team: "Birmingham Phoenix", type: "New Signing" },
  { number: "195", name: "Jack Leach", team: "Birmingham Phoenix", type: "New Signing" },
  { number: "196", name: "Sophie Molineux", team: "Birmingham Phoenix", type: "New Signing" },
  { number: "197", name: "Kieron Pollard", team: "London Spirit", type: "New Signing" },
  { number: "198", name: "Liam Dawson", team: "London Spirit", type: "New Signing" },
  { number: "199", name: "Jordan Thompson", team: "London Spirit", type: "New Signing" },
  { number: "200", name: "Beth Mooney", team: "London Spirit", type: "New Signing" },
  { number: "201", name: "Sophie Luff", team: "London Spirit", type: "New Signing" },
  { number: "202", name: "Andre Russell", team: "Manchester Originals", type: "New Signing" },
  { number: "203", name: "Laurie Evans", team: "Manchester Originals", type: "New Signing" },
  { number: "204", name: "Phoebe Graham", team: "Manchester Originals", type: "New Signing" },
  { number: "205", name: "Ami Campbell", team: "Manchester Originals", type: "New Signing" },
  { number: "206", name: "Dwayne Bravo", team: "Northern Superchargers", type: "New Signing" },
  { number: "207", name: "Adam Hose", team: "Northern Superchargers", type: "New Signing" },
  { number: "208", name: "Luke Wright", team: "Northern Superchargers", type: "New Signing" },
  { number: "209", name: "Jenny Gunn", team: "Northern Superchargers", type: "New Signing" },
  { number: "210", name: "Jack Leaning", team: "Oval Invincibles", type: "New Signing" },
  { number: "211", name: "Hilton Cartwright", team: "Oval Invincibles", type: "New Signing" },
  { number: "212", name: "Lauren Winfield-Hill", team: "Oval Invincibles", type: "New Signing" },
  { number: "213", name: "Kira Chathli", team: "Oval Invincibles", type: "New Signing" },
  { number: "214", name: "Joe Weatherley", team: "Southern Brave", type: "New Signing" },
  { number: "215", name: "Dan Moriarty", team: "Southern Brave", type: "New Signing" },
  { number: "216", name: "Tahlia Mcgrath", team: "Southern Brave", type: "New Signing" },
  { number: "217", name: "Georgia Adams", team: "Southern Brave", type: "New Signing" },
  { number: "218", name: "Tom Kohler-Cadmore", team: "Trent Rockets", type: "New Signing" },
  { number: "219", name: "Luke Fletcher", team: "Trent Rockets", type: "New Signing" },
  { number: "220", name: "Meg Lanning", team: "Trent Rockets", type: "New Signing" }, // source: "Meg Planning"
  { number: "221", name: "Bryony Smith", team: "Trent Rockets", type: "New Signing" },
  { number: "222", name: "Fran Wilson", team: "Welsh Fire", type: "New Signing" },
  { number: "223", name: "Tammy Beaumont", team: "Welsh Fire", type: "New Signing" },
  { number: "224", name: "Rachael Haynes", team: "Welsh Fire", type: "New Signing" },

  // ---- Super Boosters (225-256) ----
  { number: "225", name: "Adam Milne", team: "Birmingham Phoenix", type: "Super Boosters" },
  { number: "226", name: "Benny Howell", team: "Birmingham Phoenix", type: "Super Boosters" },
  { number: "227", name: "Ravi Bopara", team: "London Spirit", type: "Super Boosters" },
  { number: "228", name: "Mark Wood", team: "London Spirit", type: "Super Boosters" },
  { number: "229", name: "Phil Salt", team: "Manchester Originals", type: "Super Boosters" },
  { number: "230", name: "Ollie Robinson", team: "Manchester Originals", type: "Super Boosters" },
  { number: "231", name: "Faf Du Plessis", team: "Northern Superchargers", type: "Super Boosters" },
  { number: "232", name: "Wahab Riaz", team: "Northern Superchargers", type: "Super Boosters" },
  { number: "233", name: "Sam Billings", team: "Oval Invincibles", type: "Super Boosters" },
  { number: "234", name: "Sam Curran", team: "Oval Invincibles", type: "Super Boosters" },
  { number: "235", name: "Tim David", team: "Southern Brave", type: "Super Boosters" },
  { number: "236", name: "Tymal Mills", team: "Southern Brave", type: "Super Boosters" },
  { number: "237", name: "Colin Munro", team: "Trent Rockets", type: "Super Boosters" },
  { number: "238", name: "Lewis Gregory", team: "Trent Rockets", type: "Super Boosters" },
  { number: "239", name: "Sam Hain", team: "Welsh Fire", type: "Super Boosters" },
  { number: "240", name: "Adam Zampa", team: "Welsh Fire", type: "Super Boosters" },
  { number: "241", name: "Georgia Elwiss", team: "Birmingham Phoenix", type: "Super Boosters" },
  { number: "242", name: "Sophie Molineux", team: "Birmingham Phoenix", type: "Super Boosters" },
  { number: "243", name: "Naomi Dattani", team: "London Spirit", type: "Super Boosters" },
  { number: "244", name: "Freya Davies", team: "London Spirit", type: "Super Boosters" },
  { number: "245", name: "Ellie Threlkeld", team: "Manchester Originals", type: "Super Boosters" },
  { number: "246", name: "Laura Jackson", team: "Manchester Originals", type: "Super Boosters" },
  { number: "247", name: "Alice Davidson-Richards", team: "Northern Superchargers", type: "Super Boosters" },
  { number: "248", name: "Katie Levick", team: "Northern Superchargers", type: "Super Boosters" },
  { number: "249", name: "Lauren Winfield-Hill", team: "Oval Invincibles", type: "Super Boosters" },
  { number: "250", name: "Shabnim Ismail", team: "Oval Invincibles", type: "Super Boosters" },
  { number: "251", name: "Carla Rudd", team: "Southern Brave", type: "Super Boosters" },
  { number: "252", name: "Lauren Bell", team: "Southern Brave", type: "Super Boosters" },
  { number: "253", name: "Mignon Du Preez", team: "Trent Rockets", type: "Super Boosters" },
  { number: "254", name: "Alana King", team: "Trent Rockets", type: "Super Boosters" },
  { number: "255", name: "Sarah Bryce", team: "Welsh Fire", type: "Super Boosters" },
  { number: "256", name: "Alex Hartley", team: "Welsh Fire", type: "Super Boosters" },

  // ---- Team Logos (257-264) ----
  { number: "257", name: "Birmingham Phoenix", team: "Birmingham Phoenix", type: "Team Logos", isTeamCard: true },
  { number: "258", name: "London Spirit", team: "London Spirit", type: "Team Logos", isTeamCard: true },
  { number: "259", name: "Manchester Originals", team: "Manchester Originals", type: "Team Logos", isTeamCard: true },
  { number: "260", name: "Northern Superchargers", team: "Northern Superchargers", type: "Team Logos", isTeamCard: true },
  { number: "261", name: "Oval Invincibles", team: "Oval Invincibles", type: "Team Logos", isTeamCard: true },
  { number: "262", name: "Southern Brave", team: "Southern Brave", type: "Team Logos", isTeamCard: true },
  { number: "263", name: "Trent Rockets", team: "Trent Rockets", type: "Team Logos", isTeamCard: true },
  { number: "264", name: "Welsh Fire", team: "Welsh Fire", type: "Team Logos", isTeamCard: true },

  // ---- Future Legends (265-280) ----
  { number: "265", name: "Will Smeed", team: "Birmingham Phoenix", type: "Future Legends" },
  { number: "266", name: "Mason Crane", team: "London Spirit", type: "Future Legends" },
  { number: "267", name: "Matt Parkinson", team: "Manchester Originals", type: "Future Legends" },
  { number: "268", name: "Harry Brook", team: "Northern Superchargers", type: "Future Legends" },
  { number: "269", name: "Saqib Mahmood", team: "Oval Invincibles", type: "Future Legends" },
  { number: "270", name: "George Garton", team: "Southern Brave", type: "Future Legends" },
  { number: "271", name: "Rashid Khan", team: "Trent Rockets", type: "Future Legends" },
  { number: "272", name: "Ollie Pope", team: "Welsh Fire", type: "Future Legends" },
  { number: "273", name: "Issy Wong", team: "Birmingham Phoenix", type: "Future Legends" },
  { number: "274", name: "Charlie Dean", team: "London Spirit", type: "Future Legends" },
  { number: "275", name: "Emma Lamb", team: "Manchester Originals", type: "Future Legends" },
  { number: "276", name: "Laura Wolvaardt", team: "Northern Superchargers", type: "Future Legends" },
  { number: "277", name: "Alice Capsey", team: "Oval Invincibles", type: "Future Legends" },
  { number: "278", name: "Tahlia Mcgrath", team: "Southern Brave", type: "Future Legends" },
  { number: "279", name: "Sarah Glenn", team: "Trent Rockets", type: "Future Legends" },
  { number: "280", name: "Hayley Matthews", team: "Welsh Fire", type: "Future Legends" },

  // ---- Matchwinners (281-296) ----
  { number: "281", name: "Adam Milne", team: "Birmingham Phoenix", type: "Matchwinners" },
  { number: "282", name: "Eoin Morgan", team: "London Spirit", type: "Matchwinners" },
  { number: "283", name: "Jos Buttler", team: "Manchester Originals", type: "Matchwinners" },
  { number: "284", name: "Ben Stokes", team: "Northern Superchargers", type: "Matchwinners" },
  { number: "285", name: "Jason Roy", team: "Oval Invincibles", type: "Matchwinners" },
  { number: "286", name: "Chris Jordan", team: "Southern Brave", type: "Matchwinners" },
  { number: "287", name: "Alex Hales", team: "Trent Rockets", type: "Matchwinners" },
  { number: "288", name: "Jonny Bairstow", team: "Welsh Fire", type: "Matchwinners" },
  { number: "289", name: "Ellyse Perry", team: "Birmingham Phoenix", type: "Matchwinners" },
  { number: "290", name: "Amelia Kerr", team: "London Spirit", type: "Matchwinners" },
  { number: "291", name: "Sophie Ecclestone", team: "Manchester Originals", type: "Matchwinners" },
  { number: "292", name: "Alyssa Healy", team: "Northern Superchargers", type: "Matchwinners" },
  { number: "293", name: "Dane Van Niekerk", team: "Oval Invincibles", type: "Matchwinners" },
  { number: "294", name: "Smriti Mandhana", team: "Southern Brave", type: "Matchwinners" },
  { number: "295", name: "Meg Lanning", team: "Trent Rockets", type: "Matchwinners" },
  { number: "296", name: "Annabel Sutherland", team: "Welsh Fire", type: "Matchwinners" },

  // ---- Gone For 4 (297-312) ----
  { number: "297", name: "Liam Livingstone", team: "Birmingham Phoenix", type: "Gone For 4" },
  { number: "298", name: "Glenn Maxwell", team: "London Spirit", type: "Gone For 4" },
  { number: "299", name: "Wanindu Hasaranga", team: "Manchester Originals", type: "Gone For 4" },
  { number: "300", name: "Dwayne Bravo", team: "Northern Superchargers", type: "Gone For 4" },
  { number: "301", name: "Jason Roy", team: "Oval Invincibles", type: "Gone For 4" },
  { number: "302", name: "James Vince", team: "Southern Brave", type: "Gone For 4" },
  { number: "303", name: "Dawid Malan", team: "Trent Rockets", type: "Gone For 4" },
  { number: "304", name: "Tom Banton", team: "Welsh Fire", type: "Gone For 4" },
  { number: "305", name: "Amy Jones", team: "Birmingham Phoenix", type: "Gone For 4" },
  { number: "306", name: "Beth Mooney", team: "London Spirit", type: "Gone For 4" },
  { number: "307", name: "Amy Satterthwaite", team: "Manchester Originals", type: "Gone For 4" },
  { number: "308", name: "Jemimah Rodrigues", team: "Northern Superchargers", type: "Gone For 4" },
  { number: "309", name: "Marianne Kapp", team: "Oval Invincibles", type: "Gone For 4" },
  { number: "310", name: "Sophia Dunkley", team: "Southern Brave", type: "Gone For 4" },
  { number: "311", name: "Nat Sciver", team: "Trent Rockets", type: "Gone For 4" }, // source: "Nat Scriver"
  { number: "312", name: "Rachael Haynes", team: "Welsh Fire", type: "Gone For 4" },

  // ---- Hit For 6 (313-320) ----
  { number: "313", name: "Moeen Ali", team: "Birmingham Phoenix", type: "Hit For 6" },
  { number: "314", name: "Alex Hales", team: "Trent Rockets", type: "Hit For 6" },
  { number: "315", name: "Sunil Narine", team: "Oval Invincibles", type: "Hit For 6" },
  { number: "316", name: "David Miller", team: "Welsh Fire", type: "Hit For 6" },
  { number: "317", name: "Heather Knight", team: "London Spirit", type: "Hit For 6" },
  { number: "318", name: "Deandra Dottin", team: "Manchester Originals", type: "Hit For 6" },
  { number: "319", name: "Danni Wyatt", team: "Southern Brave", type: "Hit For 6" },
  { number: "320", name: "Alyssa Healy", team: "Northern Superchargers", type: "Hit For 6" },

  // ---- 100 Club (321-326) ----
  { number: "321", name: "Jonny Bairstow", team: "Welsh Fire", type: "100 Club" },
  { number: "322", name: "Jofra Archer", team: "Southern Brave", type: "100 Club" },
  { number: "323", name: "Joe Root", team: "Trent Rockets", type: "100 Club" },
  { number: "324", name: "Sophie Ecclestone", team: "Manchester Originals", type: "100 Club" }, // source: "Sophie Eccleston"
  { number: "325", name: "Ellyse Perry", team: "Birmingham Phoenix", type: "100 Club" },
  { number: "326", name: "Heather Knight", team: "London Spirit", type: "100 Club" },

  // ---- Centurion (327-328) ----
  { number: "327", name: "Ben Stokes", team: "Northern Superchargers", type: "Centurion" },
  { number: "328", name: "Dane Van Niekerk", team: "Oval Invincibles", type: "Centurion" },

  // ---- Limited Edition (LE1-LE16) ----
  { number: "LE1", name: "Moeen Ali", team: "Birmingham Phoenix", type: "Limited Edition" },
  { number: "LE2", name: "Kieron Pollard", team: "London Spirit", type: "Limited Edition" },
  { number: "LE3", name: "Andre Russell", team: "Manchester Originals", type: "Limited Edition" },
  { number: "LE4", name: "Adil Rashid", team: "Northern Superchargers", type: "Limited Edition" },
  { number: "LE5", name: "Jason Roy", team: "Oval Invincibles", type: "Limited Edition" },
  { number: "LE6", name: "Quinton De Kock", team: "Southern Brave", type: "Limited Edition" },
  { number: "LE7", name: "Rashid Khan", team: "Trent Rockets", type: "Limited Edition" },
  { number: "LE8", name: "Naseem Shah", team: "Welsh Fire", type: "Limited Edition" },
  { number: "LE9", name: "Marianne Kapp", team: "Oval Invincibles", type: "Limited Edition" },
  { number: "LE10", name: "Megan Schutt", team: "London Spirit", type: "Limited Edition" },
  { number: "LE11", name: "Kate Cross", team: "Manchester Originals", type: "Limited Edition" },
  { number: "LE12", name: "Anya Shrubsole", team: "Southern Brave", type: "Limited Edition" },
  { number: "LE13", name: "Sophie Devine", team: "Birmingham Phoenix", type: "Limited Edition" },
  { number: "LE14", name: "Laura Wolvaardt", team: "Northern Superchargers", type: "Limited Edition" },
  { number: "LE15", name: "Katherine Brunt", team: "Trent Rockets", type: "Limited Edition" },
  { number: "LE16", name: "Tammy Beaumont", team: "Welsh Fire", type: "Limited Edition" },
];

async function seedCards(setId: string, basePrintingId: string) {
  let created = 0;
  let skipped = 0;

  for (const [i, row] of ROWS.entries()) {
    const cardId = `${SET_ID}-${row.number.toLowerCase()}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const teamId = await builder.getOrCreateTeam(row.team);
    const personId = row.isTeamCard ? null : await builder.getOrCreatePerson(row.name);
    const insertId = row.type === "Heroes" ? undefined : await builder.getOrCreateInsert(row.type, setId);

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId,
        supertype: row.type,
        persons: personId ? { connect: { id: personId } } : undefined,
        teams: { connect: { id: teamId } },
      },
    });

    await prisma.variant.create({ data: { cardId, printingId: basePrintingId, insertId } });

    created++;
    if ((i + 1) % 50 === 0) console.log(`  [${i + 1}/${ROWS.length}] created=${created}`);
  }

  console.log(`Cards: created ${created}, skipped ${skipped}.`);
}

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ROWS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Cricket", universeId);
  const brandId = await builder.getOrCreateBrand("Cricket Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries(SET_NAME, franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: ROWS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  const t0 = Date.now();
  await seedCards(set.id, basePrintingId);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
