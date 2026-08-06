# Collectra Roadmap

Last updated: 2026-08-06

This is the living, phase-by-phase plan for Collectra — what's built, what's next, and roughly why, in that order. Phases are sequential by design decision (see "Sequencing rationale" at the end), not calendar time.

Status legend: ✅ done · 🔜 next · 📋 planned · 💭 future / not yet scoped

---

## Phase 0 — Foundation ✅

Core data graph, real ingestion, real persistence. No mock data anywhere in the app layer.

**What exists:**
- Prisma schema modeling the full collectible-card domain: `Universe → Franchise → Series → Set → Card → Variant`, `Manufacturer → Brand`, `Product → ProductComponent → Pack → PossiblePull` (sealed-product/pack-odds chain), `Artist`/`Character`/`Person`/`Team` (creative/subject metadata), `Instance`/`Location`/`Certification` (personal ownership + grading), `Wishlist`, `Project`/`ProjectTarget` (set-completion goals), `Event` (activity log), `UserMetrics`/`Insight` (the "Intelligence" engine), `MigrationSession`/`MigrationRow` (CSV import), `DataSource`/`Contribution` (source-agnostic ingestion + community moderation queue).
- Real ingestion pipelines, verified against the live database (2026-07-22): Pokémon 20,257 cards (complete), Magic: The Gathering 4,984 cards (substantial, real, not yet a full Scryfall bulk-data pull), Football/Soccer 530 cards (the curated Topps UEFA Match Attax 2025/26 checklist, manually curated, not scraped), Yu-Gi-Oh! 13 cards (an early sample only — despite earlier session notes calling this "live," it is not meaningfully populated yet and should not be treated as usable coverage).
- Hybrid media model: `Media` (canonical asset, source-typed: OFFICIAL > USER_UPLOAD > COMMUNITY > OPENLY_LICENSED > HOTLINK priority order) + `MediaVariant` (generated sizes/formats) + `MediaAttachment` (polymorphic, many-per-entity). Hotlinking (no download/redistribution) is the default for most current art; a real `SupabaseStorageAdapter` exists for the cases that do need hosted storage.
- Deployed to Vercel (`collectra-plum.vercel.app`), Postgres + Storage on Supabase.

## Phase 1 — Mock Data Elimination ✅

Every page audited and converted from hardcoded arrays to real Prisma queries: Cards, Explore, Search, Statistics, Vault, Wishlist, Pack Simulator, Projects, plus the collection-toggle actions (`toggleCardOwned`, `toggleFavorite`, `toggleVaulted`, `toggleWishlist`) and the old localStorage-only zustand store removed entirely. The "Intelligence" engine (portfolio value, health score, completion score, insights) runs on real formulas over real data — no placeholder constants anywhere.

## Phase 2 — Migration Engine ✅

CSV/collection import, built for real rather than mocked: a CSV parser, a `MigrationAdapter` interface (TCGPlayer export + a generic best-effort column-mapper), a `MigrationMatchingEngine` doing real string-similarity scoring against the catalog, a staged review UI for ambiguous matches, and a commit step that creates real `Instance` rows. Verified end-to-end with a real integration test.

## Phase 3 — Product Polish ✅

Three back-to-back polish passes (full detail in `docs/adr` history and prior session reports):
- Structural completeness: `loading.tsx`/skeletons on every route, real `error.tsx`/`global-error.tsx`/`not-found.tsx`, full navigation coverage (was 5 of 13+ routes reachable, now all of them), a real Settings page and Manufacturers pages (neither existed before).
- Full light/dark theme (was dark-only with ~800 hardcoded color classes), working toggle, verified dark-mode-identical rendering.
- Collector-experience fixes: ownership visually distinct at a glance in every card grid (grayscale-if-unowned), live-reactive completion stats (was a stale server snapshot), real breadcrumbs/share/related-cards on the card detail page.
- Accessibility: keyboard traps fixed on the two modals that had them, focus trapping + restore-on-close added to all three modals, `prefers-reduced-motion` respected globally, every form control given an accessible name.
- **Considered closed** as of 2026-07-22 — see the Phase 3 report and the user's sign-off. Reopen only if browser testing finds real layout issues, accessibility testing finds regressions, or real users struggle with the Favorite/Wishlist/Vault model (tracked as a known open question, not a bug).

