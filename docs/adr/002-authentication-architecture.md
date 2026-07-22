# 2. Authentication & Multi-User Architecture

Date: 2026-07-22

## Status

Accepted (2026-07-22) — all four open questions resolved, two additional decisions incorporated (idempotent user migration, structured storage paths). Ready for implementation.

## Context

Collectra has run single-user since its first commit. Every ownership relationship in the schema (`Instance.userId`, `Wishlist.userId`, `Project.userId`, `Location.userId`, `MigrationSession.userId`, `Event.userId`, `Media.uploadedByUserId`, `Contribution.submittedByUserId`/`reviewedByUserId`) already points at a real `User` row — the schema was built ownership-aware from day one, it's just that today only one `User` row (`id: "user_1"`, email `samanyu@gomarg.com`) is ever created or queried, via a single constant:

```ts
// src/lib/user.ts
export const DEFAULT_USER_ID = "user_1";
```

16 files import this constant directly (11 pages/components, 5 server actions/libs — enumerated in full under "Migration from DEFAULT_USER_ID" below). There is no sign-up, sign-in, session, or authorization check anywhere in the app. Any request to any route sees the same data.

This ADR is scoped to: choosing a provider, the resulting data model, session handling for this specific Next.js version, the authorization boundary (app-layer vs. RLS, and why they're not the same thing here), storage/media ownership, a sharing/public-profile model sized for what the product actually needs next (not a speculative full ACL system), and a concrete migration path off `DEFAULT_USER_ID` that doesn't lose the real data already sitting in the database.

## Decision

### 1. Authentication provider: Supabase Auth

**Chosen.** Rationale, in order of weight:

1. **Supabase already owns two of the three systems auth needs to integrate with.** Postgres is already hosted on Supabase (`DATABASE_URL`/`DIRECT_URL`), and Storage is already live and in use (`packages/media/storage/SupabaseAdapter.ts`, the `user-uploads` bucket created and exercised during the migration-engine build). Supabase Auth's JWTs are the thing both of those systems already know how to verify natively — Postgres via `auth.uid()` inside RLS policies, Storage via the same mechanism on bucket policies.
2. **Credentials are already provisioned.** `.env.local` already has `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the newer `SUPABASE_PUBLISHABLE_KEY` naming — this was set up for a Supabase project that already has Auth available, just unused.
3. **`@supabase/supabase-js` (`^2.110.7`) is already a dependency.** We need to add `@supabase/ssr` (not yet installed) for the Next.js App Router cookie-based session pattern — the old `@supabase/auth-helpers-nextjs` is deprecated and must not be used.
4. **Built-in provider coverage matches a collector audience**: email/password, magic link, and OAuth (Google especially) out of the box, no extra integration work.

**Alternative considered: Auth.js (NextAuth) with a Prisma adapter.** Rejected. It would create a second, disconnected user-identity system living in Prisma-managed tables, separate from Supabase's own `auth.users` schema — which means giving up native RLS integration (Auth.js JWTs aren't Supabase JWTs; Postgres wouldn't trust `auth.uid()` from them without custom verification plumbing we'd have to build and maintain ourselves) and giving up Storage's built-in per-user policy model. It solves a problem we don't have (Supabase already provides everything Auth.js would) at the cost of a second identity system to keep in sync.

### 2. User model

**Core decision: identity moves to Supabase's `auth.users`; Prisma's `User` table becomes a profile/app-data table keyed 1:1 to it — not a separate identity source.**

Today `User.id` is `String @id @default(cuid())`. That default has to go. `User.id` becomes a plain `String @id` (no default), and the *only* way a `User` row is created is via a Postgres trigger on `auth.users` that mirrors `id` and `email` into `public."User"` at signup:

```sql
-- New migration, raw SQL (Prisma migrate supports hand-written SQL in a migration file)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (id, email, "createdAt", "updatedAt")
  values (new.id, new.email, now(), now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

This is the standard Supabase pattern specifically because it's atomic with signup — there's never a window where a `auth.users` row exists with no matching `User` profile row, which every server action's `where: { userId }` query depends on existing.

Schema additions to `User`:

```prisma
model User {
  id           String    @id                // no @default — must equal auth.users.id
  email        String    @unique
  name         String?
  username     String?   @unique            // for /u/[username]; nullable until claimed, then effectively permanent (see below)
  usernameSetAt DateTime?                   // set once, on first claim — backs the "very rarely changeable" rule
  avatarUrl    String?
  bio          String?
  isPublic     Boolean   @default(false)    // profile/collection visibility — private by default
  role         String    @default("USER")   // USER | MODERATOR | CURATOR | ADMIN — backs the existing but currently-unenforced Contribution review flow
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  // ...existing relations unchanged
}
```

**Username rules**: unique, lowercase, URL-safe (`^[a-z0-9_]{3,20}$` — enforced at the application layer on claim, not a DB constraint, so the error message can be friendly), and immutable in practice — changeable at most once every 90 days via a rate-limited path, not a hard `@default` lock, since "immutable" with zero recovery path becomes a support burden the first time someone typos their own username at signup. `usernameSetAt` is what a future rate-limit check reads.

**Role values**: `USER` (default) → `MODERATOR` (reviews `Contribution` submissions) → `CURATOR` (future: can edit canonical catalog data directly, not just review community submissions) → `ADMIN`. No permission matrix beyond simple role-gating in V1 — a role check (`role IN (...)`) at the point of use, not a generalized RBAC system. Extend only when a real feature needs finer grain.

`role` exists today only conceptually — `Contribution.reviewedByUserId` already implies a reviewer role, but nothing checks that the reviewer is actually authorized to review. This closes that gap without inventing new scope.

### 3. Session model

Supabase Auth sessions are a short-lived JWT access token (~1hr) plus a long-lived refresh token, held in **httpOnly cookies** via `@supabase/ssr`. No custom session table in Prisma — `auth.sessions` is Supabase-managed, outside Prisma's schema entirely.

Three client contexts, per Supabase's documented Next.js App Router pattern:

| Context | Function | Used in |
|---|---|---|
| Browser | `createBrowserClient()` | Client components — login form, OAuth button, sign-out |
| Server | `createServerClient()` reading `next/headers` cookies | Server Components, Server Actions — reading the current user |
| Proxy | `createServerClient()` writing refreshed cookies | `proxy.ts` (see below) — keeps the session alive across requests |

**Breaking-change note specific to this Next.js version, confirmed against the installed docs, not memory: the file is `proxy.ts`, not `middleware.ts`.** Next.js renamed the convention in v16.0.0 (`middleware` is deprecated). Supabase's own SSR auth guides — including ones baked into most training data — still say `middleware.ts`. That guidance is wrong for this codebase. The session-refresh logic goes in `src/proxy.ts`, exporting a `proxy` function, matched against all routes except static assets:

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
```

Without this running on every request, Supabase access tokens silently expire ~hourly and users get logged out mid-session.

### 4. Authorization — two layers, and Proxy is not one of them for data access

Next.js's own `proxy.ts` docs (read directly from this version's bundled docs, not assumed) say this explicitly: *"Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone... A matcher change or a refactor that moves a Server Function to a different route can silently remove Proxy coverage."* That's the model this ADR follows:

1. **Proxy-level route gating** (`proxy.ts`): redirects unauthenticated visitors away from `/settings`, `/shelf`, `/vault`, `/wishlist`, `/projects`, `/statistics`, `/migration` to `/login`, and redirects authenticated visitors away from `/login`/`/signup` to `/`. This is UX, not security — it stops a logged-out user from seeing a broken page, nothing more.
2. **Per-call authorization inside every Server Action and every server data-fetch.** A new `getCurrentUser()` helper (`src/lib/auth/session.ts`) reads the Supabase server client and either returns the authenticated `User` row or throws/redirects. Every one of the 16 files currently doing `where: { userId: DEFAULT_USER_ID }` changes to `where: { userId: (await getCurrentUser()).id }`. This is the *actual* authorization boundary — the existing `userId` foreign keys on every table do the real work once they're populated from a real session instead of a constant.

### 5. Row Level Security — where it's load-bearing and where it isn't (read this before assuming RLS "handles" authorization)

This is the part most likely to be assumed rather than reasoned through, so it's worth being explicit: **Prisma connects to Postgres directly via `DATABASE_URL`/`DIRECT_URL`, not through Supabase's PostgREST/Data API.** RLS policies are enforced per-*role*, and Prisma's connection role is not the same thing as the `authenticated` role Supabase's own API layer uses with `auth.uid()` bound to the request's JWT. Enabling RLS on a table does **not** automatically protect a Prisma query against reading another user's rows — Prisma's queries never carry `auth.uid()` context unless the app explicitly sets it per-request, which this app's pooled/retrying Prisma client (`src/lib/prisma.ts`) does not do today and would need real work (per-request `SET LOCAL request.jwt.claims`, which fights connection pooling) to do correctly.

Given that, the plan for V1:

- **RLS is enabled on every table in `public`** regardless — this is non-negotiable baseline hygiene per Supabase's own security guidance, because any table in an exposed schema is reachable through the Data API the moment `anon`/`authenticated` roles are granted access to it, RLS or not. This protects against a *future* mistake (someone querying Supabase directly from the browser) even though nothing does that today.
- **Application-layer authorization (§4) is the primary, load-bearing defense for all Prisma-driven access** — which is all data access today. This is a deliberate, common, documented pattern (Prisma + Supabase where RLS backs the Data API and the app backs Prisma), not an oversight.
- **RLS *is* the primary defense for Storage**, because Storage is accessed through Supabase's client SDK using its own RLS-aware policy engine, not through Prisma. See §6.
- **Flagged as a future hardening step, not V1 scope**: if the app ever queries Supabase directly from client components (bypassing Prisma/Server Actions) — which it does not do today, and today's Server-Action-only data flow is itself a good security default — RLS would need to become load-bearing for that path too, via a Prisma client extension that sets JWT claims per transaction.

### 6. Storage ownership

Two real, concrete problems exist in the current storage code and must be fixed as part of this work, not treated as hypothetical:

1. **The `user-uploads` bucket was created `{ public: true }`** during the migration-engine build this session. Anyone with a CSV's storage key could read another user's uploaded collection export. It needs to become a private bucket with an RLS policy scoping reads/writes to the uploading user.
2. **Storage keys have no user prefix.** `src/lib/migration/storage.ts` writes to `migrations/${checksum}-${filename}` — no `userId` segment, and no consistent structure across the codebase's various storage writers more broadly.

Rather than patch just the one path, establish one consistent key structure across every writer from the start — this is what makes per-user RLS policies, bulk cleanup, and future features (avatar upload, data export download) each a one-line addition instead of a new one-off convention every time:

```
users/{userId}/uploads/{checksum}-{filename}     — migration CSVs (was: migrations/{checksum}-{filename})
users/{userId}/avatars/{filename}                — profile pictures (new, Phase 4)
users/{userId}/exports/{timestamp}.json          — data exports (currently generated client-side as a Blob download, not stored — this path is for if/when exports need to be resumable or shareable)
cards/{cardId}/{mediaId}-{variant}               — card art, canonical/shared
products/{productId}/{mediaId}-{variant}         — product/pack art, canonical/shared
manufacturers/{manufacturerId}/{mediaId}         — brand/manufacturer logos, canonical/shared
```

The `users/{userId}/...` prefix is what the RLS policy pattern-matches on. Bucket policy shape once `user-uploads` is private:

```sql
create policy "Users can access their own storage objects"
on storage.objects for all
to authenticated
using (bucket_id = 'user-uploads' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text)
with check (bucket_id = 'user-uploads' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
```

The `cards/`, `products/`, `manufacturers/` prefixes are canonical catalog assets, not personal data — safe to stay public-read on whichever bucket ends up hosting them (`media-originals` if/when that bucket is actually created; only `user-uploads` exists today). Their *write* path still needs a policy: only the uploading user (`Media.uploadedByUserId`) or a `role IN ('MODERATOR', 'CURATOR', 'ADMIN')` user should be able to write or delete.

### 7. Media ownership

Already modeled — `Media.uploadedByUserId` exists. The gap today is that `verificationStatus` transitions (`PENDING → COMMUNITY_VERIFIED/OFFICIAL/REJECTED`) have no authorization check behind them; anyone could theoretically call a hypothetical "verify" action. Once `User.role` exists (§2), verification actions gate on `role IN ('MODERATOR', 'CURATOR', 'ADMIN')`.

### 8. Sharing model, public profiles, private collections

Sized to what the product needs next, not a speculative full ACL system:

- **`User.isPublic`** (§2) is the entire sharing model for V1: off (default) means nothing about the account is visible to anyone else; on means a read-only `/u/[username]` profile becomes reachable, showing the same kind of aggregate view already built for the owner (Shelf-style display case, Statistics-style completion numbers) — no new data model needed, just a public-facing read path over data that already exists, gated by the visibility flag.
- **URL shape is namespaced from the start for this reason**: `/u/[username]` is the profile root; `/u/[username]/collection`, `/u/[username]/wishlist`, `/u/[username]/vault` are reserved sub-routes. None of the sub-routes ship in V1 — the root profile page is the only one built — but reserving the shape now means Phase 8 (Social) adds routes under an already-settled URL structure instead of renaming things a real user may already have bookmarked.
- **No per-collection or per-instance granular sharing in V1** (e.g. "share just this one set's progress via a link"). That's a real, useful feature, but it's an ACL system, and building it before there's more than one user validates the basic public-profile case would be premature. Deferred to whenever Social work actually starts (it's after Scanner in the agreed roadmap).
- **No `PublicShare`/link-token model yet** for the same reason.

### 9. Team/organization support

**Out of scope, deliberately.** Collectra is a single-collector product, not a B2B tool — there's no current feature that needs an organization boundary above the user. Noting this so it isn't silently assumed to be missing: the existing per-`User` ownership model doesn't block adding an `Organization`/`OrganizationMember` layer later if e.g. a marketplace vertical ever needs shop accounts — it would sit above `User`, not replace the ownership columns already on every table.

### 10. Migration from `DEFAULT_USER_ID` — and how the existing real data survives

The current seed user is not throwaway data — it's the account this whole session's real Instances, Events, and settings were built against (`id: "user_1"`, email `samanyu@gomarg.com`, 6 real `Instance` rows plus their `Event` history). The migration has to preserve it, not reset it.

Every file currently importing `DEFAULT_USER_ID` (confirmed by search, 16 files):

```
src/lib/user.ts                                        (the constant itself — deleted at the end)
src/lib/actions/collection.ts
src/lib/actions/export-data.ts
src/lib/actions/projects.ts
src/lib/actions/wishlist.ts
src/lib/migration/actions/create-session.ts
src/app/page.tsx
src/app/discover/page.tsx
src/app/projects/page.tsx
src/app/settings/page.tsx
src/app/shelf/page.tsx
src/app/statistics/page.tsx
src/app/vault/page.tsx
src/app/wishlist/page.tsx
src/app/migration/page.tsx
src/app/migration/[id]/review/page.tsx
src/app/migration/[id]/review/migration-review-client.tsx  (client-side reference — replace with a prop from the server component, not a client Supabase call)
```

**Not a one-off script.** A one-time manually-run reconciliation script is a single point of failure — if it's interrupted (deploy restart, connection drop mid-transaction) there's no defined recovery path other than reading the script again and reasoning about what state it left things in. Instead, this is a lazy, idempotent step inside the normal auth flow, checked on every login and safe to run zero, one, or many times with the same result:

```
First login for a given email
  ↓
getCurrentUser() finds no legacy row to migrate → normal path, nothing happens
  (this is what every login looks like forever, after the first successful one)

First login specifically for samanyu@gomarg.com, before migration has happened
  ↓
A row with id = "user_1" and email = <this user's email> still exists
  ↓
Single transaction: reassign every userId/uploadedByUserId/submittedByUserId/reviewedByUserId
foreign key across all 12 tables from "user_1" to the new real auth UUID, then delete the "user_1" row
  ↓
Transaction commits → the guard condition above ("does a matching legacy row exist") is now
permanently false for this email → never runs again, no separate "migration complete" flag needed
  ↓
If the transaction fails or the process is killed mid-way: nothing committed, the "user_1" row
is untouched, the exact same check runs again on the next login and retries cleanly
```

The idempotency comes from the guard condition itself, not a tracking flag — once the legacy row is gone, there's nothing left to find, so no `migratedAt` timestamp or separate state machine is needed. The check is one indexed lookup (`WHERE id = 'user_1' AND email = $currentUserEmail`) added to `getCurrentUser()`, cheap enough to run unconditionally on every request rather than needing its own gate.

Rollout order:

1. Ship the schema migration (§2 trigger + new columns), Storage bucket/policy changes (§6), and all app code changes (auth pages, `proxy.ts`, `getCurrentUser()` including the legacy-migration check above, the 16-file swap) **behind the existing single-user behavior still working** — land the plumbing first without deleting `DEFAULT_USER_ID` yet.
2. Sign up for real, once, using `samanyu@gomarg.com` through the new Supabase Auth flow. The trigger creates a *new* `User` row with a real `auth.users` UUID. On that same first authenticated request, `getCurrentUser()`'s guard check fires and the legacy data migrates automatically.
3. Verify (row counts match, spot-check a few Instances), then delete `DEFAULT_USER_ID`/`src/lib/user.ts` and finish the 16 call sites' swap to `getCurrentUser()`. The legacy-migration check itself can stay in `getCurrentUser()` permanently — it's a cheap no-op for every account that isn't `samanyu@gomarg.com`, so there's no forced cleanup step that could be forgotten.

### 11. Security considerations

- Never use `raw_user_meta_data`/`user_metadata` in any authorization decision — it's user-editable. Authorization-relevant data (like `role`, once it needs to be read from a JWT claim rather than a DB round-trip) belongs in `app_metadata`, set only via the service-role key server-side.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-only — already true today (only referenced in `packages/media/storage/SupabaseAdapter.ts` and `src/lib/media/resolve.ts`), must stay that way; nothing with a `NEXT_PUBLIC_` prefix should ever carry it.
- CSRF: Next.js Server Actions already reject cross-origin `Origin`-vs-`Host` mismatches by default (confirmed from this version's own server-actions docs) — no extra CSRF work needed for the action-based mutation surface.
- Global sign-out (`supabase.auth.signOut({ scope: 'global' })`) should be exposed as a real Settings control, not just local sign-out — matters once "log out of all devices" is a real expectation.
- Deleting a `User` doesn't retroactively invalidate already-issued access tokens (they're valid until they naturally expire, ~1hr) — acceptable for V1, worth documenting so nobody's surprised by it during a support conversation.
- Sign-up abuse (bot accounts): Supabase Auth has basic built-in rate limiting; CAPTCHA/Turnstile on the sign-up form is a reasonable fast-follow, not a launch blocker for a beta.

### 12. Future compatibility with Marketplace and Social

Nothing above needs to be re-architected for either:

- **Marketplace**: a future `Listing`/`Trade`/`Offer` model attaches to `Instance.userId` as seller — the ownership graph already exists. `role` (§2) covers moderator/dispute-resolution needs without a new concept.
- **Social**: `isPublic` + `username` (§2, §8) is precisely the foundation a following/activity-feed feature needs — a public profile to follow and a visibility flag to respect. `Event` already logs the kind of activity a feed would read from.

## Resolved decisions (2026-07-22)

1. **RLS scope for V1**: confirmed as written in §5 — app-layer authorization is primary for all Prisma-driven access; RLS is load-bearing for Storage and enabled everywhere else as baseline hygiene, not forced onto the Prisma connection. Explicit reasoning: forcing full RLS onto a direct Postgres connection at this stage adds real complexity (per-request JWT claim injection fighting connection pooling) without a corresponding benefit, since nothing queries Supabase directly from the browser today.
2. **Public profile URL shape**: `/u/[username]` confirmed, with `/u/[username]/collection`, `/wishlist`, `/vault` reserved as sub-routes for Phase 8 (Social) — not built in V1, but the shape is settled now so it doesn't need to change under a real user later. Usernames are unique, lowercase, URL-safe, and treated as effectively immutable (rate-limited change path, not a hard lock — see §2).
3. **OAuth providers for V1**: email/password + Google + GitHub. Deliberately excludes Apple/Discord/Facebook/X — no specific audience need identified yet, and each provider is real ongoing maintenance/testing surface, not a one-time cost.
4. **Default role**: `USER` (§2), using the full four-tier vocabulary `USER | MODERATOR | CURATOR | ADMIN` rather than the originally-drafted `collector | moderator | admin` — `CURATOR` sits between `MODERATOR` (reviews community `Contribution`s) and `ADMIN` (full access) for a future direct-catalog-edit permission, without building a permission matrix now.

Two additional decisions incorporated, beyond the original four questions:

5. **User migration is a lazy idempotent check inside `getCurrentUser()`, not a one-off script** — see the rewritten §10. Chosen specifically so an interrupted migration has a defined, automatic recovery path (the exact same check re-runs on the next login) instead of requiring manual intervention.
6. **Storage paths use one consistent structure from the start** (`users/{userId}/...` for personal data, `cards/{cardId}/...`/`products/{productId}/...`/`manufacturers/{manufacturerId}/...` for canonical shared assets) rather than patching only the one path that had a known bug — see the rewritten §6.

## Consequences

**Positive**: every table's existing `userId` ownership column stops being decorative and starts being the real authorization boundary. Storage's two live security gaps (public bucket, un-prefixed keys) get fixed as a forced consequence of this work rather than sitting unaddressed. The schema changes are additive and don't block Marketplace or Social later.

**Negative**: every one of the 16 files touching `DEFAULT_USER_ID` needs a coordinated edit — not large individually, but it's a full-surface change, not a contained one. The RLS-doesn't-cover-Prisma nuance (§5) is a real, permanent piece of architectural complexity to keep in institutional memory — the next engineer who assumes "RLS is on, so we're covered" for a Prisma-driven query would be wrong, and that's worth a code comment at the Prisma client, not just this ADR.
