# Release Checklist

A repeatable pre-release/pre-milestone verification pass. Not every item applies to every change — skip what's genuinely irrelevant, but don't skip silently on anything that touches data, auth, storage, or payments-adjacent flows (marketplace).

Last run: 2026-08-06 (infra/storage stabilization pass, before the dashboard revamp). Status of each item below reflects that run — re-verify rather than trusting these checkmarks on the next release.

## 1. Build & static checks

- [x] `npx tsc --noEmit -p tsconfig.json` clean (root)
- [x] `npx tsc --noEmit -p tsconfig.json` clean (`packages/media`)
- [x] `npm run build` (`next build`) completes, all routes compile
- [ ] `npm run lint` clean — **not currently true**: 175 pre-existing errors (`@typescript-eslint/no-explicit-any`), 21 warnings. None from the current change set; not a regression, but the suite isn't green. Fix opportunistically or budget a dedicated pass — don't let it grow further.

## 2. Automated tests

- [x] `npm test` (vitest) — 111/111 passing, 17 files, as of this run
- [ ] Coverage gaps: no test coverage found for storage-adapter selection logic itself (`storageAdapter()`/`storageAdapterFor()` provider-priority branches) — covered so far only by live/manual verification, not a repeatable test. Worth a unit test before this logic changes again.

## 3. Database & migrations

- [ ] Confirm `DATABASE_URL`/`DIRECT_URL` point at the intended environment before running any script that writes (this project has a **single Supabase environment** — local dev hits the real prod DB, see project memory. There is no shadow DB.)
- [ ] Any new hand-written SQL migration reviewed for irreversible operations (drops, non-nullable column adds without a default) before applying
- [x] Seed scripts re-run idempotency-checked where applicable (this run: both Match Attax seeds confirmed idempotent — 0 created on re-run, all-skip)

## 4. Storage

- [ ] Every new upload path has a `provider`-aware read path if the same data can be written by more than one adapter (see ADR 007 — this is what makes a provider migration safe to do incrementally rather than as a hard cutover)
- [ ] `next.config.ts` `images.remotePatterns` covers every host actually used by `<Image>` in the current data — check this specifically after any new ingestion source or storage provider is added; a missing host doesn't fail the build, only fails at runtime in the browser (found and fixed this run for Vercel Blob + TheSportsDB)
- [ ] Public vs. private classification double-checked for any new upload type: does this need to be visible to any unauthenticated visitor, or only to the owning user? Get this wrong once and it's a real data exposure, not just a bug — see ADR 007 for the reasoning this project settled on (storage provider ≠ authorization system; ownership checks live in app code, always)
- [x] Storage adapter env vars present in **both** `.env` and `.env.local` locally, and in Production/Preview/Development on Vercel — confirmed for `BLOB_READ_WRITE_TOKEN`/`BLOB_PUBLIC_BASE_URL` this run
- [ ] If anything runs as a long-lived background process/wrapper shell (like the eBay sweep loop): confirm it reloads env on its own rather than only at initial launch, or document that it needs a manual restart after credential changes

## 5. Background jobs / cron

- [ ] Every Vercel Cron route still responds 401 without `CRON_SECRET` and 200 with it
- [x] Long-running sweep process confirmed alive and progressing (not silently dead) — checked via process list + log tail, not assumed
- [ ] Check failure/retry rate in the sweep or sync logs isn't trending up — a sudden jump usually means an upstream API or DB change, not noise

## 6. Functional smoke test (manual, browser-driven)

Minimum bar — expand per release based on what actually changed:

- [ ] Unauthenticated: public routes render with zero console errors (`/explore`, `/discover`, `/login`, `/signup`, `/marketplace`, `/pack-simulator`)
- [ ] Unauthenticated: auth-gated routes redirect to `/login?next=...` rather than error (`/`, `/vault`, `/shelf`, `/scan`, `/settings`)
- [ ] Authenticated (needs real test credentials — **not available in the run this checklist reflects**, so these are unverified as of 2026-08-06): sign in, browse catalog, toggle ownership on a card, create a draft marketplace listing, upload a scan photo, run a CSV migration import
- [ ] `console --errors` (or equivalent) checked on every page visited, not just the ones expected to have problems — a shell can render fine while a data fetch silently 500s underneath it

## 7. Documentation

- [ ] `PROJECT_STATE.md` reflects current DB scale, running background jobs, and known issues — not stale
- [ ] `docs/roadmap.md` has an entry for any phase-level change (new phase, or a correction to a previous phase's claimed status)
- [ ] New architectural decisions have an ADR in `docs/adr/` (context → decision → consequences, including what was rejected and why — this project's ADRs are read for the rejected options as much as the chosen one)
- [ ] `CHANGELOG.md` updated for anything user-visible or infra-significant

## 8. Sign-off

- [ ] Report given to the user in verified / issues / deferred / tech-debt form — not "done," not "production ready" as a blanket claim
- [ ] Anything deferred by explicit user decision is named as such, not silently dropped
