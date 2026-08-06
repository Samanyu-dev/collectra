# 7. Storage Provider Migration — Supabase to Vercel Blob (public media)

Date: 2026-08-06

## Status
Accepted, partially implemented (public media done; private media deferred)

## Context

Supabase Storage hit its plan's Fair Use quota mid-session: 1.424GB used against a 1.0GB limit, flagged by Supabase with a grace period ending 2026-09-05. The primary driver is the eBay Tier-1 sweep (`sweep-catalog.ts`, ADR 003 §19), which re-hosts a listing photo per card and runs continuously against the full ~32,677-card catalog.

Two options were evaluated and rejected before landing on the decision below:
- **A second Supabase account** to dodge the quota — against most providers' fair-use terms for the same workload, doesn't scale (would hit the same wall again), and fragments a live app's data across two projects.
- **Firebase Storage** — the 5GB free-tier storage genuinely exists, but Google now gates *provisioning a bucket at all* behind the Blaze (pay-as-you-go) plan, which requires a card on file even though usage inside the free quota isn't billed. Rejected on user preference to avoid that even though the actual cost risk is ~zero.

**Vercel Blob** was chosen instead: no new vendor (the app is already deployed on Vercel), no card required to provision on the Hobby plan, and a genuinely comparable free tier (5GB storage, 100GB/mo transfer, 100K simple + 10K advanced ops/mo — see [usage-and-pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)).

One real constraint discovered during implementation: **a Blob store's access level (public/private) is fixed at creation**, unlike Supabase where a bucket's public/private policy is a setting the existing `StorageAdapter` interface already abstracted away per-instance. There is no per-object override. This matters because this app has both public media (catalog images, marketplace listing photos — meant to be visible to any visitor) and private media (scanner photos, migration CSV uploads — a specific user's own data, not meant to be reachable by URL alone).

## Decision

1. **`VercelBlobAdapter`** (`packages/media/storage/VercelBlobAdapter.ts`) implements the existing `StorageAdapter` interface (`put`/`get`/`getPublicUrl`/`getSignedUrl`/`delete`), the same contract `SupabaseStorageAdapter` and `LocalStorageAdapter` already satisfy — no interface changes needed, confirming ADR 001's original adapter abstraction did its job.
2. **One public Blob store** (`collectra-media`) now receives new writes for catalog media (`process-media.ts`) and marketplace listing photos (`lib/marketplace/storage.ts`). Existing Supabase-hosted media is **not** migrated or re-hosted — each `Media` row's `provider` field (already part of the ADR 001 schema) records which adapter actually wrote it, and every read path (`lib/media/resolve.ts`'s `storageAdapterFor`, `scanner/storage.ts`'s `getScanPhotoBuffer`) selects the adapter per-row rather than assuming today's default. Old rows keep resolving through Supabase indefinitely; only new writes land on Blob.
3. **Private media (scanner photos, migration uploads) stays on Supabase for now.** Connecting a *second*, private Blob store to the same Vercel project needs a custom environment-variable prefix so its token doesn't collide with the public store's `BLOB_READ_WRITE_TOKEN` — that step is dashboard-only; the `vercel blob create-store`/`connect` CLI doesn't expose it. A private store (`collectra-private`) was created but left unconnected. User decision: not worth the manual step until Supabase's remaining quota becomes a bottleneck for private uploads specifically (low volume today).
4. **Authorization stays entirely in the app, not the storage layer.** Vercel Blob's public/private split only decides whether an anonymous, unauthenticated request can read a file by URL — it has no concept of "users" or "collections." Per-user ownership (e.g., only the uploading user can read their own scan photo) is and remains enforced by the app's own JWT/session check (`requireUserForAction()` + `uploadedByUserId` comparison) before ever calling `get()`, exactly as it already worked with Supabase's RLS-backed private bucket. This is documented explicitly because it was a real point of confusion during design discussion, not a hypothetical.
5. **Future overflow path, decided but not built**: if Blob's free tier is also exhausted, next options in order are (a) connect the already-created private Blob store for the private-upload paths, or (b) move private uploads to Appwrite (chosen by the user as the fallback vendor, not yet integrated in any form).

## Consequences

- **Positive**: quota pressure relieved for the highest-volume writer (the eBay sweep) with zero data migration risk — old media keeps working, unaffected, for the entire multi-day sweep runtime. The `StorageAdapter` abstraction from ADR 001 absorbed a full provider swap with no interface change and no call-site rewrite beyond the adapter-selection function in five files.
- **Negative / follow-up work**:
  - `next.config.ts`'s `images.remotePatterns` needed a new entry (`*.public.blob.vercel-storage.com`) — found via a live smoke test (marketplace page threw a client-side `next/image` error before the fix), not anticipated in design. Fixed same session.
  - Private uploads (scanner, migration) are on a different provider than public media, a real asymmetry to keep in mind — `scanner/storage.ts`'s `provider`-aware read path exists specifically because of this split and must be preserved if/when a private Blob store is connected later.
  - A **process/tooling gotcha, not a Blob-specific one**, found and fixed during rollout: `tsx` does not auto-load `.env` — the long-lived shell wrapping the sweep's continuous loop (`run-sweep-loop.sh`) only had whatever was exported into it at launch, so new env vars written to `.env` after that shell started were invisible to every subsequent loop iteration until the wrapper itself was restarted. Fixed by having the loop `source .env` before every window, not just at process start — a general lesson for any other long-lived wrapper script in this codebase.
  - `packages/media/package.json`'s `"main": "dist/index.js"` points at a build output that has never been generated (predates this ADR — confirmed via `git log`, not introduced here). Works today because Next.js/Turbopack and `tsx` both fall back to resolving the TS source directly, verified with a real `next build`, but it's a latent footgun for any tool with stricter Node resolution. Tracked as tech debt, not fixed in this pass (out of scope).