---

## Phase 4 — Authentication & Accounts ✅ (core), 📋 (onboarding/public profile deferred)

**Architecture design**: `docs/adr/002-authentication-architecture.md` — **Accepted and implemented.**

Closed 2026-07-22, after a resume session that verified every previously-claimed piece against the live Supabase project (not assumed) and fixed two real authorization gaps plus one real migration bug found during that verification — see the ADR and session report for detail. Summary of what's real and live now:

**Shipped:**
- Sign up / sign in via Supabase Auth, email/password (`/login`, `/signup`, `/forgot-password`, `/reset-password`) — the only provider actually enabled on the project today (confirmed against the live Auth settings endpoint). Magic link and Google/GitHub OAuth are still just roadmap intent — no provider is configured yet, deliberately not built ahead of that.
- Real multi-user support — every `userId`/`uploadedByUserId`/`submittedByUserId`/`reviewedByUserId` foreign key is load-bearing; `DEFAULT_USER_ID`/`src/lib/user.ts` fully removed, all 16 ADR-listed call sites plus two migration actions (`commit.ts`, `rows.ts`) that had real, previously-unchecked authorization gaps migrated to `getCurrentUser()`/`requireUser()`/`requireUserForAction()`
- Session management via Supabase Auth + `@supabase/ssr`, refreshed every request via `proxy.ts`
- Protected routes gated at the proxy layer (verified: unauthenticated → 307 to `/login`) and re-checked inside every Server Action (verified: cross-user data access tested with two real accounts, confirmed isolated)
- Account settings: sign-out (including "sign out everywhere"), data export — both real and working
- `role` field live (`USER` default, `MODERATOR`/`CURATOR`/`ADMIN` for later) — no permission matrix yet, gates nothing on its own until a feature needs it
- Idempotent legacy-data migration for `user_1`/`samanyu@gomarg.com` — verified end-to-end with synthetic data (real migration for the actual account hasn't run yet; fires automatically on that account's first real sign-up)
- `user-uploads` bucket confirmed private via the live Storage API; owner-scoped RLS policy live; storage keys follow the `users/{userId}/...` structure

**Explicitly not done — deferred, not forgotten:**
- User onboarding (first-run flow for a zero-card account) — not built
- Public profile (`/u/[username]`, `isPublic` flag, username claiming) — not built; the schema fields (`User.isPublic`, `User.username`) exist but nothing reads/writes them yet
- Magic link, Google OAuth, GitHub OAuth — no provider configured on the Supabase project yet

## Phase 4.5 — Dev tooling cleanup ✅

`src/scripts/seed-collection.ts` and `seed-workspace.ts` no longer hardcode `user_1` — both now require a real, existing user id as a CLI argument (`npx tsx src/scripts/seed-collection.ts <userId>`) rather than fabricating a `User` row, since `User.id` must now equal a real `auth.users` id (see ADR §2).

## Phase 5 — Real Price Engine ✅ (deployed, verified in production)

**Architecture + implementation**: `docs/adr/003-price-engine-architecture.md` — accepted, implemented, deployed, and verified against real data and real production infrastructure, 2026-07-22 to 2026-07-23. Live at `https://collectra-plum.vercel.app`, commit `3d74ee7`, tagged `v0.5.0-beta`. See the ADR's "Implementation status" section for the full record; summary here:

