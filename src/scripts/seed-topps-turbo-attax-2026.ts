import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2026 Topps Turbo Attax F1 trading card set.
 * 353-card checklist featuring F1 teams, drivers, and special subsets.
 */
const SET_ID = "topps-turbo-attax-2026";
const SET_NAME = "Topps Turbo Attax F1 2026";

interface CardRow {
  number: string;
  name: string;
  team: string;
  type?: string;
  persons?: string[];
}

const ALL_CARDS: CardRow[] = [
  // McLaren Mastercard F1 Team (1-9)
  { number: "1", name: "McLaren Mastercard F1 Team FOIL", team: "McLaren Mastercard F1 Team", type: "Team FOIL" },
  { number: "2", name: "Andrea Stella TP", team: "McLaren Mastercard F1 Team", type: "Team Principal", persons: ["Andrea Stella"] },
  { number: "3", name: "Lando Norris / Oscar Piastri DD", team: "McLaren Mastercard F1 Team", type: "Double Driver", persons: ["Lando Norris", "Oscar Piastri"] },
  { number: "4", name: "Lando Norris HE", team: "McLaren Mastercard F1 Team", type: "Hero", persons: ["Lando Norris"] },
  { number: "5", name: "Lando Norris PIN", team: "McLaren Mastercard F1 Team", type: "Pinnacle", persons: ["Lando Norris"] },
  { number: "6", name: "Lando Norris LL", team: "McLaren Mastercard F1 Team", type: "Limited", persons: ["Lando Norris"] },
  { number: "7", name: "Oscar Piastri HE", team: "McLaren Mastercard F1 Team", type: "Hero", persons: ["Oscar Piastri"] },
  { number: "8", name: "Oscar Piastri PIN", team: "McLaren Mastercard F1 Team", type: "Pinnacle", persons: ["Oscar Piastri"] },
  { number: "9", name: "Oscar Piastri LL", team: "McLaren Mastercard F1 Team", type: "Limited", persons: ["Oscar Piastri"] },

  // Mercedes-AMG Petronas F1 Team (10-18)
  { number: "10", name: "Mercedes-AMG Petronas F1 Team FOIL", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Team FOIL" },
  { number: "11", name: "Toto Wolff TP", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Team Principal", persons: ["Toto Wolff"] },
  { number: "12", name: "George Russell / Kimi Antonelli DD", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Double Driver", persons: ["George Russell", "Kimi Antonelli"] },
  { number: "13", name: "George Russell HE", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Hero", persons: ["George Russell"] },
  { number: "14", name: "George Russell PIN", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Pinnacle", persons: ["George Russell"] },
  { number: "15", name: "George Russell LL", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Limited", persons: ["George Russell"] },
  { number: "16", name: "Kimi Antonelli HE", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Hero", persons: ["Kimi Antonelli"] },
  { number: "17", name: "Kimi Antonelli PIN", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Pinnacle", persons: ["Kimi Antonelli"] },
  { number: "18", name: "Kimi Antonelli LL", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Limited", persons: ["Kimi Antonelli"] },

  // Oracle Red Bull Racing (19-27)
  { number: "19", name: "Oracle Red Bull Racing FOIL", team: "Oracle Red Bull Racing", type: "Team FOIL" },
  { number: "20", name: "Laurent Mekies TP", team: "Oracle Red Bull Racing", type: "Team Principal", persons: ["Laurent Mekies"] },
  { number: "21", name: "Max Verstappen / Isack Hadjar DD", team: "Oracle Red Bull Racing", type: "Double Driver", persons: ["Max Verstappen", "Isack Hadjar"] },
  { number: "22", name: "Max Verstappen HE", team: "Oracle Red Bull Racing", type: "Hero", persons: ["Max Verstappen"] },
  { number: "23", name: "Max Verstappen PIN", team: "Oracle Red Bull Racing", type: "Pinnacle", persons: ["Max Verstappen"] },
  { number: "24", name: "Max Verstappen LL", team: "Oracle Red Bull Racing", type: "Limited", persons: ["Max Verstappen"] },
  { number: "25", name: "Isack Hadjar HE", team: "Oracle Red Bull Racing", type: "Hero", persons: ["Isack Hadjar"] },
  { number: "26", name: "Isack Hadjar PIN", team: "Oracle Red Bull Racing", type: "Pinnacle", persons: ["Isack Hadjar"] },
  { number: "27", name: "Isack Hadjar LL", team: "Oracle Red Bull Racing", type: "Limited", persons: ["Isack Hadjar"] },

  // Scuderia Ferrari HP (28-36)
  { number: "28", name: "Scuderia Ferrari HP FOIL", team: "Scuderia Ferrari HP", type: "Team FOIL" },
  { number: "29", name: "Frédéric Vasseur TP", team: "Scuderia Ferrari HP", type: "Team Principal", persons: ["Frédéric Vasseur"] },
  { number: "30", name: "Charles Leclerc / Lewis Hamilton DD", team: "Scuderia Ferrari HP", type: "Double Driver", persons: ["Charles Leclerc", "Lewis Hamilton"] },
  { number: "31", name: "Charles Leclerc HE", team: "Scuderia Ferrari HP", type: "Hero", persons: ["Charles Leclerc"] },
  { number: "32", name: "Charles Leclerc PIN", team: "Scuderia Ferrari HP", type: "Pinnacle", persons: ["Charles Leclerc"] },
  { number: "33", name: "Charles Leclerc LL", team: "Scuderia Ferrari HP", type: "Limited", persons: ["Charles Leclerc"] },
  { number: "34", name: "Lewis Hamilton HE", team: "Scuderia Ferrari HP", type: "Hero", persons: ["Lewis Hamilton"] },
  { number: "35", name: "Lewis Hamilton PIN", team: "Scuderia Ferrari HP", type: "Pinnacle", persons: ["Lewis Hamilton"] },
  { number: "36", name: "Lewis Hamilton LL", team: "Scuderia Ferrari HP", type: "Limited", persons: ["Lewis Hamilton"] },

  // Atlassian Williams Racing (37-45)
  { number: "37", name: "Atlassian Williams F1 Team FOIL", team: "Atlassian Williams Racing", type: "Team FOIL" },
  { number: "38", name: "James Vowles TP", team: "Atlassian Williams Racing", type: "Team Principal", persons: ["James Vowles"] },
  { number: "39", name: "Alex Albon / Carlos Sainz DD", team: "Atlassian Williams Racing", type: "Double Driver", persons: ["Alex Albon", "Carlos Sainz"] },
  { number: "40", name: "Alex Albon HE", team: "Atlassian Williams Racing", type: "Hero", persons: ["Alex Albon"] },
  { number: "41", name: "Alex Albon PIN", team: "Atlassian Williams Racing", type: "Pinnacle", persons: ["Alex Albon"] },
  { number: "42", name: "Alex Albon LL", team: "Atlassian Williams Racing", type: "Limited", persons: ["Alex Albon"] },
  { number: "43", name: "Carlos Sainz HE", team: "Atlassian Williams Racing", type: "Hero", persons: ["Carlos Sainz"] },
  { number: "44", name: "Carlos Sainz PIN", team: "Atlassian Williams Racing", type: "Pinnacle", persons: ["Carlos Sainz"] },
  { number: "45", name: "Carlos Sainz LL", team: "Atlassian Williams Racing", type: "Limited", persons: ["Carlos Sainz"] },

  // Visa Cash App RB Formula One (46-54)
  { number: "46", name: "Visa Cash App Racing Bulls FOIL", team: "Visa Cash App RB Formula One", type: "Team FOIL" },
  { number: "47", name: "Alan Permane TP", team: "Visa Cash App RB Formula One", type: "Team Principal", persons: ["Alan Permane"] },
  { number: "48", name: "Liam Lawson / Arvid Lindblad DD", team: "Visa Cash App RB Formula One", type: "Double Driver", persons: ["Liam Lawson", "Arvid Lindblad"] },
  { number: "49", name: "Liam Lawson HE", team: "Visa Cash App RB Formula One", type: "Hero", persons: ["Liam Lawson"] },
  { number: "50", name: "Liam Lawson PIN", team: "Visa Cash App RB Formula One", type: "Pinnacle", persons: ["Liam Lawson"] },
  { number: "51", name: "Liam Lawson LL", team: "Visa Cash App RB Formula One", type: "Limited", persons: ["Liam Lawson"] },
  { number: "52", name: "Arvid Lindblad HE", team: "Visa Cash App RB Formula One", type: "Hero", persons: ["Arvid Lindblad"] },
  { number: "53", name: "Arvid Lindblad PIN", team: "Visa Cash App RB Formula One", type: "Pinnacle", persons: ["Arvid Lindblad"] },
  { number: "54", name: "Arvid Lindblad LL", team: "Visa Cash App RB Formula One", type: "Limited", persons: ["Arvid Lindblad"] },

  // Aston Martin Aramco F1 Team (55-63)
  { number: "55", name: "Aston Martin Aramco F1 Team FOIL", team: "Aston Martin Aramco Formula One Team", type: "Team FOIL" },
  { number: "56", name: "Adrian Newey TP", team: "Aston Martin Aramco Formula One Team", type: "Team Principal", persons: ["Adrian Newey"] },
  { number: "57", name: "Fernando Alonso / Lance Stroll DD", team: "Aston Martin Aramco Formula One Team", type: "Double Driver", persons: ["Fernando Alonso", "Lance Stroll"] },
  { number: "58", name: "Fernando Alonso HE", team: "Aston Martin Aramco Formula One Team", type: "Hero", persons: ["Fernando Alonso"] },
  { number: "59", name: "Fernando Alonso PIN", team: "Aston Martin Aramco Formula One Team", type: "Pinnacle", persons: ["Fernando Alonso"] },
  { number: "60", name: "Fernando Alonso LL", team: "Aston Martin Aramco Formula One Team", type: "Limited", persons: ["Fernando Alonso"] },
  { number: "61", name: "Lance Stroll HE", team: "Aston Martin Aramco Formula One Team", type: "Hero", persons: ["Lance Stroll"] },
  { number: "62", name: "Lance Stroll PIN", team: "Aston Martin Aramco Formula One Team", type: "Pinnacle", persons: ["Lance Stroll"] },
  { number: "63", name: "Lance Stroll LL", team: "Aston Martin Aramco Formula One Team", type: "Limited", persons: ["Lance Stroll"] },

  // TGR Haas F1 Team (64-72)
  { number: "64", name: "TGR Haas F1 Team FOIL", team: "TGR Haas F1 Team", type: "Team FOIL" },
  { number: "65", name: "Ayao Komatsu TP", team: "TGR Haas F1 Team", type: "Team Principal", persons: ["Ayao Komatsu"] },
  { number: "66", name: "Oliver Bearman / Esteban Ocon DD", team: "TGR Haas F1 Team", type: "Double Driver", persons: ["Oliver Bearman", "Esteban Ocon"] },
  { number: "67", name: "Oliver Bearman HE", team: "TGR Haas F1 Team", type: "Hero", persons: ["Oliver Bearman"] },
  { number: "68", name: "Oliver Bearman PIN", team: "TGR Haas F1 Team", type: "Pinnacle", persons: ["Oliver Bearman"] },
  { number: "69", name: "Oliver Bearman LL", team: "TGR Haas F1 Team", type: "Limited", persons: ["Oliver Bearman"] },
  { number: "70", name: "Esteban Ocon HE", team: "TGR Haas F1 Team", type: "Hero", persons: ["Esteban Ocon"] },
  { number: "71", name: "Esteban Ocon PIN", team: "TGR Haas F1 Team", type: "Pinnacle", persons: ["Esteban Ocon"] },
  { number: "72", name: "Esteban Ocon LL", team: "TGR Haas F1 Team", type: "Limited", persons: ["Esteban Ocon"] },

  // Audi Revolut F1 Team (73-81)
  { number: "73", name: "Audi Revolut F1 Team FOIL", team: "Audi Revolut F1 Team", type: "Team FOIL" },
  { number: "74", name: "Mattia Binotto TP", team: "Audi Revolut F1 Team", type: "Team Principal", persons: ["Mattia Binotto"] },
  { number: "75", name: "Nico Hulkenberg / Gabriel Bortoleto DD", team: "Audi Revolut F1 Team", type: "Double Driver", persons: ["Nico Hulkenberg", "Gabriel Bortoleto"] },
  { number: "76", name: "Nico Hulkenberg HE", team: "Audi Revolut F1 Team", type: "Hero", persons: ["Nico Hulkenberg"] },
  { number: "77", name: "Nico Hulkenberg PIN", team: "Audi Revolut F1 Team", type: "Pinnacle", persons: ["Nico Hulkenberg"] },
  { number: "78", name: "Nico Hulkenberg LL", team: "Audi Revolut F1 Team", type: "Limited", persons: ["Nico Hulkenberg"] },
  { number: "79", name: "Gabriel Bortoleto HE", team: "Audi Revolut F1 Team", type: "Hero", persons: ["Gabriel Bortoleto"] },
  { number: "80", name: "Gabriel Bortoleto PIN", team: "Audi Revolut F1 Team", type: "Pinnacle", persons: ["Gabriel Bortoleto"] },
  { number: "81", name: "Gabriel Bortoleto LL", team: "Audi Revolut F1 Team", type: "Limited", persons: ["Gabriel Bortoleto"] },

  // BWT Alpine F1 Team (82-90)
  { number: "82", name: "BWT Alpine F1 Team FOIL", team: "BWT Alpine F1 Team", type: "Team FOIL" },
  { number: "83", name: "Steve Nielsen TP", team: "BWT Alpine F1 Team", type: "Team Principal", persons: ["Steve Nielsen"] },
  { number: "84", name: "Pierre Gasly / Franco Colapinto DD", team: "BWT Alpine F1 Team", type: "Double Driver", persons: ["Pierre Gasly", "Franco Colapinto"] },
  { number: "85", name: "Pierre Gasly HE", team: "BWT Alpine F1 Team", type: "Hero", persons: ["Pierre Gasly"] },
  { number: "86", name: "Pierre Gasly PIN", team: "BWT Alpine F1 Team", type: "Pinnacle", persons: ["Pierre Gasly"] },
  { number: "87", name: "Pierre Gasly LL", team: "BWT Alpine F1 Team", type: "Limited", persons: ["Pierre Gasly"] },
  { number: "88", name: "Franco Colapinto HE", team: "BWT Alpine F1 Team", type: "Hero", persons: ["Franco Colapinto"] },
  { number: "89", name: "Franco Colapinto PIN", team: "BWT Alpine F1 Team", type: "Pinnacle", persons: ["Franco Colapinto"] },
  { number: "90", name: "Franco Colapinto LL", team: "BWT Alpine F1 Team", type: "Limited", persons: ["Franco Colapinto"] },

  // Cadillac F1 Team (91-99)
  { number: "91", name: "Cadillac F1 Team FOIL", team: "Cadillac Formula 1 Team", type: "Team FOIL" },
  { number: "92", name: "Graeme Lowdon TP", team: "Cadillac Formula 1 Team", type: "Team Principal", persons: ["Graeme Lowdon"] },
  { number: "93", name: "Sergio Perez / Valtteri Bottas DD", team: "Cadillac Formula 1 Team", type: "Double Driver", persons: ["Sergio Perez", "Valtteri Bottas"] },
  { number: "94", name: "Sergio Perez HE", team: "Cadillac Formula 1 Team", type: "Hero", persons: ["Sergio Perez"] },
  { number: "95", name: "Sergio Perez PIN", team: "Cadillac Formula 1 Team", type: "Pinnacle", persons: ["Sergio Perez"] },
  { number: "96", name: "Sergio Perez LL", team: "Cadillac Formula 1 Team", type: "Limited", persons: ["Sergio Perez"] },
  { number: "97", name: "Valtteri Bottas HE", team: "Cadillac Formula 1 Team", type: "Hero", persons: ["Valtteri Bottas"] },
  { number: "98", name: "Valtteri Bottas PIN", team: "Cadillac Formula 1 Team", type: "Pinnacle", persons: ["Valtteri Bottas"] },
  { number: "99", name: "Valtteri Bottas LL", team: "Cadillac Formula 1 Team", type: "Limited", persons: ["Valtteri Bottas"] },

  // Emerald (EM) subset (100-117)
  { number: "100", name: "Lewis Hamilton EM", team: "Scuderia Ferrari HP", type: "Emerald", persons: ["Lewis Hamilton"] },
  { number: "101", name: "Kimi Antonelli EM", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Emerald", persons: ["Kimi Antonelli"] },
  { number: "102", name: "Max Verstappen EM", team: "Oracle Red Bull Racing", type: "Emerald", persons: ["Max Verstappen"] },
  { number: "103", name: "George Russell EM", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Emerald", persons: ["George Russell"] },
  { number: "104", name: "Kimi Antonelli EM", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Emerald", persons: ["Kimi Antonelli"] },
  { number: "105", name: "Lando Norris EM", team: "McLaren Mastercard F1 Team", type: "Emerald", persons: ["Lando Norris"] },
  { number: "106", name: "Nico Hulkenberg EM", team: "Audi Revolut F1 Team", type: "Emerald", persons: ["Nico Hulkenberg"] },
  { number: "107", name: "Oscar Piastri EM", team: "McLaren Mastercard F1 Team", type: "Emerald", persons: ["Oscar Piastri"] },
  { number: "108", name: "Charles Leclerc EM", team: "Scuderia Ferrari HP", type: "Emerald", persons: ["Charles Leclerc"] },
  { number: "109", name: "Lando Norris EM", team: "McLaren Mastercard F1 Team", type: "Emerald", persons: ["Lando Norris"] },
  { number: "110", name: "Isack Hadjar EM", team: "Oracle Red Bull Racing", type: "Emerald", persons: ["Isack Hadjar"] },
  { number: "111", name: "Max Verstappen EM", team: "Oracle Red Bull Racing", type: "Emerald", persons: ["Max Verstappen"] },
  { number: "112", name: "Carlos Sainz EM", team: "Atlassian Williams Racing", type: "Emerald", persons: ["Carlos Sainz"] },
  { number: "113", name: "Liam Lawson EM", team: "Visa Cash App RB Formula One", type: "Emerald", persons: ["Liam Lawson"] },
  { number: "114", name: "Oliver Bearman EM", team: "TGR Haas F1 Team", type: "Emerald", persons: ["Oliver Bearman"] },
  { number: "115", name: "Kimi Antonelli EM", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Emerald", persons: ["Kimi Antonelli"] },
  { number: "116", name: "Carlos Sainz EM", team: "Atlassian Williams Racing", type: "Emerald", persons: ["Carlos Sainz"] },
  { number: "117", name: "Lando Norris EM", team: "McLaren Mastercard F1 Team", type: "Emerald", persons: ["Lando Norris"] },

  // Superstar Insert (SSI) subset (118-135)
  { number: "118", name: "Oscar Piastri SSI", team: "McLaren Mastercard F1 Team", type: "Superstar Insert", persons: ["Oscar Piastri"] },
  { number: "119", name: "George Russell SSI", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Superstar Insert", persons: ["George Russell"] },
  { number: "120", name: "Kimi Antonelli SSI", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Superstar Insert", persons: ["Kimi Antonelli"] },
  { number: "121", name: "Charles Leclerc SSI", team: "Scuderia Ferrari HP", type: "Superstar Insert", persons: ["Charles Leclerc"] },
  { number: "122", name: "Alex Albon SSI", team: "Atlassian Williams Racing", type: "Superstar Insert", persons: ["Alex Albon"] },
  { number: "123", name: "Carlos Sainz SSI", team: "Atlassian Williams Racing", type: "Superstar Insert", persons: ["Carlos Sainz"] },
  { number: "124", name: "Liam Lawson SSI", team: "Visa Cash App RB Formula One", type: "Superstar Insert", persons: ["Liam Lawson"] },
  { number: "125", name: "Arvid Lindblad SSI", team: "Visa Cash App RB Formula One", type: "Superstar Insert", persons: ["Arvid Lindblad"] },
  { number: "126", name: "Fernando Alonso SSI", team: "Aston Martin Aramco Formula One Team", type: "Superstar Insert", persons: ["Fernando Alonso"] },
  { number: "127", name: "Lance Stroll SSI", team: "Aston Martin Aramco Formula One Team", type: "Superstar Insert", persons: ["Lance Stroll"] },
  { number: "128", name: "Oliver Bearman SSI", team: "TGR Haas F1 Team", type: "Superstar Insert", persons: ["Oliver Bearman"] },
  { number: "129", name: "Esteban Ocon SSI", team: "TGR Haas F1 Team", type: "Superstar Insert", persons: ["Esteban Ocon"] },
  { number: "130", name: "Nico Hulkenberg SSI", team: "Audi Revolut F1 Team", type: "Superstar Insert", persons: ["Nico Hulkenberg"] },
  { number: "131", name: "Gabriel Bortoleto SSI", team: "Audi Revolut F1 Team", type: "Superstar Insert", persons: ["Gabriel Bortoleto"] },
  { number: "132", name: "Pierre Gasly SSI", team: "BWT Alpine F1 Team", type: "Superstar Insert", persons: ["Pierre Gasly"] },
  { number: "133", name: "Franco Colapinto SSI", team: "BWT Alpine F1 Team", type: "Superstar Insert", persons: ["Franco Colapinto"] },
  { number: "134", name: "Sergio Perez SSI", team: "Cadillac Formula 1 Team", type: "Superstar Insert", persons: ["Sergio Perez"] },
  { number: "135", name: "Valtteri Bottas SSI", team: "Cadillac Formula 1 Team", type: "Superstar Insert", persons: ["Valtteri Bottas"] },

  // Legend (LG) subset (136-150)
  { number: "136", name: "Stirling Moss LG", team: "Various", type: "Legend" },
  { number: "137", name: "Jack Brabham LG", team: "Various", type: "Legend" },
  { number: "138", name: "Graham Hill LG", team: "Various", type: "Legend" },
  { number: "139", name: "Jackie Stewart LG", team: "Various", type: "Legend" },
  { number: "140", name: "Emerson Fittipaldi LG", team: "Various", type: "Legend" },
  { number: "141", name: "Jody Scheckter LG", team: "Various", type: "Legend" },
  { number: "142", name: "Riccardo Patrese LG", team: "Various", type: "Legend" },
  { number: "143", name: "Nigel Mansell LG", team: "Various", type: "Legend" },
  { number: "144", name: "Alain Prost LG", team: "Various", type: "Legend" },
  { number: "145", name: "Mika Häkkinen LG", team: "Various", type: "Legend" },
  { number: "146", name: "Michael Schumacher LG", team: "Various", type: "Legend" },
  { number: "147", name: "Damon Hill LG", team: "Various", type: "Legend" },
  { number: "148", name: "Rubens Barrichello LG", team: "Various", type: "Legend" },
  { number: "149", name: "Kimi Räikkönen LG", team: "Various", type: "Legend" },
  { number: "150", name: "Mark Webber LG", team: "Various", type: "Legend" },

  // Superstar Superstar (SSS) subset (151-156)
  { number: "151", name: "Max Verstappen SSS", team: "Oracle Red Bull Racing", type: "Superstar Superstar", persons: ["Max Verstappen"] },
  { number: "152", name: "George Russell SSS", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Superstar Superstar", persons: ["George Russell"] },
  { number: "153", name: "Lando Norris SSS", team: "McLaren Mastercard F1 Team", type: "Superstar Superstar", persons: ["Lando Norris"] },
  { number: "154", name: "Oscar Piastri SSS", team: "McLaren Mastercard F1 Team", type: "Superstar Superstar", persons: ["Oscar Piastri"] },
  { number: "155", name: "Lewis Hamilton SSS", team: "Scuderia Ferrari HP", type: "Superstar Superstar", persons: ["Lewis Hamilton"] },
  { number: "156", name: "Kimi Antonelli SSS", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Superstar Superstar", persons: ["Kimi Antonelli"] },

  // Driver Championship (DC) subset (157-178)
  { number: "157", name: "Fernando Alonso DC", team: "Aston Martin Aramco Formula One Team", type: "Driver Championship", persons: ["Fernando Alonso"] },
  { number: "158", name: "Lewis Hamilton DC", team: "Scuderia Ferrari HP", type: "Driver Championship", persons: ["Lewis Hamilton"] },
  { number: "159", name: "Sergio Perez DC", team: "Cadillac Formula 1 Team", type: "Driver Championship", persons: ["Sergio Perez"] },
  { number: "160", name: "Nico Hulkenberg DC", team: "Audi Revolut F1 Team", type: "Driver Championship", persons: ["Nico Hulkenberg"] },
  { number: "161", name: "Valtteri Bottas DC", team: "Cadillac Formula 1 Team", type: "Driver Championship", persons: ["Valtteri Bottas"] },
  { number: "162", name: "Max Verstappen DC", team: "Oracle Red Bull Racing", type: "Driver Championship", persons: ["Max Verstappen"] },
  { number: "163", name: "Carlos Sainz DC", team: "Atlassian Williams Racing", type: "Driver Championship", persons: ["Carlos Sainz"] },
  { number: "164", name: "Lance Stroll DC", team: "Aston Martin Aramco Formula One Team", type: "Driver Championship", persons: ["Lance Stroll"] },
  { number: "165", name: "Esteban Ocon DC", team: "TGR Haas F1 Team", type: "Driver Championship", persons: ["Esteban Ocon"] },
  { number: "166", name: "Pierre Gasly DC", team: "BWT Alpine F1 Team", type: "Driver Championship", persons: ["Pierre Gasly"] },
  { number: "167", name: "Charles Leclerc DC", team: "Scuderia Ferrari HP", type: "Driver Championship", persons: ["Charles Leclerc"] },
  { number: "168", name: "Lando Norris DC", team: "McLaren Mastercard F1 Team", type: "Driver Championship", persons: ["Lando Norris"] },
  { number: "169", name: "George Russell DC", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Driver Championship", persons: ["George Russell"] },
  { number: "170", name: "Alex Albon DC", team: "Atlassian Williams Racing", type: "Driver Championship", persons: ["Alex Albon"] },
  { number: "171", name: "Oscar Piastri DC", team: "McLaren Mastercard F1 Team", type: "Driver Championship", persons: ["Oscar Piastri"] },
  { number: "172", name: "Liam Lawson DC", team: "Visa Cash App RB Formula One", type: "Driver Championship", persons: ["Liam Lawson"] },
  { number: "173", name: "Oliver Bearman DC", team: "TGR Haas F1 Team", type: "Driver Championship", persons: ["Oliver Bearman"] },
  { number: "174", name: "Franco Colapinto DC", team: "BWT Alpine F1 Team", type: "Driver Championship", persons: ["Franco Colapinto"] },
  { number: "175", name: "Kimi Antonelli DC", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Driver Championship", persons: ["Kimi Antonelli"] },
  { number: "176", name: "Gabriel Bortoleto DC", team: "Audi Revolut F1 Team", type: "Driver Championship", persons: ["Gabriel Bortoleto"] },
  { number: "177", name: "Isack Hadjar DC", team: "Oracle Red Bull Racing", type: "Driver Championship", persons: ["Isack Hadjar"] },
  { number: "178", name: "Rubens Barrichello DC", team: "Various", type: "Driver Championship", persons: ["Rubens Barrichello"] },

  // Next Star (NS) subset (179-183)
  { number: "179", name: "Oscar Piastri NS", team: "McLaren Mastercard F1 Team", type: "Next Star", persons: ["Oscar Piastri"] },
  { number: "180", name: "Isack Hadjar NS", team: "Oracle Red Bull Racing", type: "Next Star", persons: ["Isack Hadjar"] },
  { number: "181", name: "Oliver Bearman NS", team: "TGR Haas F1 Team", type: "Next Star", persons: ["Oliver Bearman"] },
  { number: "182", name: "Gabriel Bortoleto NS", team: "Audi Revolut F1 Team", type: "Next Star", persons: ["Gabriel Bortoleto"] },
  { number: "183", name: "Franco Colapinto NS", team: "BWT Alpine F1 Team", type: "Next Star", persons: ["Franco Colapinto"] },

  // Card (CAR) subset (184-205)
  { number: "184", name: "Lando Norris CAR", team: "McLaren Mastercard F1 Team", type: "Card", persons: ["Lando Norris"] },
  { number: "185", name: "Max Verstappen CAR", team: "Oracle Red Bull Racing", type: "Card", persons: ["Max Verstappen"] },
  { number: "186", name: "Oscar Piastri CAR", team: "McLaren Mastercard F1 Team", type: "Card", persons: ["Oscar Piastri"] },
  { number: "187", name: "George Russell CAR", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Card", persons: ["George Russell"] },
  { number: "188", name: "Charles Leclerc CAR", team: "Scuderia Ferrari HP", type: "Card", persons: ["Charles Leclerc"] },
  { number: "189", name: "Lewis Hamilton CAR", team: "Scuderia Ferrari HP", type: "Card", persons: ["Lewis Hamilton"] },
  { number: "190", name: "Kimi Antonelli CAR", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Card", persons: ["Kimi Antonelli"] },
  { number: "191", name: "Alex Albon CAR", team: "Atlassian Williams Racing", type: "Card", persons: ["Alex Albon"] },
  { number: "192", name: "Carlos Sainz CAR", team: "Atlassian Williams Racing", type: "Card", persons: ["Carlos Sainz"] },
  { number: "193", name: "Fernando Alonso CAR", team: "Aston Martin Aramco Formula One Team", type: "Card", persons: ["Fernando Alonso"] },
  { number: "194", name: "Nico Hulkenberg CAR", team: "Audi Revolut F1 Team", type: "Card", persons: ["Nico Hulkenberg"] },
  { number: "195", name: "Isack Hadjar CAR", team: "Oracle Red Bull Racing", type: "Card", persons: ["Isack Hadjar"] },
  { number: "196", name: "Oliver Bearman CAR", team: "TGR Haas F1 Team", type: "Card", persons: ["Oliver Bearman"] },
  { number: "197", name: "Liam Lawson CAR", team: "Visa Cash App RB Formula One", type: "Card", persons: ["Liam Lawson"] },
  { number: "198", name: "Esteban Ocon CAR", team: "TGR Haas F1 Team", type: "Card", persons: ["Esteban Ocon"] },
  { number: "199", name: "Lance Stroll CAR", team: "Aston Martin Aramco Formula One Team", type: "Card", persons: ["Lance Stroll"] },
  { number: "200", name: "Pierre Gasly CAR", team: "BWT Alpine F1 Team", type: "Card", persons: ["Pierre Gasly"] },
  { number: "201", name: "Gabriel Bortoleto CAR", team: "Audi Revolut F1 Team", type: "Card", persons: ["Gabriel Bortoleto"] },
  { number: "202", name: "Franco Colapinto CAR", team: "BWT Alpine F1 Team", type: "Card", persons: ["Franco Colapinto"] },
  { number: "203", name: "Sergio Perez CAR", team: "Cadillac Formula 1 Team", type: "Card", persons: ["Sergio Perez"] },
  { number: "204", name: "Valtteri Bottas CAR", team: "Cadillac Formula 1 Team", type: "Card", persons: ["Valtteri Bottas"] },
  { number: "205", name: "Arvid Lindblad CAR", team: "Visa Cash App RB Formula One", type: "Card", persons: ["Arvid Lindblad"] },

  // Legend Master (LM) subset (206-227)
  { number: "206", name: "Lando Norris LM", team: "McLaren Mastercard F1 Team", type: "Legend Master", persons: ["Lando Norris"] },
  { number: "207", name: "Oscar Piastri LM", team: "McLaren Mastercard F1 Team", type: "Legend Master", persons: ["Oscar Piastri"] },
  { number: "208", name: "George Russell LM", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Legend Master", persons: ["George Russell"] },
  { number: "209", name: "Kimi Antonelli LM", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Legend Master", persons: ["Kimi Antonelli"] },
  { number: "210", name: "Max Verstappen LM", team: "Oracle Red Bull Racing", type: "Legend Master", persons: ["Max Verstappen"] },
  { number: "211", name: "Isack Hadjar LM", team: "Oracle Red Bull Racing", type: "Legend Master", persons: ["Isack Hadjar"] },
  { number: "212", name: "Charles Leclerc LM", team: "Scuderia Ferrari HP", type: "Legend Master", persons: ["Charles Leclerc"] },
  { number: "213", name: "Lewis Hamilton LM", team: "Scuderia Ferrari HP", type: "Legend Master", persons: ["Lewis Hamilton"] },
  { number: "214", name: "Alex Albon LM", team: "Atlassian Williams Racing", type: "Legend Master", persons: ["Alex Albon"] },
  { number: "215", name: "Carlos Sainz LM", team: "Atlassian Williams Racing", type: "Legend Master", persons: ["Carlos Sainz"] },
  { number: "216", name: "Liam Lawson LM", team: "Visa Cash App RB Formula One", type: "Legend Master", persons: ["Liam Lawson"] },
  { number: "217", name: "Arvid Lindblad LM", team: "Visa Cash App RB Formula One", type: "Legend Master", persons: ["Arvid Lindblad"] },
  { number: "218", name: "Fernando Alonso LM", team: "Aston Martin Aramco Formula One Team", type: "Legend Master", persons: ["Fernando Alonso"] },
  { number: "219", name: "Lance Stroll LM", team: "Aston Martin Aramco Formula One Team", type: "Legend Master", persons: ["Lance Stroll"] },
  { number: "220", name: "Oliver Bearman LM", team: "TGR Haas F1 Team", type: "Legend Master", persons: ["Oliver Bearman"] },
  { number: "221", name: "Esteban Ocon LM", team: "TGR Haas F1 Team", type: "Legend Master", persons: ["Esteban Ocon"] },
  { number: "222", name: "Nico Hulkenberg LM", team: "Audi Revolut F1 Team", type: "Legend Master", persons: ["Nico Hulkenberg"] },
  { number: "223", name: "Gabriel Bortoleto LM", team: "Audi Revolut F1 Team", type: "Legend Master", persons: ["Gabriel Bortoleto"] },
  { number: "224", name: "Pierre Gasly LM", team: "BWT Alpine F1 Team", type: "Legend Master", persons: ["Pierre Gasly"] },
  { number: "225", name: "Franco Colapinto LM", team: "BWT Alpine F1 Team", type: "Legend Master", persons: ["Franco Colapinto"] },
  { number: "226", name: "Sergio Perez LM", team: "Cadillac Formula 1 Team", type: "Legend Master", persons: ["Sergio Perez"] },
  { number: "227", name: "Valtteri Bottas LM", team: "Cadillac Formula 1 Team", type: "Legend Master", persons: ["Valtteri Bottas"] },

  // Legend Gold (LGC) subset (228-249)
  { number: "228", name: "Lando Norris LGC", team: "McLaren Mastercard F1 Team", type: "Legend Gold", persons: ["Lando Norris"] },
  { number: "229", name: "Oscar Piastri LGC", team: "McLaren Mastercard F1 Team", type: "Legend Gold", persons: ["Oscar Piastri"] },
  { number: "230", name: "George Russell LGC", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Legend Gold", persons: ["George Russell"] },
  { number: "231", name: "Kimi Antonelli LGC", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Legend Gold", persons: ["Kimi Antonelli"] },
  { number: "232", name: "Max Verstappen LGC", team: "Oracle Red Bull Racing", type: "Legend Gold", persons: ["Max Verstappen"] },
  { number: "233", name: "Isack Hadjar LGC", team: "Oracle Red Bull Racing", type: "Legend Gold", persons: ["Isack Hadjar"] },
  { number: "234", name: "Charles Leclerc LGC", team: "Scuderia Ferrari HP", type: "Legend Gold", persons: ["Charles Leclerc"] },
  { number: "235", name: "Lewis Hamilton LGC", team: "Scuderia Ferrari HP", type: "Legend Gold", persons: ["Lewis Hamilton"] },
  { number: "236", name: "Alex Albon LGC", team: "Atlassian Williams Racing", type: "Legend Gold", persons: ["Alex Albon"] },
  { number: "237", name: "Carlos Sainz LGC", team: "Atlassian Williams Racing", type: "Legend Gold", persons: ["Carlos Sainz"] },
  { number: "238", name: "Liam Lawson LGC", team: "Visa Cash App RB Formula One", type: "Legend Gold", persons: ["Liam Lawson"] },
  { number: "239", name: "Arvid Lindblad LGC", team: "Visa Cash App RB Formula One", type: "Legend Gold", persons: ["Arvid Lindblad"] },
  { number: "240", name: "Fernando Alonso LGC", team: "Aston Martin Aramco Formula One Team", type: "Legend Gold", persons: ["Fernando Alonso"] },
  { number: "241", name: "Lance Stroll LGC", team: "Aston Martin Aramco Formula One Team", type: "Legend Gold", persons: ["Lance Stroll"] },
  { number: "242", name: "Oliver Bearman LGC", team: "TGR Haas F1 Team", type: "Legend Gold", persons: ["Oliver Bearman"] },
  { number: "243", name: "Esteban Ocon LGC", team: "TGR Haas F1 Team", type: "Legend Gold", persons: ["Esteban Ocon"] },
  { number: "244", name: "Nico Hulkenberg LGC", team: "Audi Revolut F1 Team", type: "Legend Gold", persons: ["Nico Hulkenberg"] },
  { number: "245", name: "Gabriel Bortoleto LGC", team: "Audi Revolut F1 Team", type: "Legend Gold", persons: ["Gabriel Bortoleto"] },
  { number: "246", name: "Pierre Gasly LGC", team: "BWT Alpine F1 Team", type: "Legend Gold", persons: ["Pierre Gasly"] },
  { number: "247", name: "Franco Colapinto LGC", team: "BWT Alpine F1 Team", type: "Legend Gold", persons: ["Franco Colapinto"] },
  { number: "248", name: "Sergio Perez LGC", team: "Cadillac Formula 1 Team", type: "Legend Gold", persons: ["Sergio Perez"] },
  { number: "249", name: "Valtteri Bottas LGC", team: "Cadillac Formula 1 Team", type: "Legend Gold", persons: ["Valtteri Bottas"] },

  // Champion (CHAMP) subset (250-252)
  { number: "250", name: "Lando Norris CHAMP", team: "McLaren Mastercard F1 Team", type: "Champion", persons: ["Lando Norris"] },
  { number: "251", name: "Leonardo Fornaroli CHAMP", team: "Invicta Racing", type: "Champion", persons: ["Leonardo Fornaroli"] },
  { number: "252", name: "Rafael Câmara CHAMP", team: "Trident", type: "Champion", persons: ["Rafael Câmara"] },

  // F2/MR/RC subset (253-264)
  { number: "253", name: "Richard Verschoor F2MRC", team: "MP Motorsport", type: "F2", persons: ["Richard Verschoor"] },
  { number: "254", name: "Joshua Dürksen OTW", team: "Invicta Racing", type: "On Track", persons: ["Joshua Dürksen"] },
  { number: "255", name: "Colton Herta OTW", team: "Hitech TGR", type: "On Track", persons: ["Colton Herta"] },
  { number: "256", name: "Nikola Tsolov OTW", team: "Campos Racing", type: "On Track", persons: ["Nikola Tsolov"] },
  { number: "257", name: "Dino Beganovic OTW", team: "DAMS Lucas Oil", type: "On Track", persons: ["Dino Beganovic"] },
  { number: "258", name: "Gabriele Minì OTW", team: "MP Motorsport", type: "On Track", persons: ["Gabriele Minì"] },
  { number: "259", name: "Mari Boya OTW", team: "PREMA Racing", type: "On Track", persons: ["Mari Boya"] },
  { number: "260", name: "Alexander Dunne OTW", team: "Rodin Motorsport", type: "On Track", persons: ["Alexander Dunne"] },
  { number: "261", name: "Kush Maini OTW", team: "ART Grand Prix", type: "On Track", persons: ["Kush Maini"] },
  { number: "262", name: "Emerson Fittipaldi Jr. OTW", team: "AIX Racing", type: "On Track", persons: ["Emerson Fittipaldi Jr."] },
  { number: "263", name: "Nico Varrone OTW", team: "Van Amersfoort Racing", type: "On Track", persons: ["Nico Varrone"] },
  { number: "264", name: "2026 F1 Car TD", team: "Various", type: "Technical Drawing" },

  // Superstar (SS) subset (265-288)
  { number: "265", name: "Lando Norris SS", team: "McLaren Mastercard F1 Team", type: "Superstar", persons: ["Lando Norris"] },
  { number: "266", name: "Oscar Piastri SS", team: "McLaren Mastercard F1 Team", type: "Superstar", persons: ["Oscar Piastri"] },
  { number: "267", name: "George Russell SS", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Superstar", persons: ["George Russell"] },
  { number: "268", name: "Kimi Antonelli SS", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Superstar", persons: ["Kimi Antonelli"] },
  { number: "269", name: "Max Verstappen SS", team: "Oracle Red Bull Racing", type: "Superstar", persons: ["Max Verstappen"] },
  { number: "270", name: "Isack Hadjar SS", team: "Oracle Red Bull Racing", type: "Superstar", persons: ["Isack Hadjar"] },
  { number: "271", name: "Charles Leclerc SS", team: "Scuderia Ferrari HP", type: "Superstar", persons: ["Charles Leclerc"] },
  { number: "272", name: "Lewis Hamilton SS", team: "Scuderia Ferrari HP", type: "Superstar", persons: ["Lewis Hamilton"] },
  { number: "273", name: "Alex Albon SS", team: "Atlassian Williams Racing", type: "Superstar", persons: ["Alex Albon"] },
  { number: "274", name: "Carlos Sainz SS", team: "Atlassian Williams Racing", type: "Superstar", persons: ["Carlos Sainz"] },
  { number: "275", name: "Liam Lawson SS", team: "Visa Cash App RB Formula One", type: "Superstar", persons: ["Liam Lawson"] },
  { number: "276", name: "Arvid Lindblad SS", team: "Visa Cash App RB Formula One", type: "Superstar", persons: ["Arvid Lindblad"] },
  { number: "277", name: "Fernando Alonso SS", team: "Aston Martin Aramco Formula One Team", type: "Superstar", persons: ["Fernando Alonso"] },
  { number: "278", name: "Lance Stroll SS", team: "Aston Martin Aramco Formula One Team", type: "Superstar", persons: ["Lance Stroll"] },
  { number: "279", name: "Oliver Bearman SS", team: "TGR Haas F1 Team", type: "Superstar", persons: ["Oliver Bearman"] },
  { number: "280", name: "Esteban Ocon SS", team: "TGR Haas F1 Team", type: "Superstar", persons: ["Esteban Ocon"] },
  { number: "281", name: "Nico Hulkenberg SS", team: "Audi Revolut F1 Team", type: "Superstar", persons: ["Nico Hulkenberg"] },
  { number: "282", name: "Gabriel Bortoleto SS", team: "Audi Revolut F1 Team", type: "Superstar", persons: ["Gabriel Bortoleto"] },
  { number: "283", name: "Pierre Gasly SS", team: "BWT Alpine F1 Team", type: "Superstar", persons: ["Pierre Gasly"] },
  { number: "284", name: "Franco Colapinto SS", team: "BWT Alpine F1 Team", type: "Superstar", persons: ["Franco Colapinto"] },
  { number: "285", name: "Sergio Perez SS", team: "Cadillac Formula 1 Team", type: "Superstar", persons: ["Sergio Perez"] },
  { number: "286", name: "Valtteri Bottas SS", team: "Cadillac Formula 1 Team", type: "Superstar", persons: ["Valtteri Bottas"] },
  { number: "287", name: "Jackie Stewart SS", team: "Various", type: "Superstar", persons: ["Jackie Stewart"] },
  { number: "288", name: "Mika Häkkinen SS", team: "Various", type: "Superstar", persons: ["Mika Häkkinen"] },

  // 100 Club (100C) subset (289-297)
  { number: "289", name: "Stirling Moss 100C", team: "Various", type: "100 Club" },
  { number: "290", name: "Graham Hill 100C", team: "Various", type: "100 Club" },
  { number: "291", name: "Alain Prost 100C", team: "Various", type: "100 Club" },
  { number: "292", name: "Rubens Barrichello 100C", team: "Various", type: "100 Club" },
  { number: "293", name: "Lando Norris 100C", team: "McLaren Mastercard F1 Team", type: "100 Club", persons: ["Lando Norris"] },
  { number: "294", name: "George Russell 100C", team: "Mercedes-AMG PETRONAS Formula One Team", type: "100 Club", persons: ["George Russell"] },
  { number: "295", name: "Max Verstappen 100C", team: "Oracle Red Bull Racing", type: "100 Club", persons: ["Max Verstappen"] },
  { number: "296", name: "Carlos Sainz 100C", team: "Atlassian Williams Racing", type: "100 Club", persons: ["Carlos Sainz"] },
  { number: "297", name: "Oliver Bearman 100C", team: "TGR Haas F1 Team", type: "100 Club", persons: ["Oliver Bearman"] },

  // Base Elite (BE) subset (298-306)
  { number: "298", name: "Nigel Mansell BE", team: "Various", type: "Base Elite", persons: ["Nigel Mansell"] },
  { number: "299", name: "Damon Hill BE", team: "Various", type: "Base Elite", persons: ["Damon Hill"] },
  { number: "300", name: "Kimi Räikkönen BE", team: "Various", type: "Base Elite", persons: ["Kimi Räikkönen"] },
  { number: "301", name: "Oscar Piastri BE", team: "McLaren Mastercard F1 Team", type: "Base Elite", persons: ["Oscar Piastri"] },
  { number: "302", name: "Lewis Hamilton BE", team: "Scuderia Ferrari HP", type: "Base Elite", persons: ["Lewis Hamilton"] },
  { number: "303", name: "Alex Albon BE", team: "Atlassian Williams Racing", type: "Base Elite", persons: ["Alex Albon"] },
  { number: "304", name: "Fernando Alonso BE", team: "Aston Martin Aramco Formula One Team", type: "Base Elite", persons: ["Fernando Alonso"] },
  { number: "305", name: "Esteban Ocon BE", team: "TGR Haas F1 Team", type: "Base Elite", persons: ["Esteban Ocon"] },
  { number: "306", name: "Sergio Perez BE", team: "Cadillac Formula 1 Team", type: "Base Elite", persons: ["Sergio Perez"] },

  // Driver Insert (DI) subset (307-315)
  { number: "307", name: "Lando Norris DI", team: "McLaren Mastercard F1 Team", type: "Driver Insert", persons: ["Lando Norris"] },
  { number: "308", name: "George Russell DI", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Driver Insert", persons: ["George Russell"] },
  { number: "309", name: "Isack Hadjar DI", team: "Oracle Red Bull Racing", type: "Driver Insert", persons: ["Isack Hadjar"] },
  { number: "310", name: "Charles Leclerc DI", team: "Scuderia Ferrari HP", type: "Driver Insert", persons: ["Charles Leclerc"] },
  { number: "311", name: "Carlos Sainz DI", team: "Atlassian Williams Racing", type: "Driver Insert", persons: ["Carlos Sainz"] },
  { number: "312", name: "Arvid Lindblad DI", team: "Visa Cash App RB Formula One", type: "Driver Insert", persons: ["Arvid Lindblad"] },
  { number: "313", name: "Nico Hulkenberg DI", team: "Audi Revolut F1 Team", type: "Driver Insert", persons: ["Nico Hulkenberg"] },
  { number: "314", name: "Pierre Gasly DI", team: "BWT Alpine F1 Team", type: "Driver Insert", persons: ["Pierre Gasly"] },
  { number: "315", name: "Valtteri Bottas DI", team: "Cadillac Formula 1 Team", type: "Driver Insert", persons: ["Valtteri Bottas"] },

  // Turbo (TUC) subset (316-337)
  { number: "316", name: "Lando Norris TUC", team: "McLaren Mastercard F1 Team", type: "Turbo", persons: ["Lando Norris"] },
  { number: "317", name: "Oscar Piastri TUC", team: "McLaren Mastercard F1 Team", type: "Turbo", persons: ["Oscar Piastri"] },
  { number: "318", name: "George Russell TUC", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Turbo", persons: ["George Russell"] },
  { number: "319", name: "Kimi Antonelli TUC", team: "Mercedes-AMG PETRONAS Formula One Team", type: "Turbo", persons: ["Kimi Antonelli"] },
  { number: "320", name: "Max Verstappen TUC", team: "Oracle Red Bull Racing", type: "Turbo", persons: ["Max Verstappen"] },
  { number: "321", name: "Isack Hadjar TUC", team: "Oracle Red Bull Racing", type: "Turbo", persons: ["Isack Hadjar"] },
  { number: "322", name: "Charles Leclerc TUC", team: "Scuderia Ferrari HP", type: "Turbo", persons: ["Charles Leclerc"] },
  { number: "323", name: "Lewis Hamilton TUC", team: "Scuderia Ferrari HP", type: "Turbo", persons: ["Lewis Hamilton"] },
  { number: "324", name: "Alex Albon TUC", team: "Atlassian Williams Racing", type: "Turbo", persons: ["Alex Albon"] },
  { number: "325", name: "Carlos Sainz TUC", team: "Atlassian Williams Racing", type: "Turbo", persons: ["Carlos Sainz"] },
  { number: "326", name: "Liam Lawson TUC", team: "Visa Cash App RB Formula One", type: "Turbo", persons: ["Liam Lawson"] },
  { number: "327", name: "Arvid Lindblad TUC", team: "Visa Cash App RB Formula One", type: "Turbo", persons: ["Arvid Lindblad"] },
  { number: "328", name: "Fernando Alonso TUC", team: "Aston Martin Aramco Formula One Team", type: "Turbo", persons: ["Fernando Alonso"] },
  { number: "329", name: "Lance Stroll TUC", team: "Aston Martin Aramco Formula One Team", type: "Turbo", persons: ["Lance Stroll"] },
  { number: "330", name: "Oliver Bearman TUC", team: "TGR Haas F1 Team", type: "Turbo", persons: ["Oliver Bearman"] },
  { number: "331", name: "Esteban Ocon TUC", team: "TGR Haas F1 Team", type: "Turbo", persons: ["Esteban Ocon"] },
  { number: "332", name: "Nico Hulkenberg TUC", team: "Audi Revolut F1 Team", type: "Turbo", persons: ["Nico Hulkenberg"] },
  { number: "333", name: "Gabriel Bortoleto TUC", team: "Audi Revolut F1 Team", type: "Turbo", persons: ["Gabriel Bortoleto"] },
  { number: "334", name: "Pierre Gasly TUC", team: "BWT Alpine F1 Team", type: "Turbo", persons: ["Pierre Gasly"] },
  { number: "335", name: "Franco Colapinto TUC", team: "BWT Alpine F1 Team", type: "Turbo", persons: ["Franco Colapinto"] },
  { number: "336", name: "Sergio Perez TUC", team: "Cadillac Formula 1 Team", type: "Turbo", persons: ["Sergio Perez"] },
  { number: "337", name: "Valtteri Bottas TUC", team: "Cadillac Formula 1 Team", type: "Turbo", persons: ["Valtteri Bottas"] },
  { number: "338", name: "Stirling Moss TUC", team: "Various", type: "Turbo", persons: ["Stirling Moss"] },
  { number: "339", name: "Michael Schumacher TUC", team: "Various", type: "Turbo", persons: ["Michael Schumacher"] },
  { number: "340", name: "Mark Webber TUC", team: "Various", type: "Turbo", persons: ["Mark Webber"] },

  // World Final (WF) subset (341)
  { number: "341", name: "Lewis Hamilton WF", team: "Scuderia Ferrari HP", type: "World Final", persons: ["Lewis Hamilton"] },

  // Strategy Cards (SC) subset (342)
  { number: "342", name: "Agent, Slow Pit Stop, Fast Pit Stop & Overtake Block SC", team: "Various", type: "Strategy" },

  // F1 Game (F1G) subset (343-353)
  { number: "343", name: "Lando Norris F1G", team: "McLaren Mastercard F1 Team", type: "F1 Game", persons: ["Lando Norris"] },
  { number: "344", name: "George Russell F1G", team: "Mercedes-AMG PETRONAS Formula One Team", type: "F1 Game", persons: ["George Russell"] },
  { number: "345", name: "Max Verstappen F1G", team: "Oracle Red Bull Racing", type: "F1 Game", persons: ["Max Verstappen"] },
  { number: "346", name: "Charles Leclerc F1G", team: "Scuderia Ferrari HP", type: "F1 Game", persons: ["Charles Leclerc"] },
  { number: "347", name: "Alex Albon F1G", team: "Atlassian Williams Racing", type: "F1 Game", persons: ["Alex Albon"] },
  { number: "348", name: "Liam Lawson F1G", team: "Visa Cash App RB Formula One", type: "F1 Game", persons: ["Liam Lawson"] },
  { number: "349", name: "Fernando Alonso F1G", team: "Aston Martin Aramco Formula One Team", type: "F1 Game", persons: ["Fernando Alonso"] },
  { number: "350", name: "Oliver Bearman F1G", team: "TGR Haas F1 Team", type: "F1 Game", persons: ["Oliver Bearman"] },
  { number: "351", name: "Nico Hulkenberg F1G", team: "Audi Revolut F1 Team", type: "F1 Game", persons: ["Nico Hulkenberg"] },
  { number: "352", name: "Pierre Gasly F1G", team: "BWT Alpine F1 Team", type: "F1 Game", persons: ["Pierre Gasly"] },
  { number: "353", name: "Valtteri Bottas F1G", team: "Cadillac Formula 1 Team", type: "F1 Game", persons: ["Valtteri Bottas"] },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Formula 1", universeId);
  const brandId = await builder.getOrCreateBrand("Turbo Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Turbo Attax 2026", franchiseId, brandId);
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