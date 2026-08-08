import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2026 Topps Premier League trading card collection.
 *
 * Structure:
 *  - 360-card base set (1-360) with Team Badge cards, players linked to
 *    Persons + Teams, and a "Team Badge" supertype.
 *  - Base parallels: Festive, Blue (1:2), Yellow (1:4), Green (1:8),
 *    Mini Diamond, Sparkles and Rainbow Foil (specific base numbers below
 *    are an unconfirmed placeholder — see LIMITED_BASE_PARALLELS).
 *  - Subset tags: Generation Now, Full Force, Breakthrough Baller, Tekker,
 *    Rookie (each as an Insert), plus a 5-card Topps.com Image Variation
 *    group (#8, #105, #172, #192, #211).
 *  - Insert subsets, all rebuilt 2026-08-07 from a real checklist (the
 *    prior version of this file had fabricated player picks for every one
 *    of these — same few superstars repeated everywhere — because no real
 *    checklist existed yet): Pro Partnership (#361-380, team-paired,
 *    2 persons/card), Retro Threads (#381-400), Pro Precision (#401-420),
 *    Beast Mode (#421-440), Headlines (#441-450, 10 cards not 20), Black
 *    Edge Edition (BE1-BE50, 50 cards not 20), Chrome King (CK1-CK20, real
 *    per-club legends not current stars), Diamond Rookie (DR1-DR10, 10 not
 *    20), Festive Freeze (FF1-FF24, Countdown Calendar exclusive), Gold
 *    Lion (GL1-GL20), Heat Vision (HV1-HV20), Home Advantage (HA1-HA20,
 *    the site's own corrected checklist — the initial 21-card version it
 *    flagged as incorrect is not used), Perfect Storm (PS1-PS20, 20 not
 *    10), Classic Limited Edition (LE1-LE20), Goal Machine Limited Edition
 *    (GM1-GM3, Mega Tin #1, 3 not 10), Globaller Limited Edition (WC1-WC3,
 *    Mega Tin #2, 3 not 10 — "WC" is the source's own prefix), Big Game
 *    Baller Limited Edition (BGB1-BGB3, Mega Tin #3, 3 not 10), Golden Boot
 *    Limited Edition (GB1-GB7, Golden Boot Tin, 7 not 10), Premier League
 *    Hall of Fame across 3 Super Tin-exclusive sub-groups — Icons
 *    (HOF1-3), Champions (HOF4-6), Commanders (HOF7-9), modeled as 3
 *    separate inserts sharing one HOF1-9 numbering run — and Premier Pull
 *    Ultra Limited Edition (PP1-PP20, real per-club picks not repeats).
 *  - Memorabilia: Premier Relic (PR1-PR60, isRelic variants — 60 not 15).
 *  - Autographs: Topps PL 2026 Autograph (A1-A154, the full real checklist
 *    — previously only 20 fabricated entries existed), Beast Mode
 *    Autograph (BMA1-BMA16), Black Edge Edition Autograph (BEA1-BEA10),
 *    Chrome King Autograph (CKA1-CKA20).
 *
 * Team-name corrections applied:
 *   "Asron Villa" -> "Aston Villa" (a recurring source typo)
 * Mismatched-team flags (logged, not silently fixed — the checklist's own
 * team attribution is kept as-is per card since that's what's printed on
 * the actual card, even where it doesn't match the player's real history):
 *   Eric Cantona (Man Utd legend, Retro Threads #384 lists Man City — but
 *   correctly Man Utd elsewhere, e.g. HOF3/PP14), Stiliyan Petrov (Aston
 *   Villa/Celtic, Retro Threads #382 lists Arsenal), Emiliano Martínez
 *   (Aston Villa, Festive Freeze FF23 lists Wolves), Emile Heskey (never
 *   Brighton, Festive Freeze FF18 lists Brighton).
 */
const SET_ID = "topps-premier-league-2026";
const SET_NAME = "Topps Premier League 2026";

interface CardRow {
  number: string;
  name: string;
  team: string;
  subset?: string;
  persons?: string[];
  badge?: boolean;
}

const fixTeam = (t: string) => (t === "Asron Villa" ? "Aston Villa" : t);

const BASE_CARDS: CardRow[] = [
  // Arsenal (1-18)
  { number: "1", name: "Team Badge", team: "Arsenal", badge: true },
  { number: "2", name: "David Raya", team: "Arsenal", persons: ["David Raya"] },
  { number: "3", name: "William Saliba", team: "Arsenal", persons: ["William Saliba"] },
  { number: "4", name: "Gabriel Magalhães", team: "Arsenal", persons: ["Gabriel Magalhães"] },
  { number: "5", name: "Jurriën Timber", team: "Arsenal", persons: ["Jurriën Timber"] },
  { number: "6", name: "Mikel Merino", team: "Arsenal", persons: ["Mikel Merino"] },
  { number: "7", name: "Thomas Partey", team: "Arsenal", persons: ["Thomas Partey"] },
  { number: "8", name: "Declan Rice", team: "Arsenal", persons: ["Declan Rice"] },
  { number: "9", name: "Myles Lewis-Skelly", team: "Arsenal", persons: ["Myles Lewis-Skelly"] },
  { number: "10", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"] },
  { number: "11", name: "Ethan Nwaneri", team: "Arsenal", persons: ["Ethan Nwaneri"] },
  { number: "12", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"] },
  { number: "13", name: "Gabriel Martinelli", team: "Arsenal", persons: ["Gabriel Martinelli"] },
  { number: "14", name: "Leandro Trossard", team: "Arsenal", persons: ["Leandro Trossard"] },
  { number: "15", name: "Kai Havertz", team: "Arsenal", persons: ["Kai Havertz"] },
  { number: "16", name: "Gabriel Martinelli", team: "Arsenal", subset: "Generation Now", persons: ["Gabriel Martinelli"] },
  { number: "17", name: "Jurriën Timber", team: "Arsenal", subset: "Full Force", persons: ["Jurriën Timber"] },
  { number: "18", name: "Myles Lewis-Skelly", team: "Arsenal", subset: "Breakthrough Baller", persons: ["Myles Lewis-Skelly"] },

  // Aston Villa (19-36)
  { number: "19", name: "Team Badge", team: "Aston Villa", badge: true },
  { number: "20", name: "Emiliano Martínez", team: "Aston Villa", persons: ["Emiliano Martínez"] },
  { number: "21", name: "Pau Torres", team: "Aston Villa", persons: ["Pau Torres"] },
  { number: "22", name: "Ezri Konsa", team: "Aston Villa", persons: ["Ezri Konsa"] },
  { number: "23", name: "Matty Cash", team: "Aston Villa", persons: ["Matty Cash"] },
  { number: "24", name: "Lucas Digne", team: "Aston Villa", persons: ["Lucas Digne"] },
  { number: "25", name: "Boubacar Kamara", team: "Aston Villa", persons: ["Boubacar Kamara"] },
  { number: "26", name: "Amadou Onana", team: "Aston Villa", persons: ["Amadou Onana"] },
  { number: "27", name: "John McGinn", team: "Aston Villa", persons: ["John McGinn"] },
  { number: "28", name: "Youri Tielemans", team: "Aston Villa", persons: ["Youri Tielemans"] },
  { number: "29", name: "Jacob Ramsey", team: "Aston Villa", persons: ["Jacob Ramsey"] },
  { number: "30", name: "Morgan Rogers", team: "Aston Villa", persons: ["Morgan Rogers"] },
  { number: "31", name: "Louie Barry", team: "Aston Villa", subset: "Rookie", persons: ["Louie Barry"] },
  { number: "32", name: "Donyell Malen", team: "Aston Villa", persons: ["Donyell Malen"] },
  { number: "33", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"] },
  { number: "34", name: "Boubacar Kamara", team: "Aston Villa", subset: "Generation Now", persons: ["Boubacar Kamara"] },
  { number: "35", name: "John McGinn", team: "Aston Villa", subset: "Full Force", persons: ["John McGinn"] },
  { number: "36", name: "Donyell Malen", team: "Aston Villa", subset: "Tekker", persons: ["Donyell Malen"] },

  // AFC Bournemouth (37-54)
  { number: "37", name: "Team Badge", team: "AFC Bournemouth", badge: true },
  { number: "38", name: "Kepa Arrizabalaga", team: "AFC Bournemouth", persons: ["Kepa Arrizabalaga"] },
  { number: "39", name: "Illia Zabarnyi", team: "AFC Bournemouth", persons: ["Illia Zabarnyi"] },
  { number: "40", name: "Dean Huijsen", team: "AFC Bournemouth", persons: ["Dean Huijsen"] },
  { number: "41", name: "Julio Soler", team: "AFC Bournemouth", subset: "Rookie", persons: ["Julio Soler"] },
  { number: "42", name: "Milos Kerkez", team: "AFC Bournemouth", persons: ["Milos Kerkez"] },
  { number: "43", name: "Tyler Adams", team: "AFC Bournemouth", persons: ["Tyler Adams"] },
  { number: "44", name: "Lewis Cook", team: "AFC Bournemouth", persons: ["Lewis Cook"] },
  { number: "45", name: "Ryan Christie", team: "AFC Bournemouth", persons: ["Ryan Christie"] },
  { number: "46", name: "Luis Sinisterra", team: "AFC Bournemouth", persons: ["Luis Sinisterra"] },
  { number: "47", name: "Antoine Semenyo", team: "AFC Bournemouth", persons: ["Antoine Semenyo"] },
  { number: "48", name: "Justin Kluivert", team: "AFC Bournemouth", persons: ["Justin Kluivert"] },
  { number: "49", name: "Eli Junior Kroupi", team: "AFC Bournemouth", persons: ["Eli Junior Kroupi"] },
  { number: "50", name: "Dango Ouattara", team: "AFC Bournemouth", persons: ["Dango Ouattara"] },
  { number: "51", name: "Evanilson", team: "AFC Bournemouth", persons: ["Evanilson"] },
  { number: "52", name: "Milos Kerkez", team: "AFC Bournemouth", subset: "Generation Now", persons: ["Milos Kerkez"] },
  { number: "53", name: "Illia Zabarnyi", team: "AFC Bournemouth", subset: "Full Force", persons: ["Illia Zabarnyi"] },
  { number: "54", name: "Justin Kluivert", team: "AFC Bournemouth", subset: "Tekker", persons: ["Justin Kluivert"] },

  // Brentford (55-72)
  { number: "55", name: "Team Badge", team: "Brentford", badge: true },
  { number: "56", name: "Mark Flekken", team: "Brentford", persons: ["Mark Flekken"] },
  { number: "57", name: "Nathan Collins", team: "Brentford", persons: ["Nathan Collins"] },
  { number: "58", name: "Sepp van den Berg", team: "Brentford", persons: ["Sepp van den Berg"] },
  { number: "59", name: "Michael Kayode", team: "Brentford", persons: ["Michael Kayode"] },
  { number: "60", name: "Christian Nørgaard", team: "Brentford", persons: ["Christian Nørgaard"] },
  { number: "61", name: "Mathias Jensen", team: "Brentford", persons: ["Mathias Jensen"] },
  { number: "62", name: "Vitaly Janelt", team: "Brentford", persons: ["Vitaly Janelt"] },
  { number: "63", name: "Mikkel Damsgaard", team: "Brentford", persons: ["Mikkel Damsgaard"] },
  { number: "64", name: "Fábio Carvalho", team: "Brentford", persons: ["Fábio Carvalho"] },
  { number: "65", name: "Kevin Schade", team: "Brentford", persons: ["Kevin Schade"] },
  { number: "66", name: "Keane Lewis-Potter", team: "Brentford", persons: ["Keane Lewis-Potter"] },
  { number: "67", name: "Gustavo Nunes", team: "Brentford", subset: "Rookie", persons: ["Gustavo Nunes"] },
  { number: "68", name: "Bryan Mbeumo", team: "Brentford", persons: ["Bryan Mbeumo"] },
  { number: "69", name: "Yoane Wissa", team: "Brentford", persons: ["Yoane Wissa"] },
  { number: "70", name: "Fábio Carvalho", team: "Brentford", subset: "Generation Now", persons: ["Fábio Carvalho"] },
  { number: "71", name: "Gustavo Nunes", team: "Brentford", subset: "Full Force", persons: ["Gustavo Nunes"] },
  { number: "72", name: "Kevin Schade", team: "Brentford", subset: "Tekker", persons: ["Kevin Schade"] },

  // Brighton & Hove Albion (73-90)
  { number: "73", name: "Team Badge", team: "Brighton & Hove Albion", badge: true },
  { number: "74", name: "Bart Verbruggen", team: "Brighton & Hove Albion", persons: ["Bart Verbruggen"] },
  { number: "75", name: "Jan Paul van Hecke", team: "Brighton & Hove Albion", persons: ["Jan Paul van Hecke"] },
  { number: "76", name: "Pervis Estupiñán", team: "Brighton & Hove Albion", persons: ["Pervis Estupiñán"] },
  { number: "77", name: "Lewis Dunk", team: "Brighton & Hove Albion", persons: ["Lewis Dunk"] },
  { number: "78", name: "Jack Hinshelwood", team: "Brighton & Hove Albion", persons: ["Jack Hinshelwood"] },
  { number: "79", name: "Yankuba Minteh", team: "Brighton & Hove Albion", persons: ["Yankuba Minteh"] },
  { number: "80", name: "Carlos Baleba", team: "Brighton & Hove Albion", persons: ["Carlos Baleba"] },
  { number: "81", name: "Yoon Do-young", team: "Brighton & Hove Albion", subset: "Rookie", persons: ["Yoon Do-young"] },
  { number: "82", name: "Yasin Ayari", team: "Brighton & Hove Albion", subset: "Rookie", persons: ["Yasin Ayari"] },
  { number: "83", name: "Kaoru Mitoma", team: "Brighton & Hove Albion", persons: ["Kaoru Mitoma"] },
  { number: "84", name: "Stefanos Tzimas", team: "Brighton & Hove Albion", subset: "Rookie", persons: ["Stefanos Tzimas"] },
  { number: "85", name: "Danny Welbeck", team: "Brighton & Hove Albion", persons: ["Danny Welbeck"] },
  { number: "86", name: "Georginio Rutter", team: "Brighton & Hove Albion", persons: ["Georginio Rutter"] },
  { number: "87", name: "João Pedro", team: "Brighton & Hove Albion", persons: ["João Pedro"] },
  { number: "88", name: "Matt O'Riley", team: "Brighton & Hove Albion", subset: "Generation Now", persons: ["Matt O'Riley"] },
  { number: "89", name: "Carlos Baleba", team: "Brighton & Hove Albion", subset: "Full Force", persons: ["Carlos Baleba"] },
  { number: "90", name: "Matt O'Riley", team: "Brighton & Hove Albion", subset: "Tekker", persons: ["Matt O'Riley"] },

  // Chelsea (91-108)
  { number: "91", name: "Team Badge", team: "Chelsea", badge: true },
  { number: "92", name: "Robert Sánchez", team: "Chelsea", persons: ["Robert Sánchez"] },
  { number: "93", name: "Levi Colwill", team: "Chelsea", persons: ["Levi Colwill"] },
  { number: "94", name: "Tosin Adarabioyo", team: "Chelsea", persons: ["Tosin Adarabioyo"] },
  { number: "95", name: "Reece James", team: "Chelsea", persons: ["Reece James"] },
  { number: "96", name: "Marc Cucurella", team: "Chelsea", persons: ["Marc Cucurella"] },
  { number: "97", name: "Harrison Murray-Campbell", team: "Chelsea", subset: "Rookie", persons: ["Harrison Murray-Campbell"] },
  { number: "98", name: "Moisés Caicedo", team: "Chelsea", persons: ["Moisés Caicedo"] },
  { number: "99", name: "Enzo Fernández", team: "Chelsea", persons: ["Enzo Fernández"] },
  { number: "100", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"] },
  { number: "101", name: "Kendry Páez", team: "Chelsea", subset: "Rookie", persons: ["Kendry Páez"] },
  { number: "102", name: "Pedro Neto", team: "Chelsea", persons: ["Pedro Neto"] },
  { number: "103", name: "Noni Madueke", team: "Chelsea", persons: ["Noni Madueke"] },
  { number: "104", name: "Nicolas Jackson", team: "Chelsea", persons: ["Nicolas Jackson"] },
  { number: "105", name: "Estêvão", team: "Chelsea", subset: "Rookie", persons: ["Estêvão"] },
  { number: "106", name: "Levi Colwill", team: "Chelsea", subset: "Generation Now", persons: ["Levi Colwill"] },
  { number: "107", name: "Marc Cucurella", team: "Chelsea", subset: "Full Force", persons: ["Marc Cucurella"] },
  { number: "108", name: "Noni Madueke", team: "Chelsea", subset: "Tekker", persons: ["Noni Madueke"] },

  // Crystal Palace (109-126)
  { number: "109", name: "Team Badge", team: "Crystal Palace", badge: true },
  { number: "110", name: "Dean Henderson", team: "Crystal Palace", persons: ["Dean Henderson"] },
  { number: "111", name: "Tyrick Mitchell", team: "Crystal Palace", persons: ["Tyrick Mitchell"] },
  { number: "112", name: "Chadi Riad", team: "Crystal Palace", persons: ["Chadi Riad"] },
  { number: "113", name: "Maxence Lacroix", team: "Crystal Palace", persons: ["Maxence Lacroix"] },
  { number: "114", name: "Marc Guéhi", team: "Crystal Palace", persons: ["Marc Guéhi"] },
  { number: "115", name: "Chris Richards", team: "Crystal Palace", persons: ["Chris Richards"] },
  { number: "116", name: "Daniel Muñoz", team: "Crystal Palace", persons: ["Daniel Muñoz"] },
  { number: "117", name: "Adam Wharton", team: "Crystal Palace", persons: ["Adam Wharton"] },
  { number: "118", name: "Romain Esse", team: "Crystal Palace", subset: "Rookie", persons: ["Romain Esse"] },
  { number: "119", name: "Daichi Kamada", team: "Crystal Palace", persons: ["Daichi Kamada"] },
  { number: "120", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"] },
  { number: "121", name: "Ismaïla Sarr", team: "Crystal Palace", persons: ["Ismaïla Sarr"] },
  { number: "122", name: "Eddie Nketiah", team: "Crystal Palace", persons: ["Eddie Nketiah"] },
  { number: "123", name: "Jean-Philippe Mateta", team: "Crystal Palace", persons: ["Jean-Philippe Mateta"] },
  { number: "124", name: "Marc Guéhi", team: "Crystal Palace", subset: "Generation Now", persons: ["Marc Guéhi"] },
  { number: "125", name: "Tyrick Mitchell", team: "Crystal Palace", subset: "Full Force", persons: ["Tyrick Mitchell"] },
  { number: "126", name: "Ismaïla Sarr", team: "Crystal Palace", subset: "Tekker", persons: ["Ismaïla Sarr"] },

  // Everton (127-144)
  { number: "127", name: "Team Badge", team: "Everton", badge: true },
  { number: "128", name: "Jordan Pickford", team: "Everton", persons: ["Jordan Pickford"] },
  { number: "129", name: "James Tarkowski", team: "Everton", persons: ["James Tarkowski"] },
  { number: "130", name: "Jarrad Branthwaite", team: "Everton", persons: ["Jarrad Branthwaite"] },
  { number: "131", name: "Vitalii Mykolenko", team: "Everton", persons: ["Vitalii Mykolenko"] },
  { number: "132", name: "Jake O'Brien", team: "Everton", persons: ["Jake O'Brien"] },
  { number: "133", name: "Nathan Patterson", team: "Everton", persons: ["Nathan Patterson"] },
  { number: "134", name: "Roman Dixon", team: "Everton", subset: "Rookie", persons: ["Roman Dixon"] },
  { number: "135", name: "Tim Iroegbunam", team: "Everton", persons: ["Tim Iroegbunam"] },
  { number: "136", name: "Harrison Armstrong", team: "Everton", subset: "Rookie", persons: ["Harrison Armstrong"] },
  { number: "137", name: "James Garner", team: "Everton", persons: ["James Garner"] },
  { number: "138", name: "Dwight McNeil", team: "Everton", persons: ["Dwight McNeil"] },
  { number: "139", name: "Iliman Ndiaye", team: "Everton", persons: ["Iliman Ndiaye"] },
  { number: "140", name: "Beto", team: "Everton", persons: ["Beto"] },
  { number: "141", name: "Youssef Chermiti", team: "Everton", persons: ["Youssef Chermiti"] },
  { number: "142", name: "Iliman Ndiaye", team: "Everton", subset: "Generation Now", persons: ["Iliman Ndiaye"] },
  { number: "143", name: "Vitalii Mykolenko", team: "Everton", subset: "Full Force", persons: ["Vitalii Mykolenko"] },
  { number: "144", name: "Iliman Ndiaye", team: "Everton", subset: "Tekker", persons: ["Iliman Ndiaye"] },

  // Fulham (145-162)
  { number: "145", name: "Team Badge", team: "Fulham", badge: true },
  { number: "146", name: "Bernd Leno", team: "Fulham", persons: ["Bernd Leno"] },
  { number: "147", name: "Calvin Bassey", team: "Fulham", persons: ["Calvin Bassey"] },
  { number: "148", name: "Joachim Andersen", team: "Fulham", persons: ["Joachim Andersen"] },
  { number: "149", name: "Sander Berge", team: "Fulham", persons: ["Sander Berge"] },
  { number: "150", name: "Antonee Robinson", team: "Fulham", persons: ["Antonee Robinson"] },
  { number: "151", name: "Saša Lukić", team: "Fulham", persons: ["Saša Lukić"] },
  { number: "152", name: "Josh King", team: "Fulham", subset: "Rookie", persons: ["Josh King"] },
  { number: "153", name: "Andreas Pereira", team: "Fulham", persons: ["Andreas Pereira"] },
  { number: "154", name: "Alex Iwobi", team: "Fulham", persons: ["Alex Iwobi"] },
  { number: "155", name: "Emile Smith Rowe", team: "Fulham", persons: ["Emile Smith Rowe"] },
  { number: "156", name: "Harry Wilson", team: "Fulham", persons: ["Harry Wilson"] },
  { number: "157", name: "Adama Traoré", team: "Fulham", persons: ["Adama Traoré"] },
  { number: "158", name: "Rodrigo Muniz", team: "Fulham", persons: ["Rodrigo Muniz"] },
  { number: "159", name: "Raúl Jiménez", team: "Fulham", persons: ["Raúl Jiménez"] },
  { number: "160", name: "Rodrigo Muniz", team: "Fulham", subset: "Generation Now", persons: ["Rodrigo Muniz"] },
  { number: "161", name: "Calvin Bassey", team: "Fulham", subset: "Full Force", persons: ["Calvin Bassey"] },
  { number: "162", name: "Josh King", team: "Fulham", subset: "Breakthrough Baller", persons: ["Josh King"] },

  // Liverpool (163-180)
  { number: "163", name: "Team Badge", team: "Liverpool", subset: "Premier League Champions", badge: true },
  { number: "164", name: "Alisson Becker", team: "Liverpool", persons: ["Alisson Becker"] },
  { number: "165", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"] },
  { number: "166", name: "Ibrahima Konaté", team: "Liverpool", persons: ["Ibrahima Konaté"] },
  { number: "167", name: "Andy Robertson", team: "Liverpool", persons: ["Andy Robertson"] },
  { number: "168", name: "Conor Bradley", team: "Liverpool", persons: ["Conor Bradley"] },
  { number: "169", name: "Ryan Gravenberch", team: "Liverpool", persons: ["Ryan Gravenberch"] },
  { number: "170", name: "Alexis Mac Allister", team: "Liverpool", persons: ["Alexis Mac Allister"] },
  { number: "171", name: "Dominik Szoboszlai", team: "Liverpool", persons: ["Dominik Szoboszlai"] },
  { number: "172", name: "Rio Ngumoha", team: "Liverpool", subset: "Rookie", persons: ["Rio Ngumoha"] },
  { number: "173", name: "Luis Díaz", team: "Liverpool", persons: ["Luis Díaz"] },
  { number: "174", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"] },
  { number: "175", name: "Cody Gakpo", team: "Liverpool", persons: ["Cody Gakpo"] },
  { number: "176", name: "Diogo Jota", team: "Liverpool", persons: ["Diogo Jota"] },
  { number: "177", name: "Darwin Núñez", team: "Liverpool", persons: ["Darwin Núñez"] },
  { number: "178", name: "Dominik Szoboszlai", team: "Liverpool", subset: "Generation Now", persons: ["Dominik Szoboszlai"] },
  { number: "179", name: "Darwin Núñez", team: "Liverpool", subset: "Full Force", persons: ["Darwin Núñez"] },
  { number: "180", name: "Luis Díaz", team: "Liverpool", subset: "Tekker", persons: ["Luis Díaz"] },

  // Manchester City (181-198)
  { number: "181", name: "Team Badge", team: "Manchester City", badge: true },
  { number: "182", name: "Ederson", team: "Manchester City", persons: ["Ederson"] },
  { number: "183", name: "Rúben Dias", team: "Manchester City", persons: ["Rúben Dias"] },
  { number: "184", name: "Joško Gvardiol", team: "Manchester City", persons: ["Joško Gvardiol"] },
  { number: "185", name: "Vitor Reis", team: "Manchester City", subset: "Rookie", persons: ["Vitor Reis"] },
  { number: "186", name: "Divine Mukasa", team: "Manchester City", subset: "Rookie", persons: ["Divine Mukasa"] },
  { number: "187", name: "Nico González", team: "Manchester City", persons: ["Nico González"] },
  { number: "188", name: "Rodri", team: "Manchester City", persons: ["Rodri"] },
  { number: "189", name: "Jérémy Doku", team: "Manchester City", persons: ["Jérémy Doku"] },
  { number: "190", name: "Phil Foden", team: "Manchester City", persons: ["Phil Foden"] },
  { number: "191", name: "Bernardo Silva", team: "Manchester City", persons: ["Bernardo Silva"] },
  { number: "192", name: "Sávio", team: "Manchester City", persons: ["Sávio"] },
  { number: "193", name: "Reigan Heskey", team: "Manchester City", subset: "Rookie", persons: ["Reigan Heskey"] },
  { number: "194", name: "Omar Marmoush", team: "Manchester City", persons: ["Omar Marmoush"] },
  { number: "195", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { number: "196", name: "Jérémy Doku", team: "Manchester City", subset: "Generation Now", persons: ["Jérémy Doku"] },
  { number: "197", name: "Joško Gvardiol", team: "Manchester City", subset: "Full Force", persons: ["Joško Gvardiol"] },
  { number: "198", name: "Sávio", team: "Manchester City", subset: "Tekker", persons: ["Sávio"] },

  // Manchester United (199-216)
  { number: "199", name: "Team Badge", team: "Manchester United", badge: true },
  { number: "200", name: "André Onana", team: "Manchester United", persons: ["André Onana"] },
  { number: "201", name: "Matthijs de Ligt", team: "Manchester United", persons: ["Matthijs de Ligt"] },
  { number: "202", name: "Leny Yoro", team: "Manchester United", persons: ["Leny Yoro"] },
  { number: "203", name: "Lisandro Martínez", team: "Manchester United", persons: ["Lisandro Martínez"] },
  { number: "204", name: "Diogo Dalot", team: "Manchester United", persons: ["Diogo Dalot"] },
  { number: "205", name: "Sékou Koné", team: "Manchester United", subset: "Rookie", persons: ["Sékou Koné"] },
  { number: "206", name: "Kobbie Mainoo", team: "Manchester United", persons: ["Kobbie Mainoo"] },
  { number: "207", name: "Manuel Ugarte", team: "Manchester United", persons: ["Manuel Ugarte"] },
  { number: "208", name: "Bruno Fernandes", team: "Manchester United", persons: ["Bruno Fernandes"] },
  { number: "209", name: "Shea Lacey", team: "Manchester United", subset: "Rookie", persons: ["Shea Lacey"] },
  { number: "210", name: "Alejandro Garnacho", team: "Manchester United", persons: ["Alejandro Garnacho"] },
  { number: "211", name: "Amad", team: "Manchester United", persons: ["Amad"] },
  { number: "212", name: "Joshua Zirkzee", team: "Manchester United", persons: ["Joshua Zirkzee"] },
  { number: "213", name: "Rasmus Højlund", team: "Manchester United", persons: ["Rasmus Højlund"] },
  { number: "214", name: "Kobbie Mainoo", team: "Manchester United", subset: "Generation Now", persons: ["Kobbie Mainoo"] },
  { number: "215", name: "Manuel Ugarte", team: "Manchester United", subset: "Full Force", persons: ["Manuel Ugarte"] },
  { number: "216", name: "Patrick Dorgu", team: "Manchester United", subset: "Breakthrough Baller", persons: ["Patrick Dorgu"] },

  // Newcastle United (217-234)
  { number: "217", name: "Team Badge", team: "Newcastle United", badge: true },
  { number: "218", name: "Nick Pope", team: "Newcastle United", persons: ["Nick Pope"] },
  { number: "219", name: "Dan Burn", team: "Newcastle United", persons: ["Dan Burn"] },
  { number: "220", name: "Sven Botman", team: "Newcastle United", persons: ["Sven Botman"] },
  { number: "221", name: "Fabian Schär", team: "Newcastle United", persons: ["Fabian Schär"] },
  { number: "222", name: "Tino Livramento", team: "Newcastle United", persons: ["Tino Livramento"] },
  { number: "223", name: "Lewis Hall", team: "Newcastle United", persons: ["Lewis Hall"] },
  { number: "224", name: "Lewis Miley", team: "Newcastle United", persons: ["Lewis Miley"] },
  { number: "225", name: "Sandro Tonali", team: "Newcastle United", persons: ["Sandro Tonali"] },
  { number: "226", name: "Joelinton", team: "Newcastle United", persons: ["Joelinton"] },
  { number: "227", name: "Bruno Guimarães", team: "Newcastle United", persons: ["Bruno Guimarães"] },
  { number: "228", name: "Jacob Murphy", team: "Newcastle United", persons: ["Jacob Murphy"] },
  { number: "229", name: "Harvey Barnes", team: "Newcastle United", persons: ["Harvey Barnes"] },
  { number: "230", name: "Anthony Gordon", team: "Newcastle United", persons: ["Anthony Gordon"] },
  { number: "231", name: "Alexander Isak", team: "Newcastle United", persons: ["Alexander Isak"] },
  { number: "232", name: "Tino Livramento", team: "Newcastle United", subset: "Generation Now", persons: ["Tino Livramento"] },
  { number: "233", name: "Joelinton", team: "Newcastle United", subset: "Full Force", persons: ["Joelinton"] },
  { number: "234", name: "Lewis Miley", team: "Newcastle United", subset: "Breakthrough Baller", persons: ["Lewis Miley"] },

  // Nottingham Forest (235-252)
  { number: "235", name: "Team Badge", team: "Nottingham Forest", badge: true },
  { number: "236", name: "Matz Sels", team: "Nottingham Forest", persons: ["Matz Sels"] },
  { number: "237", name: "Nikola Milenković", team: "Nottingham Forest", persons: ["Nikola Milenković"] },
  { number: "238", name: "Ola Aina", team: "Nottingham Forest", persons: ["Ola Aina"] },
  { number: "239", name: "Murillo", team: "Nottingham Forest", persons: ["Murillo"] },
  { number: "240", name: "Neco Williams", team: "Nottingham Forest", persons: ["Neco Williams"] },
  { number: "241", name: "Zach Abbott", team: "Nottingham Forest", subset: "Rookie", persons: ["Zach Abbott"] },
  { number: "242", name: "Ryan Yates", team: "Nottingham Forest", persons: ["Ryan Yates"] },
  { number: "243", name: "Ibrahim Sangaré", team: "Nottingham Forest", persons: ["Ibrahim Sangaré"] },
  { number: "244", name: "Elliot Anderson", team: "Nottingham Forest", persons: ["Elliot Anderson"] },
  { number: "245", name: "Morgan Gibbs-White", team: "Nottingham Forest", persons: ["Morgan Gibbs-White"] },
  { number: "246", name: "Callum Hudson-Odoi", team: "Nottingham Forest", persons: ["Callum Hudson-Odoi"] },
  { number: "247", name: "Anthony Elanga", team: "Nottingham Forest", persons: ["Anthony Elanga"] },
  { number: "248", name: "Taiwo Awoniyi", team: "Nottingham Forest", persons: ["Taiwo Awoniyi"] },
  { number: "249", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"] },
  { number: "250", name: "Murillo", team: "Nottingham Forest", subset: "Generation Now", persons: ["Murillo"] },
  { number: "251", name: "Ola Aina", team: "Nottingham Forest", subset: "Full Force", persons: ["Ola Aina"] },
  { number: "252", name: "Anthony Elanga", team: "Nottingham Forest", subset: "Tekker", persons: ["Anthony Elanga"] },

  // Tottenham Hotspur (253-270)
  { number: "253", name: "Team Badge", team: "Tottenham Hotspur", badge: true },
  { number: "254", name: "Antonín Kinský", team: "Tottenham Hotspur", subset: "Rookie", persons: ["Antonín Kinský"] },
  { number: "255", name: "Pedro Porro", team: "Tottenham Hotspur", persons: ["Pedro Porro"] },
  { number: "256", name: "Micky van de Ven", team: "Tottenham Hotspur", persons: ["Micky van de Ven"] },
  { number: "257", name: "Cristian Romero", team: "Tottenham Hotspur", persons: ["Cristian Romero"] },
  { number: "258", name: "Destiny Udogie", team: "Tottenham Hotspur", persons: ["Destiny Udogie"] },
  { number: "259", name: "Archie Gray", team: "Tottenham Hotspur", persons: ["Archie Gray"] },
  { number: "260", name: "Dejan Kulusevski", team: "Tottenham Hotspur", persons: ["Dejan Kulusevski"] },
  { number: "261", name: "Lucas Bergvall", team: "Tottenham Hotspur", persons: ["Lucas Bergvall"] },
  { number: "262", name: "James Maddison", team: "Tottenham Hotspur", persons: ["James Maddison"] },
  { number: "263", name: "Will Lankshear", team: "Tottenham Hotspur", subset: "Rookie", persons: ["Will Lankshear"] },
  { number: "264", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"] },
  { number: "265", name: "Brennan Johnson", team: "Tottenham Hotspur", persons: ["Brennan Johnson"] },
  { number: "266", name: "Mikey Moore", team: "Tottenham Hotspur", persons: ["Mikey Moore"] },
  { number: "267", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"] },
  { number: "268", name: "Lucas Bergvall", team: "Tottenham Hotspur", subset: "Generation Now", persons: ["Lucas Bergvall"] },
  { number: "269", name: "Mikey Moore", team: "Tottenham Hotspur", subset: "Full Force", persons: ["Mikey Moore"] },
  { number: "270", name: "Archie Gray", team: "Tottenham Hotspur", subset: "Breakthrough Baller", persons: ["Archie Gray"] },

  // West Ham United (271-288)
  { number: "271", name: "Team Badge", team: "West Ham United", badge: true },
  { number: "272", name: "Alphonse Areola", team: "West Ham United", persons: ["Alphonse Areola"] },
  { number: "273", name: "Jean-Clair Todibo", team: "West Ham United", persons: ["Jean-Clair Todibo"] },
  { number: "274", name: "Maximilian Kilman", team: "West Ham United", persons: ["Maximilian Kilman"] },
  { number: "275", name: "Aaron Wan-Bissaka", team: "West Ham United", persons: ["Aaron Wan-Bissaka"] },
  { number: "276", name: "Emerson Palmieri", team: "West Ham United", persons: ["Emerson Palmieri"] },
  { number: "277", name: "Oliver Scarles", team: "West Ham United", persons: ["Oliver Scarles"] },
  { number: "278", name: "Tomáš Souček", team: "West Ham United", persons: ["Tomáš Souček"] },
  { number: "279", name: "Edson Álvarez", team: "West Ham United", persons: ["Edson Álvarez"] },
  { number: "280", name: "Guido Rodríguez", team: "West Ham United", persons: ["Guido Rodríguez"] },
  { number: "281", name: "Mohammed Kudus", team: "West Ham United", persons: ["Mohammed Kudus"] },
  { number: "282", name: "Niclas Füllkrug", team: "West Ham United", persons: ["Niclas Füllkrug"] },
  { number: "283", name: "Crysencio Summerville", team: "West Ham United", persons: ["Crysencio Summerville"] },
  { number: "284", name: "Jarrod Bowen", team: "West Ham United", persons: ["Jarrod Bowen"] },
  { number: "285", name: "Luis Guilherme", team: "West Ham United", subset: "Rookie", persons: ["Luis Guilherme"] },
  { number: "286", name: "Crysencio Summerville", team: "West Ham United", subset: "Generation Now", persons: ["Crysencio Summerville"] },
  { number: "287", name: "Aaron Wan-Bissaka", team: "West Ham United", subset: "Full Force", persons: ["Aaron Wan-Bissaka"] },
  { number: "288", name: "Luis Guilherme", team: "West Ham United", subset: "Breakthrough Baller", persons: ["Luis Guilherme"] },

  // Wolverhampton Wanderers (289-306)
  { number: "289", name: "Team Badge", team: "Wolverhampton Wanderers", badge: true },
  { number: "290", name: "José Sá", team: "Wolverhampton Wanderers", persons: ["José Sá"] },
  { number: "291", name: "Nélson Semedo", team: "Wolverhampton Wanderers", persons: ["Nélson Semedo"] },
  { number: "292", name: "Nasser Djiga", team: "Wolverhampton Wanderers", subset: "Rookie", persons: ["Nasser Djiga"] },
  { number: "293", name: "Emmanuel Agbadou", team: "Wolverhampton Wanderers", persons: ["Emmanuel Agbadou"] },
  { number: "294", name: "Toti Gomes", team: "Wolverhampton Wanderers", persons: ["Toti Gomes"] },
  { number: "295", name: "Rayan Aït-Nouri", team: "Wolverhampton Wanderers", persons: ["Rayan Aït-Nouri"] },
  { number: "296", name: "Marshall Munetsi", team: "Wolverhampton Wanderers", persons: ["Marshall Munetsi"] },
  { number: "297", name: "André", team: "Wolverhampton Wanderers", persons: ["André"] },
  { number: "298", name: "João Gomes", team: "Wolverhampton Wanderers", persons: ["João Gomes"] },
  { number: "299", name: "Rodrigo Gomes", team: "Wolverhampton Wanderers", persons: ["Rodrigo Gomes"] },
  { number: "300", name: "Gonçalo Guedes", team: "Wolverhampton Wanderers", persons: ["Gonçalo Guedes"] },
  { number: "301", name: "Hwang Hee-Chan", team: "Wolverhampton Wanderers", persons: ["Hwang Hee-Chan"] },
  { number: "302", name: "Jørgen Strand Larsen", team: "Wolverhampton Wanderers", persons: ["Jørgen Strand Larsen"] },
  { number: "303", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"] },
  { number: "304", name: "João Gomes", team: "Wolverhampton Wanderers", subset: "Generation Now", persons: ["João Gomes"] },
  { number: "305", name: "Nasser Djiga", team: "Wolverhampton Wanderers", subset: "Full Force", persons: ["Nasser Djiga"] },
  { number: "306", name: "André", team: "Wolverhampton Wanderers", subset: "Breakthrough Baller", persons: ["André"] },

  // Burnley (307-324)
  { number: "307", name: "Team Badge", team: "Burnley", badge: true },
  { number: "308", name: "James Trafford", team: "Burnley", persons: ["James Trafford"] },
  { number: "309", name: "Maxime Estève", team: "Burnley", persons: ["Maxime Estève"] },
  { number: "310", name: "Bashir Humphreys", team: "Burnley", subset: "Rookie", persons: ["Bashir Humphreys"] },
  { number: "311", name: "Connor Roberts", team: "Burnley", persons: ["Connor Roberts"] },
  { number: "312", name: "Lucas Pires", team: "Burnley", persons: ["Lucas Pires"] },
  { number: "313", name: "Josh Laurent", team: "Burnley", subset: "Rookie", persons: ["Josh Laurent"] },
  { number: "314", name: "Josh Cullen", team: "Burnley", persons: ["Josh Cullen"] },
  { number: "315", name: "Josh Brownhill", team: "Burnley", persons: ["Josh Brownhill"] },
  { number: "316", name: "Hannibal", team: "Burnley", persons: ["Hannibal"] },
  { number: "317", name: "Marcus Edwards", team: "Burnley", persons: ["Marcus Edwards"] },
  { number: "318", name: "Lyle Foster", team: "Burnley", persons: ["Lyle Foster"] },
  { number: "319", name: "Luca Koleosho", team: "Burnley", persons: ["Luca Koleosho"] },
  { number: "320", name: "Jaidon Anthony", team: "Burnley", persons: ["Jaidon Anthony"] },
  { number: "321", name: "Jaydon Banel", team: "Burnley", subset: "Rookie", persons: ["Jaydon Banel"] },
  { number: "322", name: "Lucas Pires", team: "Burnley", subset: "Generation Now", persons: ["Lucas Pires"] },
  { number: "323", name: "Josh Cullen", team: "Burnley", subset: "Full Force", persons: ["Josh Cullen"] },
  { number: "324", name: "Luca Koleosho", team: "Burnley", subset: "Breakthrough Baller", persons: ["Luca Koleosho"] },

  // Leeds United (325-342)
  { number: "325", name: "Team Badge", team: "Leeds United", badge: true },
  { number: "326", name: "Illan Meslier", team: "Leeds United", persons: ["Illan Meslier"] },
  { number: "327", name: "Joe Rodon", team: "Leeds United", persons: ["Joe Rodon"] },
  { number: "328", name: "Pascal Struijk", team: "Leeds United", persons: ["Pascal Struijk"] },
  { number: "329", name: "Jayden Bogle", team: "Leeds United", persons: ["Jayden Bogle"] },
  { number: "330", name: "Ethan Ampadu", team: "Leeds United", persons: ["Ethan Ampadu"] },
  { number: "331", name: "Ao Tanaka", team: "Leeds United", persons: ["Ao Tanaka"] },
  { number: "332", name: "Brenden Aaronson", team: "Leeds United", persons: ["Brenden Aaronson"] },
  { number: "333", name: "Ilia Gruev", team: "Leeds United", persons: ["Ilia Gruev"] },
  { number: "334", name: "Harry Gray", team: "Leeds United", subset: "Rookie", persons: ["Harry Gray"] },
  { number: "335", name: "Mateo Joseph", team: "Leeds United", subset: "Rookie", persons: ["Mateo Joseph"] },
  { number: "336", name: "Wilfried Gnonto", team: "Leeds United", persons: ["Wilfried Gnonto"] },
  { number: "337", name: "Daniel James", team: "Leeds United", persons: ["Daniel James"] },
  { number: "338", name: "Patrick Bamford", team: "Leeds United", persons: ["Patrick Bamford"] },
  { number: "339", name: "Joël Piroe", team: "Leeds United", subset: "Rookie", persons: ["Joël Piroe"] },
  { number: "340", name: "Mateo Joseph", team: "Leeds United", subset: "Generation Now", persons: ["Mateo Joseph"] },
  { number: "341", name: "Pascal Struijk", team: "Leeds United", subset: "Full Force", persons: ["Pascal Struijk"] },
  { number: "342", name: "Harry Gray", team: "Leeds United", subset: "Breakthrough Baller", persons: ["Harry Gray"] },

  // Sunderland (343-360)
  { number: "343", name: "Team Badge", team: "Sunderland", badge: true },
  { number: "344", name: "Anthony Patterson", team: "Sunderland", subset: "Rookie", persons: ["Anthony Patterson"] },
  { number: "345", name: "Trai Hume", team: "Sunderland", subset: "Rookie", persons: ["Trai Hume"] },
  { number: "346", name: "Dennis Cirkin", team: "Sunderland", subset: "Rookie", persons: ["Dennis Cirkin"] },
  { number: "347", name: "Luke O'Nien", team: "Sunderland", subset: "Rookie", persons: ["Luke O'Nien"] },
  { number: "348", name: "Daniel Ballard", team: "Sunderland", subset: "Rookie", persons: ["Daniel Ballard"] },
  { number: "349", name: "Chris Rigg", team: "Sunderland", subset: "Rookie", persons: ["Chris Rigg"] },
  { number: "350", name: "Dan Neil", team: "Sunderland", subset: "Rookie", persons: ["Dan Neil"] },
  { number: "351", name: "Alan Browne", team: "Sunderland", subset: "Rookie", persons: ["Alan Browne"] },
  { number: "352", name: "Jobe Bellingham", team: "Sunderland", subset: "Rookie", persons: ["Jobe Bellingham"] },
  { number: "353", name: "Enzo Le Fée", team: "Sunderland", persons: ["Enzo Le Fée"] },
  { number: "354", name: "Romaine Mundle", team: "Sunderland", subset: "Rookie", persons: ["Romaine Mundle"] },
  { number: "355", name: "Patrick Roberts", team: "Sunderland", persons: ["Patrick Roberts"] },
  { number: "356", name: "Eliezer Mayenda", team: "Sunderland", subset: "Rookie", persons: ["Eliezer Mayenda"] },
  { number: "357", name: "Wilson Isidor", team: "Sunderland", subset: "Rookie", persons: ["Wilson Isidor"] },
  { number: "358", name: "Jobe Bellingham", team: "Sunderland", subset: "Generation Now", persons: ["Jobe Bellingham"] },
  { number: "359", name: "Wilson Isidor", team: "Sunderland", subset: "Full Force", persons: ["Wilson Isidor"] },
  { number: "360", name: "Chris Rigg", team: "Sunderland", subset: "Breakthrough Baller", persons: ["Chris Rigg"] },
];

/**
 * Base-card parallels. Festive / Blue / Yellow / Green cover the whole base
 * set (odds 1:2, 1:4, 1:8 reflect pack distribution, not availability).
 * Mini Diamond, Sparkles and Rainbow Foil are each a full serial-numbered
 * color ladder (Aqua #/499 down to Platinum/FoilFractor 1/1) that the real
 * checklist documents once per subset (base set AND every insert), not tied
 * to specific base numbers — which base numbers actually pull which colors
 * isn't published anywhere, so the numbers below remain an unconfirmed
 * placeholder inherited from before this pass, not sourced data. Topps has
 * retired the "Holo" name — the real checklist explicitly says those are now
 * called Mini Diamond, so it's removed here rather than kept as a separate,
 * fictitious fourth parallel.
 */
const EVERYWHERE_BASE_PARALLELS = ["Festive", "Blue", "Yellow", "Green"];

const LIMITED_BASE_PARALLELS: Record<string, string[]> = {
  "Mini Diamond": ["12", "100", "174", "195", "208", "231", "264"],
  "Sparkles": ["13", "101", "175", "196", "209", "232", "265", "303"],
  "Rainbow Foil": ["12", "100", "174", "195", "208", "231", "264", "303", "160", "352"],
};

/**
 * Base numbers that also exist as a Topps.com image-variation print — per
 * the real checklist ("Declan Rice Image Variation card added to the
 * illustrations", 2025-07-28 update) there are exactly 5, not the 33 this
 * previously guessed.
 */
const IMAGE_VARIATION_BASE_NUMBERS = ["8", "105", "172", "192", "211"];

interface InsertRow {
  subset: string;
  number: string;
  name: string;
  team: string;
  persons?: string[];
  auto?: boolean;
  relic?: boolean;
}

const INSERT_CARDS: InsertRow[] = [
  // Pro Partnership (#361-380) — team-paired duos, 2 persons per card
  { subset: "Pro Partnership", number: "361", name: "William Saliba & Gabriel Magalhães", team: "Arsenal", persons: ["William Saliba", "Gabriel Magalhães"] },
  { subset: "Pro Partnership", number: "362", name: "Amadou Onana & Youri Tielemans", team: "Aston Villa", persons: ["Amadou Onana", "Youri Tielemans"] },
  { subset: "Pro Partnership", number: "363", name: "Antoine Semenyo & Dango Ouattara", team: "AFC Bournemouth", persons: ["Antoine Semenyo", "Dango Ouattara"] },
  { subset: "Pro Partnership", number: "364", name: "Nathan Collins & Sepp van den Berg", team: "Brentford", persons: ["Nathan Collins", "Sepp van den Berg"] },
  { subset: "Pro Partnership", number: "365", name: "Kaoru Mitoma & Simon Adingra", team: "Brighton & Hove Albion", persons: ["Kaoru Mitoma", "Simon Adingra"] },
  { subset: "Pro Partnership", number: "366", name: "Ricardo Carvalho & John Terry", team: "Chelsea", persons: ["Ricardo Carvalho", "John Terry"] },
  { subset: "Pro Partnership", number: "367", name: "Moisés Caicedo & Enzo Fernández", team: "Chelsea", persons: ["Moisés Caicedo", "Enzo Fernández"] },
  { subset: "Pro Partnership", number: "368", name: "Daichi Kamada & Adam Wharton", team: "Crystal Palace", persons: ["Daichi Kamada", "Adam Wharton"] },
  { subset: "Pro Partnership", number: "369", name: "James Tarkowski & Jarrad Branthwaite", team: "Everton", persons: ["James Tarkowski", "Jarrad Branthwaite"] },
  { subset: "Pro Partnership", number: "370", name: "Enzo Le Fée & Patrick Roberts", team: "Sunderland", persons: ["Enzo Le Fée", "Patrick Roberts"] },
  { subset: "Pro Partnership", number: "371", name: "Ryan Gravenberch & Alexis Mac Allister", team: "Liverpool", persons: ["Ryan Gravenberch", "Alexis Mac Allister"] },
  { subset: "Pro Partnership", number: "372", name: "Phil Foden & Bernardo Silva", team: "Manchester City", persons: ["Phil Foden", "Bernardo Silva"] },
  { subset: "Pro Partnership", number: "373", name: "Bruno Fernandes & Rasmus Højlund", team: "Manchester United", persons: ["Bruno Fernandes", "Rasmus Højlund"] },
  { subset: "Pro Partnership", number: "374", name: "Bruno Guimarães & Joelinton", team: "Newcastle United", persons: ["Bruno Guimarães", "Joelinton"] },
  { subset: "Pro Partnership", number: "375", name: "Ola Aina & Callum Hudson-Odoi", team: "Nottingham Forest", persons: ["Ola Aina", "Callum Hudson-Odoi"] },
  { subset: "Pro Partnership", number: "376", name: "Brennan Johnson & Dejan Kulusevski", team: "Tottenham Hotspur", persons: ["Brennan Johnson", "Dejan Kulusevski"] },
  { subset: "Pro Partnership", number: "377", name: "Darren Anderton & Teddy Sheringham", team: "Tottenham Hotspur", persons: ["Darren Anderton", "Teddy Sheringham"] },
  { subset: "Pro Partnership", number: "378", name: "Gonçalo Guedes & Jørgen Strand Larsen", team: "Wolverhampton Wanderers", persons: ["Gonçalo Guedes", "Jørgen Strand Larsen"] },
  { subset: "Pro Partnership", number: "379", name: "Maxime Estève & Lucas Pires", team: "Burnley", persons: ["Maxime Estève", "Lucas Pires"] },
  { subset: "Pro Partnership", number: "380", name: "Joe Rodon & Ethan Ampadu", team: "Leeds United", persons: ["Joe Rodon", "Ethan Ampadu"] },

  // Retro Threads (#381-400) — throwback club legends
  { subset: "Retro Threads", number: "381", name: "Ian Wright", team: "Arsenal", persons: ["Ian Wright"] },
  { subset: "Retro Threads", number: "382", name: "Stiliyan Petrov", team: "Arsenal", persons: ["Stiliyan Petrov"] },
  { subset: "Retro Threads", number: "383", name: "Simon Francis", team: "AFC Bournemouth", persons: ["Simon Francis"] },
  { subset: "Retro Threads", number: "384", name: "Eric Cantona", team: "Manchester City", persons: ["Eric Cantona"] },
  { subset: "Retro Threads", number: "385", name: "Christian Nørgaard", team: "Brentford", persons: ["Christian Nørgaard"] },
  { subset: "Retro Threads", number: "386", name: "Glenn Murray", team: "Brighton & Hove Albion", persons: ["Glenn Murray"] },
  { subset: "Retro Threads", number: "387", name: "Frank Lampard", team: "Chelsea", persons: ["Frank Lampard"] },
  { subset: "Retro Threads", number: "388", name: "Andrew Johnson", team: "Crystal Palace", persons: ["Andrew Johnson"] },
  { subset: "Retro Threads", number: "389", name: "Joleon Lescott", team: "Everton", persons: ["Joleon Lescott"] },
  { subset: "Retro Threads", number: "390", name: "Louis Saha", team: "Fulham", persons: ["Louis Saha"] },
  { subset: "Retro Threads", number: "391", name: "Jamie Carragher", team: "Liverpool", persons: ["Jamie Carragher"] },
  { subset: "Retro Threads", number: "392", name: "Micah Richards", team: "Manchester City", persons: ["Micah Richards"] },
  { subset: "Retro Threads", number: "393", name: "Gary Neville", team: "Manchester United", persons: ["Gary Neville"] },
  { subset: "Retro Threads", number: "394", name: "Faustino Asprilla", team: "Newcastle United", persons: ["Faustino Asprilla"] },
  { subset: "Retro Threads", number: "395", name: "Stan Collymore", team: "Nottingham Forest", persons: ["Stan Collymore"] },
  { subset: "Retro Threads", number: "396", name: "Robbie Keane", team: "Tottenham Hotspur", persons: ["Robbie Keane"] },
  { subset: "Retro Threads", number: "397", name: "Mark Noble", team: "West Ham United", persons: ["Mark Noble"] },
  { subset: "Retro Threads", number: "398", name: "Kevin Doyle", team: "Wolverhampton Wanderers", persons: ["Kevin Doyle"] },
  { subset: "Retro Threads", number: "399", name: "Aaron Lennon", team: "Burnley", persons: ["Aaron Lennon"] },
  { subset: "Retro Threads", number: "400", name: "Jimmy Floyd Hasselbaink", team: "Leeds United", persons: ["Jimmy Floyd Hasselbaink"] },

  // Pro Precision (#401-420) — clinical finishers
  { subset: "Pro Precision", number: "401", name: "Kai Havertz", team: "Arsenal", persons: ["Kai Havertz"] },
  { subset: "Pro Precision", number: "402", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"] },
  { subset: "Pro Precision", number: "403", name: "Dango Ouattara", team: "AFC Bournemouth", persons: ["Dango Ouattara"] },
  { subset: "Pro Precision", number: "404", name: "Mikkel Damsgaard", team: "Brentford", persons: ["Mikkel Damsgaard"] },
  { subset: "Pro Precision", number: "405", name: "Danny Welbeck", team: "Brighton & Hove Albion", persons: ["Danny Welbeck"] },
  { subset: "Pro Precision", number: "406", name: "Nicolas Jackson", team: "Chelsea", persons: ["Nicolas Jackson"] },
  { subset: "Pro Precision", number: "407", name: "Eddie Nketiah", team: "Crystal Palace", persons: ["Eddie Nketiah"] },
  { subset: "Pro Precision", number: "408", name: "Beto", team: "Everton", persons: ["Beto"] },
  { subset: "Pro Precision", number: "409", name: "Robbie Fowler", team: "Liverpool", persons: ["Robbie Fowler"] },
  { subset: "Pro Precision", number: "410", name: "Diogo Jota", team: "Liverpool", persons: ["Diogo Jota"] },
  { subset: "Pro Precision", number: "411", name: "Phil Foden", team: "Manchester City", persons: ["Phil Foden"] },
  { subset: "Pro Precision", number: "412", name: "Bruno Fernandes", team: "Manchester United", persons: ["Bruno Fernandes"] },
  { subset: "Pro Precision", number: "413", name: "Wayne Rooney", team: "Manchester United", persons: ["Wayne Rooney"] },
  { subset: "Pro Precision", number: "414", name: "Anthony Gordon", team: "Newcastle United", persons: ["Anthony Gordon"] },
  { subset: "Pro Precision", number: "415", name: "Taiwo Awoniyi", team: "Nottingham Forest", persons: ["Taiwo Awoniyi"] },
  { subset: "Pro Precision", number: "416", name: "Brennan Johnson", team: "Tottenham Hotspur", persons: ["Brennan Johnson"] },
  { subset: "Pro Precision", number: "417", name: "Mohammed Kudus", team: "West Ham United", persons: ["Mohammed Kudus"] },
  { subset: "Pro Precision", number: "418", name: "Jørgen Strand Larsen", team: "Wolverhampton Wanderers", persons: ["Jørgen Strand Larsen"] },
  { subset: "Pro Precision", number: "419", name: "Josh Brownhill", team: "Burnley", persons: ["Josh Brownhill"] },
  { subset: "Pro Precision", number: "420", name: "Patrick Bamford", team: "Leeds United", persons: ["Patrick Bamford"] },

  // Beast Mode (#421-440) — powerful stars
  { subset: "Beast Mode", number: "421", name: "Declan Rice", team: "Arsenal", persons: ["Declan Rice"] },
  { subset: "Beast Mode", number: "422", name: "Morgan Rogers", team: "Aston Villa", persons: ["Morgan Rogers"] },
  { subset: "Beast Mode", number: "423", name: "Evanilson", team: "AFC Bournemouth", persons: ["Evanilson"] },
  { subset: "Beast Mode", number: "424", name: "Yoane Wissa", team: "Brentford", persons: ["Yoane Wissa"] },
  { subset: "Beast Mode", number: "425", name: "Georginio Rutter", team: "Brighton & Hove Albion", persons: ["Georginio Rutter"] },
  { subset: "Beast Mode", number: "426", name: "Enzo Fernández", team: "Chelsea", persons: ["Enzo Fernández"] },
  { subset: "Beast Mode", number: "427", name: "Jean-Philippe Mateta", team: "Crystal Palace", persons: ["Jean-Philippe Mateta"] },
  { subset: "Beast Mode", number: "428", name: "Beto", team: "Everton", persons: ["Beto"] },
  { subset: "Beast Mode", number: "429", name: "Ibrahima Konaté", team: "Liverpool", persons: ["Ibrahima Konaté"] },
  { subset: "Beast Mode", number: "430", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"] },
  { subset: "Beast Mode", number: "431", name: "Rodri", team: "Manchester City", persons: ["Rodri"] },
  { subset: "Beast Mode", number: "432", name: "Alejandro Garnacho", team: "Manchester United", persons: ["Alejandro Garnacho"] },
  { subset: "Beast Mode", number: "433", name: "Sandro Tonali", team: "Newcastle United", persons: ["Sandro Tonali"] },
  { subset: "Beast Mode", number: "434", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"] },
  { subset: "Beast Mode", number: "435", name: "Ledley King", team: "Tottenham Hotspur", persons: ["Ledley King"] },
  { subset: "Beast Mode", number: "436", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"] },
  { subset: "Beast Mode", number: "437", name: "Emerson Palmieri", team: "West Ham United", persons: ["Emerson Palmieri"] },
  { subset: "Beast Mode", number: "438", name: "Hwang Hee-chan", team: "Wolverhampton Wanderers", persons: ["Hwang Hee-chan"] },
  { subset: "Beast Mode", number: "439", name: "Hannibal", team: "Burnley", persons: ["Hannibal"] },
  { subset: "Beast Mode", number: "440", name: "Daniel James", team: "Leeds United", persons: ["Daniel James"] },

  // Headlines (#441-450) — 10 cards
  { subset: "Headlines", number: "441", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"] },
  { subset: "Headlines", number: "442", name: "Emiliano Martínez", team: "Aston Villa", persons: ["Emiliano Martínez"] },
  { subset: "Headlines", number: "443", name: "Kevin Schade", team: "Brentford", persons: ["Kevin Schade"] },
  { subset: "Headlines", number: "444", name: "Pedro Neto", team: "Chelsea", persons: ["Pedro Neto"] },
  { subset: "Headlines", number: "445", name: "Jordan Pickford", team: "Everton", persons: ["Jordan Pickford"] },
  { subset: "Headlines", number: "446", name: "Cody Gakpo", team: "Liverpool", persons: ["Cody Gakpo"] },
  { subset: "Headlines", number: "447", name: "Jérémy Doku", team: "Manchester City", persons: ["Jérémy Doku"] },
  { subset: "Headlines", number: "448", name: "Amad", team: "Manchester United", persons: ["Amad"] },
  { subset: "Headlines", number: "449", name: "Jacob Murphy", team: "Newcastle United", persons: ["Jacob Murphy"] },
  { subset: "Headlines", number: "450", name: "James Maddison", team: "Tottenham Hotspur", persons: ["James Maddison"] },

  // Black Edge Edition (BE 1 - BE 50)
  { subset: "Black Edge Edition", number: "BE1", name: "Ethan Nwaneri", team: "Arsenal", persons: ["Ethan Nwaneri"] },
  { subset: "Black Edge Edition", number: "BE2", name: "Kai Havertz", team: "Arsenal", persons: ["Kai Havertz"] },
  { subset: "Black Edge Edition", number: "BE3", name: "Thierry Henry", team: "Arsenal", persons: ["Thierry Henry"] },
  { subset: "Black Edge Edition", number: "BE4", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"] },
  { subset: "Black Edge Edition", number: "BE5", name: "Donyell Malen", team: "Aston Villa", persons: ["Donyell Malen"] },
  { subset: "Black Edge Edition", number: "BE6", name: "Dion Dublin", team: "Aston Villa", persons: ["Dion Dublin"] },
  { subset: "Black Edge Edition", number: "BE7", name: "Justin Kluivert", team: "AFC Bournemouth", persons: ["Justin Kluivert"] },
  { subset: "Black Edge Edition", number: "BE8", name: "Yoane Wissa", team: "Brentford", persons: ["Yoane Wissa"] },
  { subset: "Black Edge Edition", number: "BE9", name: "Bryan Mbeumo", team: "Brentford", persons: ["Bryan Mbeumo"] },
  { subset: "Black Edge Edition", number: "BE10", name: "Matt O'Riley", team: "Brighton & Hove Albion", persons: ["Matt O'Riley"] },
  { subset: "Black Edge Edition", number: "BE11", name: "Danny Welbeck", team: "Brighton & Hove Albion", persons: ["Danny Welbeck"] },
  { subset: "Black Edge Edition", number: "BE12", name: "Kendry Páez", team: "Chelsea", persons: ["Kendry Páez"] },
  { subset: "Black Edge Edition", number: "BE13", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"] },
  { subset: "Black Edge Edition", number: "BE14", name: "Eden Hazard", team: "Chelsea", persons: ["Eden Hazard"] },
  { subset: "Black Edge Edition", number: "BE15", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"] },
  { subset: "Black Edge Edition", number: "BE16", name: "Eddie Nketiah", team: "Crystal Palace", persons: ["Eddie Nketiah"] },
  { subset: "Black Edge Edition", number: "BE17", name: "Jordan Pickford", team: "Everton", persons: ["Jordan Pickford"] },
  { subset: "Black Edge Edition", number: "BE18", name: "Dwight McNeil", team: "Everton", persons: ["Dwight McNeil"] },
  { subset: "Black Edge Edition", number: "BE19", name: "Antonee Robinson", team: "Fulham", persons: ["Antonee Robinson"] },
  { subset: "Black Edge Edition", number: "BE20", name: "Clint Dempsey", team: "Fulham", persons: ["Clint Dempsey"] },
  { subset: "Black Edge Edition", number: "BE21", name: "Andreas Pereira", team: "Fulham", persons: ["Andreas Pereira"] },
  { subset: "Black Edge Edition", number: "BE22", name: "Fernando Torres", team: "Liverpool", persons: ["Fernando Torres"] },
  { subset: "Black Edge Edition", number: "BE23", name: "Rio Ngumoha", team: "Liverpool", persons: ["Rio Ngumoha"] },
  { subset: "Black Edge Edition", number: "BE24", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"] },
  { subset: "Black Edge Edition", number: "BE25", name: "Diogo Jota", team: "Liverpool", persons: ["Diogo Jota"] },
  { subset: "Black Edge Edition", number: "BE26", name: "Claudio Echeverri", team: "Manchester City", persons: ["Claudio Echeverri"] },
  { subset: "Black Edge Edition", number: "BE27", name: "Carlos Tevez", team: "Manchester City", persons: ["Carlos Tevez"] },
  { subset: "Black Edge Edition", number: "BE28", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Black Edge Edition", number: "BE29", name: "Omar Marmoush", team: "Manchester City", persons: ["Omar Marmoush"] },
  { subset: "Black Edge Edition", number: "BE30", name: "Kobbie Mainoo", team: "Manchester United", persons: ["Kobbie Mainoo"] },
  { subset: "Black Edge Edition", number: "BE31", name: "Alejandro Garnacho", team: "Manchester United", persons: ["Alejandro Garnacho"] },
  { subset: "Black Edge Edition", number: "BE32", name: "Ruud van Nistelrooy", team: "Manchester United", persons: ["Ruud van Nistelrooy"] },
  { subset: "Black Edge Edition", number: "BE33", name: "Bruno Guimarães", team: "Newcastle United", persons: ["Bruno Guimarães"] },
  { subset: "Black Edge Edition", number: "BE34", name: "Sandro Tonali", team: "Newcastle United", persons: ["Sandro Tonali"] },
  { subset: "Black Edge Edition", number: "BE35", name: "Alan Shearer", team: "Newcastle United", persons: ["Alan Shearer"] },
  { subset: "Black Edge Edition", number: "BE36", name: "Morgan Gibbs-White", team: "Nottingham Forest", persons: ["Morgan Gibbs-White"] },
  { subset: "Black Edge Edition", number: "BE37", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"] },
  { subset: "Black Edge Edition", number: "BE38", name: "Dejan Kulusevski", team: "Tottenham Hotspur", persons: ["Dejan Kulusevski"] },
  { subset: "Black Edge Edition", number: "BE39", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"] },
  { subset: "Black Edge Edition", number: "BE40", name: "Dimitar Berbatov", team: "Tottenham Hotspur", persons: ["Dimitar Berbatov"] },
  { subset: "Black Edge Edition", number: "BE41", name: "Joe Cole", team: "West Ham United", persons: ["Joe Cole"] },
  { subset: "Black Edge Edition", number: "BE42", name: "Luis Guilherme", team: "West Ham United", persons: ["Luis Guilherme"] },
  { subset: "Black Edge Edition", number: "BE43", name: "André", team: "Wolverhampton Wanderers", persons: ["André"] },
  { subset: "Black Edge Edition", number: "BE44", name: "Paul Ince", team: "Wolverhampton Wanderers", persons: ["Paul Ince"] },
  { subset: "Black Edge Edition", number: "BE45", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"] },
  { subset: "Black Edge Edition", number: "BE46", name: "Josh Brownhill", team: "Burnley", persons: ["Josh Brownhill"] },
  { subset: "Black Edge Edition", number: "BE47", name: "Marcus Edwards", team: "Burnley", persons: ["Marcus Edwards"] },
  { subset: "Black Edge Edition", number: "BE48", name: "Wilfried Gnonto", team: "Leeds United", persons: ["Wilfried Gnonto"] },
  { subset: "Black Edge Edition", number: "BE49", name: "Daniel James", team: "Leeds United", persons: ["Daniel James"] },
  { subset: "Black Edge Edition", number: "BE50", name: "Jimmy Floyd Hasselbaink", team: "Leeds United", persons: ["Jimmy Floyd Hasselbaink"] },

  // Chrome King (CK 1 - CK 20, 1:10 packets) — per-club all-time legends
  { subset: "Chrome King", number: "CK1", name: "Cesc Fàbregas", team: "Arsenal", persons: ["Cesc Fàbregas"] },
  { subset: "Chrome King", number: "CK2", name: "Dwight Yorke", team: "Aston Villa", persons: ["Dwight Yorke"] },
  { subset: "Chrome King", number: "CK3", name: "Adam Smith", team: "AFC Bournemouth", persons: ["Adam Smith"] },
  { subset: "Chrome King", number: "CK4", name: "Christian Nørgaard", team: "Brentford", persons: ["Christian Nørgaard"] },
  { subset: "Chrome King", number: "CK5", name: "Lewis Dunk", team: "Brighton & Hove Albion", persons: ["Lewis Dunk"] },
  { subset: "Chrome King", number: "CK6", name: "Gianfranco Zola", team: "Chelsea", persons: ["Gianfranco Zola"] },
  { subset: "Chrome King", number: "CK7", name: "Didier Drogba", team: "Chelsea", persons: ["Didier Drogba"] },
  { subset: "Chrome King", number: "CK8", name: "Nathaniel Clyne", team: "Crystal Palace", persons: ["Nathaniel Clyne"] },
  { subset: "Chrome King", number: "CK9", name: "Séamus Coleman", team: "Everton", persons: ["Séamus Coleman"] },
  { subset: "Chrome King", number: "CK10", name: "Clint Dempsey", team: "Fulham", persons: ["Clint Dempsey"] },
  { subset: "Chrome King", number: "CK11", name: "Xabi Alonso", team: "Liverpool", persons: ["Xabi Alonso"] },
  { subset: "Chrome King", number: "CK12", name: "Steven Gerrard", team: "Liverpool", persons: ["Steven Gerrard"] },
  { subset: "Chrome King", number: "CK13", name: "David Silva", team: "Manchester City", persons: ["David Silva"] },
  { subset: "Chrome King", number: "CK14", name: "Sergio Agüero", team: "Manchester City", persons: ["Sergio Agüero"] },
  { subset: "Chrome King", number: "CK15", name: "Nemanja Vidić", team: "Manchester United", persons: ["Nemanja Vidić"] },
  { subset: "Chrome King", number: "CK16", name: "Andy Cole", team: "Newcastle United", persons: ["Andy Cole"] },
  { subset: "Chrome King", number: "CK17", name: "Roy Keane", team: "Nottingham Forest", persons: ["Roy Keane"] },
  { subset: "Chrome King", number: "CK18", name: "Gareth Bale", team: "Tottenham Hotspur", persons: ["Gareth Bale"] },
  { subset: "Chrome King", number: "CK19", name: "Bobby Zamora", team: "West Ham United", persons: ["Bobby Zamora"] },
  { subset: "Chrome King", number: "CK20", name: "Paul Ince", team: "Wolverhampton Wanderers", persons: ["Paul Ince"] },

  // Diamond Rookie (DR 1 - DR 10, 1:500 packets)
  { subset: "Diamond Rookie", number: "DR1", name: "Julio Soler", team: "AFC Bournemouth", persons: ["Julio Soler"] },
  { subset: "Diamond Rookie", number: "DR2", name: "Stefanos Tzimas", team: "Brighton & Hove Albion", persons: ["Stefanos Tzimas"] },
  { subset: "Diamond Rookie", number: "DR3", name: "Kendry Páez", team: "Chelsea", persons: ["Kendry Páez"] },
  { subset: "Diamond Rookie", number: "DR4", name: "Estêvão", team: "Chelsea", persons: ["Estêvão"] },
  { subset: "Diamond Rookie", number: "DR5", name: "Romain Esse", team: "Crystal Palace", persons: ["Romain Esse"] },
  { subset: "Diamond Rookie", number: "DR6", name: "Rio Ngumoha", team: "Liverpool", persons: ["Rio Ngumoha"] },
  { subset: "Diamond Rookie", number: "DR7", name: "Claudio Echeverri", team: "Manchester City", persons: ["Claudio Echeverri"] },
  { subset: "Diamond Rookie", number: "DR8", name: "Reigan Heskey", team: "Manchester City", persons: ["Reigan Heskey"] },
  { subset: "Diamond Rookie", number: "DR9", name: "Sékou Koné", team: "Manchester United", persons: ["Sékou Koné"] },
  { subset: "Diamond Rookie", number: "DR10", name: "Shea Lacey", team: "Manchester United", persons: ["Shea Lacey"] },

  // Festive Freeze (FF 1 - FF 24, Countdown Calendar exclusive)
  { subset: "Festive Freeze", number: "FF1", name: "Jordan Pickford", team: "Everton", persons: ["Jordan Pickford"] },
  { subset: "Festive Freeze", number: "FF2", name: "Tariq Lamptey", team: "Brighton & Hove Albion", persons: ["Tariq Lamptey"] },
  { subset: "Festive Freeze", number: "FF3", name: "Leighton Baines", team: "Everton", persons: ["Leighton Baines"] },
  { subset: "Festive Freeze", number: "FF4", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"] },
  { subset: "Festive Freeze", number: "FF5", name: "Maxime Estève", team: "Burnley", persons: ["Maxime Estève"] },
  { subset: "Festive Freeze", number: "FF6", name: "Marc Guéhi", team: "Crystal Palace", persons: ["Marc Guéhi"] },
  { subset: "Festive Freeze", number: "FF7", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"] },
  { subset: "Festive Freeze", number: "FF8", name: "Steven Gerrard", team: "Liverpool", persons: ["Steven Gerrard"] },
  { subset: "Festive Freeze", number: "FF9", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Festive Freeze", number: "FF10", name: "Sergio Agüero", team: "Manchester City", persons: ["Sergio Agüero"] },
  { subset: "Festive Freeze", number: "FF11", name: "Yoane Wissa", team: "Brentford", persons: ["Yoane Wissa"] },
  { subset: "Festive Freeze", number: "FF12", name: "Tyler Adams", team: "AFC Bournemouth", persons: ["Tyler Adams"] },
  { subset: "Festive Freeze", number: "FF13", name: "Michael Ballack", team: "Chelsea", persons: ["Michael Ballack"] },
  { subset: "Festive Freeze", number: "FF14", name: "Alexander Isak", team: "Newcastle United", persons: ["Alexander Isak"] },
  { subset: "Festive Freeze", number: "FF15", name: "Nemanja Vidić", team: "Manchester United", persons: ["Nemanja Vidić"] },
  { subset: "Festive Freeze", number: "FF16", name: "Amad", team: "Manchester United", persons: ["Amad"] },
  { subset: "Festive Freeze", number: "FF17", name: "Yankuba Minteh", team: "Brighton & Hove Albion", persons: ["Yankuba Minteh"] },
  { subset: "Festive Freeze", number: "FF18", name: "Emile Heskey", team: "Brighton & Hove Albion", persons: ["Emile Heskey"] },
  { subset: "Festive Freeze", number: "FF19", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"] },
  { subset: "Festive Freeze", number: "FF20", name: "Jarrod Bowen", team: "West Ham United", persons: ["Jarrod Bowen"] },
  { subset: "Festive Freeze", number: "FF21", name: "Anthony Elanga", team: "Nottingham Forest", persons: ["Anthony Elanga"] },
  { subset: "Festive Freeze", number: "FF22", name: "Nélson Semedo", team: "Wolverhampton Wanderers", persons: ["Nélson Semedo"] },
  { subset: "Festive Freeze", number: "FF23", name: "Emiliano Martínez", team: "Wolverhampton Wanderers", persons: ["Emiliano Martínez"] },
  { subset: "Festive Freeze", number: "FF24", name: "Reece James", team: "Chelsea", persons: ["Reece James"] },

  // Gold Lion (GL 1 - GL 20, Starter Pack 1:28 packets)
  { subset: "Gold Lion", number: "GL1", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"] },
  { subset: "Gold Lion", number: "GL2", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"] },
  { subset: "Gold Lion", number: "GL3", name: "Evanilson", team: "AFC Bournemouth", persons: ["Evanilson"] },
  { subset: "Gold Lion", number: "GL4", name: "Bryan Mbeumo", team: "Brentford", persons: ["Bryan Mbeumo"] },
  { subset: "Gold Lion", number: "GL5", name: "Kaoru Mitoma", team: "Brighton & Hove Albion", persons: ["Kaoru Mitoma"] },
  { subset: "Gold Lion", number: "GL6", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"] },
  { subset: "Gold Lion", number: "GL7", name: "Eden Hazard", team: "Chelsea", persons: ["Eden Hazard"] },
  { subset: "Gold Lion", number: "GL8", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"] },
  { subset: "Gold Lion", number: "GL9", name: "Iliman Ndiaye", team: "Everton", persons: ["Iliman Ndiaye"] },
  { subset: "Gold Lion", number: "GL10", name: "Amad", team: "Manchester United", persons: ["Amad"] },
  { subset: "Gold Lion", number: "GL11", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"] },
  { subset: "Gold Lion", number: "GL12", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Gold Lion", number: "GL13", name: "Alejandro Garnacho", team: "Manchester United", persons: ["Alejandro Garnacho"] },
  { subset: "Gold Lion", number: "GL14", name: "Alexander Isak", team: "Newcastle United", persons: ["Alexander Isak"] },
  { subset: "Gold Lion", number: "GL15", name: "Morgan Gibbs-White", team: "Nottingham Forest", persons: ["Morgan Gibbs-White"] },
  { subset: "Gold Lion", number: "GL16", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"] },
  { subset: "Gold Lion", number: "GL17", name: "Jarrod Bowen", team: "West Ham United", persons: ["Jarrod Bowen"] },
  { subset: "Gold Lion", number: "GL18", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"] },
  { subset: "Gold Lion", number: "GL19", name: "Josh Brownhill", team: "Burnley", persons: ["Josh Brownhill"] },
  { subset: "Gold Lion", number: "GL20", name: "Ao Tanaka", team: "Leeds United", persons: ["Ao Tanaka"] },

  // Heat Vision (HV 1 - HV 20, 1:1 Case)
  { subset: "Heat Vision", number: "HV1", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"] },
  { subset: "Heat Vision", number: "HV2", name: "Donyell Malen", team: "Aston Villa", persons: ["Donyell Malen"] },
  { subset: "Heat Vision", number: "HV3", name: "Antoine Semenyo", team: "AFC Bournemouth", persons: ["Antoine Semenyo"] },
  { subset: "Heat Vision", number: "HV4", name: "Yoane Wissa", team: "Brentford", persons: ["Yoane Wissa"] },
  { subset: "Heat Vision", number: "HV5", name: "Kaoru Mitoma", team: "Brighton & Hove Albion", persons: ["Kaoru Mitoma"] },
  { subset: "Heat Vision", number: "HV6", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"] },
  { subset: "Heat Vision", number: "HV7", name: "Romain Esse", team: "Crystal Palace", persons: ["Romain Esse"] },
  { subset: "Heat Vision", number: "HV8", name: "Iliman Ndiaye", team: "Everton", persons: ["Iliman Ndiaye"] },
  { subset: "Heat Vision", number: "HV9", name: "Louis Saha", team: "Fulham", persons: ["Louis Saha"] },
  { subset: "Heat Vision", number: "HV10", name: "Luis Díaz", team: "Liverpool", persons: ["Luis Díaz"] },
  { subset: "Heat Vision", number: "HV11", name: "Omar Marmoush", team: "Manchester City", persons: ["Omar Marmoush"] },
  { subset: "Heat Vision", number: "HV12", name: "Shea Lacey", team: "Manchester United", persons: ["Shea Lacey"] },
  { subset: "Heat Vision", number: "HV13", name: "Wayne Rooney", team: "Manchester United", persons: ["Wayne Rooney"] },
  { subset: "Heat Vision", number: "HV14", name: "Anthony Gordon", team: "Newcastle United", persons: ["Anthony Gordon"] },
  { subset: "Heat Vision", number: "HV15", name: "Callum Hudson-Odoi", team: "Nottingham Forest", persons: ["Callum Hudson-Odoi"] },
  { subset: "Heat Vision", number: "HV16", name: "Brennan Johnson", team: "Tottenham Hotspur", persons: ["Brennan Johnson"] },
  { subset: "Heat Vision", number: "HV17", name: "Jarrod Bowen", team: "West Ham United", persons: ["Jarrod Bowen"] },
  { subset: "Heat Vision", number: "HV18", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"] },
  { subset: "Heat Vision", number: "HV19", name: "Jaidon Anthony", team: "Burnley", persons: ["Jaidon Anthony"] },
  { subset: "Heat Vision", number: "HV20", name: "Ao Tanaka", team: "Leeds United", persons: ["Ao Tanaka"] },

  // Home Advantage (HA 1 - HA 20, 1:1 Case) — the site's corrected checklist
  { subset: "Home Advantage", number: "HA1", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"] },
  { subset: "Home Advantage", number: "HA2", name: "Morgan Rogers", team: "Aston Villa", persons: ["Morgan Rogers"] },
  { subset: "Home Advantage", number: "HA3", name: "Antoine Semenyo", team: "AFC Bournemouth", persons: ["Antoine Semenyo"] },
  { subset: "Home Advantage", number: "HA4", name: "Bryan Mbeumo", team: "Brentford", persons: ["Bryan Mbeumo"] },
  { subset: "Home Advantage", number: "HA5", name: "João Pedro", team: "Brighton & Hove Albion", persons: ["João Pedro"] },
  { subset: "Home Advantage", number: "HA6", name: "Estêvão", team: "Chelsea", persons: ["Estêvão"] },
  { subset: "Home Advantage", number: "HA7", name: "Didier Drogba", team: "Chelsea", persons: ["Didier Drogba"] },
  { subset: "Home Advantage", number: "HA8", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"] },
  { subset: "Home Advantage", number: "HA9", name: "Beto", team: "Everton", persons: ["Beto"] },
  { subset: "Home Advantage", number: "HA10", name: "Steven Gerrard", team: "Liverpool", persons: ["Steven Gerrard"] },
  { subset: "Home Advantage", number: "HA11", name: "Rio Ngumoha", team: "Liverpool", persons: ["Rio Ngumoha"] },
  { subset: "Home Advantage", number: "HA12", name: "Yaya Touré", team: "Manchester City", persons: ["Yaya Touré"] },
  { subset: "Home Advantage", number: "HA13", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Home Advantage", number: "HA14", name: "Bruno Fernandes", team: "Manchester United", persons: ["Bruno Fernandes"] },
  { subset: "Home Advantage", number: "HA15", name: "Zlatan Ibrahimović", team: "Manchester United", persons: ["Zlatan Ibrahimović"] },
  { subset: "Home Advantage", number: "HA16", name: "Anthony Gordon", team: "Newcastle United", persons: ["Anthony Gordon"] },
  { subset: "Home Advantage", number: "HA17", name: "Morgan Gibbs-White", team: "Nottingham Forest", persons: ["Morgan Gibbs-White"] },
  { subset: "Home Advantage", number: "HA18", name: "Marcus Edwards", team: "Burnley", persons: ["Marcus Edwards"] },
  { subset: "Home Advantage", number: "HA19", name: "Gareth Bale", team: "Tottenham Hotspur", persons: ["Gareth Bale"] },
  { subset: "Home Advantage", number: "HA20", name: "Jarrod Bowen", team: "West Ham United", persons: ["Jarrod Bowen"] },

  // Perfect Storm (PS 1 - PS 20, 1:1 Case)
  { subset: "Perfect Storm", number: "PS1", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"] },
  { subset: "Perfect Storm", number: "PS2", name: "Morgan Rogers", team: "Aston Villa", persons: ["Morgan Rogers"] },
  { subset: "Perfect Storm", number: "PS3", name: "Tyler Adams", team: "AFC Bournemouth", persons: ["Tyler Adams"] },
  { subset: "Perfect Storm", number: "PS4", name: "Bryan Mbeumo", team: "Brentford", persons: ["Bryan Mbeumo"] },
  { subset: "Perfect Storm", number: "PS5", name: "João Pedro", team: "Brighton & Hove Albion", persons: ["João Pedro"] },
  { subset: "Perfect Storm", number: "PS6", name: "Estêvão", team: "Chelsea", persons: ["Estêvão"] },
  { subset: "Perfect Storm", number: "PS7", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"] },
  { subset: "Perfect Storm", number: "PS8", name: "Dwight McNeil", team: "Everton", persons: ["Dwight McNeil"] },
  { subset: "Perfect Storm", number: "PS9", name: "Darwin Núñez", team: "Liverpool", persons: ["Darwin Núñez"] },
  { subset: "Perfect Storm", number: "PS10", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"] },
  { subset: "Perfect Storm", number: "PS11", name: "Luis Suárez", team: "Liverpool", persons: ["Luis Suárez"] },
  { subset: "Perfect Storm", number: "PS12", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Perfect Storm", number: "PS13", name: "Amad", team: "Manchester United", persons: ["Amad"] },
  { subset: "Perfect Storm", number: "PS14", name: "Alexander Isak", team: "Newcastle United", persons: ["Alexander Isak"] },
  { subset: "Perfect Storm", number: "PS15", name: "Anthony Elanga", team: "Nottingham Forest", persons: ["Anthony Elanga"] },
  { subset: "Perfect Storm", number: "PS16", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"] },
  { subset: "Perfect Storm", number: "PS17", name: "Mohammed Kudus", team: "West Ham United", persons: ["Mohammed Kudus"] },
  { subset: "Perfect Storm", number: "PS18", name: "João Gomes", team: "Wolverhampton Wanderers", persons: ["João Gomes"] },
  { subset: "Perfect Storm", number: "PS19", name: "Luca Koleosho", team: "Burnley", persons: ["Luca Koleosho"] },
  { subset: "Perfect Storm", number: "PS20", name: "Brenden Aaronson", team: "Leeds United", persons: ["Brenden Aaronson"] },

  // Classic Limited Edition (LE 1 - LE 20, Eco Packs & Mega Multipacks)
  { subset: "Classic Limited Edition", number: "LE1", name: "David Raya", team: "Arsenal", persons: ["David Raya"] },
  { subset: "Classic Limited Edition", number: "LE2", name: "Youri Tielemans", team: "Aston Villa", persons: ["Youri Tielemans"] },
  { subset: "Classic Limited Edition", number: "LE3", name: "Luis Sinisterra", team: "AFC Bournemouth", persons: ["Luis Sinisterra"] },
  { subset: "Classic Limited Edition", number: "LE4", name: "Fábio Carvalho", team: "Brentford", persons: ["Fábio Carvalho"] },
  { subset: "Classic Limited Edition", number: "LE5", name: "Pervis Estupiñán", team: "Brighton & Hove Albion", persons: ["Pervis Estupiñán"] },
  { subset: "Classic Limited Edition", number: "LE6", name: "Pedro Neto", team: "Chelsea", persons: ["Pedro Neto"] },
  { subset: "Classic Limited Edition", number: "LE7", name: "Jean-Philippe Mateta", team: "Crystal Palace", persons: ["Jean-Philippe Mateta"] },
  { subset: "Classic Limited Edition", number: "LE8", name: "James Tarkowski", team: "Everton", persons: ["James Tarkowski"] },
  { subset: "Classic Limited Edition", number: "LE9", name: "Duncan Ferguson", team: "Everton", persons: ["Duncan Ferguson"] },
  { subset: "Classic Limited Edition", number: "LE10", name: "Paul Scholes", team: "Manchester United", persons: ["Paul Scholes"] },
  { subset: "Classic Limited Edition", number: "LE11", name: "Alisson Becker", team: "Liverpool", persons: ["Alisson Becker"] },
  { subset: "Classic Limited Edition", number: "LE12", name: "Bernardo Silva", team: "Manchester City", persons: ["Bernardo Silva"] },
  { subset: "Classic Limited Edition", number: "LE13", name: "Leny Yoro", team: "Manchester United", persons: ["Leny Yoro"] },
  { subset: "Classic Limited Edition", number: "LE14", name: "Lewis Hall", team: "Newcastle United", persons: ["Lewis Hall"] },
  { subset: "Classic Limited Edition", number: "LE15", name: "Elliot Anderson", team: "Nottingham Forest", persons: ["Elliot Anderson"] },
  { subset: "Classic Limited Edition", number: "LE16", name: "Micky van de Ven", team: "Tottenham Hotspur", persons: ["Micky van de Ven"] },
  { subset: "Classic Limited Edition", number: "LE17", name: "Aaron Wan-Bissaka", team: "West Ham United", persons: ["Aaron Wan-Bissaka"] },
  { subset: "Classic Limited Edition", number: "LE18", name: "Rayan Aït-Nouri", team: "Wolverhampton Wanderers", persons: ["Rayan Aït-Nouri"] },
  { subset: "Classic Limited Edition", number: "LE19", name: "Connor Roberts", team: "Burnley", persons: ["Connor Roberts"] },
  { subset: "Classic Limited Edition", number: "LE20", name: "Brenden Aaronson", team: "Leeds United", persons: ["Brenden Aaronson"] },

  // Goal Machine Limited Edition (GM 1 - GM 3, Mega Tin #1 exclusive)
  { subset: "Goal Machine Limited Edition", number: "GM1", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"] },
  { subset: "Goal Machine Limited Edition", number: "GM2", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Goal Machine Limited Edition", number: "GM3", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"] },

  // Globaller Limited Edition (WC 1 - WC 3, Mega Tin #2 exclusive — "WC" is the source's own prefix)
  { subset: "Globaller Limited Edition", number: "WC1", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"] },
  { subset: "Globaller Limited Edition", number: "WC2", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"] },
  { subset: "Globaller Limited Edition", number: "WC3", name: "Alexis Mac Allister", team: "Liverpool", persons: ["Alexis Mac Allister"] },

  // Big Game Baller Limited Edition (BGB 1 - BGB 3, Mega Tin #3 exclusive)
  { subset: "Big Game Baller Limited Edition", number: "BGB1", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"] },
  { subset: "Big Game Baller Limited Edition", number: "BGB2", name: "Luis Díaz", team: "Liverpool", persons: ["Luis Díaz"] },
  { subset: "Big Game Baller Limited Edition", number: "BGB3", name: "Bruno Fernandes", team: "Manchester United", persons: ["Bruno Fernandes"] },

  // Golden Boot Limited Edition (GB 1 - GB 7, Golden Boot Tin exclusive, 2025-10-02)
  { subset: "Golden Boot Limited Edition", number: "GB1", name: "Thierry Henry", team: "Arsenal", persons: ["Thierry Henry"] },
  { subset: "Golden Boot Limited Edition", number: "GB2", name: "Didier Drogba", team: "Chelsea", persons: ["Didier Drogba"] },
  { subset: "Golden Boot Limited Edition", number: "GB3", name: "Michael Owen", team: "Liverpool", persons: ["Michael Owen"] },
  { subset: "Golden Boot Limited Edition", number: "GB4", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"] },
  { subset: "Golden Boot Limited Edition", number: "GB5", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },
  { subset: "Golden Boot Limited Edition", number: "GB6", name: "Andy Cole", team: "Newcastle United", persons: ["Andy Cole"] },
  { subset: "Golden Boot Limited Edition", number: "GB7", name: "Alan Shearer", team: "Newcastle United", persons: ["Alan Shearer"] },

  // Premier League Hall of Fame Limited Edition — Icons (HOF 1-3, Super Tin #1 exclusive)
  { subset: "Hall of Fame – Icons", number: "HOF1", name: "Frank Lampard", team: "Chelsea", persons: ["Frank Lampard"] },
  { subset: "Hall of Fame – Icons", number: "HOF2", name: "Steven Gerrard", team: "Liverpool", persons: ["Steven Gerrard"] },
  { subset: "Hall of Fame – Icons", number: "HOF3", name: "Eric Cantona", team: "Manchester United", persons: ["Eric Cantona"] },

  // ... Champions (HOF 4-6, Super Tin #2 exclusive)
  { subset: "Hall of Fame – Champions", number: "HOF4", name: "Dennis Bergkamp", team: "Arsenal", persons: ["Dennis Bergkamp"] },
  { subset: "Hall of Fame – Champions", number: "HOF5", name: "Sergio Agüero", team: "Manchester City", persons: ["Sergio Agüero"] },
  { subset: "Hall of Fame – Champions", number: "HOF6", name: "Rio Ferdinand", team: "Manchester United", persons: ["Rio Ferdinand"] },

  // ... Commanders (HOF 7-9, Super Tin #3 exclusive)
  { subset: "Hall of Fame – Commanders", number: "HOF7", name: "Patrick Vieira", team: "Arsenal", persons: ["Patrick Vieira"] },
  { subset: "Hall of Fame – Commanders", number: "HOF8", name: "John Terry", team: "Chelsea", persons: ["John Terry"] },
  { subset: "Hall of Fame – Commanders", number: "HOF9", name: "Roy Keane", team: "Manchester United", persons: ["Roy Keane"] },

  // Premier Pull Ultra Limited Edition (PP 1 - PP 20, 1:100 packets)
  { subset: "Premier Pull Ultra Limited Edition", number: "PP1", name: "Declan Rice", team: "Arsenal", persons: ["Declan Rice"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP2", name: "Jacob Ramsey", team: "Aston Villa", persons: ["Jacob Ramsey"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP3", name: "Justin Kluivert", team: "AFC Bournemouth", persons: ["Justin Kluivert"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP4", name: "Gustavo Nunes", team: "Brentford", persons: ["Gustavo Nunes"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP5", name: "Stefanos Tzimas", team: "Brighton & Hove Albion", persons: ["Stefanos Tzimas"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP6", name: "Estêvão", team: "Chelsea", persons: ["Estêvão"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP7", name: "Marc Guéhi", team: "Crystal Palace", persons: ["Marc Guéhi"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP8", name: "Jarrad Branthwaite", team: "Everton", persons: ["Jarrad Branthwaite"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP9", name: "John Terry", team: "Chelsea", persons: ["John Terry"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP10", name: "Cody Gakpo", team: "Liverpool", persons: ["Cody Gakpo"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP11", name: "Abdukodir Khusanov", team: "Manchester City", persons: ["Abdukodir Khusanov"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP12", name: "Nico González", team: "Manchester City", persons: ["Nico González"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP13", name: "Kobbie Mainoo", team: "Manchester United", persons: ["Kobbie Mainoo"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP14", name: "Eric Cantona", team: "Manchester United", persons: ["Eric Cantona"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP15", name: "Bruno Guimarães", team: "Newcastle United", persons: ["Bruno Guimarães"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP16", name: "Zach Abbott", team: "Nottingham Forest", persons: ["Zach Abbott"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP17", name: "Lucas Bergvall", team: "Tottenham Hotspur", persons: ["Lucas Bergvall"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP18", name: "Gonçalo Guedes", team: "Wolverhampton Wanderers", persons: ["Gonçalo Guedes"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP19", name: "James Trafford", team: "Burnley", persons: ["James Trafford"] },
  { subset: "Premier Pull Ultra Limited Edition", number: "PP20", name: "Joël Piroe", team: "Leeds United", persons: ["Joël Piroe"] },

  // Premier Relic (PR 1 - PR 60) — memorabilia
  { subset: "Premier Relic", number: "PR1", name: "Evanilson", team: "AFC Bournemouth", persons: ["Evanilson"], relic: true },
  { subset: "Premier Relic", number: "PR2", name: "Emiliano Martínez", team: "Aston Villa", persons: ["Emiliano Martínez"], relic: true },
  { subset: "Premier Relic", number: "PR3", name: "Kristoffer Ajer", team: "Brentford", persons: ["Kristoffer Ajer"], relic: true },
  { subset: "Premier Relic", number: "PR4", name: "Nathan Collins", team: "Brentford", persons: ["Nathan Collins"], relic: true },
  { subset: "Premier Relic", number: "PR5", name: "Lewis Dunk", team: "Brighton & Hove Albion", persons: ["Lewis Dunk"], relic: true },
  { subset: "Premier Relic", number: "PR6", name: "Simon Adingra", team: "Brighton & Hove Albion", persons: ["Simon Adingra"], relic: true },
  { subset: "Premier Relic", number: "PR7", name: "Didier Drogba", team: "Chelsea", persons: ["Didier Drogba"], relic: true },
  { subset: "Premier Relic", number: "PR8", name: "Enzo Fernández", team: "Chelsea", persons: ["Enzo Fernández"], relic: true },
  { subset: "Premier Relic", number: "PR9", name: "Harrison Murray-Campbell", team: "Chelsea", persons: ["Harrison Murray-Campbell"], relic: true },
  { subset: "Premier Relic", number: "PR10", name: "Hernán Crespo", team: "Chelsea", persons: ["Hernán Crespo"], relic: true },
  { subset: "Premier Relic", number: "PR11", name: "John Terry", team: "Chelsea", persons: ["John Terry"], relic: true },
  { subset: "Premier Relic", number: "PR12", name: "Levi Colwill", team: "Chelsea", persons: ["Levi Colwill"], relic: true },
  { subset: "Premier Relic", number: "PR13", name: "Malo Gusto", team: "Chelsea", persons: ["Malo Gusto"], relic: true },
  { subset: "Premier Relic", number: "PR14", name: "Nicolas Jackson", team: "Chelsea", persons: ["Nicolas Jackson"], relic: true },
  { subset: "Premier Relic", number: "PR15", name: "Chris Richards", team: "Crystal Palace", persons: ["Chris Richards"], relic: true },
  { subset: "Premier Relic", number: "PR16", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"], relic: true },
  { subset: "Premier Relic", number: "PR17", name: "Beto", team: "Everton", persons: ["Beto"], relic: true },
  { subset: "Premier Relic", number: "PR18", name: "Antonee Robinson", team: "Fulham", persons: ["Antonee Robinson"], relic: true },
  { subset: "Premier Relic", number: "PR19", name: "Emile Smith Rowe", team: "Fulham", persons: ["Emile Smith Rowe"], relic: true },
  { subset: "Premier Relic", number: "PR20", name: "Cody Gakpo", team: "Liverpool", persons: ["Cody Gakpo"], relic: true },
  { subset: "Premier Relic", number: "PR21", name: "Conor Bradley", team: "Liverpool", persons: ["Conor Bradley"], relic: true },
  { subset: "Premier Relic", number: "PR22", name: "Darwin Núñez", team: "Liverpool", persons: ["Darwin Núñez"], relic: true },
  { subset: "Premier Relic", number: "PR23", name: "Diogo Jota", team: "Liverpool", persons: ["Diogo Jota"], relic: true },
  { subset: "Premier Relic", number: "PR24", name: "Harry Kewell", team: "Liverpool", persons: ["Harry Kewell"], relic: true },
  { subset: "Premier Relic", number: "PR25", name: "Harvey Elliott", team: "Liverpool", persons: ["Harvey Elliott"], relic: true },
  { subset: "Premier Relic", number: "PR26", name: "Luis Suárez", team: "Liverpool", persons: ["Luis Suárez"], relic: true },
  { subset: "Premier Relic", number: "PR27", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"], relic: true },
  { subset: "Premier Relic", number: "PR28", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"], relic: true },
  { subset: "Premier Relic", number: "PR29", name: "Bernardo Silva", team: "Manchester City", persons: ["Bernardo Silva"], relic: true },
  { subset: "Premier Relic", number: "PR30", name: "Ederson", team: "Manchester City", persons: ["Ederson"], relic: true },
  { subset: "Premier Relic", number: "PR31", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"], relic: true },
  { subset: "Premier Relic", number: "PR32", name: "Jack Grealish", team: "Manchester City", persons: ["Jack Grealish"], relic: true },
  { subset: "Premier Relic", number: "PR33", name: "Jérémy Doku", team: "Manchester City", persons: ["Jérémy Doku"], relic: true },
  { subset: "Premier Relic", number: "PR34", name: "John Stones", team: "Manchester City", persons: ["John Stones"], relic: true },
  { subset: "Premier Relic", number: "PR35", name: "Nathan Aké", team: "Manchester City", persons: ["Nathan Aké"], relic: true },
  { subset: "Premier Relic", number: "PR36", name: "Phil Foden", team: "Manchester City", persons: ["Phil Foden"], relic: true },
  { subset: "Premier Relic", number: "PR37", name: "Rúben Dias", team: "Manchester City", persons: ["Rúben Dias"], relic: true },
  { subset: "Premier Relic", number: "PR38", name: "Sávio", team: "Manchester City", persons: ["Sávio"], relic: true },
  { subset: "Premier Relic", number: "PR39", name: "Alejandro Garnacho", team: "Manchester United", persons: ["Alejandro Garnacho"], relic: true },
  { subset: "Premier Relic", number: "PR40", name: "Diogo Dalot", team: "Manchester United", persons: ["Diogo Dalot"], relic: true },
  { subset: "Premier Relic", number: "PR41", name: "Kobbie Mainoo", team: "Manchester United", persons: ["Kobbie Mainoo"], relic: true },
  { subset: "Premier Relic", number: "PR42", name: "Manuel Ugarte", team: "Manchester United", persons: ["Manuel Ugarte"], relic: true },
  { subset: "Premier Relic", number: "PR43", name: "Paul Ince", team: "Manchester United", persons: ["Paul Ince"], relic: true },
  { subset: "Premier Relic", number: "PR44", name: "Rasmus Højlund", team: "Manchester United", persons: ["Rasmus Højlund"], relic: true },
  { subset: "Premier Relic", number: "PR45", name: "Zlatan Ibrahimović", team: "Manchester United", persons: ["Zlatan Ibrahimović"], relic: true },
  { subset: "Premier Relic", number: "PR46", name: "Alexander Isak", team: "Newcastle United", persons: ["Alexander Isak"], relic: true },
  { subset: "Premier Relic", number: "PR47", name: "Lewis Hall", team: "Newcastle United", persons: ["Lewis Hall"], relic: true },
  { subset: "Premier Relic", number: "PR48", name: "Lewis Miley", team: "Newcastle United", persons: ["Lewis Miley"], relic: true },
  { subset: "Premier Relic", number: "PR49", name: "Tino Livramento", team: "Newcastle United", persons: ["Tino Livramento"], relic: true },
  { subset: "Premier Relic", number: "PR50", name: "Cristian Romero", team: "Tottenham Hotspur", persons: ["Cristian Romero"], relic: true },
  { subset: "Premier Relic", number: "PR51", name: "Mikey Moore", team: "Tottenham Hotspur", persons: ["Mikey Moore"], relic: true },
  { subset: "Premier Relic", number: "PR52", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"], relic: true },
  { subset: "Premier Relic", number: "PR53", name: "Aaron Wan-Bissaka", team: "West Ham United", persons: ["Aaron Wan-Bissaka"], relic: true },
  { subset: "Premier Relic", number: "PR54", name: "Crysencio Summerville", team: "West Ham United", persons: ["Crysencio Summerville"], relic: true },
  { subset: "Premier Relic", number: "PR55", name: "Emerson Palmieri", team: "West Ham United", persons: ["Emerson Palmieri"], relic: true },
  { subset: "Premier Relic", number: "PR56", name: "Guido Rodríguez", team: "West Ham United", persons: ["Guido Rodríguez"], relic: true },
  { subset: "Premier Relic", number: "PR57", name: "Lewis Orford", team: "West Ham United", persons: ["Lewis Orford"], relic: true },
  { subset: "Premier Relic", number: "PR58", name: "Maximilian Kilman", team: "West Ham United", persons: ["Maximilian Kilman"], relic: true },
  { subset: "Premier Relic", number: "PR59", name: "Niclas Füllkrug", team: "West Ham United", persons: ["Niclas Füllkrug"], relic: true },
  { subset: "Premier Relic", number: "PR60", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"], relic: true },

  // Topps Premier League 2026 Autograph (A 1 - A 154, 1:168 packets) — the full real checklist
  { subset: "Topps Premier League 2026 Autograph", number: "A1", name: "Dango Ouattara", team: "AFC Bournemouth", persons: ["Dango Ouattara"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A2", name: "Evanilson", team: "AFC Bournemouth", persons: ["Evanilson"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A3", name: "Tyler Adams", team: "AFC Bournemouth", persons: ["Tyler Adams"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A4", name: "David Raya", team: "Arsenal", persons: ["David Raya"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A5", name: "William Saliba", team: "Arsenal", persons: ["William Saliba"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A6", name: "Mikel Merino", team: "Arsenal", persons: ["Mikel Merino"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A7", name: "Declan Rice", team: "Arsenal", persons: ["Declan Rice"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A8", name: "Myles Lewis-Skelly", team: "Arsenal", persons: ["Myles Lewis-Skelly"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A9", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A10", name: "Ethan Nwaneri", team: "Arsenal", persons: ["Ethan Nwaneri"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A11", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A12", name: "Gabriel Martinelli", team: "Arsenal", persons: ["Gabriel Martinelli"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A13", name: "Leandro Trossard", team: "Arsenal", persons: ["Leandro Trossard"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A14", name: "Kai Havertz", team: "Arsenal", persons: ["Kai Havertz"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A15", name: "Donyell Malen", team: "Aston Villa", persons: ["Donyell Malen"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A16", name: "Emiliano Martínez", team: "Aston Villa", persons: ["Emiliano Martínez"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A17", name: "Jacob Ramsey", team: "Aston Villa", persons: ["Jacob Ramsey"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A18", name: "Matty Cash", team: "Aston Villa", persons: ["Matty Cash"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A19", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A20", name: "Stiliyan Petrov", team: "Aston Villa", persons: ["Stiliyan Petrov"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A21", name: "Fábio Carvalho", team: "Brentford", persons: ["Fábio Carvalho"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A22", name: "Kristoffer Ajer", team: "Brentford", persons: ["Kristoffer Ajer"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A23", name: "Kevin Schade", team: "Brentford", persons: ["Kevin Schade"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A24", name: "Nathan Collins", team: "Brentford", persons: ["Nathan Collins"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A25", name: "Yehor Yarmoliuk", team: "Brentford", persons: ["Yehor Yarmoliuk"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A26", name: "Evan Ferguson", team: "Brighton & Hove Albion", persons: ["Evan Ferguson"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A27", name: "Georginio Rutter", team: "Brighton & Hove Albion", persons: ["Georginio Rutter"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A28", name: "João Pedro", team: "Brighton & Hove Albion", persons: ["João Pedro"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A29", name: "Lewis Dunk", team: "Brighton & Hove Albion", persons: ["Lewis Dunk"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A30", name: "Matt O'Riley", team: "Brighton & Hove Albion", persons: ["Matt O'Riley"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A31", name: "Simon Adingra", team: "Brighton & Hove Albion", persons: ["Simon Adingra"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A32", name: "Yasin Ayari", team: "Brighton & Hove Albion", persons: ["Yasin Ayari"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A33", name: "Yankuba Minteh", team: "Brighton & Hove Albion", persons: ["Yankuba Minteh"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A34", name: "Ashley Cole", team: "Chelsea", persons: ["Ashley Cole"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A35", name: "César Azpilicueta", team: "Chelsea", persons: ["César Azpilicueta"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A36", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A37", name: "Diego Costa", team: "Chelsea", persons: ["Diego Costa"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A38", name: "Enzo Fernández", team: "Chelsea", persons: ["Enzo Fernández"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A39", name: "Estêvão", team: "Chelsea", persons: ["Estêvão"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A40", name: "Juan Mata", team: "Chelsea", persons: ["Juan Mata"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A41", name: "John Terry", team: "Chelsea", persons: ["John Terry"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A42", name: "Levi Colwill", team: "Chelsea", persons: ["Levi Colwill"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A43", name: "Michael Ballack", team: "Chelsea", persons: ["Michael Ballack"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A44", name: "Nicolas Anelka", team: "Chelsea", persons: ["Nicolas Anelka"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A45", name: "Nicolas Jackson", team: "Chelsea", persons: ["Nicolas Jackson"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A46", name: "Noni Madueke", team: "Chelsea", persons: ["Noni Madueke"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A47", name: "Reece James", team: "Chelsea", persons: ["Reece James"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A48", name: "Tosin Adarabioyo", team: "Chelsea", persons: ["Tosin Adarabioyo"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A49", name: "Tore André Flo", team: "Chelsea", persons: ["Tore André Flo"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A50", name: "Trevoh Chalobah", team: "Chelsea", persons: ["Trevoh Chalobah"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A51", name: "Adam Wharton", team: "Crystal Palace", persons: ["Adam Wharton"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A52", name: "Chris Richards", team: "Crystal Palace", persons: ["Chris Richards"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A53", name: "Chadi Riad", team: "Crystal Palace", persons: ["Chadi Riad"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A54", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A55", name: "Marc Guéhi", team: "Crystal Palace", persons: ["Marc Guéhi"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A56", name: "Maxence Lacroix", team: "Crystal Palace", persons: ["Maxence Lacroix"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A57", name: "Yannick Bolasie", team: "Crystal Palace", persons: ["Yannick Bolasie"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A58", name: "Iliman Ndiaye", team: "Everton", persons: ["Iliman Ndiaye"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A59", name: "James Garner", team: "Everton", persons: ["James Garner"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A60", name: "Jordan Pickford", team: "Everton", persons: ["Jordan Pickford"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A61", name: "Phil Neville", team: "Everton", persons: ["Phil Neville"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A62", name: "Yakubu", team: "Everton", persons: ["Yakubu"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A63", name: "Danny Murphy", team: "Fulham", persons: ["Danny Murphy"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A64", name: "Emile Smith Rowe", team: "Fulham", persons: ["Emile Smith Rowe"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A65", name: "Jimmy Bullard", team: "Fulham", persons: ["Jimmy Bullard"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A66", name: "Josh King", team: "Fulham", persons: ["Josh King"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A67", name: "Louis Saha", team: "Fulham", persons: ["Louis Saha"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A68", name: "Illan Meslier", team: "Leeds United", persons: ["Illan Meslier"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A69", name: "Conor Bradley", team: "Liverpool", persons: ["Conor Bradley"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A70", name: "Cody Gakpo", team: "Liverpool", persons: ["Cody Gakpo"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A71", name: "Diogo Jota", team: "Liverpool", persons: ["Diogo Jota"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A72", name: "Emile Heskey", team: "Liverpool", persons: ["Emile Heskey"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A73", name: "Harvey Elliott", team: "Liverpool", persons: ["Harvey Elliott"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A74", name: "John Arne Riise", team: "Liverpool", persons: ["John Arne Riise"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A75", name: "Joe Gomez", team: "Liverpool", persons: ["Joe Gomez"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A76", name: "Ryan Gravenberch", team: "Liverpool", persons: ["Ryan Gravenberch"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A77", name: "Rio Ngumoha", team: "Liverpool", persons: ["Rio Ngumoha"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A78", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A79", name: "Bernardo Silva", team: "Manchester City", persons: ["Bernardo Silva"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A80", name: "David Silva", team: "Manchester City", persons: ["David Silva"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A81", name: "Emmanuel Adebayor", team: "Manchester City", persons: ["Emmanuel Adebayor"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A82", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A83", name: "Joško Gvardiol", team: "Manchester City", persons: ["Joško Gvardiol"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A84", name: "Joe Hart", team: "Manchester City", persons: ["Joe Hart"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A85", name: "John Stones", team: "Manchester City", persons: ["John Stones"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A86", name: "Manuel Akanji", team: "Manchester City", persons: ["Manuel Akanji"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A87", name: "Mateo Kovačić", team: "Manchester City", persons: ["Mateo Kovačić"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A88", name: "Matheus Nunes", team: "Manchester City", persons: ["Matheus Nunes"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A89", name: "Micah Richards", team: "Manchester City", persons: ["Micah Richards"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A90", name: "Oscar Bobb", team: "Manchester City", persons: ["Oscar Bobb"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A91", name: "Phil Foden", team: "Manchester City", persons: ["Phil Foden"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A92", name: "Rúben Dias", team: "Manchester City", persons: ["Rúben Dias"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A93", name: "Rico Lewis", team: "Manchester City", persons: ["Rico Lewis"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A94", name: "Riyad Mahrez", team: "Manchester City", persons: ["Riyad Mahrez"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A95", name: "Sávio", team: "Manchester City", persons: ["Sávio"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A96", name: "Vitor Reis", team: "Manchester City", persons: ["Vitor Reis"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A97", name: "André Onana", team: "Manchester United", persons: ["André Onana"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A98", name: "Bruno Fernandes", team: "Manchester United", persons: ["Bruno Fernandes"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A99", name: "Diogo Dalot", team: "Manchester United", persons: ["Diogo Dalot"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A100", name: "Edwin van der Sar", team: "Manchester United", persons: ["Edwin van der Sar"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A101", name: "Gary Neville", team: "Manchester United", persons: ["Gary Neville"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A102", name: "Harry Maguire", team: "Manchester United", persons: ["Harry Maguire"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A103", name: "Joshua Zirkzee", team: "Manchester United", persons: ["Joshua Zirkzee"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A104", name: "Kobbie Mainoo", team: "Manchester United", persons: ["Kobbie Mainoo"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A105", name: "Leny Yoro", team: "Manchester United", persons: ["Leny Yoro"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A106", name: "Mason Mount", team: "Manchester United", persons: ["Mason Mount"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A107", name: "Manuel Ugarte", team: "Manchester United", persons: ["Manuel Ugarte"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A108", name: "Nemanja Vidić", team: "Manchester United", persons: ["Nemanja Vidić"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A109", name: "Patrice Evra", team: "Manchester United", persons: ["Patrice Evra"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A110", name: "Paul Scholes", team: "Manchester United", persons: ["Paul Scholes"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A111", name: "Shea Lacey", team: "Manchester United", persons: ["Shea Lacey"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A112", name: "Anthony Gordon", team: "Newcastle United", persons: ["Anthony Gordon"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A113", name: "Bruno Guimarães", team: "Newcastle United", persons: ["Bruno Guimarães"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A114", name: "Harvey Barnes", team: "Newcastle United", persons: ["Harvey Barnes"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A115", name: "Lewis Hall", team: "Newcastle United", persons: ["Lewis Hall"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A116", name: "Lewis Miley", team: "Newcastle United", persons: ["Lewis Miley"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A117", name: "Nick Pope", team: "Newcastle United", persons: ["Nick Pope"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A118", name: "Sven Botman", team: "Newcastle United", persons: ["Sven Botman"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A119", name: "Shay Given", team: "Newcastle United", persons: ["Shay Given"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A120", name: "Sandro Tonali", team: "Newcastle United", persons: ["Sandro Tonali"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A121", name: "Tino Livramento", team: "Newcastle United", persons: ["Tino Livramento"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A122", name: "Anthony Elanga", team: "Nottingham Forest", persons: ["Anthony Elanga"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A123", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A124", name: "Matz Sels", team: "Nottingham Forest", persons: ["Matz Sels"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A125", name: "Neco Williams", team: "Nottingham Forest", persons: ["Neco Williams"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A126", name: "Zach Abbott", team: "Nottingham Forest", persons: ["Zach Abbott"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A127", name: "Archie Gray", team: "Tottenham Hotspur", persons: ["Archie Gray"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A128", name: "Cristian Romero", team: "Tottenham Hotspur", persons: ["Cristian Romero"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A129", name: "Dejan Kulusevski", team: "Tottenham Hotspur", persons: ["Dejan Kulusevski"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A130", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A131", name: "Destiny Udogie", team: "Tottenham Hotspur", persons: ["Destiny Udogie"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A132", name: "Gareth Bale", team: "Tottenham Hotspur", persons: ["Gareth Bale"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A133", name: "James Maddison", team: "Tottenham Hotspur", persons: ["James Maddison"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A134", name: "Lucas Bergvall", team: "Tottenham Hotspur", persons: ["Lucas Bergvall"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A135", name: "Ledley King", team: "Tottenham Hotspur", persons: ["Ledley King"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A136", name: "Mikey Moore", team: "Tottenham Hotspur", persons: ["Mikey Moore"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A137", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A138", name: "Teddy Sheringham", team: "Tottenham Hotspur", persons: ["Teddy Sheringham"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A139", name: "Will Lankshear", team: "Tottenham Hotspur", persons: ["Will Lankshear"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A140", name: "Yang Min-hyeok", team: "Tottenham Hotspur", persons: ["Yang Min-hyeok"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A141", name: "Aaron Wan-Bissaka", team: "West Ham United", persons: ["Aaron Wan-Bissaka"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A142", name: "Bobby Zamora", team: "West Ham United", persons: ["Bobby Zamora"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A143", name: "Emerson Palmieri", team: "West Ham United", persons: ["Emerson Palmieri"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A144", name: "Jarrod Bowen", team: "West Ham United", persons: ["Jarrod Bowen"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A145", name: "Joe Cole", team: "West Ham United", persons: ["Joe Cole"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A146", name: "Jean-Clair Todibo", team: "West Ham United", persons: ["Jean-Clair Todibo"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A147", name: "Luis Guilherme", team: "West Ham United", persons: ["Luis Guilherme"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A148", name: "Lewis Orford", team: "West Ham United", persons: ["Lewis Orford"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A149", name: "Mohammed Kudus", team: "West Ham United", persons: ["Mohammed Kudus"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A150", name: "Maximilian Kilman", team: "West Ham United", persons: ["Maximilian Kilman"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A151", name: "Yossi Benayoun", team: "West Ham United", persons: ["Yossi Benayoun"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A152", name: "Jørgen Strand Larsen", team: "Wolverhampton Wanderers", persons: ["Jørgen Strand Larsen"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A153", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"], auto: true },
  { subset: "Topps Premier League 2026 Autograph", number: "A154", name: "Tommy Doyle", team: "Wolverhampton Wanderers", persons: ["Tommy Doyle"], auto: true },

  // Beast Mode Autograph (BMA 1 - BMA 16)
  { subset: "Beast Mode Autograph", number: "BMA1", name: "Evanilson", team: "AFC Bournemouth", persons: ["Evanilson"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA2", name: "Declan Rice", team: "Arsenal", persons: ["Declan Rice"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA3", name: "Georginio Rutter", team: "Brighton & Hove Albion", persons: ["Georginio Rutter"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA4", name: "Hannibal", team: "Burnley", persons: ["Hannibal"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA5", name: "Enzo Fernández", team: "Chelsea", persons: ["Enzo Fernández"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA6", name: "John Terry", team: "Chelsea", persons: ["John Terry"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA7", name: "Beto", team: "Everton", persons: ["Beto"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA8", name: "Daniel James", team: "Leeds United", persons: ["Daniel James"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA9", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA10", name: "Rodri", team: "Manchester City", persons: ["Rodri"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA11", name: "Alejandro Garnacho", team: "Manchester United", persons: ["Alejandro Garnacho"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA12", name: "Sandro Tonali", team: "Newcastle United", persons: ["Sandro Tonali"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA13", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA14", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA15", name: "Ledley King", team: "Tottenham Hotspur", persons: ["Ledley King"], auto: true },
  { subset: "Beast Mode Autograph", number: "BMA16", name: "Emerson Palmieri", team: "West Ham United", persons: ["Emerson Palmieri"], auto: true },

  // Black Edge Edition Autograph (BEA 1 - BEA 10)
  { subset: "Black Edge Edition Autograph", number: "BEA1", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA2", name: "Eberechi Eze", team: "Crystal Palace", persons: ["Eberechi Eze"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA3", name: "Clint Dempsey", team: "Fulham", persons: ["Clint Dempsey"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA4", name: "Fernando Torres", team: "Liverpool", persons: ["Fernando Torres"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA5", name: "Rio Ngumoha", team: "Liverpool", persons: ["Rio Ngumoha"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA6", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA7", name: "Alan Shearer", team: "Newcastle United", persons: ["Alan Shearer"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA8", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA9", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"], auto: true },
  { subset: "Black Edge Edition Autograph", number: "BEA10", name: "Matheus Cunha", team: "Wolverhampton Wanderers", persons: ["Matheus Cunha"], auto: true },

  // Chrome King Autograph (CKA 1 - CKA 20)
  { subset: "Chrome King Autograph", number: "CKA1", name: "Cesc Fàbregas", team: "Arsenal", persons: ["Cesc Fàbregas"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA2", name: "Dwight Yorke", team: "Aston Villa", persons: ["Dwight Yorke"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA3", name: "Didier Drogba", team: "Chelsea", persons: ["Didier Drogba"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA4", name: "Gianfranco Zola", team: "Chelsea", persons: ["Gianfranco Zola"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA5", name: "Julián Speroni", team: "Crystal Palace", persons: ["Julián Speroni"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA6", name: "Nathaniel Clyne", team: "Crystal Palace", persons: ["Nathaniel Clyne"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA7", name: "Leighton Baines", team: "Everton", persons: ["Leighton Baines"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA8", name: "Danny Murphy", team: "Fulham", persons: ["Danny Murphy"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA9", name: "Jimmy Floyd Hasselbaink", team: "Leeds United", persons: ["Jimmy Floyd Hasselbaink"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA10", name: "Steven Gerrard", team: "Liverpool", persons: ["Steven Gerrard"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA11", name: "Xabi Alonso", team: "Liverpool", persons: ["Xabi Alonso"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA12", name: "David Silva", team: "Manchester City", persons: ["David Silva"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA13", name: "Sergio Agüero", team: "Manchester City", persons: ["Sergio Agüero"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA14", name: "Nemanja Vidić", team: "Manchester United", persons: ["Nemanja Vidić"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA15", name: "Wayne Rooney", team: "Manchester United", persons: ["Wayne Rooney"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA16", name: "Andy Cole", team: "Newcastle United", persons: ["Andy Cole"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA17", name: "Roy Keane", team: "Nottingham Forest", persons: ["Roy Keane"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA18", name: "Gareth Bale", team: "Tottenham Hotspur", persons: ["Gareth Bale"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA19", name: "Bobby Zamora", team: "West Ham United", persons: ["Bobby Zamora"], auto: true },
  { subset: "Chrome King Autograph", number: "CKA20", name: "Paul Ince", team: "Wolverhampton Wanderers", persons: ["Paul Ince"], auto: true },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${BASE_CARDS.length} base + ${INSERT_CARDS.length} inserts)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Football (Soccer)", universeId);
  const brandId = await builder.getOrCreateBrand("Premier League", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Topps Premier League 2026", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: BASE_CARDS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  // Ensure the parallel lookup table exists up-front (cheap) so per-card
  // variant creation only pays for the actual row writes.
  const parallelIds: Record<string, string> = {};
  const allParallelNames = Array.from(
    new Set([...EVERYWHERE_BASE_PARALLELS, ...Object.keys(LIMITED_BASE_PARALLELS)])
  );
  for (const name of allParallelNames) {
    parallelIds[name] = await builder.getOrCreateParallel(name);
  }

  let created = 0;
  let skipped = 0;
  let variants = 0;
  const t0 = Date.now();

  for (const row of BASE_CARDS) {
    const cardId = `${SET_ID}-${row.number}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const personIds: string[] = [];
    if (row.persons) {
      for (const name of row.persons) personIds.push(await builder.getOrCreatePerson(name));
    }

    const teamId = await builder.getOrCreateTeam(fixTeam(row.team));

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.badge ? `${row.team} Team Badge` : row.name,
        number: row.number,
        setId: set.id,
        supertype: row.badge ? "Team Badge" : row.subset ?? "Player",
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
        teams: { connect: { id: teamId } },
      },
    });

    // Base printing + all everywhere-parallels for every base card.
    await prisma.variant.create({ data: { cardId, printingId: basePrintingId } });
    variants++;
    for (const pName of EVERYWHERE_BASE_PARALLELS) {
      await prisma.variant.create({ data: { cardId, printingId: basePrintingId, parallelId: parallelIds[pName] } });
      variants++;
    }

    // Limited parallel numbers.
    for (const [pName, nums] of Object.entries(LIMITED_BASE_PARALLELS)) {
      if (nums.includes(row.number)) {
        await prisma.variant.create({ data: { cardId, printingId: basePrintingId, parallelId: parallelIds[pName] } });
        variants++;
      }
    }

    // Topps.com image-variation print (subtype "Image Variation", no parallel).
    if (IMAGE_VARIATION_BASE_NUMBERS.includes(row.number)) {
      const imgInsertId = await builder.getOrCreateInsert("Topps.com Image Variation", set.id);
      await prisma.variant.create({ data: { cardId, printingId: basePrintingId, insertId: imgInsertId } });
      variants++;
    }

    created++;
    if (created % 50 === 0) {
      console.log(`  [${created}/${BASE_CARDS.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }

  console.log(`Base set done. Created ${created} cards, skipped ${skipped}.`);

  // Insert subsets, autographs, memorabilia.
  for (const [i, row] of INSERT_CARDS.entries()) {
    const cardId = `${SET_ID}-${row.number}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    const personIds: string[] = [];
    if (row.persons) {
      for (const name of row.persons) personIds.push(await builder.getOrCreatePerson(name));
    }

    const teamId = await builder.getOrCreateTeam(fixTeam(row.team));
    const insertId = await builder.getOrCreateInsert(row.subset, set.id);

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: row.subset,
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
        teams: { connect: { id: teamId } },
      },
    });

    await prisma.variant.create({
      data: {
        cardId,
        printingId: basePrintingId,
        insertId,
        isFoil: row.auto || row.relic,
        isAuto: row.auto ?? false,
        isRelic: row.relic ?? false,
      },
    });
    variants++;

    if ((i + 1) % 50 === 0) {
      console.log(`  inserts [${i + 1}/${INSERT_CARDS.length}] elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }

  console.log(`Done. Created ${created} cards, ${variants} variants. Set: ${SET_NAME} (${set.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


