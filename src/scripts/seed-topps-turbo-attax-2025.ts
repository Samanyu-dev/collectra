import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the Topps Turbo Attax 2025 F1 trading card set.
 *
 * Replaces an earlier, inaccurate transcription of this checklist (the
 * previous version had the wrong F1 Team card structure, wrong F2/F3
 * grids, and was missing Track Profiles, Signature Style team cards, F1 75
 * Years, and the full Limited Editions/Monster Box/Black Edge exclusives).
 * This version matches the official 430-card checklist exactly: 356 base
 * cards (#1-356) + Mega Tin Exclusives (LL1-10/SK1-10/DM1-5, 25) + Limited
 * Editions (LE1-27, 27) + Monster Box Exclusives (JB1-12, 12) + Black Edge
 * (EDG1-10, 10).
 *
 * One card from the OLD checklist survives untouched: card #32 ("Max
 * Verstappen", generic F1 Team – Red Bull) has a real user Instance
 * attached (a collector already owns a physical copy logged against it).
 * The new checklist's #32 is actually "Max Verstappen (Signature Style)" —
 * a different card. Rather than risk orphaning that collector's row, #32
 * is intentionally left as-is; this script's existing-id skip logic will
 * leave it alone automatically. See TODO note at bottom of file.
 *
 * Card id scheme: `${SET_ID}-${number.toLowerCase()}` (unchanged from the
 * original script, e.g. "topps-turbo-attax-2025-32", "...-le1").
 */
const SET_ID = "topps-turbo-attax-2025";
const SET_NAME = "Turbo Attax 2025";

interface CardRow {
  number: string;
  name: string;
  type: string;
  team?: string;
  persons?: string[];
}

// Canonical team names — reused verbatim from the previously-seeded Team
// entities in this catalog so we don't create near-duplicate Team rows.
const MCLAREN = "McLaren F1 Team";
const FERRARI = "Scuderia Ferrari HP";
const REDBULL = "Oracle Red Bull Racing";
const MERCEDES = "Mercedes-AMG PETRONAS Formula One Team";
const ASTON = "Aston Martin Aramco F1 Team";
const ALPINE = "BWT Alpine F1 Team";
const WILLIAMS = "Atlassian Williams Racing";
const VCARB = "Visa Cash App RB Formula One";
const HAAS = "MoneyGram Haas F1 Team";
const SAUBER = "Stake F1 Team Kick Sauber";

function teamCards(teamLabel: string, team: string, rows: [string, string, string[]][]): CardRow[] {
  // rows: [number, name, persons]
  return rows.map(([number, name, persons]) => ({
    number,
    name,
    type: `Team Card – ${teamLabel}`,
    team,
    persons: persons.length > 0 ? persons : undefined,
  }));
}

const ALL_CARDS: CardRow[] = [
  // ---- Strategy Cards (1-9) ----
  { number: "1", name: "Rainmaster", type: "Strategy Card" },
  { number: "2", name: "DRS", type: "Strategy Card" },
  { number: "3", name: "Fast Pit Stop", type: "Strategy Card" },
  { number: "4", name: "Overtake Block", type: "Strategy Card" },
  { number: "5", name: "Agent", type: "Strategy Card" },
  { number: "6", name: "Safety Car", type: "Strategy Card" },
  { number: "7", name: "Out Of Fuel", type: "Strategy Card" },
  { number: "8", name: "Black & White Flag", type: "Strategy Card" },
  { number: "9", name: "Race Collision", type: "Strategy Card" },

  // ---- Team Cards (10-99): 10 teams x 9 cards ----
  ...teamCards("McLaren F1 Team", MCLAREN, [
    ["10", "Team Logo", []],
    ["11", "Team Car", []],
    ["12", "Andrea Stella", ["Andrea Stella"]],
    ["13", "Lando Norris", ["Lando Norris"]],
    ["14", "Lando Norris (Signature Style)", ["Lando Norris"]],
    ["15", "Lando Norris & Oscar Piastri", ["Lando Norris", "Oscar Piastri"]],
    ["16", "Oscar Piastri", ["Oscar Piastri"]],
    ["17", "Oscar Piastri (Signature Style)", ["Oscar Piastri"]],
    ["18", "Norris, Stella & Piastri", ["Lando Norris", "Andrea Stella", "Oscar Piastri"]],
  ]),
  ...teamCards("Scuderia Ferrari HP", FERRARI, [
    ["19", "Team Logo", []],
    ["20", "Team Car", []],
    ["21", "Frédéric Vasseur", ["Frédéric Vasseur"]],
    ["22", "Charles Leclerc", ["Charles Leclerc"]],
    ["23", "Charles Leclerc (Signature Style)", ["Charles Leclerc"]],
    ["24", "Charles Leclerc & Lewis Hamilton", ["Charles Leclerc", "Lewis Hamilton"]],
    ["25", "Lewis Hamilton", ["Lewis Hamilton"]],
    ["26", "Lewis Hamilton (Signature Style)", ["Lewis Hamilton"]],
    ["27", "Leclerc, Vasseur & Hamilton", ["Charles Leclerc", "Frédéric Vasseur", "Lewis Hamilton"]],
  ]),
  ...teamCards("Oracle Red Bull Racing", REDBULL, [
    ["28", "Team Logo", []],
    ["29", "Team Car", []],
    ["30", "Christian Horner", ["Christian Horner"]],
    ["31", "Max Verstappen", ["Max Verstappen"]],
    // 32 intentionally OMITTED — old checklist's card #32 ("Max Verstappen", generic)
    // has a real user Instance attached and is left in place. This new checklist's
    // #32 ("Max Verstappen (Signature Style)") is deliberately not seeded — see
    // TODO note at end of file.
    ["33", "Max Verstappen & Yuki Tsunoda", ["Max Verstappen", "Yuki Tsunoda"]],
    ["34", "Yuki Tsunoda", ["Yuki Tsunoda"]],
    ["35", "Yuki Tsunoda (Signature Style)", ["Yuki Tsunoda"]],
    ["36", "Verstappen, Horner & Tsunoda", ["Max Verstappen", "Christian Horner", "Yuki Tsunoda"]],
  ]),
  ...teamCards("Mercedes-AMG PETRONAS Formula One Team", MERCEDES, [
    ["37", "Team Logo", []],
    ["38", "Team Car", []],
    ["39", "Toto Wolff", ["Toto Wolff"]],
    ["40", "George Russell", ["George Russell"]],
    ["41", "George Russell (Signature Style)", ["George Russell"]],
    ["42", "George Russell & Kimi Antonelli", ["George Russell", "Kimi Antonelli"]],
    ["43", "Kimi Antonelli", ["Kimi Antonelli"]],
    ["44", "Kimi Antonelli (Signature Style)", ["Kimi Antonelli"]],
    ["45", "Russell, Wolff & Antonelli", ["George Russell", "Toto Wolff", "Kimi Antonelli"]],
  ]),
  ...teamCards("Aston Martin Aramco F1 Team", ASTON, [
    ["46", "Team Logo", []],
    ["47", "Team Car", []],
    ["48", "Andy Cowell", ["Andy Cowell"]],
    ["49", "Fernando Alonso", ["Fernando Alonso"]],
    ["50", "Fernando Alonso (Signature Style)", ["Fernando Alonso"]],
    ["51", "Fernando Alonso & Lance Stroll", ["Fernando Alonso", "Lance Stroll"]],
    ["52", "Lance Stroll", ["Lance Stroll"]],
    ["53", "Lance Stroll (Signature Style)", ["Lance Stroll"]],
    ["54", "Alonso, Cowell & Stroll", ["Fernando Alonso", "Andy Cowell", "Lance Stroll"]],
  ]),
  ...teamCards("BWT Alpine", ALPINE, [
    ["55", "Team Logo", []],
    ["56", "Team Car", []],
    ["57", "Oliver Oakes", ["Oliver Oakes"]],
    ["58", "Pierre Gasly", ["Pierre Gasly"]],
    ["59", "Pierre Gasly (Signature Style)", ["Pierre Gasly"]],
    ["60", "Pierre Gasly & Jack Doohan", ["Pierre Gasly", "Jack Doohan"]],
    ["61", "Jack Doohan", ["Jack Doohan"]],
    ["62", "Jack Doohan (Signature Style)", ["Jack Doohan"]],
    ["63", "Gasly, Oakes & Doohan", ["Pierre Gasly", "Oliver Oakes", "Jack Doohan"]],
  ]),
  ...teamCards("Moneygram Haas", HAAS, [
    ["64", "Team Logo", []],
    ["65", "Team Car", []],
    ["66", "Ayao Komatsu", ["Ayao Komatsu"]],
    ["67", "Esteban Ocon", ["Esteban Ocon"]],
    ["68", "Esteban Ocon (Signature Style)", ["Esteban Ocon"]],
    ["69", "Esteban Ocon & Oliver Bearman", ["Esteban Ocon", "Oliver Bearman"]],
    ["70", "Oliver Bearman", ["Oliver Bearman"]],
    ["71", "Oliver Bearman (Signature Style)", ["Oliver Bearman"]],
    ["72", "Ocon, Komatsu & Bearman", ["Esteban Ocon", "Ayao Komatsu", "Oliver Bearman"]],
  ]),
  ...teamCards("VCARB", VCARB, [
    ["73", "Team Logo", []],
    ["74", "Team Car", []],
    ["75", "Laurent Mekies", ["Laurent Mekies"]],
    ["76", "Liam Lawson", ["Liam Lawson"]],
    ["77", "Liam Lawson (Signature Style)", ["Liam Lawson"]],
    ["78", "Liam Lawson & Isack Hadjar", ["Liam Lawson", "Isack Hadjar"]],
    ["79", "Isack Hadjar", ["Isack Hadjar"]],
    ["80", "Isack Hadjar (Signature Style)", ["Isack Hadjar"]],
    ["81", "Lawson, Mekies & Hadjar", ["Liam Lawson", "Laurent Mekies", "Isack Hadjar"]],
  ]),
  ...teamCards("Williams Racing", WILLIAMS, [
    ["82", "Team Logo", []],
    ["83", "Team Car", []],
    ["84", "James Vowles", ["James Vowles"]],
    ["85", "Carlos Sainz", ["Carlos Sainz"]],
    ["86", "Carlos Sainz (Signature Style)", ["Carlos Sainz"]],
    ["87", "Carlos Sainz & Alex Albon", ["Carlos Sainz", "Alex Albon"]],
    ["88", "Alex Albon", ["Alex Albon"]],
    ["89", "Alex Albon (Signature Style)", ["Alex Albon"]],
    ["90", "Sainz, Vowles & Albon", ["Carlos Sainz", "James Vowles", "Alex Albon"]],
  ]),
  ...teamCards("Kick Sauber", SAUBER, [
    ["91", "Team Logo", []],
    ["92", "Team Car", []],
    ["93", "Jonathan Wheatley", ["Jonathan Wheatley"]],
    ["94", "Nico Hülkenberg", ["Nico Hülkenberg"]],
    ["95", "Nico Hülkenberg (Signature Style)", ["Nico Hülkenberg"]],
    ["96", "Nico Hülkenberg & Gabriel Bortoleto", ["Nico Hülkenberg", "Gabriel Bortoleto"]],
    ["97", "Gabriel Bortoleto", ["Gabriel Bortoleto"]],
    ["98", "Gabriel Bortoleto (Signature Style)", ["Gabriel Bortoleto"]],
    ["99", "Hülkenberg, Wheatley & Bortoleto", ["Nico Hülkenberg", "Jonathan Wheatley", "Gabriel Bortoleto"]],
  ]),

  // ---- Epic Moments (100-117) ----
  { number: "100", name: "Lando Norris", type: "Epic Moments", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "101", name: "Charles Leclerc", type: "Epic Moments", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "102", name: "George Russell", type: "Epic Moments", team: MERCEDES, persons: ["George Russell"] },
  { number: "103", name: "Lance Stroll", type: "Epic Moments", team: ASTON, persons: ["Lance Stroll"] },
  { number: "104", name: "Max Verstappen", type: "Epic Moments", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "105", name: "George Russell", type: "Epic Moments", team: MERCEDES, persons: ["George Russell"] },
  { number: "106", name: "Oscar Piastri", type: "Epic Moments", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "107", name: "Lando Norris", type: "Epic Moments", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "108", name: "Charles Leclerc", type: "Epic Moments", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "109", name: "Oscar Piastri", type: "Epic Moments", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "110", name: "Alex Albon", type: "Epic Moments", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "111", name: "Fernando Alonso", type: "Epic Moments", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "112", name: "Max Verstappen", type: "Epic Moments", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "113", name: "Pierre Gasly", type: "Epic Moments", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "114", name: "Pierre Gasly", type: "Epic Moments", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "115", name: "George Russell", type: "Epic Moments", team: MERCEDES, persons: ["George Russell"] },
  { number: "116", name: "Max Verstappen", type: "Epic Moments", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "117", name: "Lando Norris", type: "Epic Moments", team: MCLAREN, persons: ["Lando Norris"] },

  // ---- Pole Position (118-126) ----
  { number: "118", name: "Lando Norris", type: "Pole Position", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "119", name: "Charles Leclerc", type: "Pole Position", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "120", name: "Max Verstappen", type: "Pole Position", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "121", name: "George Russell", type: "Pole Position", team: MERCEDES, persons: ["George Russell"] },
  { number: "122", name: "Fernando Alonso", type: "Pole Position", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "123", name: "Pierre Gasly", type: "Pole Position", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "124", name: "Oliver Bearman", type: "Pole Position", team: HAAS, persons: ["Oliver Bearman"] },
  { number: "125", name: "Alex Albon", type: "Pole Position", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "126", name: "Nico Hülkenberg", type: "Pole Position", team: SAUBER, persons: ["Nico Hülkenberg"] },

  // ---- Track Profiles (127-147) ----
  { number: "127", name: "Albert Park Circuit", type: "Track Profiles" },
  { number: "128", name: "Shanghai International Circuit", type: "Track Profiles" },
  { number: "129", name: "Suzuka Circuit", type: "Track Profiles" },
  { number: "130", name: "Bahrain International Circuit", type: "Track Profiles" },
  { number: "131", name: "Jeddah Corniche Circuit", type: "Track Profiles" },
  { number: "132", name: "Miami International Autodrome", type: "Track Profiles" },
  { number: "133", name: "Autodromo Enzo e Dino Ferrari", type: "Track Profiles" },
  { number: "134", name: "Circuit de Barcelona-Catalunya", type: "Track Profiles" },
  { number: "135", name: "Circuit Gilles-Villeneuve", type: "Track Profiles" },
  { number: "136", name: "Red Bull Ring", type: "Track Profiles" },
  { number: "137", name: "Silverstone Circuit", type: "Track Profiles" },
  { number: "138", name: "Circuit de Spa-Francorchamps", type: "Track Profiles" },
  { number: "139", name: "Hungaroring", type: "Track Profiles" },
  { number: "140", name: "Circuit Zandvoort", type: "Track Profiles" },
  { number: "141", name: "Autodromo Nazionale Monza", type: "Track Profiles" },
  { number: "142", name: "Baku City Circuit", type: "Track Profiles" },
  { number: "143", name: "Circuit of the Americas", type: "Track Profiles" },
  { number: "144", name: "Autódromo José Carlos Pace", type: "Track Profiles" },
  { number: "145", name: "Las Vegas Strip Circuit", type: "Track Profiles" },
  { number: "146", name: "Lusail International Circuit", type: "Track Profiles" },
  { number: "147", name: "Yas Marina Circuit", type: "Track Profiles" },

  // ---- Sprint Superstars (148-153) ----
  { number: "148", name: "Lando Norris", type: "Sprint Superstars", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "149", name: "Oscar Piastri", type: "Sprint Superstars", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "150", name: "Charles Leclerc", type: "Sprint Superstars", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "151", name: "Lewis Hamilton", type: "Sprint Superstars", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "152", name: "Max Verstappen", type: "Sprint Superstars", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "153", name: "Carlos Sainz", type: "Sprint Superstars", team: WILLIAMS, persons: ["Carlos Sainz"] },

  // ---- National Pride (154-162) ----
  { number: "154", name: "Oscar Piastri", type: "National Pride", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "155", name: "Lewis Hamilton", type: "National Pride", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "156", name: "Yuki Tsunoda", type: "National Pride", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "157", name: "Kimi Antonelli", type: "National Pride", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "158", name: "Pierre Gasly", type: "National Pride", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "159", name: "Liam Lawson", type: "National Pride", team: VCARB, persons: ["Liam Lawson"] },
  { number: "160", name: "Carlos Sainz", type: "National Pride", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "161", name: "Nico Hülkenberg", type: "National Pride", team: SAUBER, persons: ["Nico Hülkenberg"] },
  { number: "162", name: "Gabriel Bortoleto", type: "National Pride", team: SAUBER, persons: ["Gabriel Bortoleto"] },

  // ---- PSA (163-171) ----
  { number: "163", name: "Charles Leclerc", type: "PSA", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "164", name: "Carlos Sainz", type: "PSA", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "165", name: "Lando Norris", type: "PSA", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "166", name: "Alex Albon", type: "PSA", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "167", name: "George Russell", type: "PSA", team: MERCEDES, persons: ["George Russell"] },
  { number: "168", name: "Pierre Gasly", type: "PSA", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "169", name: "Oscar Piastri", type: "PSA", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "170", name: "Nico Hülkenberg", type: "PSA", team: SAUBER, persons: ["Nico Hülkenberg"] },
  { number: "171", name: "Max Verstappen", type: "PSA", team: REDBULL, persons: ["Max Verstappen"] },

  // ---- F2 Teams (172-204): team-name rows + driver rows ----
  { number: "172", name: "Invicta Racing", type: "F2 Team", team: "Invicta Racing" },
  { number: "173", name: "Leonardo Fornaroli", type: "F2 Team", team: "Invicta Racing", persons: ["Leonardo Fornaroli"] },
  { number: "174", name: "Roman Staněk", type: "F2 Team", team: "Invicta Racing", persons: ["Roman Staněk"] },
  { number: "175", name: "Campos Racing", type: "F2 Team", team: "Campos Racing" },
  { number: "176", name: "Josep María Martí", type: "F2 Team", team: "Campos Racing", persons: ["Josep María Martí"] },
  { number: "177", name: "Arvid Lindblad", type: "F2 Team", team: "Campos Racing", persons: ["Arvid Lindblad"] },
  { number: "178", name: "MP Motorsport", type: "F2 Team", team: "MP Motorsport" },
  { number: "179", name: "Oliver Goethe", type: "F2 Team", team: "MP Motorsport", persons: ["Oliver Goethe"] },
  { number: "180", name: "Richard Verschoor", type: "F2 Team", team: "MP Motorsport", persons: ["Richard Verschoor"] },
  { number: "181", name: "Hitech TGR", type: "F2 Team", team: "Hitech TGR" },
  { number: "182", name: "Luke Browning", type: "F2 Team", team: "Hitech TGR", persons: ["Luke Browning"] },
  { number: "183", name: "Dino Beganovic", type: "F2 Team", team: "Hitech TGR", persons: ["Dino Beganovic"] },
  { number: "184", name: "Prema Racing", type: "F2 Team", team: "Prema Racing" },
  { number: "185", name: "Sebastián Montoya", type: "F2 Team", team: "Prema Racing", persons: ["Sebastián Montoya"] },
  { number: "186", name: "Gabriele Mini", type: "F2 Team", team: "Prema Racing", persons: ["Gabriele Mini"] },
  { number: "187", name: "DAMS Lucas Oil", type: "F2 Team", team: "DAMS Lucas Oil" },
  { number: "188", name: "Jak Crawford", type: "F2 Team", team: "DAMS Lucas Oil", persons: ["Jak Crawford"] },
  { number: "189", name: "Kush Maini", type: "F2 Team", team: "DAMS Lucas Oil", persons: ["Kush Maini"] },
  { number: "190", name: "ART Grand Prix", type: "F2 Team", team: "ART Grand Prix" },
  { number: "191", name: "Victor Martins", type: "F2 Team", team: "ART Grand Prix", persons: ["Victor Martins"] },
  { number: "192", name: "Ritomo Miyata", type: "F2 Team", team: "ART Grand Prix", persons: ["Ritomo Miyata"] },
  { number: "193", name: "Rodin Motorsport", type: "F2 Team", team: "Rodin Motorsport" },
  { number: "194", name: "Amaury Cordeel", type: "F2 Team", team: "Rodin Motorsport", persons: ["Amaury Cordeel"] },
  { number: "195", name: "Alexander Dunne", type: "F2 Team", team: "Rodin Motorsport", persons: ["Alexander Dunne"] },
  { number: "196", name: "AIX Racing", type: "F2 Team", team: "AIX Racing" },
  { number: "197", name: "Joshua Dürksen", type: "F2 Team", team: "AIX Racing", persons: ["Joshua Dürksen"] },
  { number: "198", name: "Cian Shields", type: "F2 Team", team: "AIX Racing", persons: ["Cian Shields"] },
  { number: "199", name: "Trident", type: "F2 Team", team: "Trident" },
  { number: "200", name: "Sami Meguetounif", type: "F2 Team", team: "Trident", persons: ["Sami Meguetounif"] },
  { number: "201", name: "Max Esterson", type: "F2 Team", team: "Trident", persons: ["Max Esterson"] },
  { number: "202", name: "Van Amersfoort Racing", type: "F2 Team", team: "Van Amersfoort Racing" },
  { number: "203", name: "John Bennett", type: "F2 Team", team: "Van Amersfoort Racing", persons: ["John Bennett"] },
  { number: "204", name: "Rafael Villagómez", type: "F2 Team", team: "Van Amersfoort Racing", persons: ["Rafael Villagómez"] },

  // ---- F2 Podium Perfections (205-216) ----
  { number: "205", name: "Jak Crawford", type: "F2 Podium Perfections", persons: ["Jak Crawford"] },
  { number: "206", name: "Richard Verschoor", type: "F2 Podium Perfections", persons: ["Richard Verschoor"] },
  { number: "207", name: "Kush Maini", type: "F2 Podium Perfections", persons: ["Kush Maini"] },
  { number: "208", name: "Victor Martins", type: "F2 Podium Perfections", persons: ["Victor Martins"] },
  { number: "209", name: "Josep María Martí", type: "F2 Podium Perfections", persons: ["Josep María Martí"] },
  { number: "210", name: "Joshua Dürksen", type: "F2 Podium Perfections", persons: ["Joshua Dürksen"] },
  { number: "211", name: "Gabriele Mini", type: "F2 Podium Perfections", persons: ["Gabriele Mini"] },
  { number: "212", name: "Roman Staněk", type: "F2 Podium Perfections", persons: ["Roman Staněk"] },
  { number: "213", name: "Dino Beganovic", type: "F2 Podium Perfections", persons: ["Dino Beganovic"] },
  { number: "214", name: "Leonardo Fornaroli", type: "F2 Podium Perfections", persons: ["Leonardo Fornaroli"] },
  { number: "215", name: "Arvid Lindblad", type: "F2 Podium Perfections", persons: ["Arvid Lindblad"] },
  { number: "216", name: "Luke Browning", type: "F2 Podium Perfections", persons: ["Luke Browning"] },

  // ---- F3 Teams (217-226): team-name only ----
  { number: "217", name: "Prema Racing", type: "F3 Team", team: "Prema Racing" },
  { number: "218", name: "Trident", type: "F3 Team", team: "Trident" },
  { number: "219", name: "ART Grand Prix", type: "F3 Team", team: "ART Grand Prix" },
  { number: "220", name: "Campos Racing", type: "F3 Team", team: "Campos Racing" },
  { number: "221", name: "Hitech TGR", type: "F3 Team", team: "Hitech TGR" },
  { number: "222", name: "MP Motorsport", type: "F3 Team", team: "MP Motorsport" },
  { number: "223", name: "Van Amersfoort Racing", type: "F3 Team", team: "Van Amersfoort Racing" },
  { number: "224", name: "Rodin Motorsport", type: "F3 Team", team: "Rodin Motorsport" },
  { number: "225", name: "AIX Racing", type: "F3 Team", team: "AIX Racing" },
  { number: "226", name: "Dams Lucas Oil", type: "F3 Team", team: "DAMS Lucas Oil" },

  // ---- F3 Ones to Watch (227-237) ----
  { number: "227", name: "Noel Leon", type: "F3 Ones to Watch", persons: ["Noel Leon"] },
  { number: "228", name: "Rafael Camara", type: "F3 Ones to Watch", persons: ["Rafael Camara"] },
  { number: "229", name: "Charlies Wurz", type: "F3 Ones to Watch", persons: ["Charlies Wurz"] },
  { number: "230", name: "Laurens Van Hoepen", type: "F3 Ones to Watch", persons: ["Laurens Van Hoepen"] },
  { number: "231", name: "Nikola Tsolov", type: "F3 Ones to Watch", persons: ["Nikola Tsolov"] },
  { number: "232", name: "Martinius Stenshorne", type: "F3 Ones to Watch", persons: ["Martinius Stenshorne"] },
  { number: "233", name: "Bruno Del Pino", type: "F3 Ones to Watch", persons: ["Bruno Del Pino"] },
  { number: "234", name: "Theophile Nael", type: "F3 Ones to Watch", persons: ["Theophile Nael"] },
  { number: "235", name: "Callum Voisin", type: "F3 Ones to Watch", persons: ["Callum Voisin"] },
  { number: "236", name: "Javier Sagrera", type: "F3 Ones to Watch", persons: ["Javier Sagrera"] },
  { number: "237", name: "Matias Zagazeta", type: "F3 Ones to Watch", persons: ["Matias Zagazeta"] },

  // ---- Stars of Tomorrow (238-243) ----
  { number: "238", name: "Arvid Lindblad", type: "Stars of Tomorrow", persons: ["Arvid Lindblad"] },
  { number: "239", name: "Luke Browning", type: "Stars of Tomorrow", persons: ["Luke Browning"] },
  { number: "240", name: "Joshua Dürksen", type: "Stars of Tomorrow", persons: ["Joshua Dürksen"] },
  { number: "241", name: "Tim Tramnitz", type: "Stars of Tomorrow", persons: ["Tim Tramnitz"] },
  { number: "242", name: "Ugo Ugochuwu", type: "Stars of Tomorrow", persons: ["Ugo Ugochuwu"] },
  { number: "243", name: "Louis Sharp", type: "Stars of Tomorrow", persons: ["Louis Sharp"] },

  // ---- Rainmaster (244-249) ----
  { number: "244", name: "Lewis Hamilton", type: "Rainmaster", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "245", name: "Max Verstappen", type: "Rainmaster", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "246", name: "George Russell", type: "Rainmaster", team: MERCEDES, persons: ["George Russell"] },
  { number: "247", name: "Lance Stroll", type: "Rainmaster", team: ASTON, persons: ["Lance Stroll"] },
  { number: "248", name: "Pierre Gasly", type: "Rainmaster", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "249", name: "Esteban Ocon", type: "Rainmaster", team: HAAS, persons: ["Esteban Ocon"] },

  // ---- Meme Mayhem (250-255) ----
  { number: "250", name: "Oscar Piastri", type: "Meme Mayhem", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "251", name: "Charles Leclerc", type: "Meme Mayhem", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "252", name: "Fernando Alonso", type: "Meme Mayhem", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "253", name: "Pierre Gasly", type: "Meme Mayhem", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "254", name: "Esteban Ocon", type: "Meme Mayhem", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "255", name: "Carlos Sainz", type: "Meme Mayhem", team: WILLIAMS, persons: ["Carlos Sainz"] },

  // ---- Rookie Rising (256-263) ----
  { number: "256", name: "Kimi Antonelli", type: "Rookie Rising", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "257", name: "Jack Doohan", type: "Rookie Rising", team: ALPINE, persons: ["Jack Doohan"] },
  { number: "258", name: "Oliver Bearman", type: "Rookie Rising", team: HAAS, persons: ["Oliver Bearman"] },
  { number: "259", name: "Liam Lawson", type: "Rookie Rising", team: VCARB, persons: ["Liam Lawson"] },
  { number: "260", name: "Isack Hadjar", type: "Rookie Rising", team: VCARB, persons: ["Isack Hadjar"] },
  { number: "261", name: "Gabriel Bortoleto", type: "Rookie Rising", team: SAUBER, persons: ["Gabriel Bortoleto"] },
  { number: "262", name: "Sebastián Montoya", type: "Rookie Rising", persons: ["Sebastián Montoya"] },
  { number: "263", name: "Alexander Dunne", type: "Rookie Rising", persons: ["Alexander Dunne"] },

  // ---- Victory Lap (264-270) ----
  { number: "264", name: "Carlos Sainz", type: "Victory Lap", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "265", name: "Max Verstappen", type: "Victory Lap", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "266", name: "George Russell", type: "Victory Lap", team: MERCEDES, persons: ["George Russell"] },
  { number: "267", name: "Lewis Hamilton", type: "Victory Lap", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "268", name: "Oscar Piastri", type: "Victory Lap", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "269", name: "Lando Norris", type: "Victory Lap", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "270", name: "Charles Leclerc", type: "Victory Lap", team: FERRARI, persons: ["Charles Leclerc"] },

  // ---- Pit Stop Pros (271-275): team-only ----
  { number: "271", name: "McLaren F1 Team", type: "Pit Stop Pros", team: MCLAREN },
  { number: "272", name: "Scuderia Ferrari", type: "Pit Stop Pros", team: FERRARI },
  { number: "273", name: "Oracle Red Bull Racing", type: "Pit Stop Pros", team: REDBULL },
  { number: "274", name: "Mercedes AMG", type: "Pit Stop Pros", team: MERCEDES },
  { number: "275", name: "VCARB", type: "Pit Stop Pros", team: VCARB },

  // ---- F2 Logo (276) ----
  { number: "276", name: "F2 Logo", type: "F2 Logo" },

  // ---- Champions (277-279) ----
  { number: "277", name: "Max Verstappen", type: "Champions", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "278", name: "Gabriel Bortoleto", type: "Champions", persons: ["Gabriel Bortoleto"] },
  { number: "279", name: "Leonardo Fornaroli", type: "Champions", persons: ["Leonardo Fornaroli"] },

  // ---- Topps Awards (280-288) ----
  { number: "280", name: "Max Verstappen", type: "Topps Awards", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "281", name: "Nico Hülkenberg", type: "Topps Awards", team: SAUBER, persons: ["Nico Hülkenberg"] },
  { number: "282", name: "Andrea Stella", type: "Topps Awards", team: MCLAREN, persons: ["Andrea Stella"] },
  { number: "283", name: "Charles Leclerc", type: "Topps Awards", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "284", name: "Carlos Sainz", type: "Topps Awards", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "285", name: "Oliver Bearman", type: "Topps Awards", team: HAAS, persons: ["Oliver Bearman"] },
  { number: "286", name: "Charles Leclerc", type: "Topps Awards", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "287", name: "Lewis Hamilton", type: "Topps Awards", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "288", name: "Max Verstappen", type: "Topps Awards", team: REDBULL, persons: ["Max Verstappen"] },

  // ---- Constructor Kings (289-293): team-only ----
  { number: "289", name: "Scuderia Ferrari", type: "Constructor Kings", team: FERRARI },
  { number: "290", name: "McLaren F1 Team", type: "Constructor Kings", team: MCLAREN },
  { number: "291", name: "Williams Racing", type: "Constructor Kings", team: WILLIAMS },
  { number: "292", name: "Mercedes AMG", type: "Constructor Kings", team: MERCEDES },
  { number: "293", name: "Oracle Red Bull Racing", type: "Constructor Kings", team: REDBULL },

  // ---- F1 75 Years (294) ----
  { number: "294", name: "F1 Logo", type: "F1 75 Years" },

  // ---- Icons of the Grid (295-312) ----
  { number: "295", name: "Sir Jackie Stewart", type: "Icons of the Grid", persons: ["Sir Jackie Stewart"] },
  { number: "296", name: "Emerson Fittipaldi", type: "Icons of the Grid", persons: ["Emerson Fittipaldi"] },
  { number: "297", name: "James Hunt", type: "Icons of the Grid", persons: ["James Hunt"] },
  { number: "298", name: "Alain Prost", type: "Icons of the Grid", persons: ["Alain Prost"] },
  { number: "299", name: "Nigel Mansell", type: "Icons of the Grid", persons: ["Nigel Mansell"] },
  { number: "300", name: "Gilles Villeneuve", type: "Icons of the Grid", persons: ["Gilles Villeneuve"] },
  { number: "301", name: "Gerhard Berger", type: "Icons of the Grid", persons: ["Gerhard Berger"] },
  { number: "302", name: "Mario Andretti", type: "Icons of the Grid", persons: ["Mario Andretti"] },
  { number: "303", name: "Mika Häkkinen", type: "Icons of the Grid", persons: ["Mika Häkkinen"] },
  { number: "304", name: "Michael Schumacher", type: "Icons of the Grid", persons: ["Michael Schumacher"] },
  { number: "305", name: "Damon Hill", type: "Icons of the Grid", persons: ["Damon Hill"] },
  { number: "306", name: "David Coulthard", type: "Icons of the Grid", persons: ["David Coulthard"] },
  { number: "307", name: "Jacques Villeneuve", type: "Icons of the Grid", persons: ["Jacques Villeneuve"] },
  { number: "308", name: "Juan Pablo Montoya", type: "Icons of the Grid", persons: ["Juan Pablo Montoya"] },
  { number: "309", name: "Kimi Räikkönen", type: "Icons of the Grid", persons: ["Kimi Räikkönen"] },
  { number: "310", name: "Fernando Alonso", type: "Icons of the Grid", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "311", name: "Lewis Hamilton", type: "Icons of the Grid", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "312", name: "Max Verstappen", type: "Icons of the Grid", team: REDBULL, persons: ["Max Verstappen"] },

  // ---- Diamond Pull (313-324) ----
  { number: "313", name: "Lando Norris", type: "Diamond Pull", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "314", name: "Lewis Hamilton", type: "Diamond Pull", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "315", name: "Max Verstappen", type: "Diamond Pull", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "316", name: "Yuki Tsunoda", type: "Diamond Pull", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "317", name: "Kimi Antonelli", type: "Diamond Pull", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "318", name: "Fernando Alonso", type: "Diamond Pull", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "319", name: "Lance Stroll", type: "Diamond Pull", team: ASTON, persons: ["Lance Stroll"] },
  { number: "320", name: "Jack Doohan", type: "Diamond Pull", team: ALPINE, persons: ["Jack Doohan"] },
  { number: "321", name: "Esteban Ocon", type: "Diamond Pull", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "322", name: "Isack Hadjar", type: "Diamond Pull", team: VCARB, persons: ["Isack Hadjar"] },
  { number: "323", name: "Alex Albon", type: "Diamond Pull", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "324", name: "Gabriel Bortoleto", type: "Diamond Pull", team: SAUBER, persons: ["Gabriel Bortoleto"] },

  // ---- Podium Power (325-333) ----
  { number: "325", name: "Lando Norris", type: "Podium Power", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "326", name: "Oscar Piastri", type: "Podium Power", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "327", name: "Charles Leclerc", type: "Podium Power", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "328", name: "Lewis Hamilton", type: "Podium Power", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "329", name: "Max Verstappen", type: "Podium Power", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "330", name: "George Russell", type: "Podium Power", team: MERCEDES, persons: ["George Russell"] },
  { number: "331", name: "Pierre Gasly", type: "Podium Power", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "332", name: "Esteban Ocon", type: "Podium Power", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "333", name: "Carlos Sainz", type: "Podium Power", team: WILLIAMS, persons: ["Carlos Sainz"] },

  // ---- Supernova (334-353) ----
  { number: "334", name: "Lando Norris", type: "Supernova", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "335", name: "Oscar Piastri", type: "Supernova", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "336", name: "Charles Leclerc", type: "Supernova", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "337", name: "Lewis Hamilton", type: "Supernova", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "338", name: "Max Verstappen", type: "Supernova", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "339", name: "Yuki Tsunoda", type: "Supernova", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "340", name: "George Russell", type: "Supernova", team: MERCEDES, persons: ["George Russell"] },
  { number: "341", name: "Kimi Antonelli", type: "Supernova", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "342", name: "Fernando Alonso", type: "Supernova", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "343", name: "Lance Stroll", type: "Supernova", team: ASTON, persons: ["Lance Stroll"] },
  { number: "344", name: "Pierre Gasly", type: "Supernova", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "345", name: "Jack Doohan", type: "Supernova", team: ALPINE, persons: ["Jack Doohan"] },
  { number: "346", name: "Esteban Ocon", type: "Supernova", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "347", name: "Oliver Bearman", type: "Supernova", team: HAAS, persons: ["Oliver Bearman"] },
  { number: "348", name: "Liam Lawson", type: "Supernova", team: VCARB, persons: ["Liam Lawson"] },
  { number: "349", name: "Isack Hadjar", type: "Supernova", team: VCARB, persons: ["Isack Hadjar"] },
  { number: "350", name: "Carlos Sainz", type: "Supernova", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "351", name: "Alex Albon", type: "Supernova", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "352", name: "Nico Hülkenberg", type: "Supernova", team: SAUBER, persons: ["Nico Hülkenberg"] },
  { number: "353", name: "Gabriel Bortoleto", type: "Supernova", team: SAUBER, persons: ["Gabriel Bortoleto"] },

  // ---- 100 Club (354-356) ----
  { number: "354", name: "Oscar Piastri", type: "100 Club", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "355", name: "Max Verstappen", type: "100 Club", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "356", name: "Mika Häkkinen", type: "100 Club", persons: ["Mika Häkkinen"] },

  // ---- Mega Tin Exclusives (25): Lightning Lids / Shake Down / Diamond Edition ----
  { number: "LL1", name: "Lando Norris", type: "Mega Tin Exclusive – Lightning Lids", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "LL2", name: "Lewis Hamilton", type: "Mega Tin Exclusive – Lightning Lids", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "LL3", name: "Max Verstappen", type: "Mega Tin Exclusive – Lightning Lids", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "LL4", name: "George Russell", type: "Mega Tin Exclusive – Lightning Lids", team: MERCEDES, persons: ["George Russell"] },
  { number: "LL5", name: "Fernando Alonso", type: "Mega Tin Exclusive – Lightning Lids", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "LL6", name: "Jack Doohan", type: "Mega Tin Exclusive – Lightning Lids", team: ALPINE, persons: ["Jack Doohan"] },
  { number: "LL7", name: "Oliver Bearman", type: "Mega Tin Exclusive – Lightning Lids", team: HAAS, persons: ["Oliver Bearman"] },
  { number: "LL8", name: "Isack Hadjar", type: "Mega Tin Exclusive – Lightning Lids", team: VCARB, persons: ["Isack Hadjar"] },
  { number: "LL9", name: "Alex Albon", type: "Mega Tin Exclusive – Lightning Lids", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "LL10", name: "Nico Hülkenberg", type: "Mega Tin Exclusive – Lightning Lids", team: SAUBER, persons: ["Nico Hülkenberg"] },

  { number: "SK1", name: "Oscar Piastri", type: "Mega Tin Exclusive – Shake Down", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "SK2", name: "Charles Leclerc", type: "Mega Tin Exclusive – Shake Down", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "SK3", name: "Yuki Tsunoda", type: "Mega Tin Exclusive – Shake Down", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "SK4", name: "Kimi Antonelli", type: "Mega Tin Exclusive – Shake Down", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "SK5", name: "Lance Stroll", type: "Mega Tin Exclusive – Shake Down", team: ASTON, persons: ["Lance Stroll"] },
  { number: "SK6", name: "Pierre Gasly", type: "Mega Tin Exclusive – Shake Down", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "SK7", name: "Esteban Ocon", type: "Mega Tin Exclusive – Shake Down", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "SK8", name: "Liam Lawson", type: "Mega Tin Exclusive – Shake Down", team: VCARB, persons: ["Liam Lawson"] },
  { number: "SK9", name: "Carlos Sainz", type: "Mega Tin Exclusive – Shake Down", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "SK10", name: "Gabriel Bortoleto", type: "Mega Tin Exclusive – Shake Down", team: SAUBER, persons: ["Gabriel Bortoleto"] },

  { number: "DM1", name: "Lando Norris", type: "Mega Tin Exclusive – Diamond Edition", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "DM2", name: "Charles Leclerc", type: "Mega Tin Exclusive – Diamond Edition", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "DM3", name: "George Russell", type: "Mega Tin Exclusive – Diamond Edition", team: MERCEDES, persons: ["George Russell"] },
  { number: "DM4", name: "Pierre Gasly", type: "Mega Tin Exclusive – Diamond Edition", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "DM5", name: "Nico Hülkenberg", type: "Mega Tin Exclusive – Diamond Edition", team: SAUBER, persons: ["Nico Hülkenberg"] },

  // ---- Limited Editions (27) — named parallel captured in the card name ----
  { number: "LE1", name: "Lewis Hamilton (Ruby)", type: "Limited Edition", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "LE2", name: "Kimi Antonelli (Emerald)", type: "Limited Edition", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "LE3", name: "Max Verstappen (Orange)", type: "Limited Edition", team: REDBULL, persons: ["Max Verstappen"] },
  { number: "LE4", name: "George Russell (Emerald)", type: "Limited Edition", team: MERCEDES, persons: ["George Russell"] },
  { number: "LE5", name: "Lando Norris (Emerald)", type: "Limited Edition", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "LE6", name: "Yuki Tsunoda (Opal)", type: "Limited Edition", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "LE7", name: "Alex Albon (Opal)", type: "Limited Edition", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "LE8", name: "Fernando Alonso (Opal)", type: "Limited Edition", team: ASTON, persons: ["Fernando Alonso"] },
  { number: "LE9", name: "Liam Lawson (Aquamarine)", type: "Limited Edition", team: VCARB, persons: ["Liam Lawson"] },
  { number: "LE10", name: "Esteban Ocon (Amethyst)", type: "Limited Edition", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "LE11", name: "Nico Hülkenberg (Gold)", type: "Limited Edition", team: SAUBER, persons: ["Nico Hülkenberg"] },
  { number: "LE12", name: "Jack Doohan (Opal)", type: "Limited Edition", team: ALPINE, persons: ["Jack Doohan"] },
  { number: "LE13", name: "Gabriel Bortoleto (Aquamarine)", type: "Limited Edition", team: SAUBER, persons: ["Gabriel Bortoleto"] },
  { number: "LE14", name: "Isack Hadjar (Emerald)", type: "Limited Edition", team: VCARB, persons: ["Isack Hadjar"] },
  { number: "LE15", name: "Pierre Gasly (Amethyst)", type: "Limited Edition", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "LE16", name: "Carlos Sainz (Red Hot Chilli)", type: "Limited Edition", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "LE17", name: "Michael Schumacher (Ruby)", type: "Limited Edition", persons: ["Michael Schumacher"] },
  { number: "LE18", name: "Emerson Fittipaldi (Brazilian Yellow)", type: "Limited Edition", persons: ["Emerson Fittipaldi"] },
  { number: "LE19", name: "Nigel Mansell (Aquamarine)", type: "Limited Edition", persons: ["Nigel Mansell"] },
  { number: "LE20", name: "Lewis Hamilton (Amethyst)", type: "Limited Edition", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "LE21", name: "Gerhard Berger (Gold)", type: "Limited Edition", persons: ["Gerhard Berger"] },
  { number: "LE22", name: "Juan Pablo Montoya (Gold)", type: "Limited Edition", persons: ["Juan Pablo Montoya"] },
  { number: "LE23", name: "Charles Leclerc (Ruby)", type: "Limited Edition", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "LE24", name: "Lando Norris (McLaren Papaya)", type: "Limited Edition", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "LE25", name: "Lance Stroll (Aquamarine)", type: "Limited Edition", team: ASTON, persons: ["Lance Stroll"] },
  { number: "LE26", name: "Oscar Piastri (Aquamarine)", type: "Limited Edition", team: MCLAREN, persons: ["Oscar Piastri"] },
  { number: "LE27", name: "Oliver Bearman (Gold)", type: "Limited Edition", team: HAAS, persons: ["Oliver Bearman"] },

  // ---- Monster Box Exclusives (12) ----
  { number: "JB1", name: "Lewis Hamilton", type: "Monster Box Exclusive", team: FERRARI, persons: ["Lewis Hamilton"] },
  { number: "JB2", name: "Yuki Tsunoda", type: "Monster Box Exclusive", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "JB3", name: "Pierre Gasly", type: "Monster Box Exclusive", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "JB4", name: "Esteban Ocon", type: "Monster Box Exclusive", team: HAAS, persons: ["Esteban Ocon"] },
  { number: "JB5", name: "Isack Hadjar", type: "Monster Box Exclusive", team: VCARB, persons: ["Isack Hadjar"] },
  { number: "JB6", name: "Alex Albon", type: "Monster Box Exclusive", team: WILLIAMS, persons: ["Alex Albon"] },
  { number: "JB7", name: "Kimi Antonelli", type: "Monster Box Exclusive", team: MERCEDES, persons: ["Kimi Antonelli"] },
  { number: "JB8", name: "Lando Norris", type: "Monster Box Exclusive", team: MCLAREN, persons: ["Lando Norris"] },
  { number: "JB9", name: "Fernando Alonso & Lance Stroll", type: "Monster Box Exclusive", team: ASTON, persons: ["Fernando Alonso", "Lance Stroll"] },
  { number: "JB10", name: "Pierre Gasly & Jack Doohan", type: "Monster Box Exclusive", team: ALPINE, persons: ["Pierre Gasly", "Jack Doohan"] },
  { number: "JB11", name: "Esteban Ocon & Oliver Bearman", type: "Monster Box Exclusive", team: HAAS, persons: ["Esteban Ocon", "Oliver Bearman"] },
  { number: "JB12", name: "Nico Hülkenberg & Gabriel Bortoleto", type: "Monster Box Exclusive", team: SAUBER, persons: ["Nico Hülkenberg", "Gabriel Bortoleto"] },

  // ---- Black Edge (10) ----
  { number: "EDG1", name: "Michael Schumacher", type: "Black Edge", persons: ["Michael Schumacher"] },
  { number: "EDG2", name: "Charles Leclerc", type: "Black Edge", team: FERRARI, persons: ["Charles Leclerc"] },
  { number: "EDG3", name: "Yuki Tsunoda", type: "Black Edge", team: REDBULL, persons: ["Yuki Tsunoda"] },
  { number: "EDG4", name: "George Russell", type: "Black Edge", team: MERCEDES, persons: ["George Russell"] },
  { number: "EDG5", name: "Lance Stroll", type: "Black Edge", team: ASTON, persons: ["Lance Stroll"] },
  { number: "EDG6", name: "Pierre Gasly", type: "Black Edge", team: ALPINE, persons: ["Pierre Gasly"] },
  { number: "EDG7", name: "Oliver Bearman", type: "Black Edge", team: HAAS, persons: ["Oliver Bearman"] },
  { number: "EDG8", name: "Liam Lawson", type: "Black Edge", team: VCARB, persons: ["Liam Lawson"] },
  { number: "EDG9", name: "Carlos Sainz", type: "Black Edge", team: WILLIAMS, persons: ["Carlos Sainz"] },
  { number: "EDG10", name: "Nico Hülkenberg", type: "Black Edge", team: SAUBER, persons: ["Nico Hülkenberg"] },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards in new checklist)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Formula 1", universeId);
  const brandId = await builder.getOrCreateBrand("Turbo Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Turbo Attax 2025", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: 430,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  const t0 = Date.now();

  for (const [i, row] of ALL_CARDS.entries()) {
    const cardId = `${SET_ID}-${String(row.number).toLowerCase()}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) { skipped++; continue; }

    const personIds: string[] = [];
    if (row.persons) {
      for (const name of row.persons) personIds.push(await builder.getOrCreatePerson(name));
    }

    const teamId = row.team ? await builder.getOrCreateTeam(row.team) : undefined;
    const insertId = row.type ? await builder.getOrCreateInsert(row.type, set.id) : undefined;

    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: String(row.number),
        setId: set.id,
        supertype: row.type ?? "Base",
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
        teams: teamId ? { connect: { id: teamId } } : undefined,
      },
    });

    await prisma.variant.create({ data: { cardId: card.id, printingId: basePrintingId, insertId } });

    created++;
    if ((i + 1) % 50 === 0) console.log(`  [${i + 1}/${ALL_CARDS.length}] created=${created}`);
  }

  console.log(`Done. Created ${created} cards, skipped ${skipped}. Set: ${SET_NAME} (${(Date.now() - t0) / 1000}s)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

// TODO(human): card #32 ("Max Verstappen (Signature Style)", Oracle Red Bull
// Racing) from the new checklist was NOT seeded because the old #32 ("Max
// Verstappen", generic) already has a real collector's Instance attached and
// this script never deletes/overwrites cards with live user data. If you
// want the correct new #32 in the catalog, either (a) seed it under a new
// id (e.g. "topps-turbo-attax-2025-32-sig") and accept #32 staying wrong, or
// (b) migrate the collector's Instance to a new card/variant, delete the old
// #32, then re-run this script so #32 seeds correctly. Not done here because
// migrating a live user's collection row wasn't explicitly authorized.
