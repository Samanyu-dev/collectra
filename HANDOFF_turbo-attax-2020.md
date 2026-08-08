# Handoff: seed Topps Turbo Attax 2020 + resume roadmap

## 0. First, check the filesystem permission blocker

Last session, reads of most files under `src/` and some root files (e.g.
`next.config.ts`) failed with `Operation not permitted`, even with the Bash
sandbox disabled. Root cause traced to macOS Desktop-folder protection: this
project lives at `~/Desktop/collectra`, and the terminal app running Claude
Code didn't have "Files and Folders" (Desktop) or Full Disk Access permission
in System Settings → Privacy & Security. A few files worked anyway because
they already carried a `com.apple.macl` access-grant xattr from earlier
approved reads (`prisma/schema.prisma`, `TODO.md`, `PROJECT_STATE.md`,
`packages/media/index.ts`); most `.ts` files under `src/` did not.

**Before doing anything else**, try reading a file that previously failed,
e.g. `src/proxy.ts` or `next.config.ts`. If it still throws `Operation not
permitted`, stop and tell the user to grant Terminal Desktop-folder / Full
Disk Access in System Settings, then retry — don't try to work around it
file-by-file again, it isn't fixable from inside the sandbox.

## 1. Task: seed "Topps Turbo Attax 2020" as a new Set

This is a brand-new set, not one of the existing Turbo Attax scripts
(`seed-topps-turbo-attax-2023.ts`, `-2025.ts`, `-2025-products.ts`,
`-2026.ts` already exist in `src/scripts/` — none for 2020). Season markers
in the checklist (Racing Point, Renault DP World, AlphaTauri, Alfa Romeo
Racing ORLEN) confirm 2020 season.

**Before writing the script**, read `src/scripts/seed-topps-turbo-attax-2025.ts`
(and/or `-2026.ts`) to mirror the existing conventions: `builder.ts` usage,
idempotency (skip-if-exists), how Section/Type map to `Insert` records vs.
plain Card fields, how F1 Team Duo / multi-person cards attach multiple
`Person`/`Team` rows, and how tin/insert exclusives get tagged.

Relevant schema (`prisma/schema.prisma`): `Set` → `Card` → `Variant`, with
`Insert` for subset/insert categories (distinct from `Parallel` for
color/foil variants). A "Section" column value here (e.g. "Brilliant
Brits", "F1 Team Duo") is an `Insert`, not a `Parallel`.

**Pricing**: `CurrentPrice` is explicitly a cache "never hand-written by an
adapter... rebuilt by the price-recompute-current job" (see schema comment
at that model). Do **not** write directly to `CurrentPrice`. Instead create
`PriceObservation` rows (`kind: "LISTING"` or similar, needs a `DataSource`
row — check `model DataSource` in schema and how other scripts/adapters
create one, e.g. look at `src/ingestion/ebay/sweep-catalog.ts` conventions)
so the existing recompute job can build `CurrentPrice` normally. Confirm
this plan with the user before committing to it — it's a schema-fit
judgment call, not a hard rule found elsewhere in the codebase yet.

### 1a. Full checklist data (197 rows: #1–181 + XL-1..XL-5 + 11 Limited Edition rows)

Columns: No. | Title | Section | Type | Need | Offer | Hold | Need/Offer ratio.
**Per user instruction: ignore Need/Offer/Hold/ratio entirely** — those are
community trade stats, not catalog data. Only use No./Title/Section/Type.

