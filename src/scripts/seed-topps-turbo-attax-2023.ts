import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the Topps Turbo Attax 2023 F1 trading card set.
 * Full 372-card base checklist + Limited Edition, Giant Card, and Mega inserts.
 * Source: Official Topps Turbo Attax 2023 checklist.
 */
const SET_ID = "topps-turbo-attax-2023";
const SET_NAME = "Turbo Attax 2023";

interface CardRow {
  number: string;
  name: string;
  type: string;
  team?: string;
  persons?: string[];
}

const ALL_CARDS: CardRow[] = [
  // Strategy Cards (1-9)
  { number: "1", name: "Fast Pit Stop", type: "Strategy Card" },
  { number: "2", name: "DRS", type: "Strategy Card" },
  { number: "3", name: "Rainmaster", type: "Strategy Card" },
  { number: "4", name: "Overtake Block", type: "Strategy Card" },
  { number: "5", name: "Agent", type: "Strategy Card" },
  { number: "6", name: "Safety Car", type: "Strategy Card" },
  { number: "7", name: "Out of Fuel", type: "Strategy Card" },
  { number: "8", name: "Black & Orange Flag", type: "Strategy Card" },
  { number: "9", name: "Race Collision", type: "Strategy Card" },

  // F1 Team – Red Bull (10-18)
  { number: "10", name: "Team Logo", type: "F1 Team – Red Bull", team: "Red Bull Racing" },
  { number: "11", name: "2023 F1 Car", type: "F1 Team – Red Bull", team: "Red Bull Racing" },
  { number: "12", name: "Christian Horner", type: "F1 Team – Red Bull", team: "Red Bull Racing", persons: ["Christian Horner"] },
  { number: "13", name: "Pit Crew", type: "F1 Team – Red Bull", team: "Red Bull Racing" },
  { number: "14", name: "Max Verstappen", type: "F1 Team – Red Bull", team: "Red Bull Racing", persons: ["Max Verstappen"] },
  { number: "15", name: "Max Verstappen", type: "F1 Team – Red Bull", team: "Red Bull Racing", persons: ["Max Verstappen"] },
  { number: "16", name: "Sergio Perez", type: "F1 Team – Red Bull", team: "Red Bull Racing", persons: ["Sergio Perez"] },
  { number: "17", name: "Sergio Perez", type: "F1 Team – Red Bull", team: "Red Bull Racing", persons: ["Sergio Perez"] },
  { number: "18", name: "Team Duo", type: "F1 Team – Red Bull", team: "Red Bull Racing", persons: ["Max Verstappen", "Sergio Perez"] },

  // F1 Team – Ferrari (19-27)
  { number: "19", name: "Team Logo", type: "F1 Team – Ferrari", team: "Ferrari" },
  { number: "20", name: "2023 F1 Car", type: "F1 Team – Ferrari", team: "Ferrari" },
  { number: "21", name: "Frederic Vasseur", type: "F1 Team – Ferrari", team: "Ferrari", persons: ["Frederic Vasseur"] },
  { number: "22", name: "Pit Crew", type: "F1 Team – Ferrari", team: "Ferrari" },
  { number: "23", name: "Charles Leclerc", type: "F1 Team – Ferrari", team: "Ferrari", persons: ["Charles Leclerc"] },
  { number: "24", name: "Charles Leclerc", type: "F1 Team – Ferrari", team: "Ferrari", persons: ["Charles Leclerc"] },
  { number: "25", name: "Carlos Sainz", type: "F1 Team – Ferrari", team: "Ferrari", persons: ["Carlos Sainz"] },
  { number: "26", name: "Carlos Sainz", type: "F1 Team – Ferrari", team: "Ferrari", persons: ["Carlos Sainz"] },
  { number: "27", name: "Team Duo", type: "F1 Team – Ferrari", team: "Ferrari", persons: ["Charles Leclerc", "Carlos Sainz"] },

  // F1 Team – Mercedes (28-36)
  { number: "28", name: "Team Logo", type: "F1 Team – Mercedes", team: "Mercedes" },
  { number: "29", name: "2023 F1 Car", type: "F1 Team – Mercedes", team: "Mercedes" },
  { number: "30", name: "Toto Wolff", type: "F1 Team – Mercedes", team: "Mercedes", persons: ["Toto Wolff"] },
  { number: "31", name: "Pit Crew", type: "F1 Team – Mercedes", team: "Mercedes" },
  { number: "32", name: "George Russell", type: "F1 Team – Mercedes", team: "Mercedes", persons: ["George Russell"] },
  { number: "33", name: "George Russell", type: "F1 Team – Mercedes", team: "Mercedes", persons: ["George Russell"] },
  { number: "34", name: "Lewis Hamilton", type: "F1 Team – Mercedes", team: "Mercedes", persons: ["Lewis Hamilton"] },
  { number: "35", name: "Lewis Hamilton", type: "F1 Team – Mercedes", team: "Mercedes", persons: ["Lewis Hamilton"] },
  { number: "36", name: "Team Duo", type: "F1 Team – Mercedes", team: "Mercedes", persons: ["George Russell", "Lewis Hamilton"] },

  // F1 Team – Alpine (37-45)
  { number: "37", name: "Team Logo", type: "F1 Team – Alpine", team: "Alpine" },
  { number: "38", name: "2023 F1 Car", type: "F1 Team – Alpine", team: "Alpine" },
  { number: "39", name: "Otmar Szafnauer", type: "F1 Team – Alpine", team: "Alpine", persons: ["Otmar Szafnauer"] },
  { number: "40", name: "Pit Crew", type: "F1 Team – Alpine", team: "Alpine" },
  { number: "41", name: "Esteban Ocon", type: "F1 Team – Alpine", team: "Alpine", persons: ["Esteban Ocon"] },
  { number: "42", name: "Esteban Ocon", type: "F1 Team – Alpine", team: "Alpine", persons: ["Esteban Ocon"] },
  { number: "43", name: "Pierre Gasly", type: "F1 Team – Alpine", team: "Alpine", persons: ["Pierre Gasly"] },
  { number: "44", name: "Pierre Gasly", type: "F1 Team – Alpine", team: "Alpine", persons: ["Pierre Gasly"] },
  { number: "45", name: "Team Duo", type: "F1 Team – Alpine", team: "Alpine", persons: ["Esteban Ocon", "Pierre Gasly"] },

  // F1 Team – McLaren (46-54)
  { number: "46", name: "Team Logo", type: "F1 Team – McLaren", team: "McLaren" },
  { number: "47", name: "2023 F1 Car", type: "F1 Team – McLaren", team: "McLaren" },
  { number: "48", name: "Andrea Stella", type: "F1 Team – McLaren", team: "McLaren", persons: ["Andrea Stella"] },
  { number: "49", name: "Pit Crew", type: "F1 Team – McLaren", team: "McLaren" },
  { number: "50", name: "Lando Norris", type: "F1 Team – McLaren", team: "McLaren", persons: ["Lando Norris"] },
  { number: "51", name: "Lando Norris", type: "F1 Team – McLaren", team: "McLaren", persons: ["Lando Norris"] },
  { number: "52", name: "Oscar Piastri", type: "F1 Team – McLaren", team: "McLaren", persons: ["Oscar Piastri"] },
  { number: "53", name: "Oscar Piastri", type: "F1 Team – McLaren", team: "McLaren", persons: ["Oscar Piastri"] },
  { number: "54", name: "Team Duo", type: "F1 Team – McLaren", team: "McLaren", persons: ["Lando Norris", "Oscar Piastri"] },

  // F1 Team – Alfa Romeo (55-63)
  { number: "55", name: "Team Logo", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo" },
  { number: "56", name: "2023 F1 Car", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo" },
  { number: "57", name: "Alessandro Bravi", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo", persons: ["Alessandro Bravi"] },
  { number: "58", name: "Pit Crew", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo" },
  { number: "59", name: "Valtteri Bottas", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo", persons: ["Valtteri Bottas"] },
  { number: "60", name: "Valtteri Bottas", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo", persons: ["Valtteri Bottas"] },
  { number: "61", name: "Zhou Guanyu", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo", persons: ["Zhou Guanyu"] },
  { number: "62", name: "Zhou Guanyu", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo", persons: ["Zhou Guanyu"] },
  { number: "63", name: "Team Duo", type: "F1 Team – Alfa Romeo", team: "Alfa Romeo", persons: ["Valtteri Bottas", "Zhou Guanyu"] },

  // F1 Team – Aston Martin (64-72)
  { number: "64", name: "Team Logo", type: "F1 Team – Aston Martin", team: "Aston Martin" },
  { number: "65", name: "2023 F1 Car", type: "F1 Team – Aston Martin", team: "Aston Martin" },
  { number: "66", name: "Mike Krack", type: "F1 Team – Aston Martin", team: "Aston Martin", persons: ["Mike Krack"] },
  { number: "67", name: "Pit Crew", type: "F1 Team – Aston Martin", team: "Aston Martin" },
  { number: "68", name: "Fernando Alonso", type: "F1 Team – Aston Martin", team: "Aston Martin", persons: ["Fernando Alonso"] },
  { number: "69", name: "Fernando Alonso", type: "F1 Team – Aston Martin", team: "Aston Martin", persons: ["Fernando Alonso"] },
  { number: "70", name: "Lance Stroll", type: "F1 Team – Aston Martin", team: "Aston Martin", persons: ["Lance Stroll"] },
  { number: "71", name: "Lance Stroll", type: "F1 Team – Aston Martin", team: "Aston Martin", persons: ["Lance Stroll"] },
  { number: "72", name: "Team Duo", type: "F1 Team – Aston Martin", team: "Aston Martin", persons: ["Fernando Alonso", "Lance Stroll"] },

  // F1 Team – Haas (73-81)
  { number: "73", name: "Team Logo", type: "F1 Team – Haas", team: "Haas" },
  { number: "74", name: "2023 F1 Car", type: "F1 Team – Haas", team: "Haas" },
  { number: "75", name: "Guenther Steiner", type: "F1 Team – Haas", team: "Haas", persons: ["Guenther Steiner"] },
  { number: "76", name: "Pit Crew", type: "F1 Team – Haas", team: "Haas" },
  { number: "77", name: "Kevin Magnussen", type: "F1 Team – Haas", team: "Haas", persons: ["Kevin Magnussen"] },
  { number: "78", name: "Kevin Magnussen", type: "F1 Team – Haas", team: "Haas", persons: ["Kevin Magnussen"] },
  { number: "79", name: "Nico Hulkenberg", type: "F1 Team – Haas", team: "Haas", persons: ["Nico Hulkenberg"] },
  { number: "80", name: "Nico Hulkenberg", type: "F1 Team – Haas", team: "Haas", persons: ["Nico Hulkenberg"] },
  { number: "81", name: "Team Duo", type: "F1 Team – Haas", team: "Haas", persons: ["Kevin Magnussen", "Nico Hulkenberg"] },

  // F1 Team – AlphaTauri (82-90)
  { number: "82", name: "Team Logo", type: "F1 Team – AlphaTauri", team: "AlphaTauri" },
  { number: "83", name: "2023 F1 Car", type: "F1 Team – AlphaTauri", team: "AlphaTauri" },
  { number: "84", name: "Franz Tost", type: "F1 Team – AlphaTauri", team: "AlphaTauri", persons: ["Franz Tost"] },
  { number: "85", name: "Pit Crew", type: "F1 Team – AlphaTauri", team: "AlphaTauri" },
  { number: "86", name: "Yuki Tsunoda", type: "F1 Team – AlphaTauri", team: "AlphaTauri", persons: ["Yuki Tsunoda"] },
  { number: "87", name: "Yuki Tsunoda", type: "F1 Team – AlphaTauri", team: "AlphaTauri", persons: ["Yuki Tsunoda"] },
  { number: "88", name: "Nyck De Vries", type: "F1 Team – AlphaTauri", team: "AlphaTauri", persons: ["Nyck De Vries"] },
  { number: "89", name: "Nyck De Vries", type: "F1 Team – AlphaTauri", team: "AlphaTauri", persons: ["Nyck De Vries"] },
  { number: "90", name: "Team Duo", type: "F1 Team – AlphaTauri", team: "AlphaTauri", persons: ["Yuki Tsunoda", "Nyck De Vries"] },

  // F1 Team – Williams (91-99)
  { number: "91", name: "Team Logo", type: "F1 Team – Williams", team: "Williams" },
  { number: "92", name: "2023 F1 Car", type: "F1 Team – Williams", team: "Williams" },
  { number: "93", name: "James Vowles", type: "F1 Team – Williams", team: "Williams", persons: ["James Vowles"] },
  { number: "94", name: "Pit Crew", type: "F1 Team – Williams", team: "Williams" },
  { number: "95", name: "Alex Albon", type: "F1 Team – Williams", team: "Williams", persons: ["Alex Albon"] },
  { number: "96", name: "Alex Albon", type: "F1 Team – Williams", team: "Williams", persons: ["Alex Albon"] },
  { number: "97", name: "Logan Sargeant", type: "F1 Team – Williams", team: "Williams", persons: ["Logan Sargeant"] },
  { number: "98", name: "Logan Sargeant", type: "F1 Team – Williams", team: "Williams", persons: ["Logan Sargeant"] },
  { number: "99", name: "Team Duo", type: "F1 Team – Williams", team: "Williams", persons: ["Alex Albon", "Logan Sargeant"] },

  // Qualifying Master (100-108)
  { number: "100", name: "Max Verstappen", type: "Qualifying Master", persons: ["Max Verstappen"] },
  { number: "101", name: "Charles Leclerc", type: "Qualifying Master", persons: ["Charles Leclerc"] },
  { number: "102", name: "Lewis Hamilton", type: "Qualifying Master", persons: ["Lewis Hamilton"] },
  { number: "103", name: "Pierre Gasly", type: "Qualifying Master", persons: ["Pierre Gasly"] },
  { number: "104", name: "Lando Norris", type: "Qualifying Master", persons: ["Lando Norris"] },
  { number: "105", name: "Valtteri Bottas", type: "Qualifying Master", persons: ["Valtteri Bottas"] },
  { number: "106", name: "Fernando Alonso", type: "Qualifying Master", persons: ["Fernando Alonso"] },
  { number: "107", name: "Kevin Magnussen", type: "Qualifying Master", persons: ["Kevin Magnussen"] },
  { number: "108", name: "Alex Albon", type: "Qualifying Master", persons: ["Alex Albon"] },

  // F1 Sprint Superstar (109-111)
  { number: "109", name: "Max Verstappen", type: "F1 Sprint Superstar", persons: ["Max Verstappen"] },
  { number: "110", name: "George Russell", type: "F1 Sprint Superstar", persons: ["George Russell"] },
  { number: "111", name: "Kevin Magnussen", type: "F1 Sprint Superstar", persons: ["Kevin Magnussen"] },

  // F1 Live Action (112-147)
  { number: "112", name: "Valtteri Bottas – Sakhir", type: "F1 Live Action", persons: ["Valtteri Bottas"] },
  { number: "113", name: "Yuki Tsunoda – Sakhir", type: "F1 Live Action", persons: ["Yuki Tsunoda"] },
  { number: "114", name: "Max Verstappen – Jeddah", type: "F1 Live Action", persons: ["Max Verstappen"] },
  { number: "115", name: "Esteban Ocon – Jeddah", type: "F1 Live Action", persons: ["Esteban Ocon"] },
  { number: "116", name: "George Russell – Melbourne", type: "F1 Live Action", persons: ["George Russell"] },
  { number: "117", name: "Sergio Perez – Imola", type: "F1 Live Action", persons: ["Sergio Perez"] },
  { number: "118", name: "Valtteri Bottas – Imola", type: "F1 Live Action", persons: ["Valtteri Bottas"] },
  { number: "119", name: "Yuki Tsunoda – Imola", type: "F1 Live Action", persons: ["Yuki Tsunoda"] },
  { number: "120", name: "Esteban Ocon – Miami", type: "F1 Live Action", persons: ["Esteban Ocon"] },
  { number: "121", name: "Alex Albon – Miami", type: "F1 Live Action", persons: ["Alex Albon"] },
  { number: "122", name: "Lance Stroll – Miami", type: "F1 Live Action", persons: ["Lance Stroll"] },
  { number: "123", name: "Charles Leclerc – Monte Carlo", type: "F1 Live Action", persons: ["Charles Leclerc"] },
  { number: "124", name: "Lando Norris – Monte Carlo", type: "F1 Live Action", persons: ["Lando Norris"] },
  { number: "125", name: "Zhou Guanyu – Montreal", type: "F1 Live Action", persons: ["Zhou Guanyu"] },
  { number: "126", name: "Lance Stroll – Montreal", type: "F1 Live Action", persons: ["Lance Stroll"] },
  { number: "127", name: "Esteban Ocon – Spielberg", type: "F1 Live Action", persons: ["Esteban Ocon"] },
  { number: "128", name: "Max Verstappen – Le Castellet", type: "F1 Live Action", persons: ["Max Verstappen"] },
  { number: "129", name: "Carlos Sainz – Le Castellet", type: "F1 Live Action", persons: ["Carlos Sainz"] },
  { number: "130", name: "Alex Albon – Le Castellet", type: "F1 Live Action", persons: ["Alex Albon"] },
  { number: "131", name: "Lewis Hamilton – Budapest", type: "F1 Live Action", persons: ["Lewis Hamilton"] },
  { number: "132", name: "Max Verstappen – Spa-Francorchamps", type: "F1 Live Action", persons: ["Max Verstappen"] },
  { number: "133", name: "Alex Albon – Spa-Francorchamps", type: "F1 Live Action", persons: ["Alex Albon"] },
  { number: "134", name: "Max Verstappen – Zandvoort", type: "F1 Live Action", persons: ["Max Verstappen"] },
  { number: "135", name: "George Russell – Zandvoort", type: "F1 Live Action", persons: ["George Russell"] },
  { number: "136", name: "Charles Leclerc – Monza", type: "F1 Live Action", persons: ["Charles Leclerc"] },
  { number: "137", name: "Max Verstappen – Monza", type: "F1 Live Action", persons: ["Max Verstappen"] },
  { number: "138", name: "Zhou Guanyu – Monza", type: "F1 Live Action", persons: ["Zhou Guanyu"] },
  { number: "139", name: "Carlos Sainz – Marina Bay", type: "F1 Live Action", persons: ["Carlos Sainz"] },
  { number: "140", name: "Lando Norris – Marina Bay", type: "F1 Live Action", persons: ["Lando Norris"] },
  { number: "141", name: "Lance Stroll – Marina Bay", type: "F1 Live Action", persons: ["Lance Stroll"] },
  { number: "142", name: "Yuki Tsunoda – Suzuka", type: "F1 Live Action", persons: ["Yuki Tsunoda"] },
  { number: "143", name: "Zhou Guanyu – Suzuka", type: "F1 Live Action", persons: ["Zhou Guanyu"] },
  { number: "144", name: "Kevin Magnussen – Austin", type: "F1 Live Action", persons: ["Kevin Magnussen"] },
  { number: "145", name: "Sergio Perez – Mexico City", type: "F1 Live Action", persons: ["Sergio Perez"] },
  { number: "146", name: "Charles Leclerc – Yas Island", type: "F1 Live Action", persons: ["Charles Leclerc"] },
  { number: "147", name: "Valtteri Bottas – Yas Island", type: "F1 Live Action", persons: ["Valtteri Bottas"] },

  // F1 Epic Moment (148-171)
  { number: "148", name: "Charles Leclerc – Sakhir", type: "F1 Epic Moment", persons: ["Charles Leclerc"] },
  { number: "149", name: "Kevin Magnussen – Sakhir", type: "F1 Epic Moment", persons: ["Kevin Magnussen"] },
  { number: "150", name: "Zhou Guanyu – Sakhir", type: "F1 Epic Moment", persons: ["Zhou Guanyu"] },
  { number: "151", name: "Sergio Perez – Jeddah", type: "F1 Epic Moment", persons: ["Sergio Perez"] },
  { number: "152", name: "Charles Leclerc – Melbourne", type: "F1 Epic Moment", persons: ["Charles Leclerc"] },
  { number: "153", name: "Alex Albon – Melbourne", type: "F1 Epic Moment", persons: ["Alex Albon"] },
  { number: "154", name: "Lando Norris – Imola", type: "F1 Epic Moment", persons: ["Lando Norris"] },
  { number: "155", name: "Max Verstappen – Miami", type: "F1 Epic Moment", persons: ["Max Verstappen"] },
  { number: "156", name: "Sergio Perez – Monte Carlo", type: "F1 Epic Moment", persons: ["Sergio Perez"] },
  { number: "157", name: "Carlos Sainz – Silverstone", type: "F1 Epic Moment", persons: ["Carlos Sainz"] },
  { number: "158", name: "Lewis Hamilton – Silverstone", type: "F1 Epic Moment", persons: ["Lewis Hamilton"] },
  { number: "159", name: "Charles Leclerc – Spielberg", type: "F1 Epic Moment", persons: ["Charles Leclerc"] },
  { number: "160", name: "Lewis Hamilton – Le Castellet", type: "F1 Epic Moment", persons: ["Lewis Hamilton"] },
  { number: "161", name: "George Russell – Le Castellet", type: "F1 Epic Moment", persons: ["George Russell"] },
  { number: "162", name: "George Russell – Budapest", type: "F1 Epic Moment", persons: ["George Russell"] },
  { number: "163", name: "Max Verstappen – Budapest", type: "F1 Epic Moment", persons: ["Max Verstappen"] },
  { number: "164", name: "Sergio Perez – Marina Bay", type: "F1 Epic Moment", persons: ["Sergio Perez"] },
  { number: "165", name: "Max Verstappen – Suzuka", type: "F1 Epic Moment", persons: ["Max Verstappen"] },
  { number: "166", name: "Esteban Ocon – Suzuka", type: "F1 Epic Moment", persons: ["Esteban Ocon"] },
  { number: "167", name: "Max Verstappen – Austin", type: "F1 Epic Moment", persons: ["Max Verstappen"] },
  { number: "168", name: "Lewis Hamilton – Austin", type: "F1 Epic Moment", persons: ["Lewis Hamilton"] },
  { number: "169", name: "Max Verstappen – Mexico City", type: "F1 Epic Moment", persons: ["Max Verstappen"] },
  { number: "170", name: "Kevin Magnussen – Sao Paulo", type: "F1 Epic Moment", persons: ["Kevin Magnussen"] },
  { number: "171", name: "George Russell – Sao Paulo", type: "F1 Epic Moment", persons: ["George Russell"] },

  // F1 Milestone Moment (172-181)
  { number: "172", name: "Charles Leclerc", type: "F1 Milestone Moment", persons: ["Charles Leclerc"] },
  { number: "173", name: "Zhou Guanyu", type: "F1 Milestone Moment", persons: ["Zhou Guanyu"] },
  { number: "174", name: "Sergio Perez", type: "F1 Milestone Moment", persons: ["Sergio Perez"] },
  { number: "175", name: "Carlos Sainz", type: "F1 Milestone Moment", persons: ["Carlos Sainz"] },
  { number: "176", name: "George Russell", type: "F1 Milestone Moment", persons: ["George Russell"] },
  { number: "177", name: "Pierre Gasly", type: "F1 Milestone Moment", persons: ["Pierre Gasly"] },
  { number: "178", name: "Nyck De Vries", type: "F1 Milestone Moment", persons: ["Nyck De Vries"] },
  { number: "179", name: "Fernando Alonso", type: "F1 Milestone Moment", persons: ["Fernando Alonso"] },
  { number: "180", name: "Kevin Magnussen", type: "F1 Milestone Moment", persons: ["Kevin Magnussen"] },
  { number: "181", name: "Max Verstappen", type: "F1 Milestone Moment", persons: ["Max Verstappen"] },

  // PSA (182-192)
  { number: "182", name: "Charles Leclerc", type: "PSA", persons: ["Charles Leclerc"] },
  { number: "183", name: "Nico Hulkenberg", type: "PSA", persons: ["Nico Hulkenberg"] },
  { number: "184", name: "Esteban Ocon", type: "PSA", persons: ["Esteban Ocon"] },
  { number: "185", name: "Fernando Alonso", type: "PSA", persons: ["Fernando Alonso"] },
  { number: "186", name: "Zhou Guanyu", type: "PSA", persons: ["Zhou Guanyu"] },
  { number: "187", name: "Lewis Hamilton", type: "PSA", persons: ["Lewis Hamilton"] },
  { number: "188", name: "George Russell", type: "PSA", persons: ["George Russell"] },
  { number: "189", name: "Carlos Sainz", type: "PSA", persons: ["Carlos Sainz"] },
  { number: "190", name: "Max Verstappen", type: "PSA", persons: ["Max Verstappen"] },
  { number: "191", name: "Sergio Perez", type: "PSA", persons: ["Sergio Perez"] },
  { number: "192", name: "Lando Norris", type: "PSA", persons: ["Lando Norris"] },

  // F2 Team cards (193-214)
  { number: "193", name: "Dennis Hauger", type: "F2 Team – MP Motorsport", persons: ["Dennis Hauger"] },
  { number: "194", name: "Jehan Daruvala", type: "F2 Team – MP Motorsport", persons: ["Jehan Daruvala"] },
  { number: "195", name: "Enzo Fittipaldi", type: "F2 Team – Rodin Carlin", persons: ["Enzo Fittipaldi"] },
  { number: "196", name: "Zane Maloney", type: "F2 Team – Rodin Carlin", persons: ["Zane Maloney"] },
  { number: "197", name: "Theo Pourchaire", type: "F2 Team – Art Grand Prix", persons: ["Theo Pourchaire"] },
  { number: "198", name: "Victor Martins", type: "F2 Team – Art Grand Prix", persons: ["Victor Martins"] },
  { number: "199", name: "Frederik Vesti", type: "F2 Team – Prema Racing", persons: ["Frederik Vesti"] },
  { number: "200", name: "Oliver Bearman", type: "F2 Team – Prema Racing", persons: ["Oliver Bearman"] },
  { number: "201", name: "Jak Crawford", type: "F2 Team – Hitech Pulse Eight", persons: ["Jak Crawford"] },
  { number: "202", name: "Isack Hadjar", type: "F2 Team – Hitech Pulse Eight", persons: ["Isack Hadjar"] },
  { number: "203", name: "Ayumu Iwasa", type: "F2 Team – DAMS", persons: ["Ayumu Iwasa"] },
  { number: "204", name: "Arthur Leclerc", type: "F2 Team – DAMS", persons: ["Arthur Leclerc"] },
  { number: "205", name: "Jack Doohan", type: "F2 Team – Invicta Virtousi", persons: ["Jack Doohan"] },
  { number: "206", name: "Amaury Cordeel", type: "F2 Team – Invicta Virtousi", persons: ["Amaury Cordeel"] },
  { number: "207", name: "Roy Nissany", type: "F2 Team – PHM Racing", persons: ["Roy Nissany"] },
  { number: "208", name: "Brad Benavides", type: "F2 Team – PHM Racing", persons: ["Brad Benavides"] },
  { number: "209", name: "Roman Stanek", type: "F2 Team – Trident", persons: ["Roman Stanek"] },
  { number: "210", name: "Clement Novalak", type: "F2 Team – Trident", persons: ["Clement Novalak"] },
  { number: "211", name: "Richard Verschoor", type: "F2 Team – Van Amersfoort", persons: ["Richard Verschoor"] },
  { number: "212", name: "Juan Manuel Correa", type: "F2 Team – Van Amersfoort", persons: ["Juan Manuel Correa"] },
  { number: "213", name: "Kush Maini", type: "F2 Team – Campos Racing", persons: ["Kush Maini"] },
  { number: "214", name: "Ralph Boschung", type: "F2 Team – Campos Racing", persons: ["Ralph Boschung"] },

  // F2 Speedster (215-236)
  { number: "215", name: "Dennis Hauger", type: "F2 Speedster", persons: ["Dennis Hauger"] },
  { number: "216", name: "Jehan Daruvala", type: "F2 Speedster", persons: ["Jehan Daruvala"] },
  { number: "217", name: "Enzo Fittipaldi", type: "F2 Speedster", persons: ["Enzo Fittipaldi"] },
  { number: "218", name: "Zane Maloney", type: "F2 Speedster", persons: ["Zane Maloney"] },
  { number: "219", name: "Theo Pourchaire", type: "F2 Speedster", persons: ["Theo Pourchaire"] },
  { number: "220", name: "Victor Martins", type: "F2 Speedster", persons: ["Victor Martins"] },
  { number: "221", name: "Frederik Vesti", type: "F2 Speedster", persons: ["Frederik Vesti"] },
  { number: "222", name: "Oliver Bearman", type: "F2 Speedster", persons: ["Oliver Bearman"] },
  { number: "223", name: "Jak Crawford", type: "F2 Speedster", persons: ["Jak Crawford"] },
  { number: "224", name: "Isack Hadjar", type: "F2 Speedster", persons: ["Isack Hadjar"] },
  { number: "225", name: "Ayumu Iwasa", type: "F2 Speedster", persons: ["Ayumu Iwasa"] },
  { number: "226", name: "Arthur Leclerc", type: "F2 Speedster", persons: ["Arthur Leclerc"] },
  { number: "227", name: "Jack Doohan", type: "F2 Speedster", persons: ["Jack Doohan"] },
  { number: "228", name: "Amaury Cordeel", type: "F2 Speedster", persons: ["Amaury Cordeel"] },
  { number: "229", name: "Roy Nissany", type: "F2 Speedster", persons: ["Roy Nissany"] },
  { number: "230", name: "Brad Benavides", type: "F2 Speedster", persons: ["Brad Benavides"] },
  { number: "231", name: "Roman Stanek", type: "F2 Speedster", persons: ["Roman Stanek"] },
  { number: "232", name: "Clement Novalak", type: "F2 Speedster", persons: ["Clement Novalak"] },
  { number: "233", name: "Richard Verschoor", type: "F2 Speedster", persons: ["Richard Verschoor"] },
  { number: "234", name: "Juan Manuel Correa", type: "F2 Speedster", persons: ["Juan Manuel Correa"] },
  { number: "235", name: "Kush Maini", type: "F2 Speedster", persons: ["Kush Maini"] },
  { number: "236", name: "Ralph Boschung", type: "F2 Speedster", persons: ["Ralph Boschung"] },

  // F3 Team cards (237-266)
  { number: "237", name: "Paul Aron", type: "F3 Team – Prema Racing", persons: ["Paul Aron"] },
  { number: "238", name: "Dino Beganovic", type: "F3 Team – Prema Racing", persons: ["Dino Beganovic"] },
  { number: "239", name: "Zak O'Sullivan", type: "F3 Team – Prema Racing", persons: ["Zak O'Sullivan"] },
  { number: "240", name: "Leonardo Fornaroli", type: "F3 Team – Trident", persons: ["Leonardo Fornaroli"] },
  { number: "241", name: "Gabriel Bortoleto", type: "F3 Team – Trident", persons: ["Gabriel Bortoleto"] },
  { number: "242", name: "Oliver Goethe", type: "F3 Team – Trident", persons: ["Oliver Goethe"] },
  { number: "243", name: "Kaylen Frederick", type: "F3 Team – Art Grand Prix", persons: ["Kaylen Frederick"] },
  { number: "244", name: "Gregoire Saucy", type: "F3 Team – Art Grand Prix", persons: ["Gregoire Saucy"] },
  { number: "245", name: "Nikola Tsolov", type: "F3 Team – Art Grand Prix", persons: ["Nikola Tsolov"] },
  { number: "246", name: "Franco Colapinto", type: "F3 Team – MP Motorsport", persons: ["Franco Colapinto"] },
  { number: "247", name: "Mari Boya", type: "F3 Team – MP Motorsport", persons: ["Mari Boya"] },
  { number: "248", name: "Jonny Edgar", type: "F3 Team – MP Motorsport", persons: ["Jonny Edgar"] },
  { number: "249", name: "Sebastian Montoya", type: "F3 Team – Hitech Pulse Eight", persons: ["Sebastian Montoya"] },
  { number: "250", name: "Gabriele Mini", type: "F3 Team – Hitech Pulse Eight", persons: ["Gabriele Mini"] },
  { number: "251", name: "Luke Browning", type: "F3 Team – Hitech Pulse Eight", persons: ["Luke Browning"] },
  { number: "252", name: "Caio Collet", type: "F3 Team – Van Amersfoort", persons: ["Caio Collet"] },
  { number: "253", name: "Rafael Villagomez", type: "F3 Team – Van Amersfoort", persons: ["Rafael Villagomez"] },
  { number: "254", name: "Tommy Smith", type: "F3 Team – Van Amersfoort", persons: ["Tommy Smith"] },
  { number: "255", name: "Oliver Gray", type: "F3 Team – Rodin Carlin", persons: ["Oliver Gray"] },
  { number: "256", name: "Hunter Yeany", type: "F3 Team – Rodin Carlin", persons: ["Hunter Yeany"] },
  { number: "257", name: "Ido Cohen", type: "F3 Team – Rodin Carlin", persons: ["Ido Cohen"] },
  { number: "258", name: "Josep Marti", type: "F3 Team – Campos Racing", persons: ["Josep Marti"] },
  { number: "259", name: "Christian Mansell", type: "F3 Team – Campos Racing", persons: ["Christian Mansell"] },
  { number: "260", name: "Hugh Barter", type: "F3 Team – Campos Racing", persons: ["Hugh Barter"] },
  { number: "261", name: "Nikita Bedrin", type: "F3 Team – Jenzer Motorsport", persons: ["Nikita Bedrin"] },
  { number: "262", name: "Taylor Barnard", type: "F3 Team – Jenzer Motorsport", persons: ["Taylor Barnard"] },
  { number: "263", name: "Alejandro Garcia", type: "F3 Team – Jenzer Motorsport", persons: ["Alejandro Garcia"] },
  { number: "264", name: "Sophia Florsch", type: "F3 Team – PHM Racing", persons: ["Sophia Florsch"] },
  { number: "265", name: "Roberto Faria", type: "F3 Team – PHM Racing", persons: ["Roberto Faria"] },
  { number: "266", name: "Piotr Wisnicki", type: "F3 Team – PHM Racing", persons: ["Piotr Wisnicki"] },

  // F1 Race Winner (267-271)
  { number: "267", name: "Charles Leclerc", type: "F1 Race Winner", persons: ["Charles Leclerc"] },
  { number: "268", name: "Max Verstappen", type: "F1 Race Winner", persons: ["Max Verstappen"] },
  { number: "269", name: "Sergio Perez", type: "F1 Race Winner", persons: ["Sergio Perez"] },
  { number: "270", name: "Carlos Sainz", type: "F1 Race Winner", persons: ["Carlos Sainz"] },
  { number: "271", name: "George Russell", type: "F1 Race Winner", persons: ["George Russell"] },

  // F1 Superstar (272-291)
  { number: "272", name: "Max Verstappen", type: "F1 Superstar", persons: ["Max Verstappen"] },
  { number: "273", name: "Sergio Perez", type: "F1 Superstar", persons: ["Sergio Perez"] },
  { number: "274", name: "Charles Leclerc", type: "F1 Superstar", persons: ["Charles Leclerc"] },
  { number: "275", name: "Carlos Sainz", type: "F1 Superstar", persons: ["Carlos Sainz"] },
  { number: "276", name: "George Russell", type: "F1 Superstar", persons: ["George Russell"] },
  { number: "277", name: "Lewis Hamilton", type: "F1 Superstar", persons: ["Lewis Hamilton"] },
  { number: "278", name: "Esteban Ocon", type: "F1 Superstar", persons: ["Esteban Ocon"] },
  { number: "279", name: "Pierre Gasly", type: "F1 Superstar", persons: ["Pierre Gasly"] },
  { number: "280", name: "Lando Norris", type: "F1 Superstar", persons: ["Lando Norris"] },
  { number: "281", name: "Oscar Piastri", type: "F1 Superstar", persons: ["Oscar Piastri"] },
  { number: "282", name: "Valtteri Bottas", type: "F1 Superstar", persons: ["Valtteri Bottas"] },
  { number: "283", name: "Zhou Guanyu", type: "F1 Superstar", persons: ["Zhou Guanyu"] },
  { number: "284", name: "Fernando Alonso", type: "F1 Superstar", persons: ["Fernando Alonso"] },
  { number: "285", name: "Lance Stroll", type: "F1 Superstar", persons: ["Lance Stroll"] },
  { number: "286", name: "Kevin Magnussen", type: "F1 Superstar", persons: ["Kevin Magnussen"] },
  { number: "287", name: "Nico Hulkenberg", type: "F1 Superstar", persons: ["Nico Hulkenberg"] },
  { number: "288", name: "Yuki Tsunoda", type: "F1 Superstar", persons: ["Yuki Tsunoda"] },
  { number: "289", name: "Nyck De Vries", type: "F1 Superstar", persons: ["Nyck De Vries"] },
  { number: "290", name: "Alex Albon", type: "F1 Superstar", persons: ["Alex Albon"] },
  { number: "291", name: "Logan Sargeant", type: "F1 Superstar", persons: ["Logan Sargeant"] },

  // F1 NextGen (292-296)
  { number: "292", name: "Lando Norris", type: "F1 NextGen", persons: ["Lando Norris"] },
  { number: "293", name: "Oscar Piastri", type: "F1 NextGen", persons: ["Oscar Piastri"] },
  { number: "294", name: "Zhou Guanyu", type: "F1 NextGen", persons: ["Zhou Guanyu"] },
  { number: "295", name: "Yuki Tsunoda", type: "F1 NextGen", persons: ["Yuki Tsunoda"] },
  { number: "296", name: "Nyck De Vries", type: "F1 NextGen", persons: ["Nyck De Vries"] },
  { number: "297", name: "Logan Sargeant", type: "F1 NextGen", persons: ["Logan Sargeant"] },

  // F1 Topps Awards (298-308)
  { number: "298", name: "Lewis Hamilton – Best Overtake of 2022", type: "F1 Topps Awards", persons: ["Lewis Hamilton"] },
  { number: "299", name: "Sergio Perez – 2022 Drive of the Season", type: "F1 Topps Awards", persons: ["Sergio Perez"] },
  { number: "300", name: "Charles Leclerc – 2022 Most Improved Driver", type: "F1 Topps Awards", persons: ["Charles Leclerc"] },
  { number: "301", name: "Christian Horner – 2022 Team Principal of the Season", type: "F1 Topps Awards", persons: ["Christian Horner"] },
  { number: "302", name: "Lando Norris – 2022 Personality of the Year", type: "F1 Topps Awards", persons: ["Lando Norris"] },
  { number: "303", name: "Kevin Magnussen – Pole Position Lap of 2022", type: "F1 Topps Awards", persons: ["Kevin Magnussen"] },
  { number: "304", name: "Pierre Gasly – 2022 Social Media Superstar", type: "F1 Topps Awards", persons: ["Pierre Gasly"] },
  { number: "305", name: "Max Verstappen – 2022 Driver of the Season", type: "F1 Topps Awards", persons: ["Max Verstappen"] },
  { number: "306", name: "Felipe Drugovich – 2022 F2 Driver of the Season", type: "F1 Topps Awards", persons: ["Felipe Drugovich"] },

  // Champion Card (307-309)
  { number: "307", name: "Max Verstappen", type: "Champion Card", persons: ["Max Verstappen"] },
  { number: "308", name: "Felipe Drugovich", type: "Champion Card", persons: ["Felipe Drugovich"] },
  { number: "309", name: "Victor Martins", type: "Champion Card", persons: ["Victor Martins"] },

  // Stars of Tomorrow (310-320)
  { number: "310", name: "Dennis Hauger", type: "Stars of Tomorrow", persons: ["Dennis Hauger"] },
  { number: "311", name: "Enzo Fittipaldi", type: "Stars of Tomorrow", persons: ["Enzo Fittipaldi"] },
  { number: "312", name: "Theo Pourchaire", type: "Stars of Tomorrow", persons: ["Theo Pourchaire"] },
  { number: "313", name: "Victor Martins", type: "Stars of Tomorrow", persons: ["Victor Martins"] },
  { number: "314", name: "Oliver Bearman", type: "Stars of Tomorrow", persons: ["Oliver Bearman"] },
  { number: "315", name: "Jak Crawford", type: "Stars of Tomorrow", persons: ["Jak Crawford"] },
  { number: "316", name: "Ayumu Iwasa", type: "Stars of Tomorrow", persons: ["Ayumu Iwasa"] },
  { number: "317", name: "Jack Doohan", type: "Stars of Tomorrow", persons: ["Jack Doohan"] },
  { number: "318", name: "Clement Novalak", type: "Stars of Tomorrow", persons: ["Clement Novalak"] },
  { number: "319", name: "Richard Verschoor", type: "Stars of Tomorrow", persons: ["Richard Verschoor"] },
  { number: "320", name: "Kush Maini", type: "Stars of Tomorrow", persons: ["Kush Maini"] },

  // F1 Country Pride (321-327)
  { number: "321", name: "Max Verstappen", type: "F1 Country Pride", persons: ["Max Verstappen"] },
  { number: "322", name: "Charles Leclerc", type: "F1 Country Pride", persons: ["Charles Leclerc"] },
  { number: "323", name: "Pierre Gasly", type: "F1 Country Pride", persons: ["Pierre Gasly"] },
  { number: "324", name: "Oscar Piastri", type: "F1 Country Pride", persons: ["Oscar Piastri"] },
  { number: "325", name: "Lance Stroll", type: "F1 Country Pride", persons: ["Lance Stroll"] },
  { number: "326", name: "Nico Hulkenberg", type: "F1 Country Pride", persons: ["Nico Hulkenberg"] },
  { number: "327", name: "Logan Sargeant", type: "F1 Country Pride", persons: ["Logan Sargeant"] },

  // F1 Gladiator (328-342)
  { number: "328", name: "Max Verstappen – Dutch Lion", type: "F1 Gladiator", persons: ["Max Verstappen"] },
  { number: "329", name: "Sergio Perez – Checo", type: "F1 Gladiator", persons: ["Sergio Perez"] },
  { number: "330", name: "Carlos Sainz – Smooth Operator", type: "F1 Gladiator", persons: ["Carlos Sainz"] },
  { number: "331", name: "George Russell – Mr Consistent", type: "F1 Gladiator", persons: ["George Russell"] },
  { number: "332", name: "Lewis Hamilton – Hammertime", type: "F1 Gladiator", persons: ["Lewis Hamilton"] },
  { number: "333", name: "Pierre Gasly – Full Gas", type: "F1 Gladiator", persons: ["Pierre Gasly"] },
  { number: "334", name: "Lando Norris – Dynamo", type: "F1 Gladiator", persons: ["Lando Norris"] },
  { number: "335", name: "Oscar Piastri – Storm", type: "F1 Gladiator", persons: ["Oscar Piastri"] },
  { number: "336", name: "Valtteri Bottas – Flying Finn", type: "F1 Gladiator", persons: ["Valtteri Bottas"] },
  { number: "337", name: "Fernando Alonso – Warrior", type: "F1 Gladiator", persons: ["Fernando Alonso"] },
  { number: "338", name: "Kevin Magnussen – K-MAG", type: "F1 Gladiator", persons: ["Kevin Magnussen"] },
  { number: "339", name: "Nico Hulkenberg – Hulk", type: "F1 Gladiator", persons: ["Nico Hulkenberg"] },
  { number: "340", name: "Yuki Tsunoda – Paradise", type: "F1 Gladiator", persons: ["Yuki Tsunoda"] },
  { number: "341", name: "Alex Albon – Albono", type: "F1 Gladiator", persons: ["Alex Albon"] },
  { number: "342", name: "Logan Sargeant – Rookie", type: "F1 Gladiator", persons: ["Logan Sargeant"] },

  // F1 Legend (343-347)
  { number: "343", name: "Alain Prost", type: "F1 Legend", persons: ["Alain Prost"] },
  { number: "344", name: "Nigel Mansell", type: "F1 Legend", persons: ["Nigel Mansell"] },
  { number: "345", name: "Ayrton Senna", type: "F1 Legend", persons: ["Ayrton Senna"] },
  { number: "346", name: "Michael Schumacher", type: "F1 Legend", persons: ["Michael Schumacher"] },
  { number: "347", name: "David Coulthard", type: "F1 Legend", persons: ["David Coulthard"] },

  // 100 Club (348-351)
  { number: "348", name: "Max Verstappen", type: "100 Club", persons: ["Max Verstappen"] },
  { number: "349", name: "George Russell", type: "100 Club", persons: ["George Russell"] },
  { number: "350", name: "Lewis Hamilton", type: "100 Club", persons: ["Lewis Hamilton"] },
  { number: "351", name: "Fernando Alonso", type: "100 Club", persons: ["Fernando Alonso"] },

  // 100 Club Legend (352)
  { number: "352", name: "Michael Schumacher", type: "100 Club Legend", persons: ["Michael Schumacher"] },

  // Signature Style (353-372)
  { number: "353", name: "Max Verstappen", type: "Signature Style", persons: ["Max Verstappen"] },
  { number: "354", name: "Sergio Perez", type: "Signature Style", persons: ["Sergio Perez"] },
  { number: "355", name: "Charles Leclerc", type: "Signature Style", persons: ["Charles Leclerc"] },
  { number: "356", name: "Carlos Sainz", type: "Signature Style", persons: ["Carlos Sainz"] },
  { number: "357", name: "George Russell", type: "Signature Style", persons: ["George Russell"] },
  { number: "358", name: "Lewis Hamilton", type: "Signature Style", persons: ["Lewis Hamilton"] },
  { number: "359", name: "Esteban Ocon", type: "Signature Style", persons: ["Esteban Ocon"] },
  { number: "360", name: "Pierre Gasly", type: "Signature Style", persons: ["Pierre Gasly"] },
  { number: "361", name: "Lando Norris", type: "Signature Style", persons: ["Lando Norris"] },
  { number: "362", name: "Oscar Piastri", type: "Signature Style", persons: ["Oscar Piastri"] },
  { number: "363", name: "Valtteri Bottas", type: "Signature Style", persons: ["Valtteri Bottas"] },
  { number: "364", name: "Zhou Guanyu", type: "Signature Style", persons: ["Zhou Guanyu"] },
  { number: "365", name: "Fernando Alonso", type: "Signature Style", persons: ["Fernando Alonso"] },
  { number: "366", name: "Lance Stroll", type: "Signature Style", persons: ["Lance Stroll"] },
  { number: "367", name: "Kevin Magnussen", type: "Signature Style", persons: ["Kevin Magnussen"] },
  { number: "368", name: "Nico Hulkenberg", type: "Signature Style", persons: ["Nico Hulkenberg"] },
  { number: "369", name: "Yuki Tsunoda", type: "Signature Style", persons: ["Yuki Tsunoda"] },
  { number: "370", name: "Nyck De Vries", type: "Signature Style", persons: ["Nyck De Vries"] },
  { number: "371", name: "Alex Albon", type: "Signature Style", persons: ["Alex Albon"] },
  { number: "372", name: "Logan Sargeant", type: "Signature Style", persons: ["Logan Sargeant"] },
];

async function main() {
  console.log(`Seeding: ${SET_NAME} (${ALL_CARDS.length} cards)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("Formula 1", universeId);
  const brandId = await builder.getOrCreateBrand("Turbo Attax", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Turbo Attax 2023", franchiseId, brandId);
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
    const cardId = `${SET_ID}-${String(row.number).replace("MEG-", "meg").replace("LE-", "le").replace("GC-", "gc")}`;

    const existing = await prisma.card.findUnique({ where: { id: cardId } });
    if (existing) {
      skipped++;
      continue;
    }

    // Create persons if any
    const personIds: string[] = [];
    if (row.persons) {
      for (const personName of row.persons) {
        personIds.push(await builder.getOrCreatePerson(personName));
      }
    }

    const card = await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: String(row.number),
        setId: set.id,
        supertype: row.type,
        persons: personIds.length > 0 ? { connect: personIds.map((id) => ({ id })) } : undefined,
      },
    });

    await prisma.variant.create({
      data: { cardId: card.id, printingId: basePrintingId },
    });

    created++;
    if ((i + 1) % 50 === 0) {
      console.log(`  [${i + 1}/${ALL_CARDS.length}] created=${created} skipped=${skipped}`);
    }
  }

  console.log(`Done. Created ${created} cards, skipped ${skipped}. Set: ${SET_NAME} (${(Date.now() - t0) / 1000}s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });