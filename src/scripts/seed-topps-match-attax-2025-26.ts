import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2025/26 Topps Match Attax football trading card set.
 * 315+ cards featuring football clubs, players, and special subsets.
 */
const SET_ID = "topps-match-attax-2025-26";
const SET_NAME = "Topps Match Attax 2025/26";

interface CardRow {
  number: string;
  name: string;
  team: string;
  type?: string;
  persons?: string[];
}

const ALL_CARDS: CardRow[] = [
  // Tottenham Hotspur (1-9)
  { number: "1", name: "Team Badge (Tottenham Hotspur)", team: "Tottenham Hotspur", type: "Team Badge" },
  { number: "2", name: "Guglielmo Vicario", team: "Tottenham Hotspur", persons: ["Guglielmo Vicario"] },
  { number: "3", name: "Micky van de Ven", team: "Tottenham Hotspur", persons: ["Micky van de Ven"] },
  { number: "4", name: "Cristian Romero", team: "Tottenham Hotspur", persons: ["Cristian Romero"] },
  { number: "5", name: "Destiny Udogie", team: "Tottenham Hotspur", persons: ["Destiny Udogie"] },
  { number: "6", name: "James Maddison", team: "Tottenham Hotspur", persons: ["James Maddison"] },
  { number: "7", name: "Son Heung-Min", team: "Tottenham Hotspur", persons: ["Son Heung-Min"] },
  { number: "8", name: "Brennan Johnson", team: "Tottenham Hotspur", persons: ["Brennan Johnson"] },
  { number: "9", name: "Dominic Solanke", team: "Tottenham Hotspur", persons: ["Dominic Solanke"] },

  // Liverpool (10-27)
  { number: "10", name: "Team Badge (Liverpool)", team: "Liverpool", type: "Team Badge" },
  { number: "11", name: "Alisson Becker", team: "Liverpool", persons: ["Alisson Becker"] },
  { number: "12", name: "Virgil van Dijk", team: "Liverpool", persons: ["Virgil van Dijk"] },
  { number: "13", name: "Ibrahima Konaté", team: "Liverpool", persons: ["Ibrahima Konaté"] },
  { number: "14", name: "Jeremie Frimpong", team: "Liverpool", persons: ["Jeremie Frimpong"] },
  { number: "15", name: "Andy Robertson", team: "Liverpool", persons: ["Andy Robertson"] },
  { number: "16", name: "Milos Kerkez", team: "Liverpool", persons: ["Milos Kerkez"] },
  { number: "17", name: "Conor Bradley", team: "Liverpool", persons: ["Conor Bradley"] },
  { number: "18", name: "Joe Gomez", team: "Liverpool", persons: ["Joe Gomez"] },
  { number: "19", name: "Dominik Szoboszlai", team: "Liverpool", persons: ["Dominik Szoboszlai"] },
  { number: "20", name: "Aleix Mac Allister", team: "Liverpool", persons: ["Aleix Mac Allister"] },
  { number: "21", name: "Ryan Gravenberch", team: "Liverpool", persons: ["Ryan Gravenberch"] },
  { number: "22", name: "Florian Wirtz", team: "Liverpool", persons: ["Florian Wirtz"] },
  { number: "23", name: "Curtis Jones", team: "Liverpool", persons: ["Curtis Jones"] },
  { number: "24", name: "Wataru Endo", team: "Liverpool", persons: ["Wataru Endo"] },
  { number: "25", name: "Luis Díaz", team: "Liverpool", persons: ["Luis Díaz"] },
  { number: "26", name: "Mohamed Salah", team: "Liverpool", persons: ["Mohamed Salah"] },
  { number: "27", name: "Cody Gakpo", team: "Liverpool", persons: ["Cody Gakpo"] },

  // Arsenal (28-45)
  { number: "28", name: "Team Badge (Arsenal)", team: "Arsenal", type: "Team Badge" },
  { number: "29", name: "David Raya", team: "Arsenal", persons: ["David Raya"] },
  { number: "30", name: "William Saliba", team: "Arsenal", persons: ["William Saliba"] },
  { number: "31", name: "Ben White", team: "Arsenal", persons: ["Ben White"] },
  { number: "32", name: "Gabriel", team: "Arsenal", persons: ["Gabriel"] },
  { number: "33", name: "Riccardo Calafiori", team: "Arsenal", persons: ["Riccardo Calafiori"] },
  { number: "34", name: "Jurrién Timber", team: "Arsenal", persons: ["Jurrién Timber"] },
  { number: "35", name: "Myles Lewis-Skelly", team: "Arsenal", persons: ["Myles Lewis-Skelly"] },
  { number: "36", name: "Martín Zubimendi", team: "Arsenal", persons: ["Martín Zubimendi"] },
  { number: "37", name: "Martin Ødegaard", team: "Arsenal", persons: ["Martin Ødegaard"] },
  { number: "38", name: "Declan Rice", team: "Arsenal", persons: ["Declan Rice"] },
  { number: "39", name: "Mikel Merino", team: "Arsenal", persons: ["Mikel Merino"] },
  { number: "40", name: "Ethan Nwaneri", team: "Arsenal", persons: ["Ethan Nwaneri"] },
  { number: "41", name: "Kai Havertz", team: "Arsenal", persons: ["Kai Havertz"] },
  { number: "42", name: "Bukayo Saka", team: "Arsenal", persons: ["Bukayo Saka"] },
  { number: "43", name: "Leandro Trossard", team: "Arsenal", persons: ["Leandro Trossard"] },
  { number: "44", name: "Gabriel Martinelli", team: "Arsenal", persons: ["Gabriel Martinelli"] },
  { number: "45", name: "Noni Madueke", team: "Arsenal", persons: ["Noni Madueke"] },

  // Manchester City (46-63)
  { number: "46", name: "Team Badge (Manchester City)", team: "Manchester City", type: "Team Badge" },
  { number: "47", name: "Ederson", team: "Manchester City", persons: ["Ederson"] },
  { number: "48", name: "Rúben Dias", team: "Manchester City", persons: ["Rúben Dias"] },
  { number: "49", name: "John Stones", team: "Manchester City", persons: ["John Stones"] },
  { number: "50", name: "Joško Gvardiol", team: "Manchester City", persons: ["Joško Gvardiol"] },
  { number: "51", name: "Manuel Akanji", team: "Manchester City", persons: ["Manuel Akanji"] },
  { number: "52", name: "Nathan Aké", team: "Manchester City", persons: ["Nathan Aké"] },
  { number: "53", name: "Aboukodir Khusanov", team: "Manchester City", persons: ["Aboukodir Khusanov"] },
  { number: "54", name: "Vitor Reis", team: "Manchester City", persons: ["Vitor Reis"] },
  { number: "55", name: "Bernardo Silva", team: "Manchester City", persons: ["Bernardo Silva"] },
  { number: "56", name: "Claudio Echeverri", team: "Manchester City", persons: ["Claudio Echeverri"] },
  { number: "57", name: "Phil Foden", team: "Manchester City", persons: ["Phil Foden"] },
  { number: "58", name: "Rodri", team: "Manchester City", persons: ["Rodri"] },
  { number: "59", name: "Nico González", team: "Manchester City", persons: ["Nico González"] },
  { number: "60", name: "Jérémy Doku", team: "Manchester City", persons: ["Jérémy Doku"] },
  { number: "61", name: "Sávio", team: "Manchester City", persons: ["Sávio"] },
  { number: "62", name: "Omar Marmoush", team: "Manchester City", persons: ["Omar Marmoush"] },
  { number: "63", name: "Erling Haaland", team: "Manchester City", persons: ["Erling Haaland"] },

  // Chelsea (64-72)
  { number: "64", name: "Team Badge (Chelsea)", team: "Chelsea", type: "Team Badge" },
  { number: "65", name: "Robert Sánchez", team: "Chelsea", persons: ["Robert Sánchez"] },
  { number: "66", name: "Reece James", team: "Chelsea", persons: ["Reece James"] },
  { number: "67", name: "Tosin Adarabioyo", team: "Chelsea", persons: ["Tosin Adarabioyo"] },
  { number: "68", name: "Enzo Fernádez", team: "Chelsea", persons: ["Enzo Fernádez"] },
  { number: "69", name: "Moisés Caicedo", team: "Chelsea", persons: ["Moisés Caicedo"] },
  { number: "70", name: "Estêvão", team: "Chelsea", persons: ["Estêvão"] },
  { number: "71", name: "Liam Delap", team: "Chelsea", persons: ["Liam Delap"] },
  { number: "72", name: "Cole Palmer", team: "Chelsea", persons: ["Cole Palmer"] },

  // Newcastle United (73-81)
  { number: "73", name: "Team Badge (Newcastle United)", team: "Newcastle United", type: "Team Badge" },
  { number: "74", name: "Nick Pope", team: "Newcastle United", persons: ["Nick Pope"] },
  { number: "75", name: "Lewis Hall", team: "Newcastle United", persons: ["Lewis Hall"] },
  { number: "76", name: "Dan Burn", team: "Newcastle United", persons: ["Dan Burn"] },
  { number: "77", name: "Bruno Guimarães", team: "Newcastle United", persons: ["Bruno Guimarães"] },
  { number: "78", name: "Sandro Tonali", team: "Newcastle United", persons: ["Sandro Tonali"] },
  { number: "79", name: "Joelinton", team: "Newcastle United", persons: ["Joelinton"] },
  { number: "80", name: "Alexander Isak", team: "Newcastle United", persons: ["Alexander Isak"] },
  { number: "81", name: "Anthony Gordon", team: "Newcastle United", persons: ["Anthony Gordon"] },

  // Aston Villa (82-90)
  { number: "82", name: "Team Badge (Aston Villa)", team: "Aston Villa", type: "Team Badge" },
  { number: "83", name: "Emiliano Martínez", team: "Aston Villa", persons: ["Emiliano Martínez"] },
  { number: "84", name: "Ezri Konsa", team: "Aston Villa", persons: ["Ezri Konsa"] },
  { number: "85", name: "Pau Torres", team: "Aston Villa", persons: ["Pau Torres"] },
  { number: "86", name: "John McGinn", team: "Aston Villa", persons: ["John McGinn"] },
  { number: "87", name: "Youri Tielemans", team: "Aston Villa", persons: ["Youri Tielemans"] },
  { number: "88", name: "Morgan Rogers", team: "Aston Villa", persons: ["Morgan Rogers"] },
  { number: "89", name: "Ollie Watkins", team: "Aston Villa", persons: ["Ollie Watkins"] },
  { number: "90", name: "Donyell Malen", team: "Aston Villa", persons: ["Donyell Malen"] },

  // Nottingham Forest (91-99)
  { number: "91", name: "Team Badge (Nottingham Forest)", team: "Nottingham Forest", type: "Team Badge" },
  { number: "92", name: "Matz Sels", team: "Nottingham Forest", persons: ["Matz Sels"] },
  { number: "93", name: "Nikola Milenković", team: "Nottingham Forest", persons: ["Nikola Milenković"] },
  { number: "94", name: "Murillo", team: "Nottingham Forest", persons: ["Murillo"] },
  { number: "95", name: "Ola Aina", team: "Nottingham Forest", persons: ["Ola Aina"] },
  { number: "96", name: "Morgan Gibbs-White", team: "Nottingham Forest", persons: ["Morgan Gibbs-White"] },
  { number: "97", name: "Ryan Yates", team: "Nottingham Forest", persons: ["Ryan Yates"] },
  { number: "98", name: "Chris Wood", team: "Nottingham Forest", persons: ["Chris Wood"] },
  { number: "99", name: "Callum Hudson-Odoi", team: "Nottingham Forest", persons: ["Callum Hudson-Odoi"] },

  // FC Barcelona (100-117)
  { number: "100", name: "Team Badge (FC Barcelona)", team: "FC Barcelona", type: "Team Badge" },
  { number: "101", name: "Iñigo Martínez", team: "FC Barcelona", persons: ["Iñigo Martínez"] },
  { number: "102", name: "Ronald Araújo", team: "FC Barcelona", persons: ["Ronald Araújo"] },
  { number: "103", name: "Jules Koundé", team: "FC Barcelona", persons: ["Jules Koundé"] },
  { number: "104", name: "Pau Cubarsí", team: "FC Barcelona", persons: ["Pau Cubarsí"] },
  { number: "105", name: "Alejandro Balde", team: "FC Barcelona", persons: ["Alejandro Balde"] },
  { number: "106", name: "Marc Bernal", team: "FC Barcelona", persons: ["Marc Bernal"] },
  { number: "107", name: "Frenkie de Jong", team: "FC Barcelona", persons: ["Frenkie de Jong"] },
  { number: "108", name: "Fermín López", team: "FC Barcelona", persons: ["Fermín López"] },
  { number: "109", name: "Pedri", team: "FC Barcelona", persons: ["Pedri"] },
  { number: "110", name: "Gavi", team: "FC Barcelona", persons: ["Gavi"] },
  { number: "111", name: "Marc Casadó", team: "FC Barcelona", persons: ["Marc Casadó"] },
  { number: "112", name: "Dani Olmo", team: "FC Barcelona", persons: ["Dani Olmo"] },
  { number: "113", name: "Lamine Yamal", team: "FC Barcelona", persons: ["Lamine Yamal"] },
  { number: "114", name: "Robert Lewandowski", team: "FC Barcelona", persons: ["Robert Lewandowski"] },
  { number: "115", name: "Ferran Torres", team: "FC Barcelona", persons: ["Ferran Torres"] },
  { number: "116", name: "Pau Víctor", team: "FC Barcelona", persons: ["Pau Víctor"] },
  { number: "117", name: "Raphinha", team: "FC Barcelona", persons: ["Raphinha"] },

  // Real Madrid CF (118-135)
  { number: "118", name: "Team Badge (Real Madrid CF)", team: "Real Madrid CF", type: "Team Badge" },
  { number: "119", name: "Thibaut Courtois", team: "Real Madrid CF", persons: ["Thibaut Courtois"] },
  { number: "120", name: "Antonio Rüdiger", team: "Real Madrid CF", persons: ["Antonio Rüdiger"] },
  { number: "121", name: "Éder Militão", team: "Real Madrid CF", persons: ["Éder Militão"] },
  { number: "122", name: "Daniel Carvajal", team: "Real Madrid CF", persons: ["Daniel Carvajal"] },
  { number: "123", name: "Trent Alexander-Arnold", team: "Real Madrid CF", persons: ["Trent Alexander-Arnold"] },
  { number: "124", name: "Ferland Mendy", team: "Real Madrid CF", persons: ["Ferland Mendy"] },
  { number: "125", name: "Dean Huijsen", team: "Real Madrid CF", persons: ["Dean Huijsen"] },
  { number: "126", name: "David Alaba", team: "Real Madrid CF", persons: ["David Alaba"] },
  { number: "127", name: "Aurélien Tchouaméndi", team: "Real Madrid CF", persons: ["Aurélien Tchouaméndi"] },
  { number: "128", name: "Eduardo Camavinga", team: "Real Madrid CF", persons: ["Eduardo Camavinga"] },
  { number: "129", name: "Federico Valverde", team: "Real Madrid CF", persons: ["Federico Valverde"] },
  { number: "130", name: "Jude Bellingham", team: "Real Madrid CF", persons: ["Jude Bellingham"] },
  { number: "131", name: "Arda Güler", team: "Real Madrid CF", persons: ["Arda Güler"] },
  { number: "132", name: "Kylian Mbappé", team: "Real Madrid CF", persons: ["Kylian Mbappé"] },
  { number: "133", name: "Rodrygo", team: "Real Madrid CF", persons: ["Rodrygo"] },
  { number: "134", name: "Endrick", team: "Real Madrid CF", persons: ["Endrick"] },
  { number: "135", name: "Vini Jr.", team: "Real Madrid CF", persons: ["Vini Jr."] },

  // Atlético de Madrid (136-144)
  { number: "136", name: "Team Badge (Atlético de Madrid)", team: "Atlético de Madrid", type: "Team Badge" },
  { number: "137", name: "Jan Oblak", team: "Atlético de Madrid", persons: ["Jan Oblak"] },
  { number: "138", name: "José María Giménez", team: "Atlético de Madrid", persons: ["José María Giménez"] },
  { number: "139", name: "Koke", team: "Atlético de Madrid", persons: ["Koke"] },
  { number: "140", name: "Conor Gallagher", team: "Atlético de Madrid", persons: ["Conor Gallagher"] },
  { number: "141", name: "Pablo Barrios", team: "Atlético de Madrid", persons: ["Pablo Barrios"] },
  { number: "142", name: "Marcos Llorente", team: "Atlético de Madrid", persons: ["Marcos Llorente"] },
  { number: "143", name: "Antoine Griezmann", team: "Atlético de Madrid", persons: ["Antoine Griezmann"] },
  { number: "144", name: "Julián Alvarez", team: "Atlético de Madrid", persons: ["Julián Alvarez"] },

  // VfB Stuttgart (145-153)
  { number: "145", name: "Team Badge (VfB Stuttgart)", team: "VfB Stuttgart", type: "Team Badge" },
  { number: "146", name: "Alexander Nübel", team: "VfB Stuttgart", persons: ["Alexander Nübel"] },
  { number: "147", name: "Josha Vagnoman", team: "VfB Stuttgart", persons: ["Josha Vagnoman"] },
  { number: "148", name: "Maximilian Mittelstädt", team: "VfB Stuttgart", persons: ["Maximilian Mittelstädt"] },
  { number: "149", name: "Jeff Chabot", team: "VfB Stuttgart", persons: ["Jeff Chabot"] },
  { number: "150", name: "Atakan Karazor", team: "VfB Stuttgart", persons: ["Atakan Karazor"] },
  { number: "151", name: "Angelo Stiller", team: "VfB Stuttgart", persons: ["Angelo Stiller"] },
  { number: "152", name: "Deniz Undav", team: "VfB Stuttgart", persons: ["Deniz Undav"] },
  { number: "153", name: "Ermedin Demirović", team: "VfB Stuttgart", persons: ["Ermedin Demirović"] },

  // FC Bayern München (154-171)
  { number: "154", name: "Team Badge (FC Bayern München)", team: "FC Bayern München", type: "Team Badge" },
  { number: "155", name: "Manuel Neuer", team: "FC Bayern München", persons: ["Manuel Neuer"] },
  { number: "156", name: "Josip Stanišić", team: "FC Bayern München", persons: ["Josip Stanišić"] },
  { number: "157", name: "Kim Min-Jae", team: "FC Bayern München", persons: ["Kim Min-Jae"] },
  { number: "158", name: "Alphonso Davies", team: "FC Bayern München", persons: ["Alphonso Davies"] },
  { number: "159", name: "Dayot Upamecano", team: "FC Bayern München", persons: ["Dayot Upamecano"] },
  { number: "160", name: "Raphaël Guerreiro", team: "FC Bayern München", persons: ["Raphaël Guerreiro"] },
  { number: "161", name: "Jonathan Tah", team: "FC Bayern München", persons: ["Jonathan Tah"] },
  { number: "162", name: "Hiroki Ito", team: "FC Bayern München", persons: ["Hiroki Ito"] },
  { number: "163", name: "Joshua Kimmich", team: "FC Bayern München", persons: ["Joshua Kimmich"] },
  { number: "164", name: "João Palhinha", team: "FC Bayern München", persons: ["João Palhinha"] },
  { number: "165", name: "Konrad Laimer", team: "FC Bayern München", persons: ["Konrad Laimer"] },
  { number: "166", name: "Aleksandr Pavlović", team: "FC Bayern München", persons: ["Aleksandr Pavlović"] },
  { number: "167", name: "Leon Goretzka", team: "FC Bayern München", persons: ["Leon Goretzka"] },
  { number: "168", name: "Michael Olise", team: "FC Bayern München", persons: ["Michael Olise"] },
  { number: "169", name: "Jamal Musiala", team: "FC Bayern München", persons: ["Jamal Musiala"] },
  { number: "170", name: "Serge Gnabry", team: "FC Bayern München", persons: ["Serge Gnabry"] },
  { number: "171", name: "Harry Kane", team: "FC Bayern München", persons: ["Harry Kane"] },

  // Bayer 04 Leverkusen (172-180)
  { number: "172", name: "Team Badge (Bayer 04 Leverkusen)", team: "Bayer 04 Leverkusen", type: "Team Badge" },
  { number: "173", name: "Lukas Hradecky", team: "Bayer 04 Leverkusen", persons: ["Lukas Hradecky"] },
  { number: "174", name: "Alejandro Grimaldo", team: "Bayer 04 Leverkusen", persons: ["Alejandro Grimaldo"] },
  { number: "175", name: "Piero Hincapié", team: "Bayer 04 Leverkusen", persons: ["Piero Hincapié"] },
  { number: "176", name: "Robert Andrich", team: "Bayer 04 Leverkusen", persons: ["Robert Andrich"] },
  { number: "177", name: "Exequiel Palacios", team: "Bayer 04 Leverkusen", persons: ["Exequiel Palacios"] },
  { number: "178", name: "Granit Xhaka", team: "Bayer 04 Leverkusen", persons: ["Granit Xhaka"] },
  { number: "179", name: "Aleix García", team: "Bayer 04 Leverkusen", persons: ["Aleix García"] },
  { number: "180", name: "Patrik Schick", team: "Bayer 04 Leverkusen", persons: ["Patrik Schick"] },

  // Eintracht Frankfurt (181-189)
  { number: "181", name: "Team Badge (Eintracht Frankfurt)", team: "Eintracht Frankfurt", type: "Team Badge" },
  { number: "182", name: "Kevin Trapp", team: "Eintracht Frankfurt", persons: ["Kevin Trapp"] },
  { number: "183", name: "Robin Koch", team: "Eintracht Frankfurt", persons: ["Robin Koch"] },
  { number: "184", name: "Rasmus Kristensen", team: "Eintracht Frankfurt", persons: ["Rasmus Kristensen"] },
  { number: "185", name: "Arthur Theate", team: "Eintracht Frankfurt", persons: ["Arthur Theate"] },
  { number: "186", name: "Mario Götze", team: "Eintracht Frankfurt", persons: ["Mario Götze"] },
  { number: "187", name: "Hugo Larsson", team: "Eintracht Frankfurt", persons: ["Hugo Larsson"] },
  { number: "188", name: "Ellyes Skhiri", team: "Eintracht Frankfurt", persons: ["Ellyes Skhiri"] },
  { number: "189", name: "Hugo Ekitike", team: "Eintracht Frankfurt", persons: ["Hugo Ekitike"] },

  // Borussia Dortmund (190-198)
  { number: "190", name: "Team Badge (Borussia Dortmund)", team: "Borussia Dortmund", type: "Team Badge" },
  { number: "191", name: "Gregor Kobel", team: "Borussia Dortmund", persons: ["Gregor Kobel"] },
  { number: "192", name: "Nico Schlotterbeck", team: "Borussia Dortmund", persons: ["Nico Schlotterbeck"] },
  { number: "193", name: "Waldemar Anton", team: "Borussia Dortmund", persons: ["Waldemar Anton"] },
  { number: "194", name: "Marcel Sabitzer", team: "Borussia Dortmund", persons: ["Marcel Sabitzer"] },
  { number: "195", name: "Emre Can", team: "Borussia Dortmund", persons: ["Emre Can"] },
  { number: "196", name: "Julian Brandt", team: "Borussia Dortmund", persons: ["Julian Brandt"] },
  { number: "197", name: "Maximilian Beier", team: "Borussia Dortmund", persons: ["Maximilian Beier"] },
  { number: "198", name: "Serhou Guirassy", team: "Borussia Dortmund", persons: ["Serhou Guirassy"] },

  // Sporting Clube de Portugal (199-207)
  { number: "199", name: "Team Badge (Sporting Clube de Portugal)", team: "Sporting Clube de Portugal", type: "Team Badge" },
  { number: "200", name: "Ousmane Diomande", team: "Sporting Clube de Portugal", persons: ["Ousmane Diomande"] },
  { number: "201", name: "Zeno Debast", team: "Sporting Clube de Portugal", persons: ["Zeno Debast"] },
  { number: "202", name: "Gonçalo Inácio", team: "Sporting Clube de Portugal", persons: ["Gonçalo Inácio"] },
  { number: "203", name: "Morten Hjulmand", team: "Sporting Clube de Portugal", persons: ["Morten Hjulmand"] },
  { number: "204", name: "Pedro Gonçalves", team: "Sporting Clube de Portugal", persons: ["Pedro Gonçalves"] },
  { number: "205", name: "Viktor Gyökeres", team: "Sporting Clube de Portugal", persons: ["Viktor Gyökeres"] },
  { number: "206", name: "Francisco Trincão", team: "Sporting Clube de Portugal", persons: ["Francisco Trincão"] },
  { number: "207", name: "Geovany Quenda", team: "Sporting Clube de Portugal", persons: ["Geovany Quenda"] },

  // SL Benfica (208-216)
  { number: "208", name: "Team Badge (SL Benfica)", team: "SL Benfica", type: "Team Badge" },
  { number: "209", name: "Antonio Silva", team: "SL Benfica", persons: ["Antonio Silva"] },
  { number: "210", name: "Nicolas Otamendi", team: "SL Benfica", persons: ["Nicolas Otamendi"] },
  { number: "211", name: "Gianluca Prestianni", team: "SL Benfica", persons: ["Gianluca Prestianni"] },
  { number: "212", name: "Fredrik Aursnes", team: "SL Benfica", persons: ["Fredrik Aursnes"] },
  { number: "213", name: "Florentino", team: "SL Benfica", persons: ["Florentino"] },
  { number: "214", name: "Andreas Schjelderup", team: "SL Benfica", persons: ["Andreas Schjelderup"] },
  { number: "215", name: "Kerem Aktürkoğlu", team: "SL Benfica", persons: ["Kerem Aktürkoğlu"] },
  { number: "216", name: "Vangelis Pavlidis", team: "SL Benfica", persons: ["Vangelis Pavlidis"] },

  // AFC Ajax (217-225)
  { number: "217", name: "Team Badge (AFC Ajax)", team: "AFC Ajax", type: "Team Badge" },
  { number: "218", name: "Remko Pasveer", team: "AFC Ajax", persons: ["Remko Pasveer"] },
  { number: "219", name: "Jorrel Hato", team: "AFC Ajax", persons: ["Jorrel Hato"] },
  { number: "220", name: "Youri Baas", team: "AFC Ajax", persons: ["Youri Baas"] },
  { number: "221", name: "Youri Regeer", team: "AFC Ajax", persons: ["Youri Regeer"] },
  { number: "222", name: "Davy Klaassen", team: "AFC Ajax", persons: ["Davy Klaassen"] },
  { number: "223", name: "Kenneth Taylor", team: "AFC Ajax", persons: ["Kenneth Taylor"] },
  { number: "224", name: "Brian Brobbey", team: "AFC Ajax", persons: ["Brian Brobbey"] },
  { number: "225", name: "Mika Godts", team: "AFC Ajax", persons: ["Mika Godts"] },

  // Paris Saint-Germain (226-243)
  { number: "226", name: "Team Badge (Paris Saint-Germain)", team: "Paris Saint-Germain", type: "Team Badge" },
  { number: "227", name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", persons: ["Gianluigi Donnarumma"] },
  { number: "228", name: "Marquinhos", team: "Paris Saint-Germain", persons: ["Marquinhos"] },
  { number: "229", name: "Willian Pacho", team: "Paris Saint-Germain", persons: ["Willian Pacho"] },
  { number: "230", name: "Nuno Mendes", team: "Paris Saint-Germain", persons: ["Nuno Mendes"] },
  { number: "231", name: "Lucas Beraldo", team: "Paris Saint-Germain", persons: ["Lucas Beraldo"] },
  { number: "232", name: "Achraf Hakimi", team: "Paris Saint-Germain", persons: ["Achraf Hakimi"] },
  { number: "233", name: "Lucas Hernández", team: "Paris Saint-Germain", persons: ["Lucas Hernández"] },
  { number: "234", name: "João Neves", team: "Paris Saint-Germain", persons: ["João Neves"] },
  { number: "235", name: "Warren Zaïre-Emery", team: "Paris Saint-Germain", persons: ["Warren Zaïre-Emery"] },
  { number: "236", name: "Vitinha", team: "Paris Saint-Germain", persons: ["Vitinha"] },
  { number: "237", name: "Fabián Ruiz", team: "Paris Saint-Germain", persons: ["Fabián Ruiz"] },
  { number: "238", name: "Lee Kang-In", team: "Paris Saint-Germain", persons: ["Lee Kang-In"] },
  { number: "239", name: "Désiré Doué", team: "Paris Saint-Germain", persons: ["Désiré Doué"] },
  { number: "240", name: "Bradley Barcola", team: "Paris Saint-Germain", persons: ["Bradley Barcola"] },
  { number: "241", name: "Khvicha Kvaratskhelia", team: "Paris Saint-Germain", persons: ["Khvicha Kvaratskhelia"] },
  { number: "242", name: "Ousmane Dembélé", team: "Paris Saint-Germain", persons: ["Ousmane Dembélé"] },
  { number: "243", name: "Gonçalo Ramos", team: "Paris Saint-Germain", persons: ["Gonçalo Ramos"] },

  // SSC Napoli (244-252)
  { number: "244", name: "Team Badge (SSC Napoli)", team: "SSC Napoli", type: "Team Badge" },
  { number: "245", name: "Alex Meret", team: "SSC Napoli", persons: ["Alex Meret"] },
  { number: "246", name: "Giovanni Di Lorenzo", team: "SSC Napoli", persons: ["Giovanni Di Lorenzo"] },
  { number: "247", name: "Alessandro Buongiorno", team: "SSC Napoli", persons: ["Alessandro Buongiorno"] },
  { number: "248", name: "Billy Gilmour", team: "SSC Napoli", persons: ["Billy Gilmour"] },
  { number: "249", name: "André-Frank Zambo Anguissa", team: "SSC Napoli", persons: ["André-Frank Zambo Anguissa"] },
  { number: "250", name: "Scott McTominay", team: "SSC Napoli", persons: ["Scott McTominay"] },
  { number: "251", name: "Romelu Lukaku", team: "SSC Napoli", persons: ["Romelu Lukaku"] },
  { number: "252", name: "Matteo Politano", team: "SSC Napoli", persons: ["Matteo Politano"] },

  // FC Internazionale Milano (253-261)
  { number: "253", name: "Team Badge (FC Internazionale Milano)", team: "FC Internazionale Milano", type: "Team Badge" },
  { number: "254", name: "Yann Sommer", team: "FC Internazionale Milano", persons: ["Yann Sommer"] },
  { number: "255", name: "Alessandro Bastoni", team: "FC Internazionale Milano", persons: ["Alessandro Bastoni"] },
  { number: "256", name: "Federico Dimarco", team: "FC Internazionale Milano", persons: ["Federico Dimarco"] },
  { number: "257", name: "Denzel Dumfries", team: "FC Internazionale Milano", persons: ["Denzel Dumfries"] },
  { number: "258", name: "Nicolò Barella", team: "FC Internazionale Milano", persons: ["Nicolò Barella"] },
  { number: "259", name: "Hakan Çalhanoğlu", team: "FC Internazionale Milano", persons: ["Hakan Çalhanoğlu"] },
  { number: "260", name: "Lautaro Martínez", team: "FC Internazionale Milano", persons: ["Lautaro Martínez"] },
  { number: "261", name: "Marcus Thuram", team: "FC Internazionale Milano", persons: ["Marcus Thuram"] },

  // Juventus (262-270)
  { number: "262", name: "Team Badge (Juventus)", team: "Juventus", type: "Team Badge" },
  { number: "263", name: "Michele Di Gregorio", team: "Juventus", persons: ["Michele Di Gregorio"] },
  { number: "264", name: "Pierre Kalulu", team: "Juventus", persons: ["Pierre Kalulu"] },
  { number: "265", name: "Andrea Cambiaso", team: "Juventus", persons: ["Andrea Cambiaso"] },
  { number: "266", name: "Manuel Locatelli", team: "Juventus", persons: ["Manuel Locatelli"] },
  { number: "267", name: "Teun Koopmeiners", team: "Juventus", persons: ["Teun Koopmeiners"] },
  { number: "268", name: "Weston McKennie", team: "Juventus", persons: ["Weston McKennie"] },
  { number: "269", name: "Khéphren Thuram", team: "Juventus", persons: ["Khéphren Thuram"] },
  { number: "270", name: "Kenan Yildiz", team: "Juventus", persons: ["Kenan Yildiz"] },

  // Bologna FC 1909 (271-279)
  { number: "271", name: "Team Badge (Bologna FC 1909)", team: "Bologna FC 1909", type: "Team Badge" },
  { number: "272", name: "Łukasz Skorupski", team: "Bologna FC 1909", persons: ["Łukasz Skorupski"] },
  { number: "273", name: "Juan Miranda", team: "Bologna FC 1909", persons: ["Juan Miranda"] },
  { number: "274", name: "Lewis Ferguson", team: "Bologna FC 1909", persons: ["Lewis Ferguson"] },
  { number: "275", name: "Remo Freuler", team: "Bologna FC 1909", persons: ["Remo Freuler"] },
  { number: "276", name: "Jens Odgaard", team: "Bologna FC 1909", persons: ["Jens Odgaard"] },
  { number: "277", name: "Dan Ndoye", team: "Bologna FC 1909", persons: ["Dan Ndoye"] },
  { number: "278", name: "Riccardo Orsolini", team: "Bologna FC 1909", persons: ["Riccardo Orsolini"] },
  { number: "279", name: "Santiago Castro", team: "Bologna FC 1909", persons: ["Santiago Castro"] },

  // ACF Fiorentina (280-288)
  { number: "280", name: "Team Badge (ACF Fiorentina)", team: "ACF Fiorentina", type: "Team Badge" },
  { number: "281", name: "David De Gea", team: "ACF Fiorentina", persons: ["David De Gea"] },
  { number: "282", name: "Luca Ranieri", team: "ACF Fiorentina", persons: ["Luca Ranieri"] },
  { number: "283", name: "Dodô", team: "ACF Fiorentina", persons: ["Dodô"] },
  { number: "284", name: "Pietro Comuzzo", team: "ACF Fiorentina", persons: ["Pietro Comuzzo"] },
  { number: "285", name: "Rolando Mandragora", team: "ACF Fiorentina", persons: ["Rolando Mandragora"] },
  { number: "286", name: "Nicolò Fagioli", team: "ACF Fiorentina", persons: ["Nicolò Fagioli"] },
  { number: "287", name: "Cher Ndour", team: "ACF Fiorentina", persons: ["Cher Ndour"] },
  { number: "288", name: "Moise Kean", team: "ACF Fiorentina", persons: ["Moise Kean"] },

  // FC Salzburg (289-297)
  { number: "289", name: "Team Badge (FC Salzburg)", team: "FC Salzburg", type: "Team Badge" },
  { number: "290", name: "Alexander Schlager", team: "FC Salzburg", persons: ["Alexander Schlager"] },
  { number: "291", name: "Samson Baidoo", team: "FC Salzburg", persons: ["Samson Baidoo"] },
  { number: "292", name: "Aleksa Terzić", team: "FC Salzburg", persons: ["Aleksa Terzić"] },
  { number: "293", name: "Mads Bidstrup", team: "FC Salzburg", persons: ["Mads Bidstrup"] },
  { number: "294", name: "Oscar Gloukh", team: "FC Salzburg", persons: ["Oscar Gloukh"] },
  { number: "295", name: "Bobby Clark", team: "FC Salzburg", persons: ["Bobby Clark"] },
  { number: "296", name: "Dorgeles Nene", team: "FC Salzburg", persons: ["Dorgeles Nene"] },
  { number: "297", name: "Karim Konate", team: "FC Salzburg", persons: ["Karim Konate"] },

  // Celtic FC (298-302)
  { number: "298", name: "Team Badge (Celtic FC)", team: "Celtic FC", type: "Team Badge" },
  { number: "299", name: "Kasper Schmeichel", team: "Celtic FC", persons: ["Kasper Schmeichel"] },
  { number: "300", name: "Cameron Carter-Vickers", team: "Celtic FC", persons: ["Cameron Carter-Vickers"] },
  { number: "301", name: "Callum McGregor", team: "Celtic FC", persons: ["Callum McGregor"] },
  { number: "302", name: "Daizen Maeda", team: "Celtic FC", persons: ["Daizen Maeda"] },

  // Athletic Club (303-306)
  { number: "303", name: "Team Badge (Athletic Club)", team: "Athletic Club", type: "Team Badge" },
  { number: "304", name: "Unai Simón", team: "Athletic Club", persons: ["Unai Simón"] },
  { number: "305", name: "Daniel Vivian", team: "Athletic Club", persons: ["Daniel Vivian"] },
  { number: "306", name: "Iñaki Williams", team: "Athletic Club", persons: ["Iñaki Williams"] },

  // Rangers FC (307-311)
  { number: "307", name: "Team Badge (Rangers FC)", team: "Rangers FC", type: "Team Badge" },
  { number: "308", name: "Jack Butland", team: "Rangers FC", persons: ["Jack Butland"] },
  { number: "309", name: "James Tavernier", team: "Rangers FC", persons: ["James Tavernier"] },
  { number: "310", name: "Robin Pröpper", team: "Rangers FC", persons: ["Robin Pröpper"] },
  { number: "311", name: "Nedim Bajrami", team: "Rangers FC", persons: ["Nedim Bajrami"] },

  // FC Porto (312-315)
  { number: "312", name: "Team Badge (FC Porto)", team: "FC Porto", type: "Team Badge" },
  { number: "313", name: "Diogo Costa", team: "FC Porto", persons: ["Diogo Costa"] },
  { number: "314", name: "Alan Varela", team: "FC Porto", persons: ["Alan Varela"] },
  { number: "315", name: "Samu Aghehowa", team: "FC Porto", persons: ["Samu Aghehowa"] },

  // Man of the Match Wildcard (316-342)
  { number: "316", name: "Jeremie Frimpong", team: "Liverpool", type: "Man of the Match Wildcard", persons: ["Jeremie Frimpong"] },
  { number: "317", name: "William Saliba", team: "Arsenal", type: "Man of the Match Wildcard", persons: ["William Saliba"] },
  { number: "318", name: "Joško Gvardiol", team: "Manchester City", type: "Man of the Match Wildcard", persons: ["Joško Gvardiol"] },
  { number: "319", name: "Reece James", team: "Chelsea", type: "Man of the Match Wildcard", persons: ["Reece James"] },
  { number: "320", name: "Dan Burn", team: "Newcastle United", type: "Man of the Match Wildcard", persons: ["Dan Burn"] },
  { number: "321", name: "Pau Torres", team: "Aston Villa", type: "Man of the Match Wildcard", persons: ["Pau Torres"] },
  { number: "322", name: "Elliot Anderson", team: "Nottingham Forest", type: "Man of the Match Wildcard", persons: ["Elliot Anderson"] },
  { number: "323", name: "Pedro Porro", team: "Tottenham Hotspur", type: "Man of the Match Wildcard", persons: ["Pedro Porro"] },
  { number: "324", name: "Pedri", team: "FC Barcelona", type: "Man of the Match Wildcard", persons: ["Pedri"] },
  { number: "325", name: "Jude Bellingham", team: "Real Madrid CF", type: "Man of the Match Wildcard", persons: ["Jude Bellingham"] },
  { number: "326", name: "José María Giménez", team: "Atlético de Madrid", type: "Man of the Match Wildcard", persons: ["José María Giménez"] },
  { number: "327", name: "Oihan Sancet", team: "Athletic Club", type: "Man of the Match Wildcard", persons: ["Oihan Sancet"] },
  { number: "328", name: "Gorka Guruzeta", team: "Athletic Club", type: "Man of the Match Wildcard", persons: ["Gorka Guruzeta"] },
  { number: "329", name: "Alphonso Davies", team: "FC Bayern München", type: "Man of the Match Wildcard", persons: ["Alphonso Davies"] },
  { number: "330", name: "Alejandro Grimaldo", team: "Bayer 04 Leverkusen", type: "Man of the Match Wildcard", persons: ["Alejandro Grimaldo"] },
  { number: "331", name: "Emre Can", team: "Borussia Dortmund", type: "Man of the Match Wildcard", persons: ["Emre Can"] },
  { number: "332", name: "Nuno Mendes", team: "Paris Saint-Germain", type: "Man of the Match Wildcard", persons: ["Nuno Mendes"] },
  { number: "333", name: "Zeno Debast", team: "Sporting Clube de Portugal", type: "Man of the Match Wildcard", persons: ["Zeno Debast"] },
  { number: "334", name: "João Mário", team: "FC Porto", type: "Man of the Match Wildcard", persons: ["João Mário"] },
  { number: "335", name: "Youri Baas", team: "AFC Ajax", type: "Man of the Match Wildcard", persons: ["Youri Baas"] },
  { number: "336", name: "David Neres", team: "SSC Napoli", type: "Man of the Match Wildcard", persons: ["David Neres"] },
  { number: "337", name: "Federico Dimarco", team: "FC Internazionale Milano", type: "Man of the Match Wildcard", persons: ["Federico Dimarco"] },
  { number: "338", name: "Michele Di Gregorio", team: "Juventus", type: "Man of the Match Wildcard", persons: ["Michele Di Gregorio"] },
  { number: "339", name: "Juan Miranda", team: "Bologna FC 1909", type: "Man of the Match Wildcard", persons: ["Juan Miranda"] },
  { number: "340", name: "Dodô", team: "ACF Fiorentina", type: "Man of the Match Wildcard", persons: ["Dodô"] },
  { number: "341", name: "Arthur Theate", team: "Eintracht Frankfurt", type: "Man of the Match Wildcard", persons: ["Arthur Theate"] },
  { number: "342", name: "Cyriel Dessers", team: "Rangers FC", type: "Man of the Match Wildcard", persons: ["Cyriel Dessers"] },

  // Cup Champion (343-360)
  { number: "343", name: "Virgil van Dijk", team: "Liverpool", type: "Cup Champion", persons: ["Virgil van Dijk"] },
  { number: "344", name: "Xabi Alonso", team: "Liverpool", type: "Cup Champion", persons: ["Xabi Alonso"] },
  { number: "345", name: "Rúben Dias", team: "Manchester City", type: "Cup Champion", persons: ["Rúben Dias"] },
  { number: "346", name: "Ashley Cole", team: "Chelsea", type: "Cup Champion", persons: ["Ashley Cole"] },
  { number: "347", name: "Frank Lampard", team: "Chelsea", type: "Cup Champion", persons: ["Frank Lampard"] },
  { number: "348", name: "Fernando Torres", team: "Chelsea", type: "Cup Champion", persons: ["Fernando Torres"] },
  { number: "349", name: "Xavi Hernández", team: "FC Barcelona", type: "Cup Champion", persons: ["Xavi Hernández"] },
  { number: "350", name: "Andrés Iniesta", team: "FC Barcelona", type: "Cup Champion", persons: ["Andrés Iniesta"] },
  { number: "351", name: "Lionel Messi", team: "FC Barcelona", type: "Cup Champion", persons: ["Lionel Messi"] },
  { number: "352", name: "Daniel Carvajal", team: "Real Madrid CF", type: "Cup Champion", persons: ["Daniel Carvajal"] },
  { number: "353", name: "Toni Kroos", team: "Real Madrid CF", type: "Cup Champion", persons: ["Toni Kroos"] },
  { number: "354", name: "Raúl", team: "Real Madrid CF", type: "Cup Champion", persons: ["Raúl"] },
  { number: "355", name: "Diego Godín", team: "Atlético de Madrid", type: "Cup Champion", persons: ["Diego Godín"] },
  { number: "356", name: "Antoine Griezmann", team: "Atlético de Madrid", type: "Cup Champion", persons: ["Antoine Griezmann"] },
  { number: "357", name: "Manuel Neuer", team: "FC Bayern München", type: "Cup Champion", persons: ["Manuel Neuer"] },
  { number: "358", name: "Bastian Schweinsteiger", team: "FC Bayern München", type: "Cup Champion", persons: ["Bastian Schweinsteiger"] },
  { number: "359", name: "Samuel Eto'o", team: "FC Internazionale Milano", type: "Cup Champion", persons: ["Samuel Eto'o"] },
  { number: "360", name: "Alessandro Del Piero", team: "Juventus", type: "Cup Champion", persons: ["Alessandro Del Piero"] },

  // All-Action Hero (361-378)
  { number: "361", name: "Ryan Gravenberch", team: "Liverpool", type: "All-Action Hero", persons: ["Ryan Gravenberch"] },
  { number: "362", name: "Mikel Merino", team: "Arsenal", type: "All-Action Hero", persons: ["Mikel Merino"] },
  { number: "363", name: "Rodri", team: "Manchester City", type: "All-Action Hero", persons: ["Rodri"] },
  { number: "364", name: "Tosin Adarabioyo", team: "Chelsea", type: "All-Action Hero", persons: ["Tosin Adarabioyo"] },
  { number: "365", name: "Chris Wood", team: "Nottingham Forest", type: "All-Action Hero", persons: ["Chris Wood"] },
  { number: "366", name: "Brennan Johnson", team: "Tottenham Hotspur", type: "All-Action Hero", persons: ["Brennan Johnson"] },
  { number: "367", name: "Frenkie de Jong", team: "FC Barcelona", type: "All-Action Hero", persons: ["Frenkie de Jong"] },
  { number: "368", name: "Koke", team: "Atlético de Madrid", type: "All-Action Hero", persons: ["Koke"] },
  { number: "369", name: "Iñaki Williams", team: "Athletic Club", type: "All-Action Hero", persons: ["Iñaki Williams"] },
  { number: "370", name: "Mario Götze", team: "Eintracht Frankfurt", type: "All-Action Hero", persons: ["Mario Götze"] },
  { number: "371", name: "Marcel Sabitzer", team: "Borussia Dortmund", type: "All-Action Hero", persons: ["Marcel Sabitzer"] },
  { number: "372", name: "Vitinha", team: "Paris Saint-Germain", type: "All-Action Hero", persons: ["Vitinha"] },
  { number: "373", name: "Gonçalo Inácio", team: "Sporting Clube de Portugal", type: "All-Action Hero", persons: ["Gonçalo Inácio"] },
  { number: "374", name: "Kenneth Taylor", team: "AFC Ajax", type: "All-Action Hero", persons: ["Kenneth Taylor"] },
  { number: "375", name: "Weston McKennie", team: "Juventus", type: "All-Action Hero", persons: ["Weston McKennie"] },
  { number: "376", name: "Riccardo Orsolini", team: "Bologna FC 1909", type: "All-Action Hero", persons: ["Riccardo Orsolini"] },
  { number: "377", name: "Daizen Maeda", team: "Celtic FC", type: "All-Action Hero", persons: ["Daizen Maeda"] },
  { number: "378", name: "Mohamed Diomande", team: "Rangers FC", type: "All-Action Hero", persons: ["Mohamed Diomande"] },

  // Heritage (379-405)
  { number: "379", name: "Ibrahima Konaté", team: "Liverpool", type: "Heritage", persons: ["Ibrahima Konaté"] },
  { number: "380", name: "Nicolas Jackson", team: "Chelsea", type: "Heritage", persons: ["Nicolas Jackson"] },
  { number: "381", name: "Donyell Malen", team: "Aston Villa", type: "Heritage", persons: ["Donyell Malen"] },
  { number: "382", name: "Micky van de Ven", team: "Tottenham Hotspur", type: "Heritage", persons: ["Micky van de Ven"] },
  { number: "383", name: "Dani Olmo", team: "FC Barcelona", type: "Heritage", persons: ["Dani Olmo"] },
  { number: "384", name: "Aurélien Tchouaméndi", team: "Real Madrid CF", type: "Heritage", persons: ["Aurélien Tchouaméndi"] },
  { number: "385", name: "Pepê", team: "FC Porto", type: "Heritage", persons: ["Pepê"] },
  { number: "386", name: "Alessandro Buongiorno", team: "SSC Napoli", type: "Heritage", persons: ["Alessandro Buongiorno"] },
  { number: "387", name: "Andrea Cambiaso", team: "Juventus", type: "Heritage", persons: ["Andrea Cambiaso"] },
  { number: "388", name: "David Raya", team: "Arsenal", type: "Heritage", persons: ["David Raya"] },
  { number: "389", name: "Jan Oblak", team: "Atlético de Madrid", type: "Heritage", persons: ["Jan Oblak"] },
  { number: "390", name: "Unai Simón", team: "Athletic Club", type: "Heritage", persons: ["Unai Simón"] },
  { number: "391", name: "Kevin Trapp", team: "Eintracht Frankfurt", type: "Heritage", persons: ["Kevin Trapp"] },
  { number: "392", name: "Gregor Kobel", team: "Borussia Dortmund", type: "Heritage", persons: ["Gregor Kobel"] },
  { number: "393", name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", type: "Heritage", persons: ["Gianluigi Donnarumma"] },
  { number: "394", name: "Yann Sommer", team: "FC Internazionale Milano", type: "Heritage", persons: ["Yann Sommer"] },
  { number: "395", name: "Manuel Neuer", team: "FC Bayern München", type: "Heritage", persons: ["Manuel Neuer"] },
  { number: "396", name: "Kasper Schmeichel", team: "Celtic FC", type: "Heritage", persons: ["Kasper Schmeichel"] },
  { number: "397", name: "Bruno Guimarães", team: "Newcastle United", type: "Heritage", persons: ["Bruno Guimarães"] },
  { number: "398", name: "Ryan Yates", team: "Nottingham Forest", type: "Heritage", persons: ["Ryan Yates"] },
  { number: "399", name: "Atakan Karazor", team: "VfB Stuttgart", type: "Heritage", persons: ["Atakan Karazor"] },
  { number: "400", name: "Morten Hjulmand", team: "Sporting Clube de Portugal", type: "Heritage", persons: ["Morten Hjulmand"] },
  { number: "401", name: "Bernardo Silva", team: "Manchester City", type: "Heritage", persons: ["Bernardo Silva"] },
  { number: "402", name: "Lewis Ferguson", team: "Bologna FC 1909", type: "Heritage", persons: ["Lewis Ferguson"] },
  { number: "403", name: "Luca Ranieri", team: "ACF Fiorentina", type: "Heritage", persons: ["Luca Ranieri"] },
  { number: "404", name: "Mads Bidstrup", team: "FC Salzburg", type: "Heritage", persons: ["Mads Bidstrup"] },
  { number: "405", name: "James Tavernier", team: "Rangers FC", type: "Heritage", persons: ["James Tavernier"] },

  // Counter Attax (406-414)
  { number: "406", name: "Harvey Elliott", team: "Liverpool", type: "Counter Attax", persons: ["Harvey Elliott"] },
  { number: "407", name: "Mohamed Salah", team: "Liverpool", type: "Counter Attax", persons: ["Mohamed Salah"] },
  { number: "408", name: "Erling Haaland", team: "Manchester City", type: "Counter Attax", persons: ["Erling Haaland"] },
  { number: "409", name: "Fernando Torres", team: "Chelsea", type: "Counter Attax", persons: ["Fernando Torres"] },
  { number: "410", name: "Ollie Watkins", team: "Aston Villa", type: "Counter Attax", persons: ["Ollie Watkins"] },
  { number: "411", name: "Endrick", team: "Real Madrid CF", type: "Counter Attax", persons: ["Endrick"] },
  { number: "412", name: "Julián Alvarez", team: "Atlético de Madrid", type: "Counter Attax", persons: ["Julián Alvarez"] },
  { number: "413", name: "Ousmane Dembélé", team: "Paris Saint-Germain", type: "Counter Attax", persons: ["Ousmane Dembélé"] },
  { number: "414", name: "Weston McKennie", team: "Juventus", type: "Counter Attax", persons: ["Weston McKennie"] },

  // Showboat (415-423)
  { number: "415", name: "Roberto Firmino", team: "Liverpool", type: "Showboat", persons: ["Roberto Firmino"] },
  { number: "416", name: "Eden Hazard", team: "Chelsea", type: "Showboat", persons: ["Eden Hazard"] },
  { number: "417", name: "Ronaldinho", team: "FC Barcelona", type: "Showboat", persons: ["Ronaldinho"] },
  { number: "418", name: "Ronaldo", team: "Real Madrid CF", type: "Showboat", persons: ["Ronaldo"] },
  { number: "419", name: "David Villa", team: "Manchester City", type: "Showboat", persons: ["David Villa"] },
  { number: "420", name: "Franck Ribéry", team: "FC Bayern München", type: "Showboat", persons: ["Franck Ribéry"] },
  { number: "421", name: "Dimitar Berbatov", team: "Bayer 04 Leverkusen", type: "Showboat", persons: ["Dimitar Berbatov"] },
  { number: "422", name: "Adriano", team: "FC Internazionale Milano", type: "Showboat", persons: ["Adriano"] },
  { number: "423", name: "Zinedine Zidane", team: "Juventus", type: "Showboat", persons: ["Zinedine Zidane"] },

  // Magic Memories (424-441)
  { number: "424", name: "Jerzy Dudek", team: "Liverpool", type: "Magic Memories", persons: ["Jerzy Dudek"] },
  { number: "425", name: "Rodri", team: "Manchester City", type: "Magic Memories", persons: ["Rodri"] },
  { number: "426", name: "Didier Drogba", team: "Chelsea", type: "Magic Memories", persons: ["Didier Drogba"] },
  { number: "427", name: "Morgan Rogers", team: "Aston Villa", type: "Magic Memories", persons: ["Morgan Rogers"] },
  { number: "428", name: "Brennan Johnson", team: "Tottenham Hotspur", type: "Magic Memories", persons: ["Brennan Johnson"] },
  { number: "429", name: "David Villa", team: "FC Barcelona", type: "Magic Memories", persons: ["David Villa"] },
  { number: "430", name: "Lionel Messi", team: "FC Barcelona", type: "Magic Memories", persons: ["Lionel Messi"] },
  { number: "431", name: "Neymar Jr.", team: "FC Barcelona", type: "Magic Memories", persons: ["Neymar Jr."] },
  { number: "432", name: "Gareth Bale", team: "Real Madrid CF", type: "Magic Memories", persons: ["Gareth Bale"] },
  { number: "433", name: "Rodrygo", team: "Real Madrid CF", type: "Magic Memories", persons: ["Rodrygo"] },
  { number: "434", name: "Antoine Griezmann", team: "Atlético de Madrid", type: "Magic Memories", persons: ["Antoine Griezmann"] },
  { number: "435", name: "Joshua Kimmich", team: "FC Bayern München", type: "Magic Memories", persons: ["Joshua Kimmich"] },
  { number: "436", name: "Harry Kane", team: "FC Bayern München", type: "Magic Memories", persons: ["Harry Kane"] },
  { number: "437", name: "Patrik Schick", team: "Bayer 04 Leverkusen", type: "Magic Memories", persons: ["Patrik Schick"] },
  { number: "438", name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", type: "Magic Memories", persons: ["Gianluigi Donnarumma"] },
  { number: "439", name: "Francesco Acerbi", team: "FC Internazionale Milano", type: "Magic Memories", persons: ["Francesco Acerbi"] },
  { number: "440", name: "Shunsuke Nakamura", team: "Celtic FC", type: "Magic Memories", persons: ["Shunsuke Nakamura"] },
  { number: "441", name: "James Tavernier", team: "Rangers FC", type: "Magic Memories", persons: ["James Tavernier"] },

  // Stealth Strike (442-459)
  { number: "442", name: "Cody Gakpo", team: "Liverpool", type: "Stealth Strike", persons: ["Cody Gakpo"] },
  { number: "443", name: "Kai Havertz", team: "Arsenal", type: "Stealth Strike", persons: ["Kai Havertz"] },
  { number: "444", name: "Omar Marmoush", team: "Manchester City", type: "Stealth Strike", persons: ["Omar Marmoush"] },
  { number: "445", name: "Cole Palmer", team: "Chelsea", type: "Stealth Strike", persons: ["Cole Palmer"] },
  { number: "446", name: "Anthony Gordon", team: "Newcastle United", type: "Stealth Strike", persons: ["Anthony Gordon"] },
  { number: "447", name: "Dominic Solanke", team: "Tottenham Hotspur", type: "Stealth Strike", persons: ["Dominic Solanke"] },
  { number: "448", name: "Lamine Yamal", team: "FC Barcelona", type: "Stealth Strike", persons: ["Lamine Yamal"] },
  { number: "449", name: "Vini Jr.", team: "Real Madrid CF", type: "Stealth Strike", persons: ["Vini Jr."] },
  { number: "450", name: "Antoine Griezmann", team: "Atlético de Madrid", type: "Stealth Strike", persons: ["Antoine Griezmann"] },
  { number: "451", name: "Nico Williams", team: "Athletic Club", type: "Stealth Strike", persons: ["Nico Williams"] },
  { number: "452", name: "Michael Olise", team: "FC Bayern München", type: "Stealth Strike", persons: ["Michael Olise"] },
  { number: "453", name: "Deniz Undav", team: "VfB Stuttgart", type: "Stealth Strike", persons: ["Deniz Undav"] },
  { number: "454", name: "Bradley Barcola", team: "Paris Saint-Germain", type: "Stealth Strike", persons: ["Bradley Barcola"] },
  { number: "455", name: "Romelu Lukaku", team: "SSC Napoli", type: "Stealth Strike", persons: ["Romelu Lukaku"] },
  { number: "456", name: "Denzel Dumfries", team: "FC Internazionale Milano", type: "Stealth Strike", persons: ["Denzel Dumfries"] },
  { number: "457", name: "Moise Kean", team: "ACF Fiorentina", type: "Stealth Strike", persons: ["Moise Kean"] },
  { number: "458", name: "Samu Aghehowa", team: "FC Porto", type: "Stealth Strike", persons: ["Samu Aghehowa"] },
  { number: "459", name: "Conrad Harder", team: "Sporting Clube de Portugal", type: "Stealth Strike", persons: ["Conrad Harder"] },

  // 100 Club (460-467)
  { number: "460", name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", type: "100 Club", persons: ["Gianluigi Donnarumma"] },
  { number: "461", name: "Trent Alexander-Arnold", team: "Real Madrid CF", type: "100 Club", persons: ["Trent Alexander-Arnold"] },
  { number: "462", name: "Denzel Dumfries", team: "FC Internazionale Milano", type: "100 Club", persons: ["Denzel Dumfries"] },
  { number: "463", name: "Declan Rice", team: "Arsenal", type: "100 Club", persons: ["Declan Rice"] },
  { number: "464", name: "Pedri", team: "FC Barcelona", type: "100 Club", persons: ["Pedri"] },
  { number: "465", name: "João Neves", team: "Paris Saint-Germain", type: "100 Club", persons: ["João Neves"] },
  { number: "466", name: "Mohamed Salah", team: "Liverpool", type: "100 Club", persons: ["Mohamed Salah"] },
  { number: "467", name: "Raphinha", team: "FC Barcelona", type: "100 Club", persons: ["Raphinha"] },

  // 100 Club Unbeatable 101 (468)
  { number: "468", name: "Ousmane Dembele", team: "Paris Saint-Germain", type: "100 Club Unbeatable 101", persons: ["Ousmane Dembele"] },

  // Black Edge Edition (BE 1-9)
  { number: "BE 1", name: "Virgil van Dijk", team: "Liverpool", type: "Black Edge Edition", persons: ["Virgil van Dijk"] },
  { number: "BE 2", name: "Bukayo Saka", team: "Arsenal", type: "Black Edge Edition", persons: ["Bukayo Saka"] },
  { number: "BE 3", name: "Lamine Yamal", team: "FC Barcelona", type: "Black Edge Edition", persons: ["Lamine Yamal"] },
  { number: "BE 4", name: "Rodrygo", team: "Real Madrid CF", type: "Black Edge Edition", persons: ["Rodrygo"] },
  { number: "BE 5", name: "Julián Alvarez", team: "Atlético de Madrid", type: "Black Edge Edition", persons: ["Julián Alvarez"] },
  { number: "BE 6", name: "Joshua Kimmich", team: "FC Bayern München", type: "Black Edge Edition", persons: ["Joshua Kimmich"] },
  { number: "BE 7", name: "Serhou Guirassy", team: "Borussia Dortmund", type: "Black Edge Edition", persons: ["Serhou Guirassy"] },
  { number: "BE 8", name: "Khvicha Kvaratskhelia", team: "Paris Saint-Germain", type: "Black Edge Edition", persons: ["Khvicha Kvaratskhelia"] },
  { number: "BE 9", name: "Marcus Thuram", team: "FC Internazionale Milano", type: "Black Edge Edition", persons: ["Marcus Thuram"] },

  // Ball Master (BM 1-4)
  { number: "BM 1", name: "Rodri", team: "Manchester City", type: "Ball Master", persons: ["Rodri"] },
  { number: "BM 2", name: "Mohamed Salah", team: "Liverpool", type: "Ball Master", persons: ["Mohamed Salah"] },
  { number: "BM 3", name: "Vini Jr.", team: "Real Madrid CF", type: "Ball Master", persons: ["Vini Jr."] },
  { number: "BM 4", name: "Jamal Musiala", team: "FC Bayern München", type: "Ball Master", persons: ["Jamal Musiala"] },

  // Chrome Award Winner (CA 1-18)
  { number: "CA 1", name: "Raphinha", team: "FC Barcelona", type: "Chrome Award Winner", persons: ["Raphinha"] },
  { number: "CA 2", name: "Désiré Doué", team: "Paris Saint-Germain", type: "Chrome Award Winner", persons: ["Désiré Doué"] },
  { number: "CA 3", name: "Lamine Yamal", team: "FC Barcelona", type: "Chrome Award Winner", persons: ["Lamine Yamal"] },
  { number: "CA 4", name: "Julián Alvarez", team: "Atlético de Madrid", type: "Chrome Award Winner", persons: ["Julián Alvarez"] },
  { number: "CA 5", name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", type: "Chrome Award Winner", persons: ["Gianluigi Donnarumma"] },
  { number: "CA 6", name: "Mohamed Salah", team: "Liverpool", type: "Chrome Award Winner", persons: ["Mohamed Salah"] },
  { number: "CA 7", name: "Harry Kane", team: "FC Bayern München", type: "Chrome Award Winner", persons: ["Harry Kane"] },
  { number: "CA 8", name: "Achraf Hakimi", team: "Paris Saint-Germain", type: "Chrome Award Winner", persons: ["Achraf Hakimi"] },
  { number: "CA 9", name: "Serhou Guirassy", team: "Borussia Dortmund", type: "Chrome Award Winner", persons: ["Serhou Guirassy"] },
  { number: "CA 10", name: "João Neves", team: "Paris Saint-Germain", type: "Chrome Award Winner", persons: ["João Neves"] },
  { number: "CA 11", name: "Raphinha", team: "FC Barcelona", type: "Chrome Award Winner", persons: ["Raphinha"] },
  { number: "CA 12", name: "Vitinha", team: "Paris Saint-Germain", type: "Chrome Award Winner", persons: ["Vitinha"] },
  { number: "CA 13", name: "Davide Frattesi", team: "FC Internazionale Milano", type: "Chrome Award Winner", persons: ["Davide Frattesi"] },
  { number: "CA 14", name: "Declan Rice", team: "Arsenal", type: "Chrome Award Winner", persons: ["Declan Rice"] },
  { number: "CA 15", name: "Vini Jr.", team: "Real Madrid CF", type: "Chrome Award Winner", persons: ["Vini Jr."] },
  { number: "CA 16", name: "Jude Bellingham", team: "Real Madrid CF", type: "Chrome Award Winner", persons: ["Jude Bellingham"] },
  { number: "CA 17", name: "Alisson Becker", team: "Liverpool", type: "Chrome Award Winner", persons: ["Alisson Becker"] },
  { number: "CA 18", name: "Marquinhos", team: "Paris Saint-Germain", type: "Chrome Award Winner", persons: ["Marquinhos"] },

  // Galactic Exclusive Edition (GA 1-4)
  { number: "GA 1", name: "Vini Jr.", team: "Real Madrid CF", type: "Galactic Exclusive Edition", persons: ["Vini Jr."] },
  { number: "GA 2", name: "Morgan Rogers", team: "Aston Villa", type: "Galactic Exclusive Edition", persons: ["Morgan Rogers"] },
  { number: "GA 3", name: "David De Gea", team: "ACF Fiorentina", type: "Galactic Exclusive Edition", persons: ["David De Gea"] },
  { number: "GA 4", name: "Leah Williamson", team: "Arsenal", type: "Galactic Exclusive Edition", persons: ["Leah Williamson"] },

  // The Graduates (GRD 1-4)
  { number: "GRD 1", name: "Phil Foden", team: "Manchester City", type: "The Graduates", persons: ["Phil Foden"] },
  { number: "GRD 2", name: "Reece James", team: "Chelsea", type: "The Graduates", persons: ["Reece James"] },
  { number: "GRD 3", name: "Lionel Messi", team: "FC Barcelona", type: "The Graduates", persons: ["Lionel Messi"] },
  { number: "GRD 4", name: "Philipp Lahm", team: "FC Bayern München", type: "The Graduates", persons: ["Philipp Lahm"] },

  // Match Attax Hall of Fame (HOF 1-7)
  { number: "HOF 1", name: "Steven Gerrard", team: "Liverpool", type: "Match Attax Hall of Fame", persons: ["Steven Gerrard"] },
  { number: "HOF 2", name: "Didier Drogba", team: "Chelsea", type: "Match Attax Hall of Fame", persons: ["Didier Drogba"] },
  { number: "HOF 3", name: "Gareth Bale", team: "Real Madrid CF", type: "Match Attax Hall of Fame", persons: ["Gareth Bale"] },
  { number: "HOF 4", name: "Neymar Jr.", team: "FC Barcelona", type: "Match Attax Hall of Fame", persons: ["Neymar Jr."] },
  { number: "HOF 5", name: "Bastian Schweinsteiger", team: "FC Bayern München", type: "Match Attax Hall of Fame", persons: ["Bastian Schweinsteiger"] },
  { number: "HOF 6", name: "Wesley Sneijder", team: "FC Internazionale Milano", type: "Match Attax Hall of Fame", persons: ["Wesley Sneijder"] },
  { number: "HOF 7", name: "Ronaldinho", team: "FC Barcelona", type: "Match Attax Hall of Fame", persons: ["Ronaldinho"] },

  // Infinity (IN 1-10)
  { number: "IN 1", name: "Mohamed Salah", team: "Liverpool", type: "Infinity", persons: ["Mohamed Salah"] },
  { number: "IN 2", name: "Bukayo Saka", team: "Arsenal", type: "Infinity", persons: ["Bukayo Saka"] },
  { number: "IN 3", name: "Erling Haaland", team: "Manchester City", type: "Infinity", persons: ["Erling Haaland"] },
  { number: "IN 4", name: "Robert Lewandowski", team: "FC Barcelona", type: "Infinity", persons: ["Robert Lewandowski"] },
  { number: "IN 5", name: "Kylian Mbappé", team: "Real Madrid CF", type: "Infinity", persons: ["Kylian Mbappé"] },
  { number: "IN 6", name: "Jude Bellingham", team: "Real Madrid CF", type: "Infinity", persons: ["Jude Bellingham"] },
  { number: "IN 7", name: "Jamal Musiala", team: "FC Bayern München", type: "Infinity", persons: ["Jamal Musiala"] },
  { number: "IN 8", name: "Vitinha", team: "Paris Saint-Germain", type: "Infinity", persons: ["Vitinha"] },
  { number: "IN 9", name: "Lautaro Martínez", team: "FC Internazionale Milano", type: "Infinity", persons: ["Lautaro Martínez"] },
  { number: "IN 10", name: "Franck Ribéry", team: "FC Bayern München", type: "Infinity", persons: ["Franck Ribéry"] },
  { number: "IN 10B", name: "Zinedine Zidane", team: "Real Madrid CF", type: "Infinity", persons: ["Zinedine Zidane"] },

  // Lethal Combo (LC-RN)
  { number: "LC-RN", name: "Ronaldinho / Neymar Jr.", team: "FC Barcelona", type: "Lethal Combo", persons: ["Ronaldinho", "Neymar Jr."] },

  // Match Attax Card Winner (MAW)
  { number: "MAW", name: "Phil Foden", team: "Manchester City", type: "Match Attax Card Winner", persons: ["Phil Foden"] },

  // Red Hot and Cold
  { number: "RH-LY", name: "Lamine Yamal", team: "FC Barcelona", type: "Red Hot and Cold", persons: ["Lamine Yamal"] },
  { number: "ICE-CP", name: "Cole Palmer", team: "Manchester City", type: "Red Hot and Cold", persons: ["Cole Palmer"] },

  // Squadzone Exclusive Festive Edition (SZ 1-24)
  { number: "SZ 1", name: "Kevin Trapp", team: "Eintracht Frankfurt", type: "Squadzone Exclusive Festive Edition", persons: ["Kevin Trapp"] },
  { number: "SZ 2", name: "Alistair Johnston", team: "Celtic FC", type: "Squadzone Exclusive Festive Edition", persons: ["Alistair Johnston"] },
  { number: "SZ 3", name: "Marc Cucurella", team: "Chelsea", type: "Squadzone Exclusive Festive Edition", persons: ["Marc Cucurella"] },
  { number: "SZ 4", name: "Conor Gallagher", team: "Atlético de Madrid", type: "Squadzone Exclusive Festive Edition", persons: ["Conor Gallagher"] },
  { number: "SZ 5", name: "Jude Bellingham", team: "Real Madrid CF", type: "Squadzone Exclusive Festive Edition", persons: ["Jude Bellingham"] },
  { number: "SZ 6", name: "Stephen Eustáquio", team: "FC Porto", type: "Squadzone Exclusive Festive Edition", persons: ["Stephen Eustáquio"] },
  { number: "SZ 7", name: "Khvicha Kvaratskhelia", team: "Paris Saint-Germain", type: "Squadzone Exclusive Festive Edition", persons: ["Khvicha Kvaratskhelia"] },
  { number: "SZ 8", name: "Paul Gascoigne", team: "Rangers FC", type: "Squadzone Exclusive Festive Edition", persons: ["Paul Gascoigne"] },
  { number: "SZ 9", name: "Alan Shearer", team: "Newcastle United", type: "Squadzone Exclusive Festive Edition", persons: ["Alan Shearer"] },
  { number: "SZ 10", name: "Lamine Yamal", team: "FC Barcelona", type: "Squadzone Exclusive Festive Edition", persons: ["Lamine Yamal"] },
  { number: "SZ 11", name: "Neymar Jr.", team: "FC Barcelona", type: "Squadzone Exclusive Festive Edition", persons: ["Neymar Jr."] },
  { number: "SZ 12", name: "Trent Alexander-Arnold", team: "Real Madrid CF", type: "Squadzone Exclusive Festive Edition", persons: ["Trent Alexander-Arnold"] },
  { number: "SZ 13", name: "Pascal Groß", team: "Borussia Dortmund", type: "Squadzone Exclusive Festive Edition", persons: ["Pascal Groß"] },
  { number: "SZ 14", name: "Désiré Doué", team: "Paris Saint-Germain", type: "Squadzone Exclusive Festive Edition", persons: ["Désiré Doué"] },
  { number: "SZ 15", name: "Lucas Bergvall", team: "Tottenham Hotspur", type: "Squadzone Exclusive Festive Edition", persons: ["Lucas Bergvall"] },
  { number: "SZ 16", name: "Weston McKennie", team: "Juventus", type: "Squadzone Exclusive Festive Edition", persons: ["Weston McKennie"] },
  { number: "SZ 17", name: "Michael Olise", team: "FC Bayern München", type: "Squadzone Exclusive Festive Edition", persons: ["Michael Olise"] },
  { number: "SZ 18", name: "Cody Gakpo", team: "Liverpool", type: "Squadzone Exclusive Festive Edition", persons: ["Cody Gakpo"] },
  { number: "SZ 19", name: "Conrad Harder", team: "Sporting Clube de Portugal", type: "Squadzone Exclusive Festive Edition", persons: ["Conrad Harder"] },
  { number: "SZ 20", name: "Alejandro Grimaldo", team: "Bayer 04 Leverkusen", type: "Squadzone Exclusive Festive Edition", persons: ["Alejandro Grimaldo"] },
  { number: "SZ 21", name: "David Silva", team: "Manchester City", type: "Squadzone Exclusive Festive Edition", persons: ["David Silva"] },
  { number: "SZ 22", name: "Ethan Nwaneri", team: "Arsenal", type: "Squadzone Exclusive Festive Edition", persons: ["Ethan Nwaneri"] },
  { number: "SZ 23", name: "Nicolo Barella", team: "FC Internazionale Milano", type: "Squadzone Exclusive Festive Edition", persons: ["Nicolo Barella"] },
  { number: "SZ 24", name: "Lorenzo Insigne", team: "SSC Napoli", type: "Squadzone Exclusive Festive Edition", persons: ["Lorenzo Insigne"] },

  // Tactic Card
  { number: "T1", name: "Tactic Card", team: "Various", type: "Tactic Card" },

  // Update Eco Pack #1 Scream Team
  { number: "ST 1", name: "Hugo Ekitike", team: "Liverpool", type: "Scream Team", persons: ["Hugo Ekitike"] },
  { number: "ST 2", name: "Alvaro Carreras", team: "Real Madrid CF", type: "Scream Team", persons: ["Alvaro Carreras"] },
  { number: "ST 3", name: "Paul Pogba", team: "AS Monaco", type: "Scream Team", persons: ["Paul Pogba"] },
  { number: "ST 4", name: "Jarell Quansah", team: "Bayer 04 Leverkusen", type: "Scream Team", persons: ["Jarell Quansah"] },
  { number: "ST 5", name: "Tijjani Reijnders", team: "Manchester City", type: "Scream Team", persons: ["Tijjani Reijnders"] },
  { number: "ST 6", name: "Anthony Elanga", team: "Newcastle United", type: "Scream Team", persons: ["Anthony Elanga"] },
  { number: "ST 7", name: "Thiago Almada", team: "Atlético de Madrid", type: "Scream Team", persons: ["Thiago Almada"] },
  { number: "ST 8", name: "Petar Sušić", team: "FC Internazionale Milano", type: "Scream Team", persons: ["Petar Sušić"] },
  { number: "ST 9", name: "Mohammed Kudus", team: "Tottenham Hotspur", type: "Scream Team", persons: ["Mohammed Kudus"] },
  { number: "ST 10", name: "Noa Lang", team: "SSC Napoli", type: "Scream Team", persons: ["Noa Lang"] },
  { number: "ST 11", name: "Kevin De Bruyne", team: "SSC Napoli", type: "Scream Team", persons: ["Kevin De Bruyne"] },
  { number: "ST 12", name: "Malik Tillman", team: "Bayer 04 Leverkusen", type: "Scream Team", persons: ["Malik Tillman"] },
  { number: "ST 13", name: "João Pedro", team: "Chelsea", type: "Scream Team", persons: ["João Pedro"] },
  { number: "ST 14", name: "Luís Diaz", team: "FC Bayern München", type: "Scream Team", persons: ["Luís Diaz"] },
  { number: "ST 15", name: "Marcus Rashford", team: "FC Barcelona", type: "Scream Team", persons: ["Marcus Rashford"] },
  { number: "ST 16", name: "Jonathan David", team: "Juventus", type: "Scream Team", persons: ["Jonathan David"] },
  { number: "ST EN", name: "Viktor Gyökeres", team: "Arsenal", type: "Scream Team Energy", persons: ["Viktor Gyökeres"] },

  // Update Eco Pack #2 Star Ballers
  { number: "SB 1", name: "Raphinha", team: "FC Barcelona", type: "Star Ballers", persons: ["Raphinha"] },
  { number: "SB 2", name: "Florian Wirtz", team: "Liverpool", type: "Star Ballers", persons: ["Florian Wirtz"] },
  { number: "SB 3", name: "Désiré Doué", team: "Paris Saint-Germain", type: "Star Ballers", persons: ["Désiré Doué"] },
  { number: "SB 4", name: "Jonathan Burkardt", team: "Eintracht Frankfurt", type: "Star Ballers", persons: ["Jonathan Burkardt"] },
  { number: "SB 5", name: "Jude Bellingham", team: "Real Madrid CF", type: "Star Ballers", persons: ["Jude Bellingham"] },
  { number: "SB 6", name: "Alejandro Garnacho", team: "Chelsea", type: "Star Ballers", persons: ["Alejandro Garnacho"] },
  { number: "SB 7", name: "Jobe Bellingham", team: "Borussia Dortmund", type: "Star Ballers", persons: ["Jobe Bellingham"] },
  { number: "SB 8", name: "Nick Woltemade", team: "Newcastle United", type: "Star Ballers", persons: ["Nick Woltemade"] },
  { number: "SB 9", name: "Eberechi Eze", team: "Arsenal", type: "Star Ballers", persons: ["Eberechi Eze"] },
  { number: "SB 10", name: "Gianluigi Donnarumma", team: "Manchester City", type: "Star Ballers", persons: ["Gianluigi Donnarumma"] },
  { number: "SB 11", name: "Scott McTominay", team: "SSC Napoli", type: "Star Ballers", persons: ["Scott McTominay"] },
  { number: "SB 12", name: "Lautaro Martínez", team: "FC Internazionale Milano", type: "Star Ballers", persons: ["Lautaro Martínez"] },
  { number: "SB 13", name: "Illia Zabarnyi", team: "Paris Saint-Germain", type: "Star Ballers", persons: ["Illia Zabarnyi"] },
  { number: "SB 14", name: "Julián Álvarez", team: "Atlético de Madrid", type: "Star Ballers", persons: ["Julián Álvarez"] },
  { number: "SB 15", name: "Xavi Simons", team: "Tottenham Hotspur", type: "Star Ballers", persons: ["Xavi Simons"] },
  { number: "SB 16", name: "Nicolas Jackson", team: "FC Bayern München", type: "Star Ballers", persons: ["Nicolas Jackson"] },
  { number: "SB EN", name: "Alexander Isak", team: "Liverpool", type: "Star Ballers Energy", persons: ["Alexander Isak"] },

  // Update Eco Pack #3 Queens of Europe
  { number: "QE 1", name: "Alessia Russo", team: "Arsenal", type: "Queens of Europe", persons: ["Alessia Russo"] },
  { number: "QE 2", name: "Cristiana Girelli", team: "Juventus", type: "Queens of Europe", persons: ["Cristiana Girelli"] },
  { number: "QE 3", name: "Klara Bühl", team: "FC Bayern München", type: "Queens of Europe", persons: ["Klara Bühl"] },
  { number: "QE 4", name: "Chloe Kelly", team: "Arsenal", type: "Queens of Europe", persons: ["Chloe Kelly"] },
  { number: "QE 5", name: "Caroline Weir", team: "Real Madrid CF", type: "Queens of Europe", persons: ["Caroline Weir"] },
  { number: "QE 6", name: "Olivia Smith", team: "Arsenal", type: "Queens of Europe", persons: ["Olivia Smith"] },
  { number: "QE 7", name: "Alexia Putellas", team: "FC Barcelona", type: "Queens of Europe", persons: ["Alexia Putellas"] },
  { number: "QE 8", name: "Melchie Dumornay", team: "Olympique Lyonnais Lyonnes", type: "Queens of Europe", persons: ["Melchie Dumornay"] },
  { number: "QE 9", name: "Aitana Bonmatí", team: "FC Barcelona", type: "Queens of Europe", persons: ["Aitana Bonmatí"] },
  { number: "QE 10", name: "Hannah Hampton", team: "Chelsea", type: "Queens of Europe", persons: ["Hannah Hampton"] },
  { number: "QE 11", name: "Ewa Pajor", team: "FC Barcelona", type: "Queens of Europe", persons: ["Ewa Pajor"] },
  { number: "QE 12", name: "Clara Mateo", team: "Paris FC", type: "Queens of Europe", persons: ["Clara Mateo"] },
  { number: "QE 13", name: "Jule Brand", team: "Olympique Lyonnais Lyonnes", type: "Queens of Europe", persons: ["Jule Brand"] },
  { number: "QE 14", name: "Georgia Stanway", team: "FC Bayern München", type: "Queens of Europe", persons: ["Georgia Stanway"] },
  { number: "QE 15", name: "Alyssa Thompson", team: "Chelsea", type: "Queens of Europe", persons: ["Alyssa Thompson"] },
  { number: "QE 16", name: "Ella Toone", team: "Manchester United", type: "Queens of Europe", persons: ["Ella Toone"] },
  { number: "QE EN", name: "Mariona Caldentey", team: "Arsenal", type: "Queens of Europe Energy", persons: ["Mariona Caldentey"] },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Football (Soccer)", universeId);
  const brandId = await builder.getOrCreateBrand("Match Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Match Attax 2025/26", franchiseId, brandId);
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
    const cardId = `${SET_ID}-${String(row.number).toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) { skipped++; continue; }

    const personIds: string[] = [];
    if (row.persons) {
      for (const name of row.persons) personIds.push(await builder.getOrCreatePerson(name));
    }

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: String(row.number),
        setId: set.id,
        supertype: row.type ?? "Base",
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
      },
    });

    created++;
    if ((i + 1) % 50 === 0) console.log(`  [${i + 1}/${ALL_CARDS.length}] created=${created}`);
  }

  console.log(`Done. Created ${created} cards, skipped ${skipped}. Set: ${SET_NAME} (${(Date.now() - t0) / 1000}s)`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });