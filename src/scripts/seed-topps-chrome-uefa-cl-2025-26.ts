import { prisma } from "../ingestion/engine/prisma";
import { builder } from "../ingestion/engine/builder";

/**
 * Seeds the 2025/26 Topps Chrome UEFA Champions League trading card set.
 *
 * Source: user-supplied checklist (base 200 + base parallels; "Base – Club &
 * Country Variations" explicitly "Checklist not provided" in the source, so
 * it is skipped rather than fabricated; Autographs section — Chrome, Chrome
 * Legends, Future Stars, Dual/Triple/Quad, Black Lazer, Piece Of Club History
 * Booklets, Global Attraction Summer 2026, Road To Glory, Bowman UEFA Youth
 * League, Marks Of Excellence, UCL Final Performers (Linkin Park — not
 * footballers, no Team link), Superior Signatures Veterans+Legends; Inserts
 * section — Bowman UYL, Last Dance, Wonderkids, Silenced, Power Players,
 * Veni Vidi Vici, Youthquake, Ultra Violet, Radiating Rookies, Shadow Etch,
 * Bionic, Metaverse, Budapest At Night, Helix, Champion Gold Refractors,
 * three single-card Trophy Superfractors, The Grail, Anime.
 *
 * No print-run numbers were given in the source for base/autograph parallels
 * (unlike some other seeded Topps Chrome sets) except "Superfractor", which
 * is a universal 1/1 across all Topps Chrome products — that one is set to
 * serialTo: 1, nothing else is invented.
 *
 * Card id scheme: `${SET_ID}-${subsetSlug}-${numberSlug}` for everything
 * except the base set (`${SET_ID}-${number}`) — namespaced per subset since
 * source numbering prefixes collide across subsets (e.g. "CA-" is both
 * Chrome Autographs and the Anime insert).
 *
 * Images are intentionally NOT sourced here — that's a later phase.
 */
const SET_ID = "topps-chrome-uefa-cl-2025-26";
const SET_NAME = "Topps Chrome UEFA Champions League 2025/26";

interface ParallelDef {
  name: string;
  serialTo?: number;
}

interface BaseRow {
  number: string;
  name: string;
  team: string;
  rookie: boolean;
  futureStars: boolean;
}