- Two real Tier 0 sources (TCGPlayer + Cardmarket, same free API, no new credentials) replacing the never-populated `MarketListing`, which has been fully removed from the schema after proving zero remaining reads and writes.
- Real outlier exclusion, confidence scoring, and graceful degradation — each verified against actual live-API anomalies and stale data, not synthetic test cases.
- Rate limiting enforced against the API's real documented limits (30/min, 1000/day), integration-tested with a genuine forced wait/resume.
- Performance: 1.9x faster after batching, confirmed on a larger real run (413 variants); the original retry storm is gone.
- 59 tests, a shared `PriceTag` UI component wired into every major price-display surface, and a role-gated `/admin/pricing` visibility page.
- **Deployed and verified live**: real signup/login, ownership isolation, cron authentication, and the admin dashboard all confirmed against production, not just locally.
- **Phase 5.1 (incremental/resumable sync), also shipped**: production verification itself found that one cron invocation can't finish the ~174-set catalog inside Vercel's function time limit. Fixed with a persisted resume cursor (keyed on each set's own stable id, not array position) and a time-boxed loop — each daily invocation now picks up where the last one stopped, wrapping to the start once a full lap completes. Verified with a real three-run test against the live database proving actual resume, not just design intent.

**Deliberately not done**: further throughput optimization (the 1.9x batching win plus incremental sync is the more durable fix than squeezing more speed out of one invocation), MTG/Scryfall pricing, realized gains, wishlist notification delivery, OAuth/magic-link. Each is a named, scoped follow-up in the ADR, not a silently dropped requirement.

## Phase 5.2 — eBay Tier 1 price + image adapter ✅ (implemented, verified against real production data)

**Architecture**: `docs/adr/003-price-engine-architecture.md` §19. Correcting this file's own prior claim that Tier 1 was deferred — a real eBay Browse API integration (Production credentials) is built and running.

Real, credentialed (not scraped) source: eBay Browse API `item_summary/search`, observing **active listings (asks)**, never sold comps — eBay's separately-gated Marketplace Insights API would be needed for that and isn't integrated. `src/ingestion/ebay/`: OAuth client-credentials auth, three anti-contamination filters found and fixed against real bad matches (bulk/lot listings, graded slabs, wrong-number/wrong-subline title matches), and a resumable, **paginated** full-catalog sweep (`sweep-catalog.ts`) — the pagination strategy the task required, decided after confirming the real bottleneck is Vercel's 300s function cap, not eBay's own rate limit: a `{tier}:{cardId}` cursor, a tiered priority order (the user's own owned collection first, then four named franchise groups, then everything else), and a bounded 1,000-card window per invocation that tops up across tier boundaries and wraps. Deployed as a daily `CRON_SECRET`-gated Vercel Cron (`/api/cron/ebay-price-sync`).

Best-matched listing photos are downloaded and **re-hosted in Supabase Storage** (`EBAY_LISTING_PHOTO` usage) rather than left as bare hotlinks, since eBay listings expire far faster than the official-artwork hotlinks every other source uses — a deliberate, user-approved departure from this codebase's hotlink-first convention. `pick-primary-image.ts` now centralizes cross-source image display priority (`OFFICIAL_ARTWORK > THUMBNAIL > EBAY_LISTING_PHOTO > LISTING_PHOTO`) so every page agrees.

**Verified against real production data, no mocks** (2026-08-04): 2,493 clean `PriceObservation` rows across 706 variants, 706 real re-hosted images, a real contamination bug found mid-sweep and fixed (plus a one-time purge of the specific pre-fix rows, not a blanket delete), 21 new unit tests covering the filter/matching logic and the tiered resume-cursor guarantee.

**Deliberately not built**: the listing-liveness recheck/delete job eBay's License Agreement §8.1(b)(1) technically calls for (user accepted this as a known risk — see ADR §19), telemetry, and running the sweep's long-lived `--unbounded` mode (needed to lap the full ~32,107-card catalog in days rather than months under the daily cron alone).

## Phase 5.3 — Storage provider migration (Supabase → Vercel Blob, public media) ✅

**Architecture**: `docs/adr/007-storage-provider-migration.md`. Supabase Storage hit its plan's Fair Use quota (1.424GB / 1.0GB limit), driven mainly by the eBay sweep's continuous image re-hosting. Evaluated and rejected: a second Supabase account (fair-use evasion, doesn't scale), Firebase Storage (now requires the Blaze plan — a card on file — just to provision a bucket at all, even though usage inside the free tier isn't billed).

Landed on Vercel Blob: no new vendor, no card required on the Hobby plan, comparable free tier (5GB storage). `VercelBlobAdapter` implements the existing `StorageAdapter` interface from ADR 001 with no interface changes — catalog images and marketplace listing photos now write to a new public Blob store; existing Supabase-hosted media is untouched and keeps resolving correctly (`Media.provider` is read per-row, not assumed from today's default). Private uploads (scanner, migration) stay on Supabase for now — a private Blob store was created but not connected (needs a dashboard step the CLI doesn't expose); revisit only if Supabase's remaining quota becomes a bottleneck there too. Explicitly re-confirmed with the user: storage-provider access level (public/private) is not an authorization system — per-user ownership checks remain entirely the app's own responsibility (JWT + `uploadedByUserId`), unchanged by this migration.

Two real bugs found and fixed during rollout, not left as silent gaps: `next.config.ts` was missing the Blob image host (found via a live smoke test, `/marketplace` threw a client-side error); the sweep's long-lived wrapper shell doesn't auto-reload `.env` (tsx doesn't auto-load it either — the shell only had what was exported at its own launch), fixed by sourcing `.env` before every sweep window instead of only at process start.

**Deliberately not done**: private-store connection (Appwrite chosen as the fallback vendor if Blob's quota is also exhausted, not yet integrated in any form); no migration/backfill of existing Supabase-hosted media to Blob (unnecessary — old rows keep working as-is).

## Phase 6 — Scanner ✅ (implemented, validated end-to-end against real services)

**Architecture**: `docs/adr/004-scanner-architecture.md` — accepted 2026-07-23. Photo upload/camera capture → OCR → identification via the extended `MigrationMatchingEngine` → candidate review → one-tap add to collection, with pricing refreshed immediately via the existing pricing pipeline (Phase 5).

Correcting this file's own prior claim: `Media.perceptualHash` does exist in the schema with a real, working generator (`SharpImageProcessor.analyze()`) behind it — but confirmed directly against the live database, **zero of 44,966 real `Media` rows have one populated**. Perceptual-hash matching stays a deferred fast-follow (needs a backfill), not implemented in V1.

Reuses four pieces of already-proven infrastructure rather than building parallel systems: the media/storage pipeline (Phase 4/ADR 001), the `MigrationMatchingEngine` confidence-scored text matcher (extended with two new set-less match paths for OCR input, gated so the existing CSV-import caller is untouched), the pricing confidence/display pattern (ADR 003), and the `CARD_SCANNED` event type the schema already anticipated.

**OCR provider**: implemented behind a swappable `OcrProvider` interface (`src/lib/scanner/ocr.ts`), selected via `OCR_PROVIDER` (explicit, fails loudly on misconfiguration) with an implicit key-presence fallback for local dev. Google Cloud Vision was built first but is blocked on GCP billing setup; OCR.space (no billing account required) is the currently active provider.

**Verified live, 2026-07-23** — a full real run (real card photo, real OCR.space call, real `MigrationMatchingEngine`, real DB writes, real Pokémon TCG price refresh, no mocks): OCR extracted 22 lines correctly; name/number extraction correct; matching engine correctly returned MEDIUM confidence with 5 real ambiguous candidates rather than a false-positive guess; collection write + `CARD_SCANNED` event + price refresh all succeeded (`$1,746.56`, HIGH confidence, 18 observations). ~4s total scan latency (OCR + matching). A real bug found during this run — the name-extraction heuristic picked a card's copyright line over its actual name because the copyright line was longer — was fixed (filter obvious non-name text, then take the first block in reading order rather than the longest) and locked in with a regression test built from the actual OCR output that exposed it.

**Deliberately not done / tracked as beta hardening, not blocking work**: a real (non-demo) `OCR_SPACE_API_KEY`; telemetry (provider used, OCR latency, match confidence distribution, manual-selection rate, OCR failures, scan completion rate); a real-world evaluation set of 50–100 photos across franchises/lighting/sleeves/foil/camera quality to measure top-1/top-5 accuracy; monitoring OCR.space's free-tier limits in production. Also deferred per the ADR's V1 scope: live camera preview, continuous/batch scanning, barcode lookup, perceptual-hash matching, offline mode, automatic grading estimation.

## Phase 7 — Marketplace / Trading ✅ (V1 implemented, verified against real infrastructure)

**Architecture**: `docs/adr/005-marketplace-architecture.md` — accepted 2026-07-23. Guiding principle: **"Marketplace listings are advertisements for owned instances — not transactions."** Collectra stays the catalog, pricing engine, discovery platform, and inventory manager; the actual sale (payment, shipping) happens off-platform in V1, by explicit choice, not because payment is hard to build — it isn't the product's differentiator and pulls in an entire second product area (KYC, fraud, chargebacks, tax handling, dispute resolution) that a full transactional marketplace (Stripe Connect-style, a real named fast-follow as Phase 7.5/8) would require.

Correcting this file's own prior claim: `MarketListing` does **not** exist — it was fully removed from the schema during Phase 5 after proving zero real reads/writes, and this file kept repeating the pre-removal claim. `ProductRelationship` is not marketplace infrastructure either — it's a catalog-graph edge between two `Product` rows (successor/predecessor/alternative/bundle), unrelated to user-to-user listings. `Event` genuinely does already anticipate a `TRADE_CREATED` type in its documented vocabulary, unemitted — that part was accurate.

**Implemented 2026-07-23**, in the vertical slices the user requested:

- **Schema**: `Listing` (full snapshot at creation — condition/grade/photos never silently sync from a later `Instance` edit) and `ListingInquiry` ("Message Seller," one row per buyer per listing). A hand-written partial unique index (`status = 'ACTIVE'`) enforces "at most one active listing per instance" — not representable in Prisma schema syntax, added directly to the migration SQL matching this project's established migration-by-hand-SQL convention.
- **Lifecycle**: `createListing` (DRAFT) → `uploadListingPhoto` → `publishListing` (blocks at zero photos; catches the real unique-constraint violation with a clear error rather than pre-checking and racing) → `reserveListing` (atomic conditional `updateMany`, not read-then-write, so two buyers can't both reserve the same listing) → `cancelReservation` → `markListingSold` (retires the listing; deliberately does **not** touch `Instance.userId` — the seller separately removes the card from their own collection if they choose to, via the existing `toggleCardOwned` flow) → `withdrawListing`.
- **Discovery**: `/marketplace` (search by card name, filter by `shipsTo`, pagination) — same query/pagination shape as `/cards`.
- **Listing detail**: `/marketplace/[id]` — photo gallery, condition/grade snapshot, price anchored against the existing `CurrentPrice`/`PriceTag` (ADR 003), seller trust panel, Reserve + Message Seller.
- **Trust signals**: `getSellerTrustFacts()` — member since, collection size, verified-scan count (`Instance.scanMediaId`), completed sales, response rate. No score, ever, per the ADR — `responseRate: null` (never a fabricated 0% or 100%) until a seller has at least one real inquiry.
- **Storage**: a real new public `marketplace-media` Supabase bucket (provisioned this session), separate from the existing private `user-uploads` bucket — verified live that an uploaded listing photo's public URL is actually publicly fetchable (200 OK), not just assumed from the bucket's `public: true` flag.
- **Seller dashboard**: `/marketplace/selling` — manage listings by status, reply to inquiries.

**Verified live** against the real database (temporary test user + instance, fully cleaned up afterward, confirmed via a fresh query): full DRAFT→ACTIVE→RESERVED→SOLD lifecycle, the partial unique index actually rejecting a second active listing, the reservation race guard actually returning 0 rows on a second concurrent attempt, `markListingSold` confirmed to leave `Instance.userId` untouched, and `getSellerTrustFacts` returning real, correctly-derived numbers (a real collection size of 7, `completedSales` moving 0→1, `responseRate` computing to 1.0 after one real reply) — not asserted from how the code is supposed to behave.

**Listing expiry, added same session**: `/api/cron/marketplace-expire` (Vercel Cron, `CRON_SECRET`-gated, daily) transitions `ACTIVE` listings past their `expiresAt` to `EXPIRED`. Built this way after checking a claim this ADR itself originally made — that it would reuse `SyncJob`, "Phase 5's real job-queue infrastructure" — against the actual codebase: `SyncJob`'s polling worker is only ever invoked by standalone local scripts, never wired into `package.json`, `next build`, or any Vercel Cron entry, so it doesn't run anywhere in this deployment. The real proven pattern is what `price-sync` itself uses (Vercel Cron → `CRON_SECRET`-gated route → direct function call) — that's what the expiry job follows instead. ADR 005 corrected to match.

**Deliberately not built this session — real, named gaps, not silently dropped**: wiring a "List for Sale" entry point directly into the Shelf UI (V1 uses a standalone instance-picker at `/marketplace/new` instead, to avoid touching the existing `DisplayCase` component); wishlist→listing notifications (`Wishlist.priceAlert` exists but isn't wired to new listings yet — now the subject of Phase 7.5 below); marketplace telemetry (listings created, publish success/failure, reserve attempts, inquiry response times); deleting/replacing/reordering a listing photo after upload. None of these block V1 usability; all are named follow-ups, not oversights.

## Phase 7.5 — Notification & Activity Architecture ▶️ (architecture drafted, pending review — not implemented)

**Architecture**: `docs/adr/006-notification-architecture.md` — drafted 2026-07-23, status Proposed. The connective layer across Marketplace, Wishlist, the pricing engine, and Scanner — user's own framing: "the missing piece is an engagement layer," what turns Collectra "from a database into a product users return to regularly."

Three existing systems look like they might already solve this and don't, each for a specific, checked reason: `Insight` (`src/lib/intelligence/insights/generator.ts`) is a real recommendation engine, but it's recomputed and wiped on every page load — the wrong temporal model for a notification that has to persist until read. `Event` is the real append-only log every mutation already writes to, but `Event.userId` is the actor (e.g. the buyer who reserved a listing), not necessarily the recipient (the seller who needs to know) — deriving "who to notify" means joining through `Instance.userId`, which `Event` alone doesn't give you. `Wishlist.priceAlert` exists and is shown in the UI, but confirmed via search: nothing anywhere evaluates it against real price changes — it's inert metadata today.

Decided in the draft, per the user's own recommendation: in-app only for V1 (no email/push infrastructure — matches Marketplace's off-platform-payment reasoning, avoid building the expensive channel before validating the cheap one), a new minimal `Notification` model (`recipientUserId`, `type`, `payload`, `linkUrl`, `readAt`) rather than repurposing `Insight` or `Event`, pull-based unread counts (no realtime/WebSocket infrastructure exists in this codebase — computed on page load/navigation, not live-pushed), and no per-event preferences or digesting in V1 — every notification type is immediate, the only per-notification state is read/unread. Six V1 notification types, each wired to a real, already-existing trigger point: `LISTING_RESERVED`, `LISTING_SOLD`, `LISTING_EXPIRED`, `INQUIRY_RECEIVED`, `INQUIRY_REPLIED`, `WISHLIST_MATCH`, and `PRICE_ALERT_TRIGGERED` (the first real use of `Wishlist.priceAlert` since it was added).

Not yet implemented — ADR only, pending review.

## Phase 8 — Social & Community 💭

Following, activity feeds, public collection browsing beyond the single-profile view Phase 4 ships. Depends on Phase 4's `isPublic`/`username` foundation. The `Contribution` moderation queue (community-submitted data edits) already exists in the schema and is a form of "community" infrastructure, just not yet exposed in any UI.

---

## Sequencing rationale

Phases 0–3 were infrastructure and polish — necessary, but not what makes someone open the app on a Tuesday. Phases 4 and 5 are what make it a product: an account worth having, and numbers worth checking. Everything after that (Scanner, Marketplace, Social) compounds on having real accounts and real prices — building any of them first would mean building on a single-user, price-less foundation and redoing work later. Phase 4 before Phase 5 specifically because pricing alerts, portfolio valuation, and "check this daily" behavior are only meaningful once there's a real identity to attach them to.

Per explicit instruction: no major new backend systems or additional ingestion work happens outside of what a given phase actually requires. Phase 4 does not expand ingestion. Phase 5 will need real price-source integration, which is ingestion-adjacent but is the actual point of that phase, not scope creep.
