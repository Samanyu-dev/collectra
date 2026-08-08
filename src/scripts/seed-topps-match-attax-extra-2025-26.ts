import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds "Match Attax Extra 2025/26" — a separate Topps product from the
 * base "Match Attax 2025/26" set (see seed-topps-match-attax-2025-26.ts).
 * Transcribed from a fan-maintained checklist; some rows are the collector's
 * own annotations (amendment dates, print-run notes) which are folded into
 * the card name/type or dropped where they aren't a distinct card.
 */
const SET_ID = "topps-matchattax-extra-2025-26";
const SET_NAME = "Match Attax Extra 2025/26";

interface CardRow {
  number: string;
  name: string;
  team: string;
  type?: string;
  persons?: string[];
}

const ALL_CARDS: CardRow[] = [
  // Squad Update (1-72)
  { number: "1", name: "Rio Ngumoha", team: "Liverpool", type: "Squad Update", persons: ["Rio Ngumoha"] },
  { number: "2", name: "Alexander Isak", team: "Liverpool", type: "Squad Update", persons: ["Alexander Isak"] },
  { number: "3", name: "Cristhian Mosquera", team: "Arsenal", type: "Squad Update", persons: ["Cristhian Mosquera"] },
  { number: "4", name: "Piero Hincapié", team: "Arsenal", type: "Squad Update", persons: ["Piero Hincapié"] },
  { number: "5", name: "Gianluigi Donnarumma", team: "Manchester City", type: "Squad Update", persons: ["Gianluigi Donnarumma"] },
  { number: "6", name: "Rayan Aït-Nouri", team: "Manchester City", type: "Squad Update", persons: ["Rayan Aït-Nouri"] },
  { number: "7", name: "Nico O'Reilly", team: "Manchester City", type: "Squad Update", persons: ["Nico O'Reilly"] },
  { number: "8", name: "Jorrel Hato", team: "Chelsea", type: "Squad Update", persons: ["Jorrel Hato"] },
  { number: "9", name: "Marc Cucurella", team: "Chelsea", type: "Squad Update", persons: ["Marc Cucurella"] },
  { number: "10", name: "Pedro Neto", team: "Chelsea", type: "Squad Update", persons: ["Pedro Neto"] },
  { number: "11", name: "Jamie Gittens", team: "Chelsea", type: "Squad Update", persons: ["Jamie Gittens"] },
  { number: "12", name: "Tino Livramento", team: "Newcastle United", type: "Squad Update", persons: ["Tino Livramento"] },
  { number: "13", name: "Malick Thiaw", team: "Newcastle United", type: "Squad Update", persons: ["Malick Thiaw"] },
  { number: "14", name: "Yoane Wissa", team: "Newcastle United", type: "Squad Update", persons: ["Yoane Wissa"] },
  { number: "15", name: "Djed Spence", team: "Tottenham Hotspur", type: "Squad Update", persons: ["Djed Spence"] },
  { number: "16", name: "Pape Matar Sarr", team: "Tottenham Hotspur", type: "Squad Update", persons: ["Pape Matar Sarr"] },
  { number: "17", name: "Wilson Odobert", team: "Tottenham Hotspur", type: "Squad Update", persons: ["Wilson Odobert"] },
  { number: "18", name: "Richarlison", team: "Tottenham Hotspur", type: "Squad Update", persons: ["Richarlison"] },
  { number: "19", name: "Amadou Onana", team: "Aston Villa", type: "Squad Update", persons: ["Amadou Onana"] },
  { number: "20", name: "Evann Guessand", team: "Aston Villa", type: "Squad Update", persons: ["Evann Guessand"] },
  { number: "21", name: "Douglas Luiz", team: "Nottingham Forest", type: "Squad Update", persons: ["Douglas Luiz"] },
  { number: "22", name: "Igor Jesus", team: "Nottingham Forest", type: "Squad Update", persons: ["Igor Jesus"] },
  { number: "23", name: "Dean Henderson", team: "Crystal Palace", type: "Squad Update", persons: ["Dean Henderson"] },
  { number: "24", name: "Daniel Muñoz", team: "Crystal Palace", type: "Squad Update", persons: ["Daniel Muñoz"] },
  { number: "25", name: "Maxence Lacroix", team: "Crystal Palace", type: "Squad Update", persons: ["Maxence Lacroix"] },
  { number: "26", name: "Jaydee Canvot", team: "Crystal Palace", type: "Squad Update", persons: ["Jaydee Canvot"] },
  { number: "27", name: "Ismaila Sarr", team: "Crystal Palace", type: "Squad Update", persons: ["Ismaila Sarr"] },
  { number: "28", name: "Jean-Philippe Mateta", team: "Crystal Palace", type: "Squad Update", persons: ["Jean-Philippe Mateta"] },
  { number: "29", name: "Joan García", team: "FC Barcelona", type: "Squad Update", persons: ["Joan García"] },
  { number: "30", name: "Franco Mastantuono", team: "Real Madrid CF", type: "Squad Update", persons: ["Franco Mastantuono"] },
  { number: "31", name: "Gonzalo García", team: "Real Madrid CF", type: "Squad Update", persons: ["Gonzalo García"] },
  { number: "32", name: "Robin Le Normand", team: "Atlético de Madrid", type: "Squad Update", persons: ["Robin Le Normand"] },
  { number: "33", name: "Johnny Cardoso", team: "Atlético de Madrid", type: "Squad Update", persons: ["Johnny Cardoso"] },
  { number: "34", name: "Nicolás González", team: "Atlético de Madrid", type: "Squad Update", persons: ["Nicolás González"] },
  { number: "35", name: "Giovani Lo Celso", team: "Real Betis Balompié", type: "Squad Update", persons: ["Giovani Lo Celso"] },
  { number: "36", name: "Tom Bischof", team: "FC Bayern München", type: "Squad Update", persons: ["Tom Bischof"] },
  { number: "37", name: "Nicolas Jackson", team: "FC Bayern München", type: "Squad Update", persons: ["Nicolas Jackson"] },
  { number: "38", name: "Loïc Badé", team: "Bayer 04 Leverkusen", type: "Squad Update", persons: ["Loïc Badé"] },
  { number: "39", name: "Eliesse Ben Saghir", team: "Bayer 04 Leverkusen", type: "Squad Update", persons: ["Eliesse Ben Saghir"] },
  { number: "40", name: "Carney Chukwuemeka", team: "Borussia Dortmund", type: "Squad Update", persons: ["Carney Chukwuemeka"] },
  { number: "41", name: "Felix Nmecha", team: "Borussia Dortmund", type: "Squad Update", persons: ["Felix Nmecha"] },
  { number: "42", name: "Bilal El Khannouss", team: "VfB Stuttgart", type: "Squad Update", persons: ["Bilal El Khannouss"] },
  { number: "43", name: "Chema Andrés", team: "VfB Stuttgart", type: "Squad Update", persons: ["Chema Andrés"] },
  { number: "44", name: "Lucas Chevalier", team: "Paris Saint-Germain", type: "Squad Update", persons: ["Lucas Chevalier"] },
  { number: "45", name: "Paul Pogba", team: "AS Monaco", type: "Squad Update", persons: ["Paul Pogba"] },
  { number: "46", name: "Folarin Balogun", team: "AS Monaco", type: "Squad Update", persons: ["Folarin Balogun"] },
  { number: "47", name: "Rui Silva", team: "Sporting Clube de Portugal", type: "Squad Update", persons: ["Rui Silva"] },
  { number: "48", name: "Luis Suárez", team: "Sporting Clube de Portugal", type: "Squad Update", persons: ["Luis Suárez"] },
  { number: "49", name: "Anatoliy Trubin", team: "SL Benfica", type: "Squad Update", persons: ["Anatoliy Trubin"] },
  { number: "50", name: "William Gomes", team: "FC Porto", type: "Squad Update", persons: ["William Gomes"] },
  { number: "51", name: "Gabri Veiga", team: "FC Porto", type: "Squad Update", persons: ["Gabri Veiga"] },
  { number: "52", name: "Borja Sainz", team: "FC Porto", type: "Squad Update", persons: ["Borja Sainz"] },
  { number: "53", name: "Sam Beukema", team: "SSC Napoli", type: "Squad Update", persons: ["Sam Beukema"] },
  { number: "54", name: "Stanislav Lobotka", team: "SSC Napoli", type: "Squad Update", persons: ["Stanislav Lobotka"] },
  { number: "55", name: "Yann-Aurel Bisseck", team: "FC Internazionale Milano", type: "Squad Update", persons: ["Yann-Aurel Bisseck"] },
  { number: "56", name: "Ange-Yoan Bonny", team: "FC Internazionale Milano", type: "Squad Update", persons: ["Ange-Yoan Bonny"] },
  { number: "57", name: "Giorgio Scalvini", team: "Atalanta BC", type: "Squad Update", persons: ["Giorgio Scalvini"] },
  { number: "58", name: "Charles De Ketelaere", team: "Atalanta BC", type: "Squad Update", persons: ["Charles De Ketelaere"] },
  { number: "59", name: "João Mário", team: "Juventus", type: "Squad Update", persons: ["João Mário"] },
  { number: "60", name: "Edon Zhagrova", team: "Juventus", type: "Squad Update", persons: ["Edon Zhagrova"] },
  { number: "61", name: "Dušan Vlahović", team: "Juventus", type: "Squad Update", persons: ["Dušan Vlahović"] },
  { number: "62", name: "Wesley", team: "AS Roma", type: "Squad Update", persons: ["Wesley"] },
  { number: "63", name: "Evan Ndicka", team: "AS Roma", type: "Squad Update", persons: ["Evan Ndicka"] },
  { number: "64", name: "Evan Ferguson", team: "AS Roma", type: "Squad Update", persons: ["Evan Ferguson"] },
  { number: "65", name: "Ismael Saibari", team: "PSV Eindhoven", type: "Squad Update", persons: ["Ismael Saibari"] },
  { number: "66", name: "Ricardo Pepi", team: "PSV Eindhoven", type: "Squad Update", persons: ["Ricardo Pepi"] },
  { number: "67", name: "Kieran Tierney", team: "Celtic FC", type: "Squad Update", persons: ["Kieran Tierney"] },
  { number: "68", name: "Kelechi Iheanacho", team: "Celtic FC", type: "Squad Update", persons: ["Kelechi Iheanacho"] },
  { number: "69", name: "Djeidi Gassama", team: "Rangers FC", type: "Squad Update", persons: ["Djeidi Gassama"] },
  { number: "70", name: "Mikey Moore", team: "Rangers FC", type: "Squad Update", persons: ["Mikey Moore"] },
  { number: "71", name: "Maurits Kjaergaard", team: "FC Salzburg", type: "Squad Update", persons: ["Maurits Kjaergaard"] },
  { number: "72", name: "Petar Ratkov", team: "FC Salzburg", type: "Squad Update", persons: ["Petar Ratkov"] },

  // Manager (73-99)
  { number: "73", name: "Mikel Arteta", team: "Arsenal", type: "Manager", persons: ["Mikel Arteta"] },
  { number: "74", name: "Pep Guardiola", team: "Manchester City", type: "Manager", persons: ["Pep Guardiola"] },
  { number: "75", name: "Enzo Maresca", team: "Chelsea", type: "Manager", persons: ["Enzo Maresca"] },
  { number: "76", name: "Eddie Howe", team: "Newcastle United", type: "Manager", persons: ["Eddie Howe"] },
  { number: "77", name: "Thomas Frank", team: "Tottenham Hotspur", type: "Manager", persons: ["Thomas Frank"] },
  { number: "78", name: "Unai Emery", team: "Aston Villa", type: "Manager", persons: ["Unai Emery"] },
  { number: "79", name: "Sean Dyche", team: "Nottingham Forest", type: "Manager", persons: ["Sean Dyche"] },
  { number: "80", name: "Oliver Glasner", team: "Crystal Palace", type: "Manager", persons: ["Oliver Glasner"] },
  { number: "81", name: "Hansi Flick", team: "FC Barcelona", type: "Manager", persons: ["Hansi Flick"] },
  { number: "82", name: "Xabi Alonso", team: "Real Madrid CF", type: "Manager", persons: ["Xabi Alonso"] },
  { number: "83", name: "Diego Simeone", team: "Atlético de Madrid", type: "Manager", persons: ["Diego Simeone"] },
  { number: "84", name: "Ernesto Valverde", team: "Athletic Club", type: "Manager", persons: ["Ernesto Valverde"] },
  { number: "85", name: "Manuel Pellegrini", team: "Real Betis Balompié", type: "Manager", persons: ["Manuel Pellegrini"] },
  { number: "86", name: "Vincent Kompany", team: "FC Bayern München", type: "Manager", persons: ["Vincent Kompany"] },
  { number: "87", name: "Kasper Hjulmand", team: "Bayer 04 Leverkusen", type: "Manager", persons: ["Kasper Hjulmand"] },
  { number: "88", name: "Niko Kovac", team: "Borussia Dortmund", type: "Manager", persons: ["Niko Kovac"] },
  { number: "89", name: "Sebastian Hoeneß", team: "VfB Stuttgart", type: "Manager", persons: ["Sebastian Hoeneß"] },
  { number: "90", name: "Luis Enrique", team: "Paris Saint-Germain", type: "Manager", persons: ["Luis Enrique"] },
  { number: "91", name: "Rui Borges", team: "Sporting Clube de Portugal", type: "Manager", persons: ["Rui Borges"] },
  { number: "92", name: "José Mourinho", team: "SL Benfica", type: "Manager", persons: ["José Mourinho"] },
  { number: "93", name: "Francesco Farioli", team: "FC Porto", type: "Manager", persons: ["Francesco Farioli"] },
  { number: "94", name: "Antonio Conte", team: "SSC Napoli", type: "Manager", persons: ["Antonio Conte"] },
  { number: "95", name: "Cristian Chivu", team: "FC Internazionale Milano", type: "Manager", persons: ["Cristian Chivu"] },
  { number: "96", name: "Luciano Spalletti", team: "Juventus", type: "Manager", persons: ["Luciano Spalletti"] },
  { number: "97", name: "Gian Piero Gasperini", team: "AS Roma", type: "Manager", persons: ["Gian Piero Gasperini"] },
  { number: "98", name: "Peter Bosz", team: "PSV Eindhoven", type: "Manager", persons: ["Peter Bosz"] },
  { number: "99", name: "Danny Röhl", team: "Rangers FC", type: "Manager", persons: ["Danny Röhl"] },

  // Away Kit (100-126)
  { number: "100", name: "Jeremie Frimpong", team: "Liverpool", type: "Away Kit", persons: ["Jeremie Frimpong"] },
  { number: "101", name: "Martín Zubimendi", team: "Arsenal", type: "Away Kit", persons: ["Martín Zubimendi"] },
  { number: "102", name: "Bernardo Silva", team: "Manchester City", type: "Away Kit", persons: ["Bernardo Silva"] },
  { number: "103", name: "Moisés Caicedo", team: "Chelsea", type: "Away Kit", persons: ["Moisés Caicedo"] },
  { number: "104", name: "Sandro Tonali", team: "Newcastle United", type: "Away Kit", persons: ["Sandro Tonali"] },
  { number: "105", name: "João Palhinha", team: "Tottenham Hotspur", type: "Away Kit", persons: ["João Palhinha"] },
  { number: "106", name: "Donyell Malen", team: "Aston Villa", type: "Away Kit", persons: ["Donyell Malen"] },
  { number: "107", name: "Chris Wood", team: "Nottingham Forest", type: "Away Kit", persons: ["Chris Wood"] },
  { number: "108", name: "Marc Guéhi", team: "Crystal Palace", type: "Away Kit", persons: ["Marc Guéhi"] },
  { number: "109", name: "Ferran Torres", team: "FC Barcelona", type: "Away Kit", persons: ["Ferran Torres"] },
  { number: "110", name: "Alvaro Carreras", team: "Real Madrid CF", type: "Away Kit", persons: ["Alvaro Carreras"] },
  { number: "111", name: "Marcos Llorente", team: "Atlético de Madrid", type: "Away Kit", persons: ["Marcos Llorente"] },
  { number: "112", name: "Mikel Jauregizar", team: "Athletic Club", type: "Away Kit", persons: ["Mikel Jauregizar"] },
  { number: "113", name: "Isco", team: "Real Betis Balompié", type: "Away Kit", persons: ["Isco"] },
  { number: "114", name: "Aleksandr Pavlović", team: "FC Bayern München", type: "Away Kit", persons: ["Aleksandr Pavlović"] },
  { number: "115", name: "Maximilian Beier", team: "Borussia Dortmund", type: "Away Kit", persons: ["Maximilian Beier"] },
  { number: "116", name: "Can Uzun", team: "Eintracht Frankfurt", type: "Away Kit", persons: ["Can Uzun"] },
  { number: "117", name: "Illia Zabarnyi", team: "Paris Saint-Germain", type: "Away Kit", persons: ["Illia Zabarnyi"] },
  { number: "118", name: "Takumi Minamino", team: "AS Monaco", type: "Away Kit", persons: ["Takumi Minamino"] },
  { number: "119", name: "Lorenzo Lucca", team: "SSC Napoli", type: "Away Kit", persons: ["Lorenzo Lucca"] },
  { number: "120", name: "Petar Sušić", team: "FC Internazionale Milano", type: "Away Kit", persons: ["Petar Sušić"] },
  { number: "121", name: "Francisco Conceição", team: "Juventus", type: "Away Kit", persons: ["Francisco Conceição"] },
  { number: "122", name: "Albert Gudmundsson", team: "ACF Fiorentina", type: "Away Kit", persons: ["Albert Gudmundsson"] },
  { number: "123", name: "Gianluca Mancini", team: "AS Roma", type: "Away Kit", persons: ["Gianluca Mancini"] },
  { number: "124", name: "Pedro Gonçalves", team: "Sporting Clube de Portugal", type: "Away Kit", persons: ["Pedro Gonçalves"] },
  { number: "125", name: "Pablo Rosario", team: "FC Porto", type: "Away Kit", persons: ["Pablo Rosario"] },
  { number: "126", name: "Benjamin Nygren", team: "Celtic FC", type: "Away Kit", persons: ["Benjamin Nygren"] },

  // UEFA Women's Champions League (127-171)
  { number: "127", name: "Leah Williamson", team: "Arsenal", type: "UEFA Women's Champions League", persons: ["Leah Williamson"] },
  { number: "128", name: "Frida Maanum", team: "Arsenal", type: "UEFA Women's Champions League", persons: ["Frida Maanum"] },
  { number: "129", name: "Mariona Caldentey", team: "Arsenal", type: "UEFA Women's Champions League", persons: ["Mariona Caldentey"] },
  { number: "130", name: "Olivia Smith", team: "Arsenal", type: "UEFA Women's Champions League", persons: ["Olivia Smith"] },
  { number: "131", name: "Chloe Kelly", team: "Arsenal", type: "UEFA Women's Champions League", persons: ["Chloe Kelly"] },
  { number: "132", name: "Caitlin Foord", team: "Arsenal", type: "UEFA Women's Champions League", persons: ["Caitlin Foord"] },
  { number: "133", name: "Niamh Charles", team: "Chelsea", type: "UEFA Women's Champions League", persons: ["Niamh Charles"] },
  { number: "134", name: "Ellie Carpenter", team: "Chelsea", type: "UEFA Women's Champions League", persons: ["Ellie Carpenter"] },
  { number: "135", name: "Keira Walsh", team: "Chelsea", type: "UEFA Women's Champions League", persons: ["Keira Walsh"] },
  { number: "136", name: "Aggie Beever-Jones", team: "Chelsea", type: "UEFA Women's Champions League", persons: ["Aggie Beever-Jones"] },
  { number: "137", name: "Sandy Baltimore", team: "Chelsea", type: "UEFA Women's Champions League", persons: ["Sandy Baltimore"] },
  { number: "138", name: "Fridolina Rolfö", team: "Manchester United", type: "UEFA Women's Champions League", persons: ["Fridolina Rolfö"] },
  { number: "139", name: "Maya Le Tissier", team: "Manchester United", type: "UEFA Women's Champions League", persons: ["Maya Le Tissier"] },
  { number: "140", name: "Ella Toone", team: "Manchester United", type: "UEFA Women's Champions League", persons: ["Ella Toone"] },
  { number: "141", name: "Melvine Malard", team: "Manchester United", type: "UEFA Women's Champions League", persons: ["Melvine Malard"] },
  { number: "142", name: "Jess Park", team: "Manchester United", type: "UEFA Women's Champions League", persons: ["Jess Park"] },
  { number: "143", name: "Alexia Putellas", team: "FC Barcelona", type: "UEFA Women's Champions League", persons: ["Alexia Putellas"] },
  { number: "144", name: "Patri Guijarro", team: "FC Barcelona", type: "UEFA Women's Champions League", persons: ["Patri Guijarro"] },
  { number: "145", name: "Claudia Pina", team: "FC Barcelona", type: "UEFA Women's Champions League", persons: ["Claudia Pina"] },
  { number: "146", name: "Vicky López", team: "FC Barcelona", type: "UEFA Women's Champions League", persons: ["Vicky López"] },
  { number: "147", name: "Salma Paralluelo", team: "FC Barcelona", type: "UEFA Women's Champions League", persons: ["Salma Paralluelo"] },
  { number: "148", name: "Caroline Weir", team: "Real Madrid CF", type: "UEFA Women's Champions League", persons: ["Caroline Weir"] },
  { number: "149", name: "Sara Däbritz", team: "Real Madrid CF", type: "UEFA Women's Champions League", persons: ["Sara Däbritz"] },
  { number: "150", name: "Signe Bruun", team: "Real Madrid CF", type: "UEFA Women's Champions League", persons: ["Signe Bruun"] },
  { number: "151", name: "Gio Garbelini", team: "Atlético de Madrid", type: "UEFA Women's Champions League", persons: ["Gio Garbelini"] },
  { number: "152", name: "Giulia Gwinn", team: "FC Bayern München", type: "UEFA Women's Champions League", persons: ["Giulia Gwinn"] },
  { number: "153", name: "Lena Oberdorf", team: "FC Bayern München", type: "UEFA Women's Champions League", persons: ["Lena Oberdorf"] },
  { number: "154", name: "Klara Bühl", team: "FC Bayern München", type: "UEFA Women's Champions League", persons: ["Klara Bühl"] },
  { number: "155", name: "Pernille Harder", team: "FC Bayern München", type: "UEFA Women's Champions League", persons: ["Pernille Harder"] },
  { number: "156", name: "Svenja Huth", team: "VfL Wolfsburg", type: "UEFA Women's Champions League", persons: ["Svenja Huth"] },
  { number: "157", name: "Alexandra Popp", team: "VfL Wolfsburg", type: "UEFA Women's Champions League", persons: ["Alexandra Popp"] },
  { number: "158", name: "Lineth Beerensteyn", team: "VfL Wolfsburg", type: "UEFA Women's Champions League", persons: ["Lineth Beerensteyn"] },
  { number: "159", name: "Wendie Renard", team: "Olympique Lyonnais Lyonnes", type: "UEFA Women's Champions League", persons: ["Wendie Renard"] },
  { number: "160", name: "Ingrid Engen", team: "Olympique Lyonnais Lyonnes", type: "UEFA Women's Champions League", persons: ["Ingrid Engen"] },
  { number: "161", name: "Kadidiatou Diani", team: "Olympique Lyonnais Lyonnes", type: "UEFA Women's Champions League", persons: ["Kadidiatou Diani"] },
  { number: "162", name: "Melchie Dumornay", team: "Olympique Lyonnais Lyonnes", type: "UEFA Women's Champions League", persons: ["Melchie Dumornay"] },
  { number: "163", name: "Marie Katoto", team: "Olympique Lyonnais Lyonnes", type: "UEFA Women's Champions League", persons: ["Marie Katoto"] },
  { number: "164", name: "Mary Earps", team: "Paris Saint-Germain", type: "UEFA Women's Champions League", persons: ["Mary Earps"] },
  { number: "165", name: "Sakina Karchaoui", team: "Paris Saint-Germain", type: "UEFA Women's Champions League", persons: ["Sakina Karchaoui"] },
  { number: "166", name: "Abi Brighton", team: "Juventus", type: "UEFA Women's Champions League", persons: ["Abi Brighton"] },
  { number: "167", name: "Barbara Bonansea", team: "Juventus", type: "UEFA Women's Champions League", persons: ["Barbara Bonansea"] },
  { number: "168", name: "Lucia Di Guglielmo", team: "AS Roma", type: "UEFA Women's Champions League", persons: ["Lucia Di Guglielmo"] },
  { number: "169", name: "Alayah Pilgrim", team: "AS Roma", type: "UEFA Women's Champions League", persons: ["Alayah Pilgrim"] },
  { number: "170", name: "Carole Costa", team: "SL Benfica", type: "UEFA Women's Champions League", persons: ["Carole Costa"] },
  { number: "171", name: "Cristina Martín-Prieto", team: "SL Benfica", type: "UEFA Women's Champions League", persons: ["Cristina Martín-Prieto"] },

  // Wingman (172-198)
  { number: "172", name: "Milos Kerkez", team: "Liverpool", type: "Wingman", persons: ["Milos Kerkez"] },
  { number: "173", name: "Noni Madueke", team: "Arsenal", type: "Wingman", persons: ["Noni Madueke"] },
  { number: "174", name: "Jérémy Doku", team: "Manchester City", type: "Wingman", persons: ["Jérémy Doku"] },
  { number: "175", name: "Alejandro Garnacho", team: "Chelsea", type: "Wingman", persons: ["Alejandro Garnacho"] },
  { number: "176", name: "Anthony Elanga", team: "Newcastle United", type: "Wingman", persons: ["Anthony Elanga"] },
  { number: "177", name: "Mohammed Kudus", team: "Tottenham Hotspur", type: "Wingman", persons: ["Mohammed Kudus"] },
  { number: "178", name: "Callum Hudson-Odoi", team: "Nottingham Forest", type: "Wingman", persons: ["Callum Hudson-Odoi"] },
  { number: "179", name: "Yeremy Pino", team: "Crystal Palace", type: "Wingman", persons: ["Yeremy Pino"] },
  { number: "180", name: "Alejandro Balde", team: "FC Barcelona", type: "Wingman", persons: ["Alejandro Balde"] },
  { number: "181", name: "Trent Alexander-Arnold", team: "Real Madrid CF", type: "Wingman", persons: ["Trent Alexander-Arnold"] },
  { number: "182", name: "Alex Baena", team: "Atlético de Madrid", type: "Wingman", persons: ["Alex Baena"] },
  { number: "183", name: "Nico Williams", team: "Athletic Club", type: "Wingman", persons: ["Nico Williams"] },
  { number: "184", name: "Serge Gnabry", team: "FC Bayern München", type: "Wingman", persons: ["Serge Gnabry"] },
  { number: "185", name: "Lucas Vázquez", team: "Bayer 04 Leverkusen", type: "Wingman", persons: ["Lucas Vázquez"] },
  { number: "186", name: "Ritsu Doan", team: "Eintracht Frankfurt", type: "Wingman", persons: ["Ritsu Doan"] },
  { number: "187", name: "Karim Adeyemi", team: "Borussia Dortmund", type: "Wingman", persons: ["Karim Adeyemi"] },
  { number: "188", name: "Maximilian Mittelstädt", team: "VfB Stuttgart", type: "Wingman", persons: ["Maximilian Mittelstädt"] },
  { number: "189", name: "Geovany Quenda", team: "Sporting Clube de Portugal", type: "Wingman", persons: ["Geovany Quenda"] },
  { number: "190", name: "Pepê", team: "FC Porto", type: "Wingman", persons: ["Pepê"] },
  { number: "191", name: "Bradley Barcola", team: "Paris Saint-Germain", type: "Wingman", persons: ["Bradley Barcola"] },
  { number: "192", name: "Maghnes Akliouche", team: "AS Monaco", type: "Wingman", persons: ["Maghnes Akliouche"] },
  { number: "193", name: "Dennis Man", team: "PSV Eindhoven", type: "Wingman", persons: ["Dennis Man"] },
  { number: "194", name: "Noa Lang", team: "SSC Napoli", type: "Wingman", persons: ["Noa Lang"] },
  { number: "195", name: "Denzel Dumfries", team: "FC Internazionale Milano", type: "Wingman", persons: ["Denzel Dumfries"] },
  { number: "196", name: "Andrea Cambiaso", team: "Juventus", type: "Wingman", persons: ["Andrea Cambiaso"] },
  { number: "197", name: "Nicola Zalewski", team: "Atalanta BC", type: "Wingman", persons: ["Nicola Zalewski"] },
  { number: "198", name: "Federico Bernardeschi", team: "Bologna FC 1909", type: "Wingman", persons: ["Federico Bernardeschi"] },

  // Pitch Perfection (199-225)
  { number: "199", name: "Gianluigi Donnarumma", team: "Manchester City", type: "Pitch Perfection", persons: ["Gianluigi Donnarumma"] },
  { number: "200", name: "David De Gea", team: "ACF Fiorentina", type: "Pitch Perfection", persons: ["David De Gea"] },
  { number: "201", name: "Gregor Kobel", team: "Borussia Dortmund", type: "Pitch Perfection", persons: ["Gregor Kobel"] },
  { number: "202", name: "Micky van de Ven", team: "Tottenham Hotspur", type: "Pitch Perfection", persons: ["Micky van de Ven"] },
  { number: "203", name: "Pau Cubarsí", team: "FC Barcelona", type: "Pitch Perfection", persons: ["Pau Cubarsí"] },
  { number: "204", name: "Dean Huijsen", team: "Real Madrid CF", type: "Pitch Perfection", persons: ["Dean Huijsen"] },
  { number: "205", name: "Jarell Quansah", team: "Bayer 04 Leverkusen", type: "Pitch Perfection", persons: ["Jarell Quansah"] },
  { number: "206", name: "Alessandro Bastoni", team: "FC Internazionale Milano", type: "Pitch Perfection", persons: ["Alessandro Bastoni"] },
  { number: "207", name: "Ryan Flamingo", team: "PSV Eindhoven", type: "Pitch Perfection", persons: ["Ryan Flamingo"] },
  { number: "208", name: "Dominik Szoboszlai", team: "Liverpool", type: "Pitch Perfection", persons: ["Dominik Szoboszlai"] },
  { number: "209", name: "Enzo Fernádez", team: "Chelsea", type: "Pitch Perfection", persons: ["Enzo Fernádez"] },
  { number: "210", name: "Fares Chaibi", team: "Eintracht Frankfurt", type: "Pitch Perfection", persons: ["Fares Chaibi"] },
  { number: "211", name: "Angelo Stiller", team: "VfB Stuttgart", type: "Pitch Perfection", persons: ["Angelo Stiller"] },
  { number: "212", name: "João Neves", team: "Paris Saint-Germain", type: "Pitch Perfection", persons: ["João Neves"] },
  { number: "213", name: "Kevin De Bruyne", team: "SSC Napoli", type: "Pitch Perfection", persons: ["Kevin De Bruyne"] },
  { number: "214", name: "Manu Koné", team: "AS Roma", type: "Pitch Perfection", persons: ["Manu Koné"] },
  { number: "215", name: "Richard Ríos", team: "SL Benfica", type: "Pitch Perfection", persons: ["Richard Ríos"] },
  { number: "216", name: "Rodrigo Mora", team: "FC Porto", type: "Pitch Perfection", persons: ["Rodrigo Mora"] },
  { number: "217", name: "Bukayo Saka", team: "Arsenal", type: "Pitch Perfection", persons: ["Bukayo Saka"] },
  { number: "218", name: "Nick Woltemade", team: "Newcastle United", type: "Pitch Perfection", persons: ["Nick Woltemade"] },
  { number: "219", name: "Dan Ndoye", team: "Nottingham Forest", type: "Pitch Perfection", persons: ["Dan Ndoye"] },
  { number: "220", name: "Giacomo Raspadori", team: "Atlético de Madrid", type: "Pitch Perfection", persons: ["Giacomo Raspadori"] },
  { number: "221", name: "Iñaki Williams", team: "Athletic Club", type: "Pitch Perfection", persons: ["Iñaki Williams"] },
  { number: "222", name: "Jamal Musiala", team: "FC Bayern München", type: "Pitch Perfection", persons: ["Jamal Musiala"] },
  { number: "223", name: "Ansu Fati", team: "AS Monaco", type: "Pitch Perfection", persons: ["Ansu Fati"] },
  { number: "224", name: "Jonathan David", team: "Juventus", type: "Pitch Perfection", persons: ["Jonathan David"] },
  { number: "225", name: "Santiago Castro", team: "Bologna FC 1909", type: "Pitch Perfection", persons: ["Santiago Castro"] },

  // Kings of Europe (226-252)
  { number: "226", name: "Ryan Gravenberch", team: "Liverpool", type: "Kings of Europe", persons: ["Ryan Gravenberch"] },
  { number: "227", name: "Martin Ødegaard", team: "Arsenal", type: "Kings of Europe", persons: ["Martin Ødegaard"] },
  { number: "228", name: "Tijjani Reijnders", team: "Manchester City", type: "Kings of Europe", persons: ["Tijjani Reijnders"] },
  { number: "229", name: "João Pedro", team: "Chelsea", type: "Kings of Europe", persons: ["João Pedro"] },
  { number: "230", name: "Anthony Gordon", team: "Newcastle United", type: "Kings of Europe", persons: ["Anthony Gordon"] },
  { number: "231", name: "Brennan Johnson", team: "Tottenham Hotspur", type: "Kings of Europe", persons: ["Brennan Johnson"] },
  { number: "232", name: "Ollie Watkins", team: "Aston Villa", type: "Kings of Europe", persons: ["Ollie Watkins"] },
  { number: "233", name: "Morgan Gibbs-White", team: "Nottingham Forest", type: "Kings of Europe", persons: ["Morgan Gibbs-White"] },
  { number: "234", name: "Jean-Philippe Mateta", team: "Crystal Palace", type: "Kings of Europe", persons: ["Jean-Philippe Mateta"] },
  { number: "235", name: "Dani Olmo", team: "FC Barcelona", type: "Kings of Europe", persons: ["Dani Olmo"] },
  { number: "236", name: "Federico Valverde", team: "Real Madrid CF", type: "Kings of Europe", persons: ["Federico Valverde"] },
  { number: "237", name: "Antoine Griezmann", team: "Atlético de Madrid", type: "Kings of Europe", persons: ["Antoine Griezmann"] },
  { number: "238", name: "Antony", team: "Real Betis Balompié", type: "Kings of Europe", persons: ["Antony"] },
  { number: "239", name: "Joshua Kimmich", team: "FC Bayern München", type: "Kings of Europe", persons: ["Joshua Kimmich"] },
  { number: "240", name: "Malik Tillman", team: "Bayer 04 Leverkusen", type: "Kings of Europe", persons: ["Malik Tillman"] },
  { number: "241", name: "Jonathan Burkardt", team: "Eintracht Frankfurt", type: "Kings of Europe", persons: ["Jonathan Burkardt"] },
  { number: "242", name: "Ermedin Demirović", team: "VfB Stuttgart", type: "Kings of Europe", persons: ["Ermedin Demirović"] },
  { number: "243", name: "Bradley Barcola", team: "Paris Saint-Germain", type: "Kings of Europe", persons: ["Bradley Barcola"] },
  { number: "244", name: "Scott McTominay", team: "SSC Napoli", type: "Kings of Europe", persons: ["Scott McTominay"] },
  { number: "245", name: "Bremer", team: "Juventus", type: "Kings of Europe", persons: ["Bremer"] },
  { number: "246", name: "Riccardo Orsolini", team: "Bologna FC 1909", type: "Kings of Europe", persons: ["Riccardo Orsolini"] },
  { number: "247", name: "Paulo Dybala", team: "AS Roma", type: "Kings of Europe", persons: ["Paulo Dybala"] },
  { number: "248", name: "Edin Dzeko", team: "ACF Fiorentina", type: "Kings of Europe", persons: ["Edin Dzeko"] },
  { number: "249", name: "Morten Hjulmand", team: "Sporting Clube de Portugal", type: "Kings of Europe", persons: ["Morten Hjulmand"] },
  { number: "250", name: "Antonio Silva", team: "SL Benfica", type: "Kings of Europe", persons: ["Antonio Silva"] },
  { number: "251", name: "Samu Aghehowa", team: "FC Porto", type: "Kings of Europe", persons: ["Samu Aghehowa"] },
  { number: "252", name: "Ivan Perišić", team: "PSV Eindhoven", type: "Kings of Europe", persons: ["Ivan Perišić"] },

  // Hat-Trick Hero (253-261)
  { number: "253", name: "Hugo Ekitike", team: "Liverpool", type: "Hat-Trick Hero", persons: ["Hugo Ekitike"] },
  { number: "254", name: "Viktor Gyökeres", team: "Arsenal", type: "Hat-Trick Hero", persons: ["Viktor Gyökeres"] },
  { number: "255", name: "Morgan Rogers", team: "Aston Villa", type: "Hat-Trick Hero", persons: ["Morgan Rogers"] },
  { number: "256", name: "Robert Lewandowski", team: "FC Barcelona", type: "Hat-Trick Hero", persons: ["Robert Lewandowski"] },
  { number: "257", name: "Rodrygo", team: "Real Madrid CF", type: "Hat-Trick Hero", persons: ["Rodrygo"] },
  { number: "258", name: "Luís Diaz", team: "FC Bayern München", type: "Hat-Trick Hero", persons: ["Luís Diaz"] },
  { number: "259", name: "Serhou Guirassy", team: "Borussia Dortmund", type: "Hat-Trick Hero", persons: ["Serhou Guirassy"] },
  { number: "260", name: "Lautaro Martínez", team: "FC Internazionale Milano", type: "Hat-Trick Hero", persons: ["Lautaro Martínez"] },
  { number: "261", name: "Moise Kean", team: "ACF Fiorentina", type: "Hat-Trick Hero", persons: ["Moise Kean"] },

  // Topps Heritage - Man of the Match (262-270)
  // NOTE: checklist gives "Alexis Mac Allister" (the correct real name) here, while the
  // base Match Attax 2025/26 set already seeded the same player as "Aleix Mac Allister"
  // (a pre-existing typo in that file, out of scope to fix here) — this will create a
  // second Person record for the same real player. Flagged for follow-up cleanup.
  { number: "262", name: "Alexis Mac Allister", team: "Liverpool", type: "Topps Heritage - Man of the Match", persons: ["Alexis Mac Allister"] },
  { number: "263", name: "Liam Delap", team: "Chelsea", type: "Topps Heritage - Man of the Match", persons: ["Liam Delap"] },
  { number: "264", name: "Randal Kolo Muani", team: "Tottenham Hotspur", type: "Topps Heritage - Man of the Match", persons: ["Randal Kolo Muani"] },
  { number: "265", name: "Jules Koundé", team: "FC Barcelona", type: "Topps Heritage - Man of the Match", persons: ["Jules Koundé"] },
  { number: "266", name: "Jonathan Tah", team: "FC Bayern München", type: "Topps Heritage - Man of the Match", persons: ["Jonathan Tah"] },
  { number: "267", name: "Jobe Bellingham", team: "Borussia Dortmund", type: "Topps Heritage - Man of the Match", persons: ["Jobe Bellingham"] },
  { number: "268", name: "Vitinha", team: "Paris Saint-Germain", type: "Topps Heritage - Man of the Match", persons: ["Vitinha"] },
  { number: "269", name: "Rasmus Højlund", team: "SSC Napoli", type: "Topps Heritage - Man of the Match", persons: ["Rasmus Højlund"] },
  { number: "270", name: "Manuel Akanji", team: "FC Internazionale Milano", type: "Topps Heritage - Man of the Match", persons: ["Manuel Akanji"] },

  // Topps Heritage - Woman of the Match (271-279)
  { number: "271", name: "Leah Williamson", team: "Arsenal", type: "Topps Heritage - Woman of the Match", persons: ["Leah Williamson"] },
  { number: "272", name: "Beth Mead", team: "Arsenal", type: "Topps Heritage - Woman of the Match", persons: ["Beth Mead"] },
  { number: "273", name: "Sam Kerr", team: "Chelsea", type: "Topps Heritage - Woman of the Match", persons: ["Sam Kerr"] },
  { number: "274", name: "Elisabeth Terland", team: "Manchester United", type: "Topps Heritage - Woman of the Match", persons: ["Elisabeth Terland"] },
  { number: "275", name: "Ewa Pajor", team: "FC Barcelona", type: "Topps Heritage - Woman of the Match", persons: ["Ewa Pajor"] },
  { number: "276", name: "Linda Caicedo", team: "Real Madrid CF", type: "Topps Heritage - Woman of the Match", persons: ["Linda Caicedo"] },
  { number: "277", name: "Georgia Stanway", team: "FC Bayern München", type: "Topps Heritage - Woman of the Match", persons: ["Georgia Stanway"] },
  { number: "278", name: "Melchie Dumornay", team: "Olympique Lyonnais Lyonnes", type: "Topps Heritage - Woman of the Match", persons: ["Melchie Dumornay"] },
  { number: "279", name: "Cristiana Girelli", team: "Juventus", type: "Topps Heritage - Woman of the Match", persons: ["Cristiana Girelli"] },

  // 100 Club (280-285)
  { number: "280", name: "David Raya", team: "Arsenal", type: "100 Club", persons: ["David Raya"] },
  { number: "281", name: "Nuno Mendes", team: "Paris Saint-Germain", type: "100 Club", persons: ["Nuno Mendes"] },
  { number: "282", name: "Moisés Caicedo", team: "Chelsea", type: "100 Club", persons: ["Moisés Caicedo"] },
  { number: "283", name: "Michael Olise", team: "FC Bayern München", type: "100 Club", persons: ["Michael Olise"] },
  { number: "284", name: "Lautaro Martínez", team: "FC Internazionale Milano", type: "100 Club", persons: ["Lautaro Martínez"] },
  { number: "285", name: "Lamine Yamal", team: "FC Barcelona", type: "100 Club", persons: ["Lamine Yamal"] },

  // 100 Club UEFA Women's Champions League (286-291)
  { number: "286", name: "Hannah Hampton", team: "Chelsea", type: "100 Club UEFA Women's Champions League", persons: ["Hannah Hampton"] },
  { number: "287", name: "Selma Bacha", team: "Olympique Lyonnais Lyonnes", type: "100 Club UEFA Women's Champions League", persons: ["Selma Bacha"] },
  { number: "288", name: "Patri Guijarro", team: "FC Barcelona", type: "100 Club UEFA Women's Champions League", persons: ["Patri Guijarro"] },
  { number: "289", name: "Claudia Pina", team: "FC Barcelona", type: "100 Club UEFA Women's Champions League", persons: ["Claudia Pina"] },
  { number: "290", name: "Alessia Russo", team: "Arsenal", type: "100 Club UEFA Women's Champions League", persons: ["Alessia Russo"] },
  { number: "291", name: "Chloe Kelly", team: "Arsenal", type: "100 Club UEFA Women's Champions League", persons: ["Chloe Kelly"] },

  // 100 Club Legend (292-297)
  { number: "292", name: "Iker Casillas", team: "Real Madrid CF", type: "100 Club Legend", persons: ["Iker Casillas"] },
  { number: "293", name: "John Terry", team: "Chelsea", type: "100 Club Legend", persons: ["John Terry"] },
  { number: "294", name: "Andrea Pirlo", team: "Juventus", type: "100 Club Legend", persons: ["Andrea Pirlo"] },
  { number: "295", name: "Sergio Agüero", team: "Manchester City", type: "100 Club Legend", persons: ["Sergio Agüero"] },
  { number: "296", name: "Gareth Bale", team: "Tottenham Hotspur", type: "100 Club Legend", persons: ["Gareth Bale"] },
  { number: "297", name: "Thierry Henry", team: "Arsenal", type: "100 Club Legend", persons: ["Thierry Henry"] },

  // Clutch Kids (298-310)
  { number: "298", name: "Rio Ngumoha", team: "Liverpool", type: "Clutch Kids", persons: ["Rio Ngumoha"] },
  { number: "299", name: "Estêvão", team: "Chelsea", type: "Clutch Kids", persons: ["Estêvão"] },
  { number: "300", name: "Lucas Bergvall", team: "Tottenham Hotspur", type: "Clutch Kids", persons: ["Lucas Bergvall"] },
  { number: "301", name: "Adam Wharton", team: "Crystal Palace", type: "Clutch Kids", persons: ["Adam Wharton"] },
  { number: "302", name: "Franco Mastantuono", team: "Real Madrid CF", type: "Clutch Kids", persons: ["Franco Mastantuono"] },
  { number: "303", name: "Arda Güler", team: "Real Madrid CF", type: "Clutch Kids", persons: ["Arda Güler"] },
  { number: "304", name: "Tom Bischof", team: "FC Bayern München", type: "Clutch Kids", persons: ["Tom Bischof"] },
  { number: "305", name: "Désiré Doué", team: "Paris Saint-Germain", type: "Clutch Kids", persons: ["Désiré Doué"] },
  { number: "306", name: "Pio Esposito", team: "FC Internazionale Milano", type: "Clutch Kids", persons: ["Pio Esposito"] },
  { number: "307", name: "Kenan Yildiz", team: "Juventus", type: "Clutch Kids", persons: ["Kenan Yildiz"] },
  { number: "308", name: "Paul Wanner", team: "PSV Eindhoven", type: "Clutch Kids", persons: ["Paul Wanner"] },
  { number: "309", name: "Vicky López", team: "FC Barcelona", type: "Clutch Kids", persons: ["Vicky López"] },
  { number: "310", name: "Olivia Smith", team: "Arsenal", type: "Clutch Kids", persons: ["Olivia Smith"] },

  // UEFA Official Matchball (311-314)
  { number: "311", name: "UEFA Champions League", team: "Various", type: "UEFA Official Matchball" },
  { number: "312", name: "UEFA Europa League", team: "Various", type: "UEFA Official Matchball" },
  { number: "313", name: "UEFA Europa Conference League", team: "Various", type: "UEFA Official Matchball" },
  { number: "314", name: "UEFA Women's Champions League", team: "Various", type: "UEFA Official Matchball" },

  // Match Attax Extra Title Card (315)
  { number: "315", name: "Match Attax Extra", team: "Various", type: "Match Attax Extra Title Card" },

  // UEFA 2026 Finals (316-319)
  { number: "316", name: "UEFA Champions League - Budapest 26", team: "Various", type: "UEFA 2026 Finals" },
  { number: "317", name: "UEFA Europa League - Istanbul", team: "Various", type: "UEFA 2026 Finals" },
  { number: "318", name: "UEFA Europa Conference League - Leipzig", team: "Various", type: "UEFA 2026 Finals" },
  { number: "319", name: "UEFA Women's Champions League - Oslo 26", team: "Various", type: "UEFA 2026 Finals" },

  // Build-a-Baller Ultimate Baller (1:100 packets) (BAB 1-9)
  { number: "BAB 1", name: "Declan Rice", team: "Arsenal", type: "Build-a-Baller Ultimate Baller", persons: ["Declan Rice"] },
  { number: "BAB 2", name: "Jude Bellingham", team: "Real Madrid CF", type: "Build-a-Baller Ultimate Baller", persons: ["Jude Bellingham"] },
  { number: "BAB 3", name: "Kevin De Bruyne", team: "SSC Napoli", type: "Build-a-Baller Ultimate Baller", persons: ["Kevin De Bruyne"] },
  { number: "BAB 4", name: "Harry Kane", team: "FC Bayern München", type: "Build-a-Baller Ultimate Baller", persons: ["Harry Kane"] },
  { number: "BAB 5", name: "Ousmane Dembele", team: "Paris Saint-Germain", type: "Build-a-Baller Ultimate Baller", persons: ["Ousmane Dembele"] },
  { number: "BAB 6", name: "Mohamed Salah", team: "Liverpool", type: "Build-a-Baller Ultimate Baller", persons: ["Mohamed Salah"] },
  { number: "BAB 7", name: "Lamine Yamal", team: "FC Barcelona", type: "Build-a-Baller Ultimate Baller", persons: ["Lamine Yamal"] },
  { number: "BAB 8", name: "Kylian Mbappé", team: "Real Madrid CF", type: "Build-a-Baller Ultimate Baller", persons: ["Kylian Mbappé"] },
  { number: "BAB 9", name: "Erling Haaland", team: "Manchester City", type: "Build-a-Baller Ultimate Baller", persons: ["Erling Haaland"] },

  // Black Edge Edition (1:16 packets) (BE 1-9)
  { number: "BE 1", name: "Florian Wirtz", team: "Liverpool", type: "Black Edge Edition", persons: ["Florian Wirtz"] },
  { number: "BE 2", name: "Viktor Gyökeres", team: "Arsenal", type: "Black Edge Edition", persons: ["Viktor Gyökeres"] },
  { number: "BE 3", name: "Didier Drogba", team: "Chelsea", type: "Black Edge Edition", persons: ["Didier Drogba"] },
  { number: "BE 4", name: "Raphinha", team: "FC Barcelona", type: "Black Edge Edition", persons: ["Raphinha"] },
  { number: "BE 5", name: "Ronaldinho", team: "FC Barcelona", type: "Black Edge Edition", persons: ["Ronaldinho"] },
  { number: "BE 6", name: "Raúl", team: "Real Madrid CF", type: "Black Edge Edition", persons: ["Raúl"] },
  { number: "BE 7", name: "Luís Diaz", team: "FC Bayern München", type: "Black Edge Edition", persons: ["Luís Diaz"] },
  { number: "BE 8", name: "Romelu Lukaku", team: "SSC Napoli", type: "Black Edge Edition", persons: ["Romelu Lukaku"] },
  { number: "BE 9", name: "Adriano", team: "FC Internazionale Milano", type: "Black Edge Edition", persons: ["Adriano"] },

  // Chrome X (1:24 packets) (CX 1-10)
  // PARALLEL tiers (Refractor #/499, Pink #/299, Blue #/150, Green #/99, Purple #/75,
  // Gold #/50, Orange #/25, Black #/10, Red #/5, SuperFractor 1/1) are finish/print-run
  // tiers of these same 10 base cards, not standalone cards — intentionally excluded,
  // same as this script's single "Base" Variant/Printing limitation elsewhere.
  { number: "CX 1", name: "Virgil van Dijk", team: "Liverpool", type: "Chrome X", persons: ["Virgil van Dijk"] },
  { number: "CX 2", name: "Rodri", team: "Manchester City", type: "Chrome X", persons: ["Rodri"] },
  { number: "CX 3", name: "Estêvão", team: "Chelsea", type: "Chrome X", persons: ["Estêvão"] },
  { number: "CX 4", name: "Marcus Rashford", team: "FC Barcelona", type: "Chrome X", persons: ["Marcus Rashford"] },
  { number: "CX 5", name: "Kaká", team: "Real Madrid CF", type: "Chrome X", persons: ["Kaká"] },
  { number: "CX 6", name: "Thiago Alcântara", team: "FC Bayern München", type: "Chrome X", persons: ["Thiago Alcântara"] },
  { number: "CX 7", name: "Khvicha Kvaratskhelia", team: "Paris Saint-Germain", type: "Chrome X", persons: ["Khvicha Kvaratskhelia"] },
  { number: "CX 8", name: "Francesco Totti", team: "AS Roma", type: "Chrome X", persons: ["Francesco Totti"] },
  { number: "CX 9", name: "Aitana Bonmatí", team: "FC Barcelona", type: "Chrome X", persons: ["Aitana Bonmatí"] },
  { number: "CX 10", name: "Zlatan Ibrahimović", team: "Paris Saint-Germain", type: "Chrome X", persons: ["Zlatan Ibrahimović"] },

  // Infinity (1:32 packets) (IN 1-10)
  { number: "IN 1", name: "Alexander Isak", team: "Liverpool", type: "Infinity", persons: ["Alexander Isak"] },
  { number: "IN 2", name: "Cole Palmer", team: "Chelsea", type: "Infinity", persons: ["Cole Palmer"] },
  { number: "IN 3", name: "Xavi Simons", team: "Tottenham Hotspur", type: "Infinity", persons: ["Xavi Simons"] },
  { number: "IN 4", name: "Raphinha", team: "FC Barcelona", type: "Infinity", persons: ["Raphinha"] },
  { number: "IN 5", name: "Vini Jr.", team: "Real Madrid CF", type: "Infinity", persons: ["Vini Jr."] },
  { number: "IN 6", name: "Julián Alvarez", team: "Atlético de Madrid", type: "Infinity", persons: ["Julián Alvarez"] },
  { number: "IN 7", name: "Harry Kane", team: "FC Bayern München", type: "Infinity", persons: ["Harry Kane"] },
  { number: "IN 8", name: "Khvicha Kvaratskhelia", team: "Paris Saint-Germain", type: "Infinity", persons: ["Khvicha Kvaratskhelia"] },
  { number: "IN 9", name: "Kevin De Bruyne", team: "SSC Napoli", type: "Infinity", persons: ["Kevin De Bruyne"] },
  { number: "IN 10", name: "Lamine Yamal", team: "FC Barcelona", type: "Infinity", persons: ["Lamine Yamal"] },

  // 3D X-Lens Phase Shifter (1:250 CDU packets)
  { number: "PS-VG", name: "Viktor Gyökeres - Phase Shifter", team: "Arsenal", type: "3D X-Lens Phase Shifter", persons: ["Viktor Gyökeres"] },
  { number: "PB-MO", name: "Michael Olise - Phase Breaker", team: "FC Bayern München", type: "3D X-Lens Phase Shifter", persons: ["Michael Olise"] },

  // X-Calibre (XC 1-5)
  { number: "XC 1", name: "Mohamed Salah", team: "Liverpool", type: "X-Calibre", persons: ["Mohamed Salah"] },
  { number: "XC 2", name: "Antony", team: "Real Betis Balompié", type: "X-Calibre", persons: ["Antony"] },
  { number: "XC 3", name: "Moise Kean", team: "Bologna FC 1909", type: "X-Calibre", persons: ["Moise Kean"] },
  { number: "XC 4", name: "Mariona Caldentey", team: "Arsenal", type: "X-Calibre", persons: ["Mariona Caldentey"] },
  { number: "XC 5", name: "Ronaldo", team: "Real Madrid CF", type: "X-Calibre", persons: ["Ronaldo"] },

  // Limited Edition - Stadium Lights (LE 01-02)
  { number: "LE 01", name: "Alexander Isak", team: "Liverpool", type: "Limited Edition - Stadium Lights", persons: ["Alexander Isak"] },
  { number: "LE 02", name: "Raphinha", team: "FC Barcelona", type: "Limited Edition - Stadium Lights", persons: ["Raphinha"] },

  // Limited Edition - ElectriX (LE 03-18)
  { number: "LE 03", name: "Mohamed Salah", team: "Liverpool", type: "Limited Edition - ElectriX", persons: ["Mohamed Salah"] },
  { number: "LE 04", name: "Bukayo Saka", team: "Arsenal", type: "Limited Edition - ElectriX", persons: ["Bukayo Saka"] },
  { number: "LE 05", name: "Omar Marmoush", team: "Manchester City", type: "Limited Edition - ElectriX", persons: ["Omar Marmoush"] },
  { number: "LE 06", name: "Estêvão", team: "Chelsea", type: "Limited Edition - ElectriX", persons: ["Estêvão"] },
  { number: "LE 07", name: "Anthony Gordon", team: "Newcastle United", type: "Limited Edition - ElectriX", persons: ["Anthony Gordon"] },
  { number: "LE 08", name: "Donyell Malen", team: "Aston Villa", type: "Limited Edition - ElectriX", persons: ["Donyell Malen"] },
  { number: "LE 09", name: "Marcus Rashford", team: "FC Barcelona", type: "Limited Edition - ElectriX", persons: ["Marcus Rashford"] },
  { number: "LE 10", name: "Vini Jr.", team: "Real Madrid CF", type: "Limited Edition - ElectriX", persons: ["Vini Jr."] },
  { number: "LE 11", name: "Julián Alvarez", team: "Atlético de Madrid", type: "Limited Edition - ElectriX", persons: ["Julián Alvarez"] },
  { number: "LE 12", name: "Serhou Guirassy", team: "Borussia Dortmund", type: "Limited Edition - ElectriX", persons: ["Serhou Guirassy"] },
  { number: "LE 13", name: "Jonathan Burkardt", team: "Eintracht Frankfurt", type: "Limited Edition - ElectriX", persons: ["Jonathan Burkardt"] },
  { number: "LE 14", name: "Paul Pogba", team: "AS Monaco", type: "Limited Edition - ElectriX", persons: ["Paul Pogba"] },
  { number: "LE 15", name: "Marcus Thuram", team: "FC Internazionale Milano", type: "Limited Edition - ElectriX", persons: ["Marcus Thuram"] },
  { number: "LE 16", name: "Matías Soulé", team: "AS Roma", type: "Limited Edition - ElectriX", persons: ["Matías Soulé"] },
  { number: "LE 17", name: "Lauren James", team: "Chelsea", type: "Limited Edition - ElectriX", persons: ["Lauren James"] },
  { number: "LE 18", name: "Caroline Graham Hansen", team: "FC Barcelona", type: "Limited Edition - ElectriX", persons: ["Caroline Graham Hansen"] },

  // Limited Edition - Untouchable (Mega Eco Pack exclusive) (LE 19)
  { number: "LE 19", name: "Jude Bellingham", team: "Real Madrid CF", type: "Limited Edition - Untouchable", persons: ["Jude Bellingham"] },

  // Limited Edition - Blitz Ballerz (Mega Tin Exclusive) (BB 1-3)
  { number: "BB 1", name: "Alexander Isak", team: "Liverpool", type: "Limited Edition - Blitz Ballerz", persons: ["Alexander Isak"] },
  { number: "BB 2", name: "Lamine Yamal", team: "FC Barcelona", type: "Limited Edition - Blitz Ballerz", persons: ["Lamine Yamal"] },
  { number: "BB 3", name: "Désiré Doué", team: "Paris Saint-Germain", type: "Limited Edition - Blitz Ballerz", persons: ["Désiré Doué"] },

  // Limited Edition - Goaliaths (Mega Tin Exclusive) (GL 1-3)
  { number: "GL 1", name: "Erling Haaland", team: "Manchester City", type: "Limited Edition - Goaliaths", persons: ["Erling Haaland"] },
  { number: "GL 2", name: "Kylian Mbappé", team: "Real Madrid CF", type: "Limited Edition - Goaliaths", persons: ["Kylian Mbappé"] },
  { number: "GL 3", name: "Harry Kane", team: "FC Bayern München", type: "Limited Edition - Goaliaths", persons: ["Harry Kane"] },

  // Limited Edition - Psykicks (Mega Tin Exclusive) (PS 1-3)
  { number: "PS 1", name: "Eberechi Eze", team: "Arsenal", type: "Limited Edition - Psykicks", persons: ["Eberechi Eze"] },
  { number: "PS 2", name: "Alexia Putellas", team: "FC Barcelona", type: "Limited Edition - Psykicks", persons: ["Alexia Putellas"] },
  { number: "PS 3", name: "Ousmane Dembélé", team: "Paris Saint-Germain", type: "Limited Edition - Psykicks", persons: ["Ousmane Dembélé"] },

  // Platinum Pull Limited Edition (1:28 packets) (PP 1-9)
  { number: "PP 1", name: "Hugo Ekitike", team: "Liverpool", type: "Platinum Pull Limited Edition", persons: ["Hugo Ekitike"] },
  { number: "PP 2", name: "Eberechi Eze", team: "Arsenal", type: "Platinum Pull Limited Edition", persons: ["Eberechi Eze"] },
  { number: "PP 3", name: "Rayan Cherki", team: "Manchester City", type: "Platinum Pull Limited Edition", persons: ["Rayan Cherki"] },
  { number: "PP 4", name: "Pedri", team: "FC Barcelona", type: "Platinum Pull Limited Edition", persons: ["Pedri"] },
  { number: "PP 5", name: "Kylian Mbappé", team: "Real Madrid CF", type: "Platinum Pull Limited Edition", persons: ["Kylian Mbappé"] },
  { number: "PP 6", name: "Luís Diaz", team: "FC Bayern München", type: "Platinum Pull Limited Edition", persons: ["Luís Diaz"] },
  { number: "PP 7", name: "Vitinha", team: "Paris Saint-Germain", type: "Platinum Pull Limited Edition", persons: ["Vitinha"] },
  { number: "PP 8", name: "Paulo Dybala", team: "AS Roma", type: "Platinum Pull Limited Edition", persons: ["Paulo Dybala"] },
  { number: "PP 9", name: "Aitana Bonmatí", team: "FC Barcelona", type: "Platinum Pull Limited Edition", persons: ["Aitana Bonmatí"] },

  // Gold Rush Ultra Limited Edition #/100 (Topps.com Exclusive - except GR 5) (GR 1-5)
  { number: "GR 1", name: "João Pedro", team: "Chelsea", type: "Gold Rush Ultra Limited Edition", persons: ["João Pedro"] },
  { number: "GR 2", name: "Jobe Bellingham", team: "Borussia Dortmund", type: "Gold Rush Ultra Limited Edition", persons: ["Jobe Bellingham"] },
  { number: "GR 3", name: "Kenan Yildiz", team: "Juventus", type: "Gold Rush Ultra Limited Edition", persons: ["Kenan Yildiz"] },
  { number: "GR 4", name: "Bukayo Saka", team: "Arsenal", type: "Gold Rush Ultra Limited Edition", persons: ["Bukayo Saka"] },
  { number: "GR 5", name: "Jude Bellingham", team: "Real Madrid CF", type: "Gold Rush Ultra Limited Edition", persons: ["Jude Bellingham"] },

  // X Greats Limited Edition (The X Tin Exclusive) (LE XG 1-4)
  { number: "LE XG 1", name: "Thierry Henry", team: "Arsenal", type: "X Greats Limited Edition", persons: ["Thierry Henry"] },
  { number: "LE XG 2", name: "Lionel Messi", team: "FC Barcelona", type: "X Greats Limited Edition", persons: ["Lionel Messi"] },
  { number: "LE XG 3", name: "Toni Kroos", team: "Real Madrid CF", type: "X Greats Limited Edition", persons: ["Toni Kroos"] },
  { number: "LE XG 4", name: "Diego Maradona", team: "SSC Napoli", type: "X Greats Limited Edition", persons: ["Diego Maradona"] },

  // Black Fire Limited Edition (Topps.com Exclusive) (BF 1-5)
  { number: "BF 1", name: "Alejandro Garnacho", team: "Chelsea", type: "Black Fire Limited Edition", persons: ["Alejandro Garnacho"] },
  { number: "BF 2", name: "Trent Alexander-Arnold", team: "Real Madrid CF", type: "Black Fire Limited Edition", persons: ["Trent Alexander-Arnold"] },
  { number: "BF 3", name: "Jamal Musiala", team: "FC Bayern München", type: "Black Fire Limited Edition", persons: ["Jamal Musiala"] },
  { number: "BF 4", name: "Rasmus Højlund", team: "SSC Napoli", type: "Black Fire Limited Edition", persons: ["Rasmus Højlund"] },
  { number: "BF 5", name: "Alessia Russo", team: "Arsenal", type: "Black Fire Limited Edition", persons: ["Alessia Russo"] },

  // Royal Elite Limited Edition (1:500 packets) — the "#/23" print-run note IS this card,
  // not a separate parallel of an unnumbered base version.
  { number: "RE 1", name: "Sir David Beckham", team: "Real Madrid CF", type: "Royal Elite Limited Edition", persons: ["Sir David Beckham"] },

  // Facsimile Signature Style Pro View (PRO 1-5)
  { number: "PRO 1", name: "Eden Hazard", team: "Chelsea", type: "Facsimile Signature Style Pro View", persons: ["Eden Hazard"] },
  { number: "PRO 2", name: "Frank Lampard", team: "Chelsea", type: "Facsimile Signature Style Pro View", persons: ["Frank Lampard"] },
  { number: "PRO 3", name: "Lamine Yamal", team: "FC Barcelona", type: "Facsimile Signature Style Pro View", persons: ["Lamine Yamal"] },
  { number: "PRO 4", name: "Gareth Bale", team: "Real Madrid CF", type: "Facsimile Signature Style Pro View", persons: ["Gareth Bale"] },
  { number: "PRO 5", name: "Giorgio Chiellini", team: "Juventus", type: "Facsimile Signature Style Pro View", persons: ["Giorgio Chiellini"] },

  // Pro-View Original 1/1 — the true 1-of-1 physical cards, distinct from the
  // Facsimile Signature Style Pro View cards above (same 5 subjects, different card type)
  { number: "PROV 1", name: "Eden Hazard", team: "Chelsea", type: "Pro-View Original 1/1", persons: ["Eden Hazard"] },
  { number: "PROV 2", name: "Frank Lampard", team: "Chelsea", type: "Pro-View Original 1/1", persons: ["Frank Lampard"] },
  { number: "PROV 3", name: "Lamine Yamal", team: "FC Barcelona", type: "Pro-View Original 1/1", persons: ["Lamine Yamal"] },
  { number: "PROV 4", name: "Gareth Bale", team: "Real Madrid CF", type: "Pro-View Original 1/1", persons: ["Gareth Bale"] },
  { number: "PROV 5", name: "Giorgio Chiellini", team: "Juventus", type: "Pro-View Original 1/1", persons: ["Giorgio Chiellini"] },

  // UCL Decades Relic (UCLD-*)
  { number: "UCLD-AI", name: "Andrés Iniesta", team: "FC Barcelona", type: "UCL Decades Relic", persons: ["Andrés Iniesta"] },
  { number: "UCLD-CA", name: "Carlo Ancelotti", team: "Real Madrid CF", type: "UCL Decades Relic", persons: ["Carlo Ancelotti"] },
  { number: "UCLD-DC", name: "Daniel Carvajal", team: "Real Madrid CF", type: "UCL Decades Relic", persons: ["Daniel Carvajal"] },
  { number: "UCLD-DD", name: "Didier Drogba", team: "Chelsea", type: "UCL Decades Relic", persons: ["Didier Drogba"] },
  { number: "UCLD-FR", name: "Franck Ribéry", team: "FC Bayern München", type: "UCL Decades Relic", persons: ["Franck Ribéry"] },
  { number: "UCLD-LM", name: "Luka Modrić", team: "Real Madrid CF", type: "UCL Decades Relic", persons: ["Luka Modrić"] },
  { number: "UCLD-M", name: "Marcelo", team: "Real Madrid CF", type: "UCL Decades Relic", persons: ["Marcelo"] },
  { number: "UCLD-MS", name: "Mohamed Salah", team: "Liverpool", type: "UCL Decades Relic", persons: ["Mohamed Salah"] },
  { number: "UCLD-NJR", name: "Neymar Jr.", team: "FC Barcelona", type: "UCL Decades Relic", persons: ["Neymar Jr."] },
  { number: "UCLD-TA", name: "Thiago Alcântara", team: "FC Bayern München", type: "UCL Decades Relic", persons: ["Thiago Alcântara"] },

  // Player-Worn Jersey Relic (1:50 Mega Tins) (JR-*)
  { number: "JR-AD", name: "Alphonso Davies", team: "FC Bayern München", type: "Player-Worn Jersey Relic", persons: ["Alphonso Davies"] },
  { number: "JR-AP", name: "Alexia Putellas", team: "FC Barcelona", type: "Player-Worn Jersey Relic", persons: ["Alexia Putellas"] },
  { number: "JR-BS", name: "Bernardo Silva", team: "Manchester City", type: "Player-Worn Jersey Relic", persons: ["Bernardo Silva"] },
  { number: "JR-CW", name: "Chris Wood", team: "Nottingham Forest", type: "Player-Worn Jersey Relic", persons: ["Chris Wood"] },
  { number: "JR-EN", name: "Endrick", team: "Real Madrid CF", type: "Player-Worn Jersey Relic", persons: ["Endrick"] },
  { number: "JR-FC", name: "Francisco Conceição", team: "Juventus", type: "Player-Worn Jersey Relic", persons: ["Francisco Conceição"] },
  { number: "JR-GF", name: "Giovanni Fabbian", team: "Bologna FC 1909", type: "Player-Worn Jersey Relic", persons: ["Giovanni Fabbian"] },
  { number: "JR-GS", name: "Giorgio Scalvini", team: "Atalanta BC", type: "Player-Worn Jersey Relic", persons: ["Giorgio Scalvini"] },
  // Checklist source has a typo here — "R-LJ" instead of "JR-LJ" — normalized for consistency with the rest of this subset.
  { number: "JR-LJ", name: "Lauren James", team: "Chelsea", type: "Player-Worn Jersey Relic", persons: ["Lauren James"] },
  { number: "JR-MAR", name: "Marquinhos", team: "Paris Saint-Germain", type: "Player-Worn Jersey Relic", persons: ["Marquinhos"] },
  { number: "JR-MR", name: "Morgan Rogers", team: "Aston Villa", type: "Player-Worn Jersey Relic", persons: ["Morgan Rogers"] },
  { number: "JR-RAP", name: "Raphinha", team: "FC Barcelona", type: "Player-Worn Jersey Relic", persons: ["Raphinha"] },
  { number: "JR-SB", name: "Stina Blackstenius", team: "Arsenal", type: "Player-Worn Jersey Relic", persons: ["Stina Blackstenius"] },
  { number: "JR-SP", name: "Salma Paralluelo", team: "FC Barcelona", type: "Player-Worn Jersey Relic", persons: ["Salma Paralluelo"] },
  { number: "JR-TA", name: "Tosin Adarabioyo", team: "Chelsea", type: "Player-Worn Jersey Relic", persons: ["Tosin Adarabioyo"] },
  { number: "JR-VVD", name: "Virgil van Dijk", team: "Liverpool", type: "Player-Worn Jersey Relic", persons: ["Virgil van Dijk"] },

  // Genuine Autograph (AC-*)
  { number: "AC-AE", name: "Anthony Elanga", team: "Newcastle United", type: "Genuine Autograph", persons: ["Anthony Elanga"] },
  // NOTE: checklist gives "Aurélien Tchouaméni" (the correct real name) here, while the
  // base Match Attax 2025/26 set already seeded the same player as "Aurélien Tchouaméndi"
  // (a pre-existing typo in that file, out of scope to fix here) — this will create a
  // second Person record for the same real player, same issue as Mac Allister above.
  { number: "AC-AT", name: "Aurélien Tchouaméni", team: "Real Madrid CF", type: "Genuine Autograph", persons: ["Aurélien Tchouaméni"] },
  { number: "AC-BM", name: "Beth Mead", team: "Arsenal", type: "Genuine Autograph", persons: ["Beth Mead"] },
  { number: "AC-CN", name: "Cher Ndour", team: "ACF Fiorentina", type: "Genuine Autograph", persons: ["Cher Ndour"] },
  { number: "AC-EE", name: "Eberechi Eze", team: "Arsenal", type: "Genuine Autograph", persons: ["Eberechi Eze"] },
  { number: "AC-EF", name: "Evan Ferguson", team: "AS Roma", type: "Genuine Autograph", persons: ["Evan Ferguson"] },
  { number: "AC-HE", name: "Hugo Ekitike", team: "Liverpool", type: "Genuine Autograph", persons: ["Hugo Ekitike"] },
  { number: "AC-JB", name: "Julian Brandt", team: "Borussia Dortmund", type: "Genuine Autograph", persons: ["Julian Brandt"] },
  { number: "AC-JP", name: "João Pedro", team: "Chelsea", type: "Genuine Autograph", persons: ["João Pedro"] },
  { number: "AC-KK", name: "Karim Konate", team: "FC Salzburg", type: "Genuine Autograph", persons: ["Karim Konate"] },
  { number: "AC-LB", name: "Lucy Bronze", team: "Chelsea", type: "Genuine Autograph", persons: ["Lucy Bronze"] },
  { number: "AC-LO", name: "Lena Oberdorf", team: "FC Bayern München", type: "Genuine Autograph", persons: ["Lena Oberdorf"] },
  { number: "AC-MK", name: "Mohammed Kudus", team: "Tottenham Hotspur", type: "Genuine Autograph", persons: ["Mohammed Kudus"] },
  { number: "AC-NW", name: "Nick Woltemade", team: "Newcastle United", type: "Genuine Autograph", persons: ["Nick Woltemade"] },
  { number: "AC-SMT", name: "Scott McTominay", team: "SSC Napoli", type: "Genuine Autograph", persons: ["Scott McTominay"] },
  { number: "AC-TK", name: "Teun Koopmeiners", team: "Juventus", type: "Genuine Autograph", persons: ["Teun Koopmeiners"] },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Football (Soccer)", universeId);
  const brandId = await builder.getOrCreateBrand("Match Attax Extra", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Match Attax Extra 2025/26", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  let backfilled = 0;
  const t0 = Date.now();

  for (const [i, row] of ALL_CARDS.entries()) {
    const slug = String(row.number).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const cardId = `${SET_ID}-${slug}`;
    // Insert = subset/insert category (e.g. "Squad Update", "Genuine Autograph") — separate
    // from Printing/Parallel. This is what the collection UI's "Progress by Set" breakdown
    // and card-type filter actually group by (getVariantCardType checks variant.insert.name
    // before falling back to Printing), so every non-base subset needs one linked here.
    const insertId = row.type && row.type !== "Base" ? await builder.getOrCreateInsert(row.type, set.id) : undefined;

    const existing = await prisma.card.findUnique({ where: { id: cardId }, include: { variants: true } });
    if (existing) {
      skipped++;
      const baseVariant = existing.variants.find((v) => v.printingId === basePrintingId) ?? existing.variants[0];
      if (baseVariant && insertId && baseVariant.insertId !== insertId) {
        await prisma.variant.update({ where: { id: baseVariant.id }, data: { insertId } });
        backfilled++;
      }
      continue;
    }

    const personIds: string[] = [];
    if (row.persons) {
      for (const name of row.persons) personIds.push(await builder.getOrCreatePerson(name));
    }
    const teamId = row.team ? await builder.getOrCreateTeam(row.team) : undefined;

    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: String(row.number),
        setId: set.id,
        supertype: "Player",
        subtypes: row.type && row.type !== "Base" ? row.type : undefined,
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
        teams: teamId ? { connect: { id: teamId } } : undefined,
      },
    });

    await prisma.variant.create({ data: { cardId: card.id, printingId: basePrintingId, insertId } });

    created++;
    if ((i + 1) % 50 === 0) console.log(`  [${i + 1}/${ALL_CARDS.length}] created=${created}`);
  }

  const finalCount = await prisma.card.count({ where: { setId: set.id } });
  await prisma.set.update({ where: { id: set.id }, data: { printedTotal: finalCount } });

  console.log(`Done. Created ${created} cards, skipped ${skipped}, backfilled ${backfilled} insert link(s). Set: ${SET_NAME} (${(Date.now() - t0) / 1000}s). printedTotal now ${finalCount}.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
