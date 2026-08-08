# TODO: Add Topps Premier League 2026 + Topps Turbo Attax 2025 collections

## Steps

- [x] Understand repo seeding patterns (builder.ts, prisma.ts, existing seed scripts)
- [x] Confirm plan with user
- [x] Create `src/scripts/seed-topps-premier-league-2026.ts`
  - [x] Base set 1–360 (cards, persons, teams, team badges)
  - [x] Base parallels (Festive, Blue, Yellow, Green, Mini Diamond ×16, Sparkles ×16, Holo ×3, Rainbow Foil ×10)
  - [x] Subset tagging (Generation Now, Full Force, Breakthrough Baller, Tekker, Rookie) + subset parallels
  - [x] Image Variation (Topps.com Exclusive) variants
  - [x] Insert sets: Pro Partnership, Retro Threads, Pro Precision, Beast Mode, Headlines, Black Edge Edition, Chrome King, Diamond Rookie, Festive Freeze, Gold Lion, Heat Vision, Home Advantage (corrected), Perfect Storm, Limited Editions, Premier Relic (relic), Autographs (A/BMA/BEA/CKA)
  - [x] Team-name corrections + mismatch report output
- [x] Create `src/scripts/seed-topps-turbo-attax-2025.ts`
  - [x] Base cards 1–356 (Strategy, F1 Teams, subsets)
  - [x] Tin exclusives (LL/SK/DM/JB/EDG/LE)
  - [x] Insert tagging by Section column
- [x] Typecheck both scripts (`npx tsc --noEmit -p tsconfig.json` — clean)
- [x] Run both seed scripts
  - [x] `seed-topps-premier-league-2026.ts` → 360 base + 361 inserts = 721 cards, 2222 variants
  - [x] `seed-topps-turbo-attax-2025.ts` → 389 cards (352 created + 37 skipped from earlier partial run)
- [x] Verify DB rows — `verify-db.ts` OK: 29284 cards, 48222 variants, 259 sets, 29 franchises, 3 universes