```
1	Lewis Hamilton	Brilliant Brits	International Superstars
2	Lando Norris	Brilliant Brits	International Superstars
3	George Russel	Brilliant Brits	International Superstars
4	Valtteri Bottas	Flying Finns	International Superstars
5	Kimi Raikkonen	Flying Finns	International Superstars
6	Lance Stroll	Cool Canadians	International Superstars
7	Nicholas Latifi	Cool Canadians	International Superstars
8	Esteban Ocon	Finest French	International Superstars
9	Pierre Gasly	Finest French	International Superstars
10	Mercedes-AMG Petronas F1 Team	Team Card	F1 Base card
11	Lewis Hamilton	F1 Racer	F1 Base card
12	Valtteri Bottas	F1 Racer	F1 Base card
13	Lewis Hamilton	Speedster	F1 Base card
14	Valtteri Bottas	Speedster	F1 Base card
15	Lewis Hamilton & Valtteri Bottas	F1 Team Duo	F1 Base card
16	Scuderia Ferrari Team	Team Card	F1 Base card
17	Charles Leclerc	F1 Racer	F1 Base card
18	Sebastian Vettel	F1 Racer	F1 Base card
19	Charles Leclerc	Speedster	F1 Base card
20	Sebastian Vettel	Speedster	F1 Base card
21	Charles Leclerc & Sebastian Vettel	F1 Team Duo	F1 Base card
22	Aston Martin Red Bull Racing Team	Team Card	F1 Base card
23	Max Verstappen	F1 Racer	F1 Base card
24	Alex Albon	F1 Racer	F1 Base card
25	Max Verstappen	Speedster	F1 Base card
26	Alex Albon	Speedster	F1 Base card
27	Max Verstappen & Alex Albon	F1 Team Duo	F1 Base card
28	McLaren F1 Team	Team Card	F1 Base card
29	Carlos Sainz	F1 Racer	F1 Base card
30	Lando Norris	F1 Racer	F1 Base card
31	Carlos Sainz	Speedster	F1 Base card
32	Lando Norris	Speedster	F1 Base card
33	Carlos Sainz & Lando Norris	F1 Team Duo	F1 Base card
34	Renault DP World F1 Team	Team Card	F1 Base card
35	Daniel Riccardo	F1 Racer	F1 Base card
36	Esteban Ocon	F1 Racer	F1 Base card
37	Daniel Riccardo	Speedster	F1 Base card
38	Esteban Ocon	Speedster	F1 Base card
39	Daniel Riccardo & Esteban Ocon	F1 Team Duo	F1 Base card
40	Scuderia AlphaTauri Team	Team Card	F1 Base card
41	Pierre Gasly	F1 Racer	F1 Base card
42	Daniil Kvyat	F1 Racer	F1 Base card
43	Pierre Gasly	Speedster	F1 Base card
44	Daniil Kvyat	Speedster	F1 Base card
45	Pierre Gasly & Daniil Kvyat	F1 Team Duo	F1 Base card
46	BWT Racing Point F1 Team	Team Card	F1 Base card
47	Sergio Perez	F1 Racer	F1 Base card
48	Lance Stroll	F1 Racer	F1 Base card
49	Sergio Perez	Speedster	F1 Base card
50	Lance Stroll	Speedster	F1 Base card
51	Sergio Perez & Lance Stroll	F1 Team Duo	F1 Base card
52	Alfa Romeo Racing ORLEN Team	Team Card	F1 Base card
53	Kimi Raikkonen	F1 Racer	F1 Base card
54	Antonio Giovinazzi	F1 Racer	F1 Base card
55	Kimi Raikkonen	Speedster	F1 Base card
56	Antonio Giovinazzi	Speedster	F1 Base card
57	Kimi Raikkonen & Antonio Giovinazzi	F1 Team Duo	F1 Base card
58	Haas F1 Team	Team Card	F1 Base card
59	Kevin Magnussen	F1 Racer	F1 Base card
60	Romain Grosjean	F1 Racer	F1 Base card
61	Kevin Magnussen	Speedster	F1 Base card
62	Romain Grosjean	Speedster	F1 Base card
63	Kevin Magnussen & Romain Grosjean	F1 Team Duo	F1 Base card
64	Willams Racing Team	Team Card	F1 Base card
65	George Russel	F1 Racer	F1 Base card
66	Nicholas Latifi	F1 Racer	F1 Base card
67	George Russel	Speedster	F1 Base card
68	Nicholas Latifi	Speedster	F1 Base card
69	George Russel & Nicholas Latifi	F1 Team Duo	F1 Base card
70	Charles Leclerc	-	Live Action Card
71	Lewis Hamilton	-	Live Action Card
72	Lando Norris	-	Live Action Card
73	Lewis Hamilton	-	Live Action Card
74	Valtteri Bottas	-	Live Action Card
75	Sebastian Vettel	-	Live Action Card
76	Kimi Raikkonen	-	Live Action Card
77	Max Verstappen	-	Live Action Card
78	Valtteri Bottas	-	Live Action Card
79	Charles Leclerc	-	Live Action Card
80	Lewis Hamilton	-	Live Action Card
81	Max Verstappen	-	Live Action Card
82	Daniil Kvyat	-	Live Action Card
83	Lance Stroll	-	Live Action Card
84	Max Verstappen	-	Live Action Card
85	Lewis Hamilton	-	Live Action Card
86	Alex Albon	-	Live Action Card
87	Charles Leclerc	-	Live Action Card
88	Daniel Riccardo	-	Live Action Card
89	Valtteri Bottas	-	Live Action Card
90	Lewis Hamilton	-	Live Action Card
91	Max Verstappen	-	Live Action Card
92	Antonio Giovinazzi	-	Live Action Card
93	Lewis Hamilton	-	Live Action Card
94	Kimi Raikkonen	-	Flashback Card
95	Lewis Hamilton	-	Flashback Card
96	Sebastian Vettel	-	Flashback Card
97	Romain Grosjean	-	Flashback Card
98	Sergio Perez	-	Flashback Card
99	Daniel Riccardo	-	Flashback Card
100	Valtteri Bottas	-	Flashback Card
101	Kevin Magnussen	-	Flashback Card
102	Daniil Kvyat	-	Flashback Card
103	Max Verstappen	-	Flashback Card
104	Carlos Sainz	-	Flashback Card
105	Esteban Ocon	-	Flashback Card
106	Lance Stroll	-	Flashback Card
107	Charles Leclerc	-	Flashback Card
108	Sean Gelael & Dan Ticktum	F2 Team Duo	F2 Card
109	Guanyu Zhou & Callum Ilott	F2 Team Duo	F2 Card
110	Marcus Armstrong & Christian Ludgaard	F2 Team Duo	F2 Card
111	Yuki Tsunoda & Jehan Daruvala	F2 Team Duo	F2 Card
112	Jack Aitken & Guilherme Samaia	F2 Team Duo	F2 Card
113	Louis Deletraz & Pedro Piquet	F2 Team Duo	F2 Card
114	Nobuharu Matsushita & Felipe Drugovich	F2 Team Duo	F2 Card
115	Artem Markelov & Giuliano Alesi	F2 Team Duo	F2 Card
116	Mick Schumacher & Robert Shwartzman	F2 Team Duo	F2 Card
117	Roy Nissany & Marino Sato	F2 Team Duo	F2 Card
118	Nikita Mazepin & Luca Ghiotto	F2 Team Duo	F2 Card
119	Rainmaster	-	Strategy Card
120	Hard Tyre	-	Strategy Card
121	Medium Tyre	-	Strategy Card
122	Soft Tyre	-	Strategy Card
123	Start Lights	-	Strategy Card
124	Fast Pitstop	-	Strategy Card
125	DRS	-	Strategy Card
126	Engine Boost	-	Strategy Card
127	Overtake	-	Strategy Card
128	Chequered Flag	-	Strategy Card
129	Podium	-	Strategy Card
130	World Championship Winning Trophy	-	Strategy Card
131	Steering Wheel	-	Strategy Card
132	Safety Car	-	Strategy Card
133	Team Orders	-	Strategy Card
134	Slow Pitstop	-	Strategy Card
135	Loose Wheel	-	Strategy Card
136	Oil Flag	-	Strategy Card
137	Blue Flag	-	Strategy Card
138	Yellow Flag	-	Strategy Card
139	Spin	-	Strategy Card
140	Blown Engine	-	Strategy Card
141	Race Collision	-	Strategy Card
142	Lewis Hamilton	-	Memorable Moments
143	Sergio Perez	-	Memorable Moments
144	Max Verstappen	-	Memorable Moments
145	Valtteri Bottas	-	Memorable Moments
146	Sebastian Vettel	-	Memorable Moments
147	Charles Leclerc	-	Memorable Moments
148	Carlos Sainz	-	Memorable Moments
149	Alex Albon	-	Future Star Card
150	Lando Norris	-	Future Star Card
151	Esteban Ocon	-	Future Star Card
152	Antonio Giovinazzi	-	Future Star Card
153	George Russel	-	Future Star Card
154	Lewis Hamilton	-	Race Superstar Card
155	Valtteri Bottas	-	Race Superstar Card
156	Charles Leclerc	-	Race Superstar Card
157	Sebastian Vettel	-	Race Superstar Card
158	Max Verstappen	-	Race Superstar Card
159	Alex Albon	-	Race Superstar Card
160	Carlos Sainz	-	Race Superstar Card
161	Lando Norris	-	Race Superstar Card
162	Daniel Riccardo	-	Race Superstar Card
163	Esteban Ocon	-	Race Superstar Card
164	Pierre Gasly	-	Race Superstar Card
165	Daniil Kvyat	-	Race Superstar Card
166	Sergio Perez	-	Race Superstar Card
167	Lance Stroll	-	Race Superstar Card
168	Kimi Raikkonen	-	Race Superstar Card
169	Antonio Giovinazzi	-	Race Superstar Card
170	Kevin Magnussen	-	Race Superstar Card
171	Romain Grosjean	-	Race Superstar Card
172	George Russel	-	Race Superstar Card
173	Nicholas Latifi	-	Race Superstar Card
174	Lewis Hamilton	-	Gold Race Winner Card
175	Sebastian Vettel	-	Gold Race Winner Card
176	Kimi Raikkonen	-	Gold Race Winner Card
177	Max Verstappen	-	Gold Race Winner Card
178	Valtteri Bottas	-	Gold Race Winner Card
179	Daniel Riccardo	-	Gold Race Winner Card
180	Charles Leclerc	-	Gold Race Winner Card
181	Pierre Gasly	-	Gold Best-Ever Finish Card
XL-1	Lewis Hamilton	-	XL Card
XL-2	Lando Norris	-	XL Card
XL-3	Charles Leclerc & Sebastian Vettel	-	XL Card
XL-4	Sergio Perez	-	XL Card
XL-5	Valtteri Bottas	-	XL Card
LE1G	Lewis Hamilton	-	Limited edition / Gold
LE2G	Max Verstappen	-	Limited edition / Gold
LE2S	Max Verstappen	-	Limited edition / Silver
LE2B	Max Verstappen	-	Limited edition / Bronze
LE3G	Charles Leclerc	-	Limited edition / Gold
LE3S	Charles Leclerc	-	Limited edition / Silver
LE3B	Charles Leclerc	-	Limited edition / Bronze
LE4G	Daniel Ricciardo	-	Limited edition / Gold
LE4S	Daniel Ricciardo	-	Limited edition / Silver
LE4B	Daniel Ricciardo	-	Limited edition / Bronze
LE5G	Kimi Räikkönen	-	Limited edition / Gold
```

