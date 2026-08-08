# Project State

Last updated: 2026-08-06 (post storage-migration + infra verification pass)

Live operational snapshot — what's running, what's healthy, what's stale. For the phase-by-phase build history see `docs/roadmap.md`; for the design record behind any decision see `docs/adr/`.

## Catalog scale (live DB, as of this update)

| Metric | Count |
|---|---|
| Cards | 32,677 |
| Variants | 92,130 |
| Sets | 263 |
| Franchises | 30 |
| Universes | 3 |
| Users | 5 |
| Active marketplace listings | 0 |
| PriceObservation rows | 117,600 |
| CurrentPrice rows | 23,942 |
| Media rows | 46,224 (40,568 external hotlink · 5,633 Supabase-hosted · 23 Vercel Blob-hosted) |

## Background jobs

**eBay Tier-1 sweep** (`src/ingestion/ebay/sweep-catalog.ts --unbounded`, wrapped in a self-relaunching loop at `run-sweep-loop.sh`): running continuously, not cron-only. Sweeps the full ~32,677-card catalog under eBay's ~4,800/day quota — genuinely a multi-day job, not expected to "finish" in any one session. Each window processes 1,000 cards, persists a resumable `{tier}:{cardId}` cursor, then the wrapper sleeps 30s and starts the next window.

- Health at last check: low failure rate (13 `FAILED` outcomes across ~1,760 cards processed this session), Supabase-pooler connection blips self-heal via the existing retry/backoff (146 retry events, all recovered).
- **Known fixed bug**: the wrapper shell doesn't reload `.env` on its own (neither does `tsx`) — new credentials written to `.env` after the loop started were invisible until the wrapper itself restarted. Fixed by sourcing `.env` before every window. If env vars change again, either restart the wrapper or trust the next window to pick it up automatically now.
- Daily cron (`/api/cron/ebay-price-sync`) also exists independently for when the long-running process isn't active.

## Storage (see ADR 007)

| Media type | Provider | Status |
|---|---|---|
| Catalog images (eBay sweep re-hosts) | Vercel Blob (new writes) / Supabase (existing) | Live, verified |
| Marketplace listing photos | Vercel Blob (new writes) / Supabase (existing) | Live, verified |
| Scanner photos | Supabase (private bucket) | Unchanged |
| Migration CSV uploads | Supabase (private bucket) | Unchanged |

- Vercel Blob store `collectra-media` (public) is live and connected to the `collectra` Vercel project. Env vars (`BLOB_READ_WRITE_TOKEN`, `BLOB_PUBLIC_BASE_URL`) are set in `.env`, `.env.local`, and Vercel's Production/Preview/Development environments.
- A second store, `collectra-private`, was created but **not connected** — connecting a second store to one project needs a custom env-var name to avoid colliding with the first store's token, and that step is dashboard-only (the CLI doesn't expose it). Not urgent: private-upload volume is low and Supabase still has headroom there.
- Every `Media` row records which provider actually wrote it (`Media.provider`); all read paths select the adapter per-row, so old and new media coexist correctly with no migration needed.
- Supabase Storage quota (the original trigger for this work): was 1.424GB against a 1.0GB Fair Use limit, grace period until 2026-09-05. New public-media writes no longer add to that number; existing usage is unaffected until/unless something explicitly migrates old files (not planned).
- Fallback path if Blob's own free tier (5GB) is exhausted later: connect the private store, or move private uploads to Appwrite (chosen by the user, not yet integrated).

## Recent catalog additions (this session, verified in DB)

- Topps Match Attax 2025/26 (base): 743 cards total, including ~90 previously-missing insert subsets (Chrome Award Winner, Chrome X, Festive, Royal Elite, Genuine Autograph, Player-Worn Jersey Relic, and others) now correctly linked via the `Insert` model, not left as untracked print-run descriptors.
- Topps Match Attax Extra 2025/26: 468 cards, same insert-linking treatment.
- Both seed scripts are idempotent and were re-run clean this session (0 created, all-skip, confirming the data was already correctly in place from an earlier interrupted session).

## Known issues / technical debt (found this session, not all fixed)

1. **Fixed**: `next.config.ts` was missing an `images.remotePatterns` entry for Vercel Blob's domain and for TheSportsDB's badge CDN — `/marketplace` was throwing a client-side rendering error. Both added (wildcarded, not hardcoded to one subdomain).
2. **Fixed**: sweep wrapper's stale-environment bug (see Background jobs above).
3. **Open — `/cards` response time**: consistently ~11-12 seconds even warm (not a cold-compile artifact — confirmed via repeated direct `curl`). The query is paginated (60/page) but does a 5-level nested `include` plus three additional queries (`count`, `getImagesForEntities`, `getOwnedVariantQuantities`) against a remote Supabase Postgres that showed connection stress elsewhere this session (the sweep's retry logs). Not root-caused further — could be query cost, could be DB contention from the concurrently-running sweep, likely both. Needs dedicated investigation before the dashboard revamp, since a slow catalog browse page will be very visible in any UI work.
4. **Open — pre-existing, not from this session**: `packages/media/package.json` declares `"main": "dist/index.js"`, which has never been built (confirmed via `git log` — predates today). Works today only because Next.js/Turbopack and `tsx` both fall back to resolving the TypeScript source directly when `main` doesn't exist. Verified via a real `next build`, so not currently blocking, but fragile — a stricter resolver would break on it.
5. **Open — pre-existing lint debt**: 175 ESLint errors (mostly `@typescript-eslint/no-explicit-any`) scattered across the migration engine, scanner, `prisma.ts`, and several seed scripts. None in anything touched this session. `npm run lint` is not currently clean.
6. **Open — pre-existing, unrelated to this session**: `GOOGLE_CLOUD_VISION_API_KEY`, `KAGGLE_API_TOKEN`, and `GOOGLE_GENERATIVE_AI_API_KEY` were lost from local `.env`/`.env.local` during this session (root cause not fully isolated — not caused by any Vercel CLI command run, but coincided with that work). Two of the three were later found restored by an external process/edit outside this session's control; user explicitly said not to worry about re-adding them. Flagging only so their absence isn't a surprise later if a feature depending on them (Vision OCR, Kaggle imports) stops working.

## Regression status (this session)

- `tsc --noEmit`: clean, root project and `packages/media` both.
- `npm run lint`: 175 pre-existing errors, 21 warnings — none in files touched this session.
- `npm test` (vitest): 111/111 passing across 17 test files.
- `npm run build` (`next build`, Turbopack): clean, all 40 routes compile.
- Manual smoke test (Playwright, unauthenticated): public routes (`/explore`, `/discover`, `/login`, `/signup`, `/collections`, `/pack-simulator`, `/marketplace`) render with zero console errors after the image-config fix; auth-gated routes (`/`, `/vault`, `/shelf`, `/scan`, `/settings`) correctly redirect to `/login?next=...` rather than error. No authenticated-flow testing was done (no test credentials available in this session) — collection actions, listing creation, and scan upload are unverified by this pass specifically, though covered by the existing automated test suite.

## Deferred by explicit user decision, not forgotten

- Appwrite integration — planned as the fallback once Vercel Blob's free tier is exhausted, not started.
- Private Blob store connection — deferred until Supabase's private-upload quota is actually a problem.
- Dashboard/UI revamp — intentionally held until this infra pass is reviewed and signed off.
