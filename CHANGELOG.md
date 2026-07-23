# Changelog

Human-readable record of what shipped and why. See `docs/roadmap.md` for the phase-by-phase plan and `docs/adr/` for the full design/verification record behind each entry.

## Unreleased

### Phase 5.1 — Incremental catalog sync

Found by production verification of v0.5.0-beta, not left as a known gap: a single cron invocation can't finish the ~174-set Pokémon catalog inside Vercel's function time limit (a live run got through 14 sets before progress stopped). Fixed, not just documented:

- `DataSource.syncCursor` persists the last fully-completed set's own id (not an array position, so it survives the upstream catalog being reordered).
- Each sync invocation is time-boxed (240s, under the route's 300s cap) and stops cleanly before starting a new set, never mid-set.
- The cursor is written after every completed set, not just at the end — a hard kill loses at most the one set in flight.
- Wraps back to the start once a full lap of the catalog completes.
- Verified with a real three-run test against the live database: budget-too-tight (0 sets, proves no false-positive corruption), first real set processed (cursor advances), second run resumes from the *next* set rather than restarting.
- Explicitly not chasing more throughput — the 1.9x batching win from v0.5.0-beta stands; this is a scheduling fix, not another optimization pass.

## v0.5.0-beta — 2026-07-23

First beta-quality release. Collectra moves from a single-user prototype to a real, multi-user product with real pricing data.

### Phase 4 — Authentication & Authorization

- **Real accounts**: Supabase Auth (email/password today; magic link and OAuth are still unconfigured, deliberately not built ahead of a real provider decision). `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- **Ownership enforced everywhere**: every server action and data read now scopes to the authenticated user (`requireUser`/`requireUserForAction`/`getCurrentUser`). `DEFAULT_USER_ID` — the single-user placeholder every page used to read from — is gone.
- **Two real authorization gaps closed** that predated this release and were never public: the migration-commit action trusted a client-supplied user id instead of the session; migration-row actions (`resolveMigrationRow`/`ignoreMigrationRow`) had no ownership check at all.
- **Storage**: the `user-uploads` bucket is private, owner-scoped via RLS, with a consistent `users/{userId}/...` key structure.
- **Idempotent legacy migration**: the pre-auth single-user data (`user_1`) migrates automatically, exactly once, the first time that account holder signs up for real — no manual script, safe to retry.
- **A real bug found by testing, not assumed away**: the `handle_new_user` trigger's original `on conflict (id)` clause didn't handle the exact email-collision case the legacy migration depends on, which would have silently blocked the real migration signup. Fixed and verified with synthetic data before it could affect the real account.

### Phase 5 — Real Price Engine

- **`MarketListing` removed.** It had zero writers in the entire codebase — every price shown anywhere in the app was silently reading an empty table. Replaced with a real, append-only `PriceObservation` time series and a derived `CurrentPrice` cache.
- **Two real, live price sources**, both free, from the same existing API call: TCGPlayer (USD) and Cardmarket (EUR, real ECB-sourced exchange rate). No new credentials.
- **Confidence, not just a number**: every price carries a confidence score (observation count, recency, source trust, outlier ratio), a label (High/Medium/Low/No data), last-updated time, and source list — rendered consistently through one shared `<PriceTag>` component everywhere a price appears.
- **Outlier detection**, verified against a real case: TCGPlayer's own API returned a $9999 price for a card worth ~$40–70; the statistical pass correctly excluded it rather than corrupting the aggregate.
- **Graceful degradation**: a failed refresh never blows away the last-known-good price; stale data decays in confidence rather than disappearing; "no data yet" is always explicit, never `$0` or a blank cell.
- **Rate limiting, actually enforced**: the Pokémon TCG API's real documented limits (30/min, 1000/day for the unauthenticated tier this project runs on) are checked before every request, with real wait/backoff — integration-tested with a genuine forced wait, not just mocked.
- **Performance**: batching fixed a real retry storm and cut sync time by ~1.9x on an identical workload (158.7s → 82.5s), confirmed at larger scale (413 variants, 497ms/variant).
- **Scheduled + on-demand refresh**: a daily Vercel Cron sweep, plus a synchronous "Refresh Now" action on individual cards that fails fast rather than hanging if rate-limited.
- **Unrealized gain/loss** on top of real prices (realized gains — sale tracking — intentionally out of scope this phase).
- **`/admin/pricing`**: role-gated dashboard showing source health, sync history, failures, and live rate-limit usage.
- **53 automated tests** covering outlier detection, confidence scoring, multi-source reconciliation, stale-data handling, ownership boundaries, cron authentication, and rate-limit enforcement.

### Deployment

First deployment of both phases to production (`https://collectra-plum.vercel.app`), commit `3d74ee7`. Verified live: authentication flow, ownership isolation, cron authentication (401 without a secret, real execution with one), the pricing sync writing real data against the production database, and the admin dashboard.

### Known limitations, carried forward deliberately

- Google/GitHub OAuth, magic link: not configured.
- Realized gains, wishlist notification delivery, Tier 1 (paid) price sources, MTG/Scryfall pricing: designed, not built — each is a named follow-up in the relevant ADR, not a silently dropped requirement.
- Full-catalog price sync duration against Vercel's function limits needs a closer look — see the ADR's implementation status notes.
