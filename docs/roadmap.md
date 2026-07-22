# Collectra Roadmap

Last updated: 2026-07-22

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

## Phase 5 — Real Price Engine ✅ (code), 🔜 (one deployment step to fully close)

**Architecture + implementation**: `docs/adr/003-price-engine-architecture.md` — accepted, implemented, and verified against real data in three passes across 2026-07-22 to 2026-07-23. See the ADR's "Implementation status" section for the full, itemized launch-readiness record; summary here:

- Two real Tier 0 sources (TCGPlayer + Cardmarket, same free API, no new credentials) replacing the never-populated `MarketListing`, which has been fully removed from the schema after proving zero remaining reads and writes.
- Real outlier exclusion, confidence scoring, and graceful degradation — each verified against actual live-API anomalies and stale data, not synthetic test cases.
- Rate limiting enforced against the API's real documented limits (30/min, 1000/day), integration-tested with a genuine forced wait/resume.
- Performance: 1.9x faster after batching, confirmed on a larger real run (413 variants); the original retry storm is gone.
- 53 tests, a shared `PriceTag` UI component wired into every major price-display surface, and a role-gated `/admin/pricing` visibility page.

**The one thing not done**: none of Phase 4 or Phase 5's code has ever been deployed — this repo has a single git commit predating both phases. Production cron execution can't be verified until this work is committed, `CRON_SECRET` is set on the Vercel project, and a real deploy goes out. Held for explicit sign-off rather than done unilaterally, since it's a real, hard-to-reverse action on shared production infrastructure.

## Phase 6 — Scanner 💭

Camera-based card capture → OCR / image matching → identification → one-tap add to collection. Not yet scoped or designed. Depends on Phase 4 (a scan resolves to a specific user's `Instance`) and benefits from Phase 5 (an identified card can show its value immediately). `Media.perceptualHash` already exists in the schema, anticipating exactly this — image-matching infrastructure was designed for from the start, just unused until now.

## Phase 7 — Marketplace / Trading 💭

Listings, trades, offers, price alerts triggering into actual transactions. Depends on Phase 4 (seller/buyer identity) and Phase 5 (trustworthy pricing to list against). `MarketListing` and the `ProductRelationship` model give this a real foundation already; `Event` already anticipates a `TRADE_CREATED` type in its documented (if not yet emitted) vocabulary.

## Phase 8 — Social & Community 💭

Following, activity feeds, public collection browsing beyond the single-profile view Phase 4 ships. Depends on Phase 4's `isPublic`/`username` foundation. The `Contribution` moderation queue (community-submitted data edits) already exists in the schema and is a form of "community" infrastructure, just not yet exposed in any UI.

---

## Sequencing rationale

Phases 0–3 were infrastructure and polish — necessary, but not what makes someone open the app on a Tuesday. Phases 4 and 5 are what make it a product: an account worth having, and numbers worth checking. Everything after that (Scanner, Marketplace, Social) compounds on having real accounts and real prices — building any of them first would mean building on a single-user, price-less foundation and redoing work later. Phase 4 before Phase 5 specifically because pricing alerts, portfolio valuation, and "check this daily" behavior are only meaningful once there's a real identity to attach them to.

Per explicit instruction: no major new backend systems or additional ingestion work happens outside of what a given phase actually requires. Phase 4 does not expand ingestion. Phase 5 will need real price-source integration, which is ingestion-adjacent but is the actual point of that phase, not scope creep.