Notes on the data as given:
- "Daniel Riccardo" (rows 1–181) vs. "Daniel Ricciardo" (LE rows) — same
  person (Daniel Ricciardo), inconsistent spelling in the source; normalize
  to one `Person` row, don't create two.
- "George Russel" — real name is George Russell (one L short in source);
  normalize.
- The Gold/Silver/Bronze suffix on LE rows (G/S/B) is a `Parallel`
  (finish="Limited Edition" or similar, color=Gold/Silver/Bronze), not an
  `Insert` — confirm against how `Parallel.finish`/`color` decomposition is
  used elsewhere (see 2026-08-07 schema comment on `Parallel`).
- LE2/LE3/LE4/LE5 numbers imply there's an LE1S/LE1B and possibly more LE
  card numbers this checklist didn't enumerate (only LE1G shown for #1) —
  flag as a probable gap, don't silently invent rows to fill it.

### 1b. Ungraded prices, matched by card number (from a second pasted price table)

User said: "store them but prices of cards (ungraded — take from here)".
Only the **Ungraded** column should be used per user's ask; Grade 9 / PSA 10
columns were also given below in case the user wants them later, but were
not explicitly requested — confirm before seeding those two.

**Coverage gap (already surfaced to the user, they're aware):** this price
table only covers #1–181. It has **no prices at all for XL-1–XL-5 or any of
the 11 LE Gold/Silver/Bronze rows**. It also has **no ungraded price** for
these 14 rows within #1–181: **#24, #49, #63, #115, #120, #121, #122, #123,
#125, #127, #129, #131, #132, #140**.

```
# | Ungraded | Grade9 | PSA10
1	$1.00			
2	$6.26			
3	$3.99			
4	$4.84			
5	$2.07			
6	$1.69			
7	$2.01			
8	$0.25			
9	$11.75			
10	$1.39			
11	$2.61	$17.50		
12	$2.02			
13	$1.35			
14	$1.70			
15	$1.00			
16	$1.47			
17	$2.63			
18	$0.25			
19	$2.84			
20	$2.65			
21	$6.25			
22	$0.25			
23	$5.25			
24	(missing)			
25	$1.69			
26	$2.00			
27	$2.00			
28	$0.25			
29	$2.45			
30	$4.94			
31	$4.49			
32	$2.62			
33	$10.25			
34	$1.44			
35	$2.35			
36	$2.11			
37	$1.44			
38	$1.46			
39	$2.47			
40	$0.25			
41	$0.25			
42	$1.73			
43	$2.11			
44	$0.25			
45	$1.42			
46	$0.25			
47	$1.98			
48	$0.25			
49	(missing)			
50	$0.25			
51	$0.25			
52	$3.70			
53	$1.75			
54	$2.02			
55	$2.11			
56	$0.25			
57	$2.11			
58	$1.82			
59	$2.54			
60	$1.40			
61	$1.98			
62	$2.00			
63	(missing)			
64	$7.44			
65	$2.05			
66	$2.02			
67	$4.06			
68	$0.25			
69	$1.84			
70	$3.54			
71	$5.99			
72	$3.49			
73	$3.78			
74	$2.00			
75	$2.11			
76	$2.00			
77	$1.64			
78	$2.44			
79	$4.68			
80	$2.02			
81	$1.34			
82	$2.05			
83	$0.25			
84	$1.38			
85	$2.73			
86	$0.25			
87	$2.25			
88	$1.44			
89	$2.00			
90	$1.39			
91	$0.25			
92	$0.25			
93	$4.99			
94	$1.96			
95	$2.71			
96	$0.99			
97	$1.23			
98	$6.13			
99	$1.44			
100	$1.44			
101	$5.06			
102	$1.68			
103	$3.69			
104	$2.27			
105	$1.31			
106	$3.33			
107	$2.99			
108	$1.46			
109	$1.42			
110	$1.46			
111	$1.90			
112	$1.46			
113	$1.45			
114	$1.58			
115	(missing)			
116	$1.46			
117	$1.46			
118	$1.46			
119	$4.84			
120	(missing)			
121	(missing)			
122	(missing)			
123	(missing)			
124	$1.65			
125	(missing)			
126	$1.46			
127	(missing)			
128	$1.94			
129	(missing)			
130	$1.47			
131	(missing)			
132	(missing)			
133	$1.46			
134	$4.84			
135	$1.75			
136	$0.25			
137	$2.02			
138	$1.85			
139	$2.00			
140	(missing)			
141	$1.90			
142	$1.20	$5.51		
143	$2.00	$2.27		
144	$7.97	$26.00		
145	$0.25			
146	$0.25			
147	$2.42		$42.00
148	$0.99			
149	$0.25			
150	$2.49	$37.30		
151	$0.64			
152	$2.00			
153	$2.02	$4.50		
154	$4.24	$35.00		
155	$4.99			
156	$2.41	$8.88	$32.39
157	$3.97			
158	$5.47	$10.00		
159	$2.00			
160	$0.99			
161	$1.44	$5.50	$16.41
162	$0.99	$4.25		
163	$0.99			
164	$2.11		$20.21
165	$1.75			
166	$2.99	$4.21		
167	$2.27			
168	$2.15			
169	$0.25			
170	$1.94			
171	$1.99			
172	$5.37	$2.27	$29.00
173	$2.03			
174	$13.07	$82.92	$180.96
175	$2.10			
176	$1.99		$23.50
177	$25.87	$26.54	$65.38
178	$2.99			
179	$5.99			
180	$4.01	$21.00		
181	$1.99	$21.25	$26.00
```

Match by row order/card number (both tables are in the same order and cover
the same #1–181 range) — don't match by name alone since many names repeat
across different rows (e.g. "Lewis Hamilton" appears ~15+ times).

## 2. After the seed is done, confirmed roadmap for this session

Per the user: after this checklist is seeded, move on to **pricing of cards
with images, then a UI/UX overhaul, then whatever the website needs after
that**. No further detail was given — treat this as three sequential,
open-ended phases to scope with the user one at a time, not a spec to
execute blind. Check `PROJECT_STATE.md` and `TODO.md` at repo root first for
what's already shipped vs. open (as of last session: Collection V2 +
Football Catalog Foundation shipped; catalog quality tooling and a small
Daka import were the previously-planned next steps — the user's answer this
session supersedes/reprioritizes that with pricing+images+UI/UX instead, but
confirm which one they actually want first before starting).

## 3. Process notes carried over

- Single Supabase environment — local dev hits the **real prod DB**, no
  shadow-DB `migrate dev`; hand-write + resolve migrations instead.
- Expect multiple detailed revision rounds on any plan before real approval
  — don't treat a first pass as signed off.
- Write completion reports as verified/issues/deferred/limits; never
  over-claim "production ready".