interface InsertRow {
  subset: string;
  number: string;
  name: string;
  persons: string[];
  teams: string[];
  auto?: boolean;
  serialTo?: number;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------------------
// BASE SET (200 cards)
// ---------------------------------------------------------------------------
const BASE_TEXT = `
1 Rayan Cherki, Manchester City
2 Bernardo Silva, Manchester City
3 Ousmane Dembélé, Paris Saint-Germain
4 Michael Olise, FC Bayern München
5 Jobe Bellingham, Borussia Dortmund RC
6 Jeremie Frimpong, Liverpool FC
7 Matteo Politano, SSC Napoli
8 Jamaldeen Jimoh-Aloba, Aston Villa RC
9 Axel Tapé, Bayer 04 Leverkusen RC
10 Lamine Yamal, FC Barcelona
11 Stanislav Lobotka, SSC Napoli
12 Bukayo Saka, Arsenal FC
13 Antony, Real Betis Balompié
14 João Neves, Paris Saint-Germain
15 Weston McKennie, Juventus
16 Richard Ríos, SL Benfica RC
17 Jonathan David, Juventus
18 Brennan Johnson, Tottenham Hotspur
19 Gabriel Martinelli, Arsenal FC
20 Iñaki Williams, Athletic Club
21 Ethan Nwaneri, Arsenal FC (Future Stars)
22 Senny Mayulu, Paris Saint-Germain (Future Stars)
23 Joelinton, Newcastle United
24 Malik Tillman, Bayer 04 Leverkusen
25 Julien Duranville, Borussia Dortmund
26 Robin Mirisola, KRC Genk RC
27 Christian Kofane, Bayer 04 Leverkusen RC
28 John McGinn, Aston Villa
29 Kendry Páez, RC Strasbourg Alsace RC
30 Jota, Celtic FC
31 Eduardo Camavinga, Real Madrid C.F.
32 Shumaira Mheuka, Chelsea FC RC
33 Savinho, Manchester City
34 Vangelis Pavlidis, SL Benfica
35 Isco, Real Betis Balompié
36 Hugo Larsson, Eintracht Frankfurt
37 Federico Dimarco, FC Internazionale Milano
38 Nico Williams, Athletic Club
39 Dean Huijsen, Real Madrid C.F.
40 Reo Hatate, Celtic FC
41 Scott McTominay, SSC Napoli
42 Viktor Gyökeres, Arsenal FC
43 Sean Steur, AFC Ajax RC
44 Alejo Sarco, Bayer 04 Leverkusen RC
45 Mohamed Diomandé, Rangers F.C.
46 Vitinha, Paris Saint-Germain
47 Jérémy Doku, Manchester City
48 Marcus Thuram, FC Internazionale Milano
49 Divine Mukasa, Manchester City RC
50 William Gomes, FC Porto
51 Cucho, Real Betis Balompié
52 Myles Lewis-Skelly, Arsenal FC (Future Stars)
53 Morgan Gibbs-White, Nottingham Forest
54 Robert Lewandowski, FC Barcelona
55 Joshua Kimmich, FC Bayern München
56 Mikey Moore, Rangers F.C. (Future Stars)
57 Max Dowman, Arsenal FC RC
58 Tyrique George, Chelsea FC (Future Stars)
59 Serhou Guirassy, Borussia Dortmund
60 Eduardo Felicíssimo, Sporting Clube de Portugal RC
61 Elye Wahi, Eintracht Frankfurt
62 Martim Fernandes, FC Porto
63 Bradley Barcola, Paris Saint-Germain
64 Jude Bellingham, Real Madrid C.F.
65 Federico Valverde, Real Madrid C.F.
66 Estêvão Willian, Chelsea FC RC
67 Alexis Mac Allister, Liverpool FC
68 Nick Woltemade, Newcastle United
69 Nuno Mendes, Paris Saint-Germain
70 Reggie Walsh, Chelsea FC RC
71 Khéphren Thuram, Juventus
72 Ibrahim Maza, Bayer 04 Leverkusen
73 Giovanni Leoni, Liverpool FC RC
74 Florian Wirtz, Liverpool FC
75 Emiliano Martínez, Aston Villa
76 Romelu Lukaku, SSC Napoli
77 Giovanni Di Lorenzo, SSC Napoli
78 Dominik Szoboszlai, Liverpool FC
79 Virgil van Dijk, Liverpool FC
80 Omar Marmoush, Manchester City
81 Julian Brandt, Borussia Dortmund
82 Antoine Griezmann, Atlético de Madrid
83 Rodrigo Mora, FC Porto (Future Stars)
84 Claudio Echeverri, Bayer 04 Leverkusen RC
85 Xavi Simons, Tottenham Hotspur
86 Endrick, Real Madrid C.F. (Future Stars)
87 Gabri Veiga, FC Porto
88 Wisdom Mike, FC Bayern München RC
89 Mohammed Kudus, Tottenham Hotspur
90 Alphonso Davies, FC Bayern München
91 Victor Froholdt, FC Porto RC
92 Marquinhos, Paris Saint-Germain
93 Quim Junyent, FC Barcelona RC
94 Lucas Michal, AS Monaco RC
95 Geovany Quenda, Sporting Clube de Portugal (Future Stars)
96 Elliot Anderson, Nottingham Forest
97 Raphinha, FC Barcelona
98 Daizen Maeda, Celtic FC
99 Nico Schlotterbeck, Borussia Dortmund
100 Giuliano Simeone, Atlético de Madrid
101 Minjae Kim, FC Bayern München
102 Rodrygo, Real Madrid C.F.
103 Phil Foden, Manchester City
104 Ousmane Diomande, Sporting Clube de Portugal
105 Maroan Sannadi, Athletic Club
106 Ricardo Pepi, PSV Eindhoven
107 Andrey Santos, Chelsea FC
108 Nicolò Barella, FC Internazionale Milano
109 Sandro Tonali, Newcastle United
110 Emmanuel Emegha, RC Strasbourg Alsace
111 Dro, FC Barcelona RC
112 Kylian Mbappé, Real Madrid C.F.
113 William Saliba, Arsenal FC
114 Abdoul Ouattara, RC Strasbourg Alsace RC
115 Vini Jr., Real Madrid C.F.
116 Alexander Isak, Liverpool FC
117 Bruno Guimarães, Newcastle United
118 Cole Palmer, Chelsea FC
119 Arthur Theate, Eintracht Frankfurt
120 Ousmane Diallo, Borussia Dortmund RC
121 Lucas Bergvall, Tottenham Hotspur
122 Noah Adedeji-Sternberg, KRC Genk RC
123 Takumi Minamino, AS Monaco
124 Ollie Watkins, Aston Villa
125 Ben Parkinson, Newcastle United RC
126 Jarne Steuckers, KRC Genk RC
127 Kenneth Taylor, AFC Ajax
128 Karim Adeyemi, Borussia Dortmund
129 George Ilenikhena, AS Monaco (Future Stars)
130 Jamal Musiala, FC Bayern München
131 Luis Henrique, FC Internazionale Milano
132 Gavi, FC Barcelona
133 Samu Aghehowa, FC Porto
134 Callum Olusesi, Tottenham Hotspur RC
135 Frenkie de Jong, FC Barcelona
136 Mohamed Salah, Liverpool FC
137 Omar Janneh, Atlético de Madrid RC
138 Ferran Torres, FC Barcelona
139 Ivan Perišić, PSV Eindhoven
140 Nasser Djiga, Rangers F.C. RC
141 Trent Alexander-Arnold, Real Madrid C.F.
142 Reigan Heskey, Manchester City RC
143 Alessandro Bastoni, FC Internazionale Milano
144 Dominic Solanke, Tottenham Hotspur
145 Denzel Dumfries, FC Internazionale Milano
146 Michael Bresser, PSV Eindhoven RC
147 Kenan Yildiz, Juventus
148 Alistair Johnston, Celtic FC
149 Abde Ezzalzouli, Real Betis Balompié
150 Konstantinos Karetsas, KRC Genk RC
151 Mika Godts, AFC Ajax
152 Gleison Bremer, Juventus
153 Patrik Schick, Bayer 04 Leverkusen
154 Julián Alvarez, Atlético de Madrid
155 Tijjani Reijnders, Manchester City
156 Lautaro Martínez, FC Internazionale Milano
157 Martin Ødegaard, Arsenal FC
158 Ibrahim Mbaye, Paris Saint-Germain (Future Stars)
159 Anthony Gordon, Newcastle United
160 Leandro Santos, SL Benfica RC
161 Igor Jesus, Nottingham Forest RC
162 Mario Götze, Eintracht Frankfurt
163 Pio Esposito, FC Internazionale Milano RC
164 Declan Rice, Arsenal FC
165 Archie Gray, Tottenham Hotspur
166 Quentin Ndjantou, Paris Saint-Germain RC
167 Khvicha Kvaratskhelia, Paris Saint-Germain
168 João Rego, SL Benfica RC
169 Sergiño Dest, PSV Eindhoven
170 Warren Zaïre-Emery, Paris Saint-Germain
171 Rodri, Manchester City
172 Franco Mastantuono, Real Madrid C.F. RC
173 Don-Angelo Konadu, AFC Ajax RC
174 Pablo García, Real Betis Balompié RC
175 Dušan Vlahović, Juventus
176 Hugo Ekitike, Liverpool FC
177 Mathis Amougou, RC Strasbourg Alsace RC
178 Mika Biereth, AS Monaco
179 Luis Díaz, FC Bayern München
180 Guela Doué, RC Strasbourg Alsace
181 Erling Haaland, Manchester City
182 Harry Kane, FC Bayern München
183 Pau Cubarsí, FC Barcelona
184 João Pedro, Chelsea FC
185 Kang-in Lee, Paris Saint-Germain
186 Chris Wood, Nottingham Forest
187 Lennart Karl, FC Bayern München RC
188 James Tavernier, Rangers F.C.
189 Conor Gallagher, Atlético de Madrid
190 Guille Fernández, FC Barcelona RC
191 Rio Ngumoha, Liverpool FC RC
192 Liam Delap, Chelsea FC
193 Ryan Gravenberch, Liverpool FC
194 Eberechi Eze, Arsenal FC
195 Oihan Sancet, Athletic Club
196 Pedri, FC Barcelona
197 Morgan Rogers, Aston Villa
198 Désiré Doué, Paris Saint-Germain
199 Morten Hjulmand, Sporting Clube de Portugal
200 Kevin De Bruyne, SSC Napoli
`.trim();

function parseBase(text: string): BaseRow[] {
  return text.split("\n").map((line) => {
    const m = line.match(/^(\d+)\s+(.+)$/);
    if (!m) throw new Error(`bad base line: ${line}`);
    const number = m[1];
    let rest = m[2];
    let futureStars = false;
    const fs = rest.match(/^(.*)\s\(Future Stars\)$/);
    if (fs) {
      rest = fs[1];
      futureStars = true;
    }
    const ci = rest.lastIndexOf(", ");
    const name = rest.slice(0, ci).trim();
    let team = rest.slice(ci + 2).trim();
    let rookie = false;
    const rc = team.match(/^(.*)\sRC$/);
    if (rc) {
      team = rc[1].trim();
      rookie = true;
    }
    return { number, name, team, rookie, futureStars };
  });
}

const BASE_ROWS = parseBase(BASE_TEXT);

// ---------------------------------------------------------------------------
// BASE PARALLELS (no print-run numbers given in source except Superfractor)
// ---------------------------------------------------------------------------
const BASE_PARALLELS: ParallelDef[] = [
  { name: "Refractor" },
  { name: "Negative" },
  { name: "Red/Gold (Hongbao Exclusive)" },
  { name: "Raywave (Value Exclusive)" },
  { name: "Pulsar (Hanger Exclusive)" },
  { name: "X-Fractor (Mega Exclusive)" },
  { name: "Geometric (Breaker Exclusive)" },
  { name: "Prism" },
  { name: "Teal Refractor" },
  { name: "Teal Lava (Hobby SKU Exclusive)" },
  { name: "Teal Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Yellow Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Pink Refractor" },
  { name: "Pink Lava (Hobby SKU Exclusive)" },
  { name: "Pink X-Fractor (Mega Exclusive)" },
  { name: "Pink Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Aqua Refractor" },
  { name: "Aqua Lava (Hobby SKU Exclusive)" },
  { name: "Aqua X-Fractor (Mega Exclusive)" },
  { name: "Aqua Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Blue Refractor" },
  { name: "Blue Lava (Hobby SKU Exclusive)" },
  { name: "Blue X-Fractor (Mega Exclusive)" },
  { name: "Blue Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Green Refractor" },
  { name: "Green Lava (Hobby SKU Exclusive)" },
  { name: "Green X-Fractor (Mega Exclusive)" },
  { name: "Green Geometric (Breaker Exclusive)" },
  { name: "Green Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Purple Refractor" },
  { name: "Purple Lava (Hobby SKU Exclusive)" },
  { name: "Purple X-Fractor (Mega Exclusive)" },
  { name: "Purple Geometric (Breaker Exclusive)" },
  { name: "Purple Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Gold Refractor" },
  { name: "Gold Lava (Hobby SKU Exclusive)" },
  { name: "Gold X-Fractor (Mega Exclusive)" },
  { name: "Gold Geometric (Breaker Exclusive)" },
  { name: "Gold Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "White Refractor (Hobby SKU Exclusive)" },
  { name: "Orange Refractor" },
  { name: "Orange Lava (Hobby SKU Exclusive)" },
  { name: "Orange X-Fractor (Mega Exclusive)" },
  { name: "Orange Geometric (Breaker Exclusive)" },
  { name: "Orange Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "First 11 (FDI Exclusive)" },
  { name: "Black Refractor" },
  { name: "Black Lava (Hobby SKU Exclusive)" },
  { name: "Black X-Fractor (Mega Exclusive)" },
  { name: "Black Geometric (Breaker Exclusive)" },
  { name: "Black Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Hongbao Green Foil (Hongbao Exclusive)" },
  { name: "Hongbao Red Foil (Hongbao Exclusive)" },
  { name: "Red Refractor" },
  { name: "Red Lava (Hobby SKU Exclusive)" },
  { name: "Red X-Fractor (Mega Exclusive)" },
  { name: "Red Geometric (Breaker Exclusive)" },
  { name: "Red Mini Diamonds (Value/Hanger Exclusive)" },
  { name: "Frozenfractor" },
  { name: "Superfractor", serialTo: 1 },
];

// ---------------------------------------------------------------------------
// Shared parallel tiers reused across many autograph/insert subsets
// ---------------------------------------------------------------------------
const REFRACTOR_11: ParallelDef[] = [
  { name: "Aqua Refractor" },
  { name: "Blue Refractor" },
  { name: "Green Refractor" },
  { name: "Purple Refractor" },
  { name: "Gold Refractor" },
  { name: "Orange Refractor" },
  { name: "Black Refractor" },
  { name: "Hongbao Red Refractor" },
  { name: "Hongbao Green Refractor" },
  { name: "Red Refractor" },
  { name: "Superfractor", serialTo: 1 },
];

const SUBSET_PARALLELS: Record<string, ParallelDef[]> = {
  "Chrome Autograph": [
    { name: "Geometric (Breaker Exclusive)" },
    { name: "Pink" },
    { name: "Aqua" },
    { name: "Aqua Lava (Hobby/Jumbo Exclusive)" },
    { name: "Blue" },
    { name: "Blue Lava (Hobby/Jumbo Exclusive)" },
    { name: "Green" },
    { name: "Green Lava (Hobby/Jumbo Exclusive)" },
    { name: "Green Geometric (Breaker Exclusive)" },
    { name: "Purple" },
    { name: "Purple Lava (Hobby/Jumbo Exclusive)" },
    { name: "Purple Geometric (Breaker Exclusive)" },
    { name: "Gold" },
    { name: "Gold Lava (Hobby/Jumbo Exclusive)" },
    { name: "Gold Geometric (Breaker Exclusive)" },
    { name: "Orange" },
    { name: "Orange Lava (Hobby/Jumbo Exclusive)" },
    { name: "Orange Geometric (Breaker Exclusive)" },
    { name: "First 11 (FDI Exclusive)" },
    { name: "Black" },
    { name: "Black Lava (Hobby/Jumbo Exclusive)" },
    { name: "Black Geometric (Breaker Exclusive)" },
    { name: "Hongbao Green (Hongbao Exclusive)" },
    { name: "Hongbao Red (Hongbao Exclusive)" },
    { name: "Red" },
    { name: "Red Lava (Hobby/Jumbo Exclusive)" },
    { name: "Red Geometric (Breaker Exclusive)" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Chrome Legends Autograph": [
    { name: "Pink" },
    { name: "Aqua" },
    { name: "Aqua Lava (Hobby/Jumbo Exclusive)" },
    { name: "Blue" },
    { name: "Blue Lava (Hobby/Jumbo Exclusive)" },
    { name: "Green" },
    { name: "Green Lava (Hobby/Jumbo Exclusive)" },
    { name: "Purple" },
    { name: "Purple Lava (Hobby/Jumbo Exclusive)" },
    { name: "Purple Geometric (Breaker Exclusive)" },
    { name: "Gold" },
    { name: "Gold Lava (Hobby/Jumbo Exclusive)" },
    { name: "Gold Geometric (Breaker Exclusive)" },
    { name: "Orange" },
    { name: "Orange Lava (Hobby/Jumbo Exclusive)" },
    { name: "Orange Geometric (Breaker Exclusive)" },
    { name: "First 11 (FDI Exclusive)" },
    { name: "Black" },
    { name: "Black Lava (Hobby/Jumbo Exclusive)" },
    { name: "Black Geometric (Breaker Exclusive)" },
    { name: "Hongbao Green (Hongbao Exclusive)" },
    { name: "Hongbao Red (Hongbao Exclusive)" },
    { name: "Red" },
    { name: "Red Lava (Hobby/Jumbo Exclusive)" },
    { name: "Red Geometric (Breaker Exclusive)" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Dual Autograph": [
    { name: "Orange" },
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Triple Autograph": [
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Quad Autograph": [{ name: "Superfractor", serialTo: 1 }],
  "Black Lazer Autograph": [
    { name: "Black/Blue Lazer Refractor" },
    { name: "Black/Neon Green Lazer Refractor" },
    { name: "Black/Purple Lazer Refractor" },
    { name: "Black/Gold Lazer Refractor" },
    { name: "Black/Orange Lazer Refractor" },
    { name: "Red/Black Lazer Refractor" },
    { name: "Nightshade Lazer Refractor" },
  ],
  "Global Attraction Summer of 2026 Autograph": [
    { name: "Gold" },
    { name: "Orange" },
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Road To Glory Autograph": [
    { name: "Green" },
    { name: "Purple" },
    { name: "Gold" },
    { name: "Orange" },
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Bowman UEFA Youth League Autograph": [
    { name: "Gold" },
    { name: "Orange" },
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Marks Of Excellence": [
    { name: "Green" },
    { name: "Gold" },
    { name: "Orange" },
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "UCL Final Performers Autograph": [
    { name: "Black" },
    { name: "Blue" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "UCL Final Performers Dual Autograph": [{ name: "Superfractor", serialTo: 1 }],
  "Superior Signatures Veterans & Rookies": [
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Superior Signatures Legends": [
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Bowman UEFA Youth League": REFRACTOR_11,
  "Last Dance": REFRACTOR_11,
  Wonderkids: REFRACTOR_11,
  Silenced: REFRACTOR_11,
  "Power Players": REFRACTOR_11,
  "Veni, Vidi, Vici": [{ name: "Superfractor", serialTo: 1 }],
  Youthquake: [
    { name: "Green Refractor" },
    { name: "Purple Refractor" },
    { name: "Gold Refractor" },
    { name: "Orange Refractor" },
    { name: "Black Refractor" },
    { name: "Red Refractor" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Ultra Violet": [
    { name: "Green" },
    { name: "Gold" },
    { name: "Orange" },
    { name: "Black" },
    { name: "Red" },
    { name: "Superfractor", serialTo: 1 },
  ],
  "Radiating Rookies": [{ name: "Superfractor", serialTo: 1 }],
  "Shadow Etch": [{ name: "Superfractor", serialTo: 1 }],
  Bionic: [{ name: "Superfractor", serialTo: 1 }],
  Metaverse: [{ name: "Superfractor", serialTo: 1 }],
  Helix: [{ name: "Superfractor", serialTo: 1 }],
  "Champion Gold Refractors": [{ name: "Superfractor", serialTo: 1 }],
  Anime: [
    { name: "Black Refractor" },
    { name: "Red Refractor" },
    { name: "Superfractor", serialTo: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Generic "CODE Name, Team" / "CODE Name1/Name2, Team1/Team2" line parser
// ---------------------------------------------------------------------------
function parseCodeLines(subset: string, text: string, opts?: { auto?: boolean }): InsertRow[] {
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const sp = line.indexOf(" ");
      const number = line.slice(0, sp);
      const rest = line.slice(sp + 1);
      const ci = rest.lastIndexOf(", ");
      if (ci === -1) {
        return { subset, number, name: rest.trim(), persons: [], teams: [], auto: opts?.auto };
      }
      const name = rest.slice(0, ci).trim();
      const team = rest.slice(ci + 2).trim();
      return { subset, number, name, persons: name.split("/").map((s) => s.trim()), teams: team.split("/").map((s) => s.trim()), auto: opts?.auto };
    });
}

// ---- Chrome Autographs (CA-, 108) ----
const CHROME_AUTO_TEXT = `
CA-A Antony, Real Betis Balompié
CA-AB Alessandro Bastoni, FC Internazionale Milano
CA-AD Alphonso Davies, FC Bayern München
CA-AE Anthony Elanga, Newcastle United
CA-AG Antoine Griezmann, Atlético de Madrid
CA-AJ Alistair Johnston, Celtic FC
CA-AK Arnaud Kalimuendo, Nottingham Forest
CA-AL Julián Alvarez, Atlético de Madrid
CA-AR Arda Güler, Real Madrid C.F.
CA-AS Alejo Sarco, Bayer 04 Leverkusen
CA-AT Aurélien Tchouaméni, Real Madrid C.F.
CA-BB Bradley Barcola, Paris Saint-Germain
CA-BG Bruno Guimarães, Newcastle United
CA-BJ Brennan Johnson, Tottenham Hotspur
CA-BR Julian Brandt, Borussia Dortmund
CA-BS Bukayo Saka, Arsenal FC
CA-CCV Cameron Carter-Vickers, Celtic FC
CA-CG Cody Gakpo, Liverpool FC
CA-CP Cole Palmer, Chelsea FC
CA-CW Chris Wood, Nottingham Forest
CA-DH Dean Huijsen, Real Madrid C.F.
CA-DK Don-Angelo Konadu, AFC Ajax
CA-DM Donyell Malen, Aston Villa
CA-DO Dani Olmo, FC Barcelona
CA-DR Declan Rice, Arsenal FC
CA-DS Dominic Solanke, Tottenham Hotspur
CA-DU Destiny Udogie, Tottenham Hotspur
CA-DV Dušan Vlahović, Juventus
CA-DZ Daizen Maeda, Celtic FC
CA-EC Eduardo Camavinga, Real Madrid C.F.
CA-EH Erling Haaland, Manchester City
CA-EL Elye Wahi, Eintracht Frankfurt
CA-EM Emiliano Martínez, Aston Villa
CA-EN Arne Engels, Celtic FC
CA-EW Estêvão Willian, Chelsea FC
CA-FB Folarin Balogun, AS Monaco
CA-FC Francisco Conceição, Juventus
CA-FM Franco Mastantuono, Real Madrid C.F.
CA-FT Ferran Torres, FC Barcelona
CA-FV Federico Valverde, Real Madrid C.F.
CA-G Gavi, FC Barcelona
CA-GF Guille Fernández, FC Barcelona
CA-GL Giovanni Leoni, Liverpool FC
CA-GM Gabriel Martinelli, Arsenal FC
CA-GO Anthony Gordon, Newcastle United
CA-GU Serhou Guirassy, Borussia Dortmund
CA-HA Reo Hatate, Celtic FC
CA-HB Héctor Bellerín, Real Betis Balompié
CA-HE Hugo Ekitike, Liverpool FC
CA-HK Harry Kane, FC Bayern München
CA-IK Ibrahima Konaté, Liverpool FC
CA-IS Isco, Real Betis Balompié
CA-JA Jamal Musiala, FC Bayern München
CA-JB Jobe Bellingham, Borussia Dortmund
CA-JF Jeremie Frimpong, Liverpool FC
CA-JM John McGinn, Aston Villa
CA-JN João Neves, Paris Saint-Germain
CA-JP João Pedro, Chelsea FC
CA-JU Jude Bellingham, Real Madrid C.F.
CA-KDB Kevin De Bruyne, SSC Napoli
CA-KH Khvicha Kvaratskhelia, Paris Saint-Germain
CA-KI Joshua Kimmich, FC Bayern München
CA-KK Konstantinos Karetsas, KRC Genk
CA-KP Kendry Páez, RC Strasbourg Alsace
CA-KY Kenan Yildiz, Juventus
CA-LK Lennart Karl, FC Bayern München
CA-LM Lautaro Martínez, FC Internazionale Milano
CA-LO Loïs Openda, Juventus
CA-LY Lamine Yamal, FC Barcelona
CA-MB Maximilian Beier, Borussia Dortmund
CA-MD Max Dowman, Arsenal FC
CA-MG Marc Guiu, Chelsea FC
CA-MI Michael Olise, FC Bayern München
CA-MK Mohammed Kudus, Tottenham Hotspur
CA-MN Manuel Neuer, FC Bayern München
CA-MO Martin Ødegaard, Arsenal FC
CA-MR Morgan Rogers, Aston Villa
CA-MS Mohamed Salah, Liverpool FC
CA-MT Mario Götze, Eintracht Frankfurt
CA-MU Divine Mukasa, Manchester City
CA-MZ Milos Kerkez, Liverpool FC
CA-NI Nico Williams, Athletic Club
CA-NM Nuno Mendes, Paris Saint-Germain
CA-OB Oscar Bobb, Manchester City
CA-OD Ousmane Dembélé, Paris Saint-Germain
CA-OG Oscar Gloukh, AFC Ajax
CA-OW Ollie Watkins, Aston Villa
CA-P Pedri, FC Barcelona
CA-PA Pablo Barrios, Atlético de Madrid
CA-PB Paris Brunner, AS Monaco
CA-PF Phil Foden, Manchester City
CA-PG Pablo García, Real Betis Balompié
CA-QJ Quim Junyent, FC Barcelona
CA-QN Quentin Ndjantou, Paris Saint-Germain
CA-RD Rodrygo, Real Madrid C.F.
CA-RH Rasmus Højlund, SSC Napoli
CA-RHE Reigan Heskey, Manchester City
CA-RL Robert Lewandowski, FC Barcelona
CA-RN Rio Ngumoha, Liverpool FC
CA-RW Reggie Walsh, Chelsea FC
CA-S Savinho, Manchester City
CA-ST Sandro Tonali, Newcastle United
CA-TR Tijjani Reijnders, Manchester City
CA-VJ Vini Jr., Real Madrid C.F.
CA-VVD Virgil van Dijk, Liverpool FC
CA-WP Willian Pacho, Paris Saint-Germain
CA-WS William Saliba, Arsenal FC
CA-XS Xavi Simons, Tottenham Hotspur
`;

// ---- Chrome Legends Autographs (65) — note CA-IA appears under this
// section header in the source despite the mismatched prefix; preserved
// verbatim rather than "corrected" to CLA-IA. ----
const CHROME_LEGENDS_TEXT = `
CA-IA Adriano, FC Internazionale Milano
CLA-ADP Alessandro Del Piero, Juventus
CLA-AI Andrés Iniesta, FC Barcelona
CLA-AP Andrea Pirlo, AC Milan
CLA-AS Alan Shearer, Newcastle United
CLA-BA Roberto Baggio, Juventus
CLA-BS Bastian Schweinsteiger, FC Bayern München
CLA-CT Carlos Tevez, Juventus
CLA-CV Christian Vieri, FC Internazionale Milano
CLA-DA Daniel Sturridge, Liverpool FC
CLA-DS David Silva, Manchester City
CLA-DT David Trezeguet, Juventus
CLA-EH Eden Hazard, Chelsea FC
CLA-FI Filippo Inzaghi, AC Milan
CLA-FL Frank Lampard, Chelsea FC
CLA-FR Franck Ribéry, FC Bayern München
CLA-FT Fernando Torres, Liverpool FC
CLA-G Guti, Real Madrid C.F.
CLA-GB Gareth Bale, Tottenham Hotspur
CLA-GN Gary Neville, Manchester United
CLA-HL Henrik Larsson, Celtic FC
CLA-IC Iker Casillas, Real Madrid C.F.
CLA-IW Ian Wright, Arsenal FC
CLA-JC Jamie Carragher, Liverpool FC
CLA-JM Juan Mata, Chelsea FC
CLA-JT John Terry, Chelsea FC
CLA-KK Kaká, AC Milan
CLA-LM Lionel Messi, FC Barcelona
CLA-LO Lothar Matthäus, FC Internazionale Milano
CLA-LS Luis Suárez, FC Barcelona
CLA-MD Luka Modrić, Tottenham Hotspur
CLA-MK Miroslav Klose, FC Bayern München
CLA-MO Mesut Özil, Real Madrid C.F.
CLA-MR Marco Reus, Borussia Dortmund
CLA-NJ Neymar Jr, Paris Saint-Germain
CLA-PL Philipp Lahm, FC Bayern München
CLA-PM Paolo Maldini, AC Milan
CLA-PN Pavel Nedvěd, Juventus
CLA-PS Paul Scholes, Manchester United
CLA-R Rivaldo, FC Barcelona
CLA-R10 Ronaldinho, FC Barcelona
CLA-R9 Ronaldo, FC Internazionale Milano
CLA-RA Raúl, Real Madrid C.F.
CLA-RG Ryan Giggs, Manchester United
CLA-RM Riyad Mahrez, Manchester City
CLA-RO Romário, FC Barcelona
CLA-RVP Robin van Persie, Manchester United
CLA-SA Sergio Agüero, Manchester City
CLA-SAF Sir Alex Ferguson, Manchester United
CLA-SB Sergio Busquets, FC Barcelona
CLA-SC Santi Cazorla, Arsenal FC
CLA-SDB David Beckham, Real Madrid C.F.
CLA-SE Samuel Eto'o, FC Internazionale Milano
CLA-SH Andriy Shevchenko, AC Milan
CLA-SK Shinji Kagawa, Borussia Dortmund
CLA-SM Sadio Mané, Liverpool FC
CLA-TH Thierry Henry, Arsenal FC
CLA-TK Toni Kroos, Real Madrid C.F.
CLA-TS Thiago Silva, Paris Saint-Germain
CLA-WR Wayne Rooney, Manchester United
CLA-WS Wesley Sneijder, FC Internazionale Milano
CLA-XH Xavi Hernández, FC Barcelona
CLA-YT Yaya Touré, Manchester City
CLA-ZI Zlatan Ibrahimović, Paris Saint-Germain
CLA-ZZ Zinédine Zidane, Real Madrid C.F.
`;

// ---- Future Stars Autographs (6) ----
const FUTURE_STARS_AUTO_TEXT = `
FSA-E Endrick, Real Madrid C.F.
FSA-GQ Geovany Quenda, Sporting Clube de Portugal
FSA-MLS Myles Lewis-Skelly, Arsenal FC
FSA-MM Mikey Moore, Rangers F.C.
FSA-RM Rodrigo Mora, FC Porto
FSA-SM Senny Mayulu, Paris Saint-Germain
`;

// ---- Dual Autographs (26) ----
const DUAL_AUTO_TEXT = `
CDA-BF David Beckham/Sir Alex Ferguson, Manchester United
CDA-BM Bastian Schweinsteiger/Miroslav Klose, FC Bayern München
CDA-CL Cole Palmer/Frank Lampard, Chelsea FC
CDA-GA Antoine Griezmann/Julián Alvarez, Atlético de Madrid
CDA-HF Erling Haaland/Phil Foden, Manchester City
CDA-HN Reo Hatate/Shunsuke Nakamura, Celtic FC
CDA-IR Zlatan Ibrahimović/Ronaldo, FC Internazionale Milano
CDA-KB Konstantino Karetsas/Kevin De Bruyne, KRC Genk
CDA-KP Kaká/Andrea Pirlo, AC Milan
CDA-KR Shinji Kagawa/Marco Reus, Borussia Dortmund
CDA-MB Luka Modrić/Gareth Bale, Tottenham Hotspur
CDA-OR Martin Ødegaard/Declan Rice, Arsenal FC
CDA-PB Alessandro Del Piero/Roberto Baggio, Juventus
CDA-PG Paul Scholes/Ryan Giggs, Manchester United
CDA-PI Pedri/Andrés Iniesta, FC Barcelona
CDA-RA Ronaldo/Adriano, FC Internazionale Milano
CDA-RE Ronaldinho/Samuel Eto'o, FC Barcelona
CDA-RL Raphinha/Robert Lewandowski, FC Barcelona
CDA-RV Rio Ferdinand/Nemanja Vidić, Manchester United
CDA-SG Mohamed Salah/Steven Gerrard, Liverpool FC
CDA-SH Bukayo Saka/Thierry Henry, Arsenal FC
CDA-SK Xavi Simons/Mohammed Kudus, Tottenham Hotspur
CDA-WP Wayne Rooney/Robin van Persie, Manchester United
CDA-YM Lamine Yamal/Lionel Messi, FC Barcelona
CDA-YN Lamine Yamal/Neymar Jr, FC Barcelona
CDA-ZR Zinédine Zidane/Raúl, Real Madrid C.F.
`;

// ---- Triple Autographs (14) ----
const TRIPLE_AUTO_TEXT = `
CTA-BSG David Beckham/Paul Scholes/Ryan Giggs, Manchester United
CTA-CBB Giorgio Chiellini/Leonardo Bonucci/Gianluigi Buffon, Juventus
CTA-CBN Petr Čech/Gianluigi Buffon/Manuel Neuer, Chelsea FC/Juventus/FC Bayern München
CTA-KGS Kevin Keegan/Paul Gascoigne/Alan Shearer, Newcastle United
CTA-KPG Kaká/Andrea Pirlo/Gennaro Gattuso, AC Milan
CTA-KSR Patrick Kluivert/Clarence Seedorf/Frank Rijkaard, AFC Ajax
CTA-MND Paolo Maldini/Alessandro Nesta/Dida, AC Milan
CTA-MSN Lionel Messi/Luis Suárez/Neymar Jr, FC Barcelona
CTA-NRR Neymar Jr/Ronaldinho/Rivaldo, FC Barcelona
CTA-PGL Pedri/Gavi/Fermín López, FC Barcelona
CTA-SFM Mohamed Salah/Roberto Firmino/Sadio Mané, Liverpool FC
CTA-SGR William Saliba/Gabriel/Declan Rice, Arsenal FC
CTA-TAG Fernando Torres/Sergio Agüero/Antoine Griezmann, Atlético de Madrid
CTA-ZBP Zinédine Zidane/Roberto Baggio/Alessandro Del Piero, Juventus
`;

// ---- Quad Autographs (3) — cross-club, no single team ----
const QUAD_AUTO_ROWS: InsertRow[] = [
  { subset: "Quad Autograph", number: "QA-2024", name: "Vini Jr./Rodrygo/Jude Bellingham/Arda Güler", persons: ["Vini Jr.", "Rodrygo", "Jude Bellingham", "Arda Güler"], teams: ["Real Madrid C.F."], auto: true },
  { subset: "Quad Autograph", number: "QA-JOGA", name: "Ronaldo/Neymar Jr/Ronaldinho/Kaká", persons: ["Ronaldo", "Neymar Jr", "Ronaldinho", "Kaká"], teams: ["FC Internazionale Milano", "Paris Saint-Germain", "FC Barcelona", "AC Milan"], auto: true },
  { subset: "Quad Autograph", number: "QA-MASIA", name: "Lionel Messi/Xavi Hernández/Andrés Iniesta/Sergio Busquets", persons: ["Lionel Messi", "Xavi Hernández", "Andrés Iniesta", "Sergio Busquets"], teams: ["FC Barcelona"], auto: true },
];

// ---- Black Lazer Autographs (45, jumbo-exclusive) ----
const BLACK_LAZER_TEXT = `
BLA-ADP Alessandro Del Piero, Juventus
BLA-BS Bastian Schweinsteiger, FC Bayern München
BLA-DM Daizen Maeda, Celtic FC
BLA-DV Dušan Vlahović, Juventus
BLA-EH Erling Haaland, Manchester City
BLA-EW Estêvão Willian, Chelsea FC
BLA-FB Franck Ribéry, FC Bayern München
BLA-FL Frank Lampard, Chelsea FC
BLA-FM Franco Mastantuono, Real Madrid C.F.
BLA-GB Gareth Bale, Tottenham Hotspur
BLA-HK Harry Kane, FC Bayern München
BLA-JA Julián Alvarez, Atlético de Madrid
BLA-JM Jamal Musiala, FC Bayern München
BLA-JU Jude Bellingham, Real Madrid C.F.
BLA-KA Kaká, AC Milan
BLA-KDB Kevin De Bruyne, SSC Napoli
BLA-KK Konstantinos Karetsas, KRC Genk
BLA-LK Lennart Karl, FC Bayern München
BLA-LM Lionel Messi, FC Barcelona
BLA-LY Lamine Yamal, FC Barcelona
BLA-MA Lautaro Martínez, FC Internazionale Milano
BLA-MD Max Dowman, Arsenal FC
BLA-MK Mohammed Kudus, Tottenham Hotspur
BLA-MO Martin Ødegaard, Arsenal FC
BLA-MS Mohamed Salah, Liverpool FC
BLA-NJ Neymar Jr, Paris Saint-Germain
BLA-OD Ousmane Dembélé, Paris Saint-Germain
BLA-P Pedri, FC Barcelona
BLA-PF Phil Foden, Manchester City
BLA-PM Paolo Maldini, AC Milan
BLA-R10 Ronaldinho, FC Barcelona
BLA-R9 Ronaldo, FC Internazionale Milano
BLA-RA Raúl, Real Madrid C.F.
BLA-RL Robert Lewandowski, FC Barcelona
BLA-RN Rio Ngumoha, Liverpool FC
BLA-RW Reggie Walsh, Chelsea FC
BLA-SC Santi Cazorla, Arsenal FC
BLA-SDB David Beckham, Real Madrid C.F.
BLA-SE Samuel Eto'o, FC Internazionale Milano
BLA-SK Shinji Kagawa, Borussia Dortmund Legend
BLA-SM Sadio Mané, Liverpool FC
BLA-TH Thierry Henry, Arsenal FC
BLA-WR Wayne Rooney, Manchester United
BLA-XS Xavi Simons, Tottenham Hotspur
BLA-ZZ Zinédine Zidane, Real Madrid C.F.
`;

// ---- Piece Of Club History Autographed Booklets (5, multi-person) ----
const BOOKLET_TEXT = `
CH-1900 Franz Beckenbauer/Lothar Matthäus/Philipp Lahm/Bastian Schweinsteiger/Manuel Neuer/Jamal Musiala, FC Bayern München
CH-BARCA Ronaldinho/Samuel Eto'o/Xavi Hernández/Lionel Messi/Pedri/Lamine Yamal, FC Barcelona
CH-COYG Tony Adams/Ian Wright/Dennis Bergkamp/Thierry Henry/Martin Ødegaard/Bukayo Saka, Arsenal FC
CH-FORZA Franco Baresi/Marco van Basten/Paolo Maldini/Andriy Shevchenko/Andrea Pirlo/Kaká, AC Milan
CH-YNWA Kevin Keegan/Kenny Dalglish/Jamie Carragher/Steven Gerrard/Virgil van Dijk/Mohamed Salah, Liverpool FC
`;

// ---- Global Attraction Summer of 2026 Autographs (24, breaker-exclusive) ----
const GLOBAL_ATTRACTION_TEXT = `
GA26-AD Alphonso Davies, FC Bayern München
GA26-CG Cody Gakpo, Liverpool FC
GA26-DM Daizen Maeda, Celtic FC
GA26-DR Declan Rice, Arsenal FC
GA26-EH Erling Haaland, Manchester City
GA26-EW Estêvão Willian, Chelsea FC
GA26-FB Folarin Balogun, AS Monaco
GA26-FM Franco Mastantuono, Real Madrid C.F.
GA26-HK Harry Kane, FC Bayern München
GA26-JA Julián Alvarez, Atlético de Madrid
GA26-JB Jude Bellingham, Real Madrid C.F.
GA26-JM Jamal Musiala, FC Bayern München
GA26-KDB Kevin De Bruyne, SSC Napoli
GA26-LM Lionel Messi, FC Barcelona
GA26-LY Lamine Yamal, FC Barcelona
GA26-MK Mohammed Kudus, Tottenham Hotspur
GA26-MO Luka Modrić, Tottenham Hotspur
GA26-MS Mohamed Salah, Liverpool FC
GA26-OD Ousmane Dembélé, Paris Saint-Germain
GA26-OM Martin Ødegaard, Arsenal FC
GA26-P Pedri, FC Barcelona
GA26-VJ Vini Jr., Real Madrid C.F.
GA26-VVD Virgil van Dijk, Liverpool FC
GA26-WM Weston McKennie, Juventus
`;

// ---- Road To Glory Autographs (63, hobby-exclusive) ----
const ROAD_TO_GLORY_TEXT = `
RTG-AD Alessandro Del Piero, Juventus
RTG-ADM Ángel Di María, Real Madrid C.F.
RTG-AG Arda Güler, Real Madrid C.F.
RTG-AI Andrés Iniesta, FC Barcelona
RTG-AP Andrea Pirlo, AC Milan
RTG-AS Andriy Shevchenko, AC Milan
RTG-BB Bradley Barcola, Paris Saint-Germain
RTG-CS Clarence Seedorf, AC Milan
RTG-CT Carlos Tevez, Manchester United
RTG-DA Alphonso Davies, FC Bayern München
RTG-EH Erling Haaland, Manchester City
RTG-FI Filippo Inzaghi, AC Milan
RTG-FL Frank Lampard, Chelsea FC
RTG-FM Fernando Morientes, Real Madrid C.F.
RTG-FR Franck Ribéry, FC Bayern München
RTG-FV Federico Valverde, Real Madrid C.F.
RTG-GB Gareth Bale, Real Madrid C.F.
RTG-GG Gennaro Gattuso, AC Milan
RTG-JB Jude Bellingham, Real Madrid C.F.
RTG-JC Jamie Carragher, Liverpool FC
RTG-JK Joshua Kimmich, FC Bayern München
RTG-JM Javier Mascherano, FC Barcelona
RTG-JN João Neves, Paris Saint-Germain
RTG-JU Juan Mata, Chelsea FC
RTG-KA Kaká, AC Milan
RTG-KD Kenny Dalglish, Liverpool FC
RTG-LM Lionel Messi, FC Barcelona
RTG-LS Luis Suárez, FC Barcelona
RTG-MN Manuel Neuer, FC Bayern München
RTG-MS Matthias Sammer, Borussia Dortmund
RTG-MU Jamal Musiala, FC Bayern München
RTG-MVB Marco van Basten, AC Milan
RTG-NV Nemanja Vidić, Manchester United
RTG-OD Ousmane Dembélé, Paris Saint-Germain
RTG-PC Petr Čech, Chelsea FC
RTG-PF Phil Foden, Manchester City
RTG-PK Patrick Kluivert, AFC Ajax
RTG-PL Philipp Lahm, FC Bayern München
RTG-PM Paolo Maldini, AC Milan
RTG-PS Paul Scholes, Manchester United
RTG-R10 Ronaldinho, FC Barcelona
RTG-RA Raúl, Real Madrid C.F.
RTG-RB Roberto Firmino, Liverpool FC
RTG-RC Roberto Carlos, Real Madrid C.F.
RTG-RD Rodrygo, Real Madrid C.F.
RTG-RG Ryan Giggs, Manchester United
RTG-RI Frank Rijkaard, AFC Ajax
RTG-RK Ronald Koeman, FC Barcelona
RTG-RM Riyad Mahrez, Manchester City
RTG-SA Mohamed Salah, Liverpool FC
RTG-SB Sergio Busquets, FC Barcelona
RTG-SC Bastian Schweinsteiger, FC Bayern München
RTG-SDB David Beckham, Manchester United
RTG-SE Samuel Eto'o, FC Internazionale Milano
RTG-SM Sadio Mané, Liverpool FC
RTG-TK Toni Kroos, Real Madrid C.F.
RTG-TM Thomas Müller, FC Bayern München
RTG-VD Virgil van Dijk, Liverpool FC
RTG-VJ Vini Jr., Real Madrid C.F.
RTG-WR Wayne Rooney, Manchester United
RTG-WS Wesley Sneijder, FC Internazionale Milano
RTG-XH Xavi Hernández, FC Barcelona
RTG-ZZ Zinédine Zidane, Real Madrid C.F.
`;

// ---- Bowman UEFA Youth League Autographs (4, hobby/jumbo-exclusive) ----
const BOWMAN_UYL_AUTO_TEXT = `
BYA-MA Mathis Albert, Borussia Dortmund
BYA-SI Samuele Inacio, Borussia Dortmund
BYA-LWB Lucá Williams-Barnett, Tottenham Hotspur
BYA-TL Teddie Lamb, Manchester City
`;

// ---- Marks Of Excellence (8) ----
const MARKS_OF_EXCELLENCE_TEXT = `
ME-AG3 Arda Güler, Real Madrid C.F.
ME-BB1 Bradley Barcola, Paris Saint-Germain
ME-CP1 Cole Palmer, Chelsea FC
ME-HK1 Harry Kane, FC Bayern München
ME-LM1 Lionel Messi, FC Barcelona
ME-MS1 Mohamed Salah, Liverpool FC
ME-SAF1 Sir Alex Ferguson, Manchester United
ME-TO1 Fernando Torres, Chelsea FC
`;

// ---- UCL Final Performers Autographs (5) — Linkin Park, not footballers.
// No Team link (band, not a club). ----
const UCL_FINAL_PERFORMERS_ROWS: InsertRow[] = [
  { subset: "UCL Final Performers Autograph", number: "UFH-CB", name: "Colin Brittain", persons: ["Colin Brittain"], teams: [], auto: true },
  { subset: "UCL Final Performers Autograph", number: "UFH-DF", name: 'Dave "Phoenix" Farrell', persons: ['Dave "Phoenix" Farrell'], teams: [], auto: true },
  { subset: "UCL Final Performers Autograph", number: "UFH-EA", name: "Emily Armstrong", persons: ["Emily Armstrong"], teams: [], auto: true },
  { subset: "UCL Final Performers Autograph", number: "UFH-JH", name: "Joe Hahn", persons: ["Joe Hahn"], teams: [], auto: true },
  { subset: "UCL Final Performers Autograph", number: "UFH-MS", name: "Mike Shinoda", persons: ["Mike Shinoda"], teams: [], auto: true },
];
const UCL_FINAL_PERFORMERS_DUAL_ROWS: InsertRow[] = [
  { subset: "UCL Final Performers Dual Autograph", number: "LPDA-SA", name: "Mike Shinoda/Emily Armstrong", persons: ["Mike Shinoda", "Emily Armstrong"], teams: [], auto: true },
];

// ---- Superior Signatures Veterans & Rookies (11) ----
const SUPERIOR_SIG_VET_TEXT = `
SSV-AG Antoine Griezmann, Atlético de Madrid
SSV-DM Divine Mukasa, Manchester City
SSV-HK Harry Kane, FC Bayern München
SSV-JA Julián Alvarez, Atlético de Madrid
SSV-JB Jude Bellingham, Real Madrid C.F.
SSV-JM Jamal Musiala, FC Bayern München
SSV-LK Lennart Karl, FC Bayern München
SSV-MD Max Dowman, Arsenal FC
SSV-QJ Quim Junyent, FC Barcelona
SSV-RN Rio Ngumoha, Liverpool FC
SSV-V Vini Jr., Real Madrid C.F.
`;

// ---- Superior Signatures Legends (7) ----
const SUPERIOR_SIG_LEGENDS_TEXT = `
SSL-AI Andrés Iniesta, FC Barcelona
SSL-BG Dennis Bergkamp, Arsenal FC
SSL-GB Gareth Bale, Real Madrid C.F.
SSL-LJ Freddie Ljungberg, Arsenal FC
SSL-LM Lionel Messi, FC Barcelona
SSL-RB Roberto Baggio, FC Internazionale Milano
SSL-TH Thierry Henry, Arsenal FC
`;

// ---------------------------------------------------------------------------
// INSERTS
// ---------------------------------------------------------------------------

// ---- Bowman UEFA Youth League insert (11) ----
const BOWMAN_UYL_INSERT_TEXT = `
BU-ET Ebrima Tunkara, FC Barcelona
BU-FS Floyd Samba, Manchester City
BU-JU Jaden Umeh, SL Benfica
BU-LWB Lucá Williams-Barnett, Tottenham Hotspur
BU-MA Mathis Albert, Borussia Dortmund
BU-OB Oliver Boast, Tottenham Hotspur
BU-RM Ryan McAidoo, Manchester City
BU-SI Samuele Inacio, Borussia Dortmund
BU-SK Shane Kluivert, FC Barcelona
BU-SM Stephen Mfuni, Manchester City
BU-TL Teddie Lamb, Manchester City
`;

// ---- Last Dance (14) ----
const LAST_DANCE_TEXT = `
LD-1 Toni Kroos, Real Madrid C.F.
LD-2 Xavi Hernández, FC Barcelona
LD-3 Gareth Bale, Real Madrid C.F.
LD-4 Frank Rijkaard, AFC Ajax
LD-5 David Villa, Atlético de Madrid
LD-6 Steven Gerrard, Liverpool FC
LD-7 Dennis Bergkamp, Arsenal FC
LD-8 John Terry, Chelsea FC
LD-9 Ronaldinho, AC Milan
LD-10 Diego Maradona, SSC Napoli
LD-11 Paolo Maldini, AC Milan
LD-12 Ryan Giggs, Manchester United
LD-13 Philipp Lahm, FC Bayern München
LD-14 Javier Zanetti, FC Internazionale Milano
`;

// ---- Wonderkids (20) ----
const WONDERKIDS_TEXT = `
WK-1 Rio Ngumoha, Liverpool FC
WK-2 Reigan Heskey, Manchester City
WK-3 Estêvão Willian, Chelsea FC
WK-4 Max Dowman, Arsenal FC
WK-5 Dro, FC Barcelona
WK-6 Dean Huijsen, Real Madrid C.F.
WK-7 Franco Mastantuono, Real Madrid C.F.
WK-8 Lennart Karl, FC Bayern München
WK-9 Jobe Bellingham, Borussia Dortmund
WK-10 Pio Esposito, FC Internazionale Milano
WK-11 Désiré Doué, Paris Saint-Germain
WK-12 Konstantinos Karetsas, KRC Genk
WK-13 Myles Lewis-Skelly, Arsenal FC
WK-14 Tyrique George, Chelsea FC
WK-15 Rodrigo Mora, FC Porto
WK-16 Pablo García, Real Betis Balompié
WK-17 Reggie Walsh, Chelsea FC
WK-18 Wisdom Mike, FC Bayern München
WK-19 Christian Kofane, Bayer 04 Leverkusen
WK-20 Quentin Ndjantou, Paris Saint-Germain
`;

// ---- Silenced (10) ----
const SILENCED_TEXT = `
SHH-1 Neymar Jr, Paris Saint-Germain
SHH-2 Thierry Henry, Arsenal FC
SHH-3 Zlatan Ibrahimović, FC Internazionale Milano
SHH-4 Luis Suárez, FC Barcelona
SHH-5 Khvicha Kvaratskhelia, Paris Saint-Germain
SHH-6 Mario Balotelli, AC Milan
SHH-7 Michael Olise, FC Bayern München
SHH-8 Vini Jr., Real Madrid C.F.
SHH-9 Samuel Eto'o, FC Internazionale Milano
SHH-10 Phil Foden, Manchester City
`;

// ---- Power Players (35) ----
const POWER_PLAYERS_TEXT = `
PP-1 Jeremie Frimpong, Liverpool FC
PP-2 Hugo Ekitike, Liverpool FC
PP-3 Gabriel Martinelli, Arsenal FC
PP-4 Myles Lewis-Skelly, Arsenal FC
PP-5 Joelinton, Newcastle United
PP-6 Erling Haaland, Manchester City
PP-7 Jérémy Doku, Manchester City
PP-8 Liam Delap, Chelsea FC
PP-9 Lautaro Martínez, FC Internazionale Milano
PP-10 Dominic Solanke, Tottenham Hotspur
PP-11 Mohammed Kudus, Tottenham Hotspur
PP-12 Romelu Lukaku, SSC Napoli
PP-13 Raphinha, FC Barcelona
PP-14 Vini Jr., Real Madrid C.F.
PP-15 Federico Valverde, Real Madrid C.F.
PP-16 Giuliano Simeone, Atlético de Madrid
PP-17 Iñaki Williams, Athletic Club
PP-18 Weston McKennie, Juventus
PP-19 Alphonso Davies, FC Bayern München
PP-20 Luis Díaz, FC Bayern München
PP-21 Karim Adeyemi, Borussia Dortmund
PP-22 Patrik Schick, Bayer 04 Leverkusen
PP-23 Morgan Rogers, Aston Villa
PP-24 Denzel Dumfries, FC Internazionale Milano
PP-25 Chris Wood, Nottingham Forest
PP-26 Dušan Vlahović, Juventus
PP-27 Antony, Real Betis Balompié
PP-28 Marquinhos, Paris Saint-Germain
PP-29 Folarin Balogun, AS Monaco
PP-30 George Ilenikhena, AS Monaco
PP-31 Ousmane Diomande, Sporting Clube de Portugal
PP-32 Richard Ríos, SL Benfica
PP-33 Samu Aghehowa, FC Porto
PP-34 Alistair Johnston, Celtic FC
PP-35 William Gomes, FC Porto
`;

// ---- Veni, Vidi, Vici (5) ----
const VVV_TEXT = `
VVV-1 Mohamed Salah, Liverpool FC
VVV-2 Bukayo Saka, Arsenal FC
VVV-3 Lamine Yamal, FC Barcelona
VVV-4 Jude Bellingham, Real Madrid C.F.
VVV-5 Lautaro Martínez, FC Internazionale Milano
`;

// ---- Youthquake insert (15, breaker-exclusive) ----
const YOUTHQUAKE_TEXT = `
YQ-1 Rio Ngumoha, Liverpool FC
YQ-2 Divine Mukasa, Manchester City
YQ-3 Estêvão Willian, Chelsea FC
YQ-4 Xavi Simons, Tottenham Hotspur
YQ-5 Pau Cubarsí, FC Barcelona
YQ-6 Franco Mastantuono, Real Madrid C.F.
YQ-7 Pablo García, Real Betis Balompié
YQ-8 Lennart Karl, FC Bayern München
YQ-9 Jobe Bellingham, Borussia Dortmund
YQ-10 Pio Esposito, FC Internazionale Milano
YQ-11 João Neves, Paris Saint-Germain
YQ-12 Kendry Páez, RC Strasbourg Alsace
YQ-13 Nico O'Reilly, Manchester City
YQ-14 Senny Mayulu, Paris Saint-Germain
YQ-15 Geovany Quenda, Sporting Clube de Portugal
`;

// ---- Ultra Violet (20) ----
const ULTRA_VIOLET_TEXT = `
UV-1 Steven Gerrard, Liverpool FC
UV-2 Thierry Henry, Arsenal FC
UV-3 Yaya Touré, Manchester City
UV-4 Didier Drogba, Chelsea FC
UV-5 Gareth Bale, Tottenham Hotspur
UV-6 Ronaldinho, FC Barcelona
UV-7 Neymar Jr, FC Barcelona
UV-8 Raúl, Real Madrid C.F.
UV-9 Roberto Carlos, Real Madrid C.F.
UV-10 Fernando Torres, Atlético de Madrid
UV-11 Franck Ribéry, FC Bayern München
UV-12 Pierre-Emerick Aubameyang, Borussia Dortmund
UV-13 Kaká, AC Milan
UV-14 Ronaldo, FC Internazionale Milano
UV-15 Alessandro Del Piero, Juventus
UV-16 George Weah, AC Milan
UV-17 Zlatan Ibrahimović, Paris Saint-Germain
UV-18 Ángel Di María, Paris Saint-Germain
UV-19 Johan Cruyff, AFC Ajax
UV-20 Henrik Larsson, Celtic FC
`;

// ---- Radiating Rookies (15) — reuses base-set numbers/names as a distinct
// insert; card id namespaced under "radiating-rookies" so it doesn't
// collide with the base-set card of the same printed number. ----
const RADIATING_ROOKIES_TEXT = `
RR-5 Jobe Bellingham, Borussia Dortmund
RR-29 Kendry Páez, RC Strasbourg Alsace
RR-57 Max Dowman, Arsenal FC
RR-66 Estêvão Willian, Chelsea FC
RR-88 Wisdom Mike, FC Bayern München
RR-91 Victor Froholdt, FC Porto
RR-111 Dro, FC Barcelona
RR-142 Reigan Heskey, Manchester City
RR-150 Konstantinos Karetsas, KRC Genk
RR-163 Pio Esposito, FC Internazionale Milano
RR-166 Quentin Ndjantou, Paris Saint-Germain
RR-172 Franco Mastantuono, Real Madrid C.F.
RR-174 Pablo García, Real Betis Balompié
RR-187 Lennart Karl, FC Bayern München
RR-191 Rio Ngumoha, Liverpool FC
`;

// ---- Shadow Etch (20) ----
const SHADOW_ETCH_TEXT = `
SE-1 Antoine Griezmann, Atlético de Madrid
SE-2 Jamal Musiala, FC Bayern München
SE-3 Vini Jr., Real Madrid C.F.
SE-4 Ousmane Dembélé, Paris Saint-Germain
SE-5 Franco Mastantuono, Real Madrid C.F.
SE-6 Pedri, FC Barcelona
SE-7 Alexander Isak, Liverpool FC
SE-8 Viktor Gyökeres, Arsenal FC
SE-9 Didier Drogba, Chelsea FC
SE-10 Raúl, Real Madrid C.F.
SE-11 Luis Suárez, FC Barcelona
SE-12 Dro, FC Barcelona
SE-13 Pablo García, Real Betis Balompié
SE-14 Roberto Baggio, Juventus
SE-15 Zlatan Ibrahimović, Paris Saint-Germain
SE-16 Marquinhos, Paris Saint-Germain
SE-17 Andriy Shevchenko, AC Milan
SE-18 Lionel Messi, FC Barcelona
SE-19 Jude Bellingham, Real Madrid C.F.
SE-20 Victor Froholdt, FC Porto
`;

// ---- Bionic (5, value box-exclusive) ----
const BIONIC_TEXT = `
B-1 Robert Lewandowski, FC Barcelona
B-2 Erling Haaland, Manchester City
B-3 Jude Bellingham, Real Madrid C.F.
B-4 Lamine Yamal, FC Barcelona
B-5 João Neves, Paris Saint-Germain
`;

// ---- Metaverse (14, mega box-exclusive) ----
const METAVERSE_TEXT = `
MV-1 Ángel Di María, Paris Saint-Germain
MV-2 Phil Foden, Manchester City
MV-3 Virgil van Dijk, Liverpool FC
MV-4 Martin Ødegaard, Arsenal FC
MV-5 Xavi Simons, Tottenham Hotspur
MV-6 Raphinha, FC Barcelona
MV-7 Sergio Agüero, Manchester City
MV-8 Gareth Bale, Tottenham Hotspur
MV-9 Vini Jr., Real Madrid C.F.
MV-10 Lautaro Martínez, FC Internazionale Milano
MV-11 Serhou Guirassy, Borussia Dortmund
MV-12 Wayne Rooney, Manchester United
MV-13 Rodrigo Mora, FC Porto
MV-14 Claudio Echeverri, Bayer 04 Leverkusen
`;

// ---- Budapest At Night (10, hobby/FDI-exclusive, no parallels listed) ----
const BUDAPEST_TEXT = `
BN-1 Lamine Yamal, FC Barcelona
BN-2 Kylian Mbappé, Real Madrid C.F.
BN-3 Max Dowman, Arsenal FC
BN-4 Estêvão Willian, Chelsea FC
BN-5 Rio Ngumoha, Liverpool FC
BN-6 Michael Olise, FC Bayern München
BN-7 Désiré Doué, Paris Saint-Germain
BN-8 Lautaro Martínez, FC Internazionale Milano
BN-9 Khvicha Kvaratskhelia, Paris Saint-Germain
BN-10 Jobe Bellingham, Borussia Dortmund
`;

// ---- Helix (10) ----
const HELIX_TEXT = `
H-1 Diego Maradona, SSC Napoli
H-2 Estêvão Willian, Chelsea FC
H-3 Kylian Mbappé, Real Madrid C.F.
H-4 Franco Mastantuono, Real Madrid C.F.
H-5 Lennart Karl, FC Bayern München
H-6 Konstantinos Karetsas, KRC Genk
H-7 Ronaldinho, FC Barcelona
H-8 Neymar Jr, Paris Saint-Germain
H-9 Max Dowman, Arsenal FC
H-10 Jobe Bellingham, Borussia Dortmund
`;

// ---- Champion Gold Refractors (12) — CC-12 is team-only (Paris Saint-Germain
// as an entity, no individual player). Handled explicitly, not via the
// generic parser (no comma in source line). ----
const CHAMPION_GOLD_TEXT = `
CC-1 Nuno Mendes, Paris Saint-Germain
CC-2 Willian Pacho, Paris Saint-Germain
CC-3 Marquinhos Paris, Paris Saint-Germain
CC-4 Fabián Ruiz, Paris Saint-Germain
CC-5 Vitinha Paris, Paris Saint-Germain
CC-6 João Neves, Paris Saint-Germain
CC-7 Khvicha Kvaratskhelia, Paris Saint-Germain
CC-8 Ousmane Dembélé, Paris Saint-Germain
CC-9 Désiré Doué, Paris Saint-Germain
CC-10 Bradley Barcola, Paris Saint-Germain
CC-11 Kang-in Lee, Paris Saint-Germain
`;
const CHAMPION_GOLD_TEAM_ONLY: InsertRow = {
  subset: "Champion Gold Refractors",
  number: "CC-12",
  name: "Paris Saint-Germain",
  persons: [],
  teams: ["Paris Saint-Germain"],
};

// ---- Trophy Superfractors (1 card each, no player, no team) ----
const TROPHY_ROWS: InsertRow[] = [
  { subset: "UCL Chrome Trophy Superfractor", number: "CL-1", name: "UCL Trophy", persons: [], teams: [], serialTo: 1 },
  { subset: "UEL Chrome Trophy Superfractor", number: "EL-1", name: "UEL Trophy", persons: [], teams: [], serialTo: 1 },
  { subset: "UECL Chrome Trophy Superfractor", number: "CO-1", name: "UECL Trophy", persons: [], teams: [], serialTo: 1 },
];

// ---- The Grail (2, hobby-exclusive, no parallels listed) ----
const GRAIL_TEXT = `
G-1 Zlatan Ibrahimović, AFC Ajax
G-3 Zlatan Ibrahimović, FC Internazionale Milano
`;

// ---- Anime (7) ----
const ANIME_TEXT = `
CA-1 Michael Olise, FC Bayern München
CA-2 Kylian Mbappé, Real Madrid C.F.
CA-3 Lamine Yamal, FC Barcelona
CA-4 Estêvão Willian, Chelsea FC
CA-5 Désiré Doué, Paris Saint-Germain
CA-6 Rio Ngumoha, Liverpool FC
CA-7 Florian Wirtz, Liverpool FC
`;

// ---------------------------------------------------------------------------
// Assemble every autograph + insert row
// ---------------------------------------------------------------------------
const ALL_ROWS: InsertRow[] = [
  ...parseCodeLines("Chrome Autograph", CHROME_AUTO_TEXT, { auto: true }),
  ...parseCodeLines("Chrome Legends Autograph", CHROME_LEGENDS_TEXT, { auto: true }),
  ...parseCodeLines("Future Stars Autograph", FUTURE_STARS_AUTO_TEXT, { auto: true }),
  ...parseCodeLines("Dual Autograph", DUAL_AUTO_TEXT, { auto: true }),
  ...parseCodeLines("Triple Autograph", TRIPLE_AUTO_TEXT, { auto: true }),
  ...QUAD_AUTO_ROWS,
  ...parseCodeLines("Black Lazer Autograph", BLACK_LAZER_TEXT, { auto: true }),
  ...parseCodeLines("Piece Of Club History Autographed Booklet", BOOKLET_TEXT, { auto: true }),
  ...parseCodeLines("Global Attraction Summer of 2026 Autograph", GLOBAL_ATTRACTION_TEXT, { auto: true }),
  ...parseCodeLines("Road To Glory Autograph", ROAD_TO_GLORY_TEXT, { auto: true }),
  ...parseCodeLines("Bowman UEFA Youth League Autograph", BOWMAN_UYL_AUTO_TEXT, { auto: true }),
  ...parseCodeLines("Marks Of Excellence", MARKS_OF_EXCELLENCE_TEXT, { auto: true }),
  ...UCL_FINAL_PERFORMERS_ROWS,
  ...UCL_FINAL_PERFORMERS_DUAL_ROWS,
  ...parseCodeLines("Superior Signatures Veterans & Rookies", SUPERIOR_SIG_VET_TEXT, { auto: true }),
  ...parseCodeLines("Superior Signatures Legends", SUPERIOR_SIG_LEGENDS_TEXT, { auto: true }),

  ...parseCodeLines("Bowman UEFA Youth League", BOWMAN_UYL_INSERT_TEXT),
  ...parseCodeLines("Last Dance", LAST_DANCE_TEXT),
  ...parseCodeLines("Wonderkids", WONDERKIDS_TEXT),
  ...parseCodeLines("Silenced", SILENCED_TEXT),
  ...parseCodeLines("Power Players", POWER_PLAYERS_TEXT),
  ...parseCodeLines("Veni, Vidi, Vici", VVV_TEXT),
  ...parseCodeLines("Youthquake", YOUTHQUAKE_TEXT),
  ...parseCodeLines("Ultra Violet", ULTRA_VIOLET_TEXT),
  ...parseCodeLines("Radiating Rookies", RADIATING_ROOKIES_TEXT),
  ...parseCodeLines("Shadow Etch", SHADOW_ETCH_TEXT),
  ...parseCodeLines("Bionic", BIONIC_TEXT),
  ...parseCodeLines("Metaverse", METAVERSE_TEXT),
  ...parseCodeLines("Budapest At Night", BUDAPEST_TEXT),
  ...parseCodeLines("Helix", HELIX_TEXT),
  ...parseCodeLines("Champion Gold Refractors", CHAMPION_GOLD_TEXT),
  CHAMPION_GOLD_TEAM_ONLY,
  ...TROPHY_ROWS,
  ...parseCodeLines("The Grail", GRAIL_TEXT),
  ...parseCodeLines("Anime", ANIME_TEXT),
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Seeding: ${SET_NAME} (${BASE_ROWS.length} base + ${ALL_ROWS.length} auto/insert rows)`);

  const universeId = await builder.getOrCreateUniverse("Sports");
  const manufacturerId = await builder.getOrCreateManufacturer("Topps");
  const franchiseId = await builder.getOrCreateFranchise("UEFA Champions League", universeId);
  const brandId = await builder.getOrCreateBrand("Topps Chrome", manufacturerId);
  const seriesId = await builder.getOrCreateSeries("Chrome UEFA Champions League 2025/26", franchiseId, brandId);
  const set = await builder.getOrCreateSet({
    id: SET_ID,
    name: SET_NAME,
    seriesId,
    printedTotal: BASE_ROWS.length,
  });
  const basePrintingId = await builder.getOrCreatePrinting("Base");

  let created = 0;
  let skipped = 0;
  let variants = 0;
  const t0 = Date.now();

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

  for (const row of BASE_ROWS) {
    const cardId = `${SET_ID}-${row.number}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const personId = await builder.getOrCreatePerson(row.name);
    const teamId = await builder.getOrCreateTeam(row.team, { type: "CLUB" });
    const subtypes = [row.rookie && "Rookie", row.futureStars && "Future Stars"].filter(Boolean).join(", ") || undefined;

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: "Player",
        subtypes,
        persons: { connect: { id: personId } },
        teams: { connect: { id: teamId } },
      },
    });
    existingIds.add(cardId);

    await prisma.variant.createMany({
      data: [{ cardId, printingId: basePrintingId }, ...baseVariantRows.map((v) => ({ cardId, ...v }))],
    });
    variants += 1 + baseVariantRows.length;

    created++;
    if (created % 50 === 0) {
      console.log(`  base [${created}/${BASE_ROWS.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }

  console.log(`Base set done. Created ${created}, skipped ${skipped}.`);

  // ---- Autographs + Inserts ----
  const subsetParallelIds = new Map<string, Map<string, string>>();
  for (const [subset, defs] of Object.entries(SUBSET_PARALLELS)) {
    const inner = new Map<string, string>();
    for (const p of defs) inner.set(p.name, await builder.getOrCreateParallel(p.name));
    subsetParallelIds.set(subset, inner);
  }

  for (const [i, row] of ALL_ROWS.entries()) {
    const cardId = `${SET_ID}-${slug(row.subset)}-${slug(row.number)}`;
    if (existingIds.has(cardId)) {
      skipped++;
      continue;
    }

    const personIds: string[] = [];
    for (const p of row.persons) personIds.push(await builder.getOrCreatePerson(p));
    const teamIds: string[] = [];
    for (const t of row.teams) teamIds.push(await builder.getOrCreateTeam(t, { type: "CLUB" }));

    const insertId = await builder.getOrCreateInsert(row.subset, set.id);

    await prisma.card.create({
      data: {
        id: cardId,
        name: row.name,
        number: row.number,
        setId: set.id,
        supertype: row.subset,
        persons: personIds.length ? { connect: personIds.map((id) => ({ id })) } : undefined,
        teams: teamIds.length ? { connect: teamIds.map((id) => ({ id })) } : undefined,
      },
    });
    existingIds.add(cardId);

    const variantData: any[] = [
      {
        cardId,
        printingId: basePrintingId,
        insertId,
        isAuto: row.auto ?? false,
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
          serialTo: p.serialTo,
        });
      }
    }

    await prisma.variant.createMany({ data: variantData });
    variants += variantData.length;

    created++;
    if ((i + 1) % 50 === 0) {
      console.log(`  inserts [${i + 1}/${ALL_ROWS.length}] variants=${variants} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);
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
