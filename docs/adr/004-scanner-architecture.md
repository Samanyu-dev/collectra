# 4. Scanner Architecture

Date: 2026-07-23

## Status

**Accepted (2026-07-23).** Reviewed; four open questions resolved, a V1 scope line drawn explicitly, a canonical Recognition Pipeline and Success Metrics added below. Ready for implementation.

## Context

### What actually exists to build on — verified, not assumed from the roadmap's own notes

The roadmap's Phase 6 stub claims: *"`Media.perceptualHash` already exists in the schema, anticipating exactly this — image-matching infrastructure was designed for from the start, just unused until now."* Half of that is true and half needed correction, the same pattern Phase 5 found with `MarketListing`:

- **`Media.perceptualHash: String?` exists**, and there's a real, working implementation behind it: `SharpImageProcessor.analyze()` (`packages/media/processor/ImageProcessor.ts`) computes a genuine 64-bit dHash via `sharp`, alongside blurhash/palette/brightness/contrast — not a stub.
- **But it has never been called.** Confirmed directly against the live database: **44,966 real `Media` rows, zero with a populated `perceptualHash`.** "Image-matching infrastructure was designed for" is accurate; "just unused until now" undersells it — it's not merely unused, there is no hash data to match against at all yet. Any perceptual-hash-based identification strategy needs a backfill job before it can return a single real result. This is stated plainly so the design below doesn't quietly assume a capability that isn't actually there yet.
- **`packages/media`'s `StorageAdapter`/`ImageProcessor` abstractions (ADR 001) already anticipated this phase** — ADR 001 says so explicitly ("The Scanner (future phase) now has a structured foundation for high-res cropping"). The adapter interfaces are real and in use for ingestion; extending them for scan capture is additive, not a new pattern.
- **`MigrationMatchingEngine` + `bestMatchScore`** (`src/lib/migration/matching-engine.ts`, `src/lib/ingestion/similarity.ts`) is a real, working, confidence-scored matcher: given a set name, card number, and card name (all free text, all potentially wrong/partial), it ranks candidate `Variant`s and returns a confidence score with human-readable reasons (`[✓] Card Number matched`, `[⚠] Multiple sets found`, `[✕] Unknown Set`). This is the *exact* shape an OCR-derived scan result needs to resolve to a real catalog entry — extend this engine, don't build a parallel one.
- **`Identifier` model** (`type: UPC|EAN|SKU|ASIN`, unique `value`, linked to `Product`) exists — but only for `Product` (sealed boxes/packs), not `Card`/`Variant`. This is correct, not a gap: individual trading cards don't carry retail barcodes in the real world. Barcode scanning is a **sealed-product identification path, not a single-card one** — conflating the two would misdesign the feature. Scoped explicitly in §3 below.
- **Confirmed via search: zero OCR, barcode-decoding, or computer-vision libraries in `package.json`.** No `tesseract.js`, no `zxing`/`quagga`/`jsQR`, nothing. This is genuinely greenfield — every identification strategy below needs a real new dependency (or external API), not a wire-up of something already installed.
- **Zero camera-access code anywhere** (`getUserMedia`, `react-webcam`, etc. — confirmed via search). The upload/capture UI doesn't exist yet.
- **No PWA manifest.** No "add to home screen," no service worker, no offline-asset caching today. Relevant to §7/§8 below — "offline" currently means "the browser tab is open with no network," not an installed app with cached assets.
- **Mobile polish is an already-known, already-deferred gap.** Per the post-Phase-3 priority order (mobile dock UI, touch target sizing) — not fixed as of this session. A camera-first feature landing on top of an admittedly-unpolished mobile shell is a real sequencing risk worth naming, not a reason to block, but a reason §8's targets should be honest about the starting point.
- **`Contribution` + `User.role`** (Phase 4) is the existing "propose something uncertain, get it reviewed" pipeline — directly reusable for "scanner found a card that doesn't match anything in the catalog" rather than inventing a second review queue.
- **`Instance`** (`userId`, `variantId`, `condition`, `purchasePrice`, `purchaseDate`, `isGraded`, `certification`, `notes`) is where a confirmed scan ultimately lands — same table `toggleCardOwned` and the migration-commit flow already write to.

## Decision

### 0. Recognition Pipeline — the canonical V1 flow

Every scan, regardless of entry point (camera or upload), goes through exactly this sequence — one pipeline, not a different path per input method:

```
1. Capture/Upload   →  camera handoff (capture="environment") or file picker
2. Preprocess       →  client-side crop, resize/compress (existing ImageProcessor.toWebP())
3. Store            →  upload to Supabase Storage, users/{userId}/scans/... (existing convention)
4. OCR              →  cloud OCR API extracts text fragments from the photo
5. Match            →  extended MigrationMatchingEngine scores candidates against
                        the extracted text, same confidence + reasoning it already
                        produces for CSV-row matching
6. Candidate list   →  HIGH: one candidate, one-tap confirm
                        MEDIUM: ranked list, manual pick (migration-review UI pattern)
                        LOW/none: manual search fallback + optional Contribution
7. Confirm          →  user reviews the resolved variant + condition, taps Add
8. Add to collection→  writes a real Instance (userId, variantId, condition,
                        scanMediaId), fires a SCANNED_ADDED Event
9. Price refresh    →  optional, immediate — PriceTag for the resolved variant,
                        "Refresh Now" (ADR 003 §9) if data's stale/missing
```

Step 6 is the only branch point; every other step is the same regardless of which branch step 6 took. This is the shape every other design decision in this ADR sits inside.

### 1. Image acquisition — camera vs. upload

Both, same underlying pipeline. The browser's `navigator.mediaDevices.getUserMedia` (or the simpler `<input type="file" accept="image/*" capture="environment">` for a fast first cut on mobile Safari/Chrome, which hands off to the native camera UI without any custom camera-preview code) covers live capture; a plain file input covers upload of an existing photo (batch-scanning a stack of already-photographed cards, or desktop use where there's no camera).

**Recommendation for the first cut**: start with `capture="environment"` file input, not a custom `getUserMedia` live-preview UI. It's dramatically less code (no video element, no capture-frame logic, no permission-UI edge cases to handle manually), uses the phone's native camera app (which already does far better autofocus/exposure than a from-scratch web camera view would), and gets real usage data on whether users even want continuous live-preview scanning before building the more complex version. A live-preview `getUserMedia` mode is a legitimate fast-follow once the simple path is validated, not a reason to delay shipping.

### 2. Image preprocessing — cropping, perspective correction, glare handling

Reuses `packages/media`'s existing `ImageProcessor` interface (`sharp`-backed) rather than a new pipeline:

- **Cropping**: client-side, interactive, before upload — a simple crop-box UI (drag corners) over the captured photo, cheap in bandwidth and gives the user control over framing rather than trusting an automatic detector to find the card edges correctly on the first try.
- **Perspective correction**: **deferred past the first cut.** Real four-corner homography correction needs either a client-side CV library (adds real bundle weight for a mobile-first flow) or a server-side pass — worth doing once real scan photos show it's actually needed, not built speculatively. The crop-box step in the meantime lets a user manually compensate for minor skew by cropping tight.
- **Glare handling**: **not solved algorithmically in the first cut.** Real glare removal (polarization-style correction from a single 2D image) is a genuinely hard CV problem, not a quick library call. First-cut mitigation is UX, not code: on-screen guidance ("avoid direct light," a live brightness/glare heuristic flagging "this photo looks washed out, retake?") — cheap, honest, and doesn't block shipping on solving a hard problem that a good product hint mostly sidesteps.
- **What ships day one**: capture/upload → client-side crop → resize/compress via the existing `ImageProcessor.toWebP()` path → upload to Supabase Storage using the same `users/{userId}/...` key convention Phase 4 already established for private per-user assets (a scan is personal data — the photo of *your* card — same ownership model as any other upload).

### 3. Identification pipeline — three real strategies, tiered by what's actually available today, not aspirational

Mirrors ADR 003's tiering discipline (Tier 0/1/2) rather than presenting one option as if it were decided in isolation:

**Strategy A — cloud OCR + existing matching engine. Decided for V1.** Not a self-hosted/heavy client-side model (`tesseract.js` and similar) — a cloud OCR API (specific provider TBD at implementation time; needs a real accuracy check against actual card photos and a ToS/privacy review before picking one, not assumed here). Reasoning: don't build or run an OCR model at all for V1 — the real architectural win is reusing something already proven in production (the matching engine), not investing engineering effort into the OCR layer itself, which is commodity and swappable. Extract candidate text fragments (card name, number, set symbol/name where legible) and feed them into **the existing `MigrationMatchingEngine`**, extended to accept OCR-derived input alongside its current CSV-row input — same confidence-scored candidate-ranking logic, same `[✓]/[⚠]/[✕]` reasoning trail, already proven in production for the migration flow. The OCR backend is intentionally isolated behind this one boundary — swapping providers later never touches the matching/confidence/UI layers.

**Strategy B — perceptual-hash image matching (real, but needs a backfill first).** Compute the scan photo's own dHash via the existing `SharpImageProcessor.analyze()`, then Hamming-distance it against `Media.perceptualHash` for candidate art matches. **Blocked today**: zero of 44,966 `Media` rows have a hash populated (confirmed above) — this strategy returns nothing until a backfill job runs `analyze()` across existing card-art `Media` rows. Also fundamentally weaker than Strategy A at distinguishing *parallels* of the same card (a Holofoil and its Reverse Holofoil counterpart can look visually near-identical in a hash sense despite being different `Variant` rows with different values) — better suited as a *confirming* second signal alongside OCR than a standalone identifier.

**Strategy C — barcode/UPC (sealed products only, not individual cards).** For scanning a sealed pack/box rather than a single card: decode the barcode (a client-side library like `jsQR`/`zxing`-style decoder against the camera frame or an uploaded photo), look up `Identifier.value` → `Product`. Real, narrow, and already has a home in the schema — no design gap here, just needs the decode step and a thin lookup action.

**Recommendation**: ship Strategy A first (it's the only one with an existing, proven confidence-matching engine behind it and doesn't require a data backfill), Strategy C as a fast-follow for sealed-product scanning (narrow, cheap, real user value for box/pack tracking), Strategy B once a real backfill exists and Strategy A's real-world accuracy shows where a second confirming signal would actually help.

### 4. Confidence model and user-confirmation flow — same visual language as pricing, not a new one

Phase 5 already built a confidence discipline users will have seen elsewhere in the app (`HIGH`/`MEDIUM`/`LOW`/`NO_DATA`, never a bare number, never silently guessed) — the scanner should look and feel like the same product, not a bolted-on separate one:

- **`HIGH` confidence** (mirroring `MigrationMatchingEngine`'s existing thresholds — e.g., an unambiguous card-number + set match): show the identified card with a one-tap "Add to collection" — no forced confirmation screen, but the match is still fully visible and reversible before committing, never silently auto-added.
- **`MEDIUM`** (partial match, multiple candidates): present a ranked candidate list — visually, this is the *exact same* card-selection UI the migration-review flow (`migration-review-client.tsx`) already built for "pick the right variant from N candidates," reused, not redesigned.
- **`LOW`/no match**: explicit "couldn't identify this card" state (never a wrong guess presented as if confident — the same "no data is more honest than a bad guess" principle §17 of ADR 003 established for prices, extended here to identification), with a manual search fallback (the existing `/cards` search) and, for a genuinely new/unrecognized card, a path into `Contribution` for curator review rather than a dead end.
- **Every scan result stores its own provenance** — which strategy matched it, the raw confidence score, and the original photo reference — mirroring `PriceObservation`'s "never discard the evidence" discipline, so a wrong auto-match is diagnosable after the fact, not a silent black box.

### 5. Mapping scanner results into the existing schema — no new ownership model needed

A confirmed scan is a normal `Instance` — `userId` (from the authenticated session, same as every other write since Phase 4), `variantId` (the resolved match), `condition` (defaulted to a sensible value, user-editable before confirming, exactly like the existing "add to collection" flow already does), plus a new **`Instance.scanMediaId`** (nullable FK to the `Media` row for the scan photo itself) so "this is the photo I actually scanned" stays attached to the instance going forward — real provenance, not thrown away after matching. `Event` gets a new type (`SCANNED_ADDED` or similar) alongside the existing `CARD_ADDED` family, for the same activity-feed/audit trail every other mutation already gets.

### 6. Batch scanning support

Two distinct things worth not conflating:

- **Multi-photo capture in one session** (photograph a stack of cards back-to-back before reviewing any of them): a client-side queue of captured photos, each independently run through the identification pipeline, presented as a single review screen listing all results (grouped by confidence, `HIGH` ones pre-checked for one bulk "Add all" action, `MEDIUM`/`LOW` ones requiring individual attention) — extending the same review-list pattern the migration flow already has for CSV rows, not a new UI paradigm.
- **Bulk backfill/re-processing** (re-running identification against previously-captured-but-unresolved scans, e.g. after Strategy B's hash backfill lands): a `SyncJob`-based background pass, same job-queue infrastructure Phase 5 already uses for price syncs — not a new scheduling mechanism.

### 7. Offline vs. online behavior — decided: no offline scanning in V1

No PWA manifest, no service worker, no cached-asset shell exist in this codebase yet (confirmed) — real offline support would be a genuine new infrastructure investment (local OCR or a local index, capture/sync queueing, conflict handling), not a small add. **Decided: require network for the identify step.** The flow is capture → upload → identify, synchronously, same as every other real-time action in this app. Once a scan is identified and confirmed, the result is a normal persisted `Instance` — no special offline cache layer needed for it, since nothing else in the app has one either. If the network drops mid-scan, the user sees a real error and can retry, the same honest-failure posture as PriceObservation writes losing a request. Revisit only if real usage shows people scanning in genuinely offline conditions often enough to justify the investment.

### 8. Performance targets on mobile — decided: Scanner drives mobile polish, not a separate phase

The post-Phase-3 mobile-polish backlog (dock UI, touch targets) stays open, but **not as a blocking prerequisite phase** — every Scanner screen is designed mobile-first from the start (spacing, touch target sizing, bottom-sheet patterns for the candidate list, camera-flow ergonomics, loading states, gestures), which naturally produces the exact polish that backlog was tracking, scoped to the screens users actually touch during a scan rather than a speculative pass over the whole app. No fabricated latency number either: before wider rollout, measure real capture-to-result latency on a real mid-tier Android device (not a desktop dev server or a high-end iPhone) — the cloud OCR round-trip is almost certainly the dominant cost, and how dominant is unknown until measured against the actual chosen provider. The one target committed to now on principle: **the crop/upload/preprocessing steps before OCR even runs should never be the bottleneck** — those are already covered by proven, fast infrastructure (`sharp`, Supabase Storage), so if scanning feels slow, the OCR/matching steps are where to look first.

### 9. How pricing integrates immediately after identification

Once a scan resolves to a real `variantId` (at any confidence level worth showing the user), the result screen should show that variant's price **through the exact same `PriceTag` component and `toPriceDisplay()` mapping** every other price surface in the app already uses (ADR 003 §8/§17) — not a new, scanner-specific price widget. This is a real, immediate, and honest payoff of Phase 5 existing: "I just scanned this, here's what it's worth, here's how confident we are in *that* number too" — two independent confidence signals (identification confidence, price confidence) shown side by side, each honestly labeled, never conflated into one misleading combined score.

## Schema gap analysis

| Concept | Exists today | Gap |
|---|---|---|
| Photo storage | `Media`/`MediaVariant`/`MediaAttachment`, Supabase Storage, `users/{userId}/...` key convention (Phase 4) | None — reuse as-is |
| Perceptual hashing | `Media.perceptualHash` field + working `SharpImageProcessor.analyze()` | **Never called** — needs a backfill job before Strategy B can return any real result |
| Text-based match-to-catalog | `MigrationMatchingEngine` + `bestMatchScore`, proven in production | Needs an OCR-input adapter path alongside its current CSV-row input — extension, not a rewrite |
| Barcode → sealed product | `Identifier` (UPC/EAN/SKU/ASIN) → `Product` | None for products; genuinely doesn't apply to individual cards (correct scope, not a gap) |
| OCR | Nothing | New dependency (client lib or cloud API) — real cost/accuracy tradeoff to evaluate at implementation time |
| Barcode decoding | Nothing | New client-side decode library |
| Camera/upload UI | Nothing | New — recommend `capture="environment"` file input over custom `getUserMedia` preview for the first cut |
| Scan → Instance | `Instance` already has every field a confirmed scan needs | New `Instance.scanMediaId` (photo provenance), new `Event` type |
| Confidence display | `PriceTag`/`toPriceDisplay()` pattern (ADR 003) | Reusable pattern, new instantiation for identification confidence specifically |
| Unresolved/new-card path | `Contribution` + role-gated review (Phase 4) | Reuse as-is with `entityType: "Card"` or `"Variant"` |
| Batch review UI | Migration-review candidate-list pattern (`migration-review-client.tsx`) | Reusable pattern, new instantiation for scan results |
| Offline capture | Nothing (no PWA manifest, no service worker) | Explicitly deferred past first cut — real infrastructure investment, not a quick add |
| Mobile performance baseline | Nothing measured | Needs a real on-device measurement before committing to a latency target |

## Rollout plan

1. **Capture + upload only** (`capture="environment"` input, client-side crop, existing `ImageProcessor`/Storage pipeline) — ships something real and testable before any identification logic exists, so the capture UX itself gets validated first.
2. **Cloud OCR provider selection** — real accuracy check against actual card photos, ToS/privacy review, credentials provisioned.
3. **Strategy A (OCR + extended `MigrationMatchingEngine`)** — the one identification path in V1 scope.
4. **Scan → `Instance` confirmation flow**, reusing the migration-review candidate-list UI pattern, with the `PriceTag` integration from day one (§9) since it's nearly free once a `variantId` resolves.
5. **Real on-device latency measurement** against the Success Metrics targets, before calling V1 done.
6. Everything in "Explicitly deferred" above (Strategy B/C, offline, live-preview, batch scanning, grading estimation, etc.) — each its own future decision point once real V1 usage says it's worth the added complexity, not bundled into this rollout.

## Security & authorization

- Scan photos are private per-user data — same `users/{userId}/...` storage convention and RLS-backed bucket policy Phase 4 already established, no new pattern.
- Scan → `Instance` confirmation goes through `requireUserForAction()` like every other mutation.
- Cloud OCR is now decided (§3), which means every scan photo genuinely does leave Collectra's infrastructure to a third-party API — real, not hypothetical. A specific provider needs picking with its actual data-retention/training-use terms read, not assumed acceptable, before implementation ships. Worth a line in the app's privacy policy once a provider is chosen.

## V1 scope — drawn explicitly, not left implicit

**Included:**
- Photo upload
- Camera capture (native handoff)
- OCR (cloud)
- Existing matching engine (extended for OCR input)
- Candidate list
- Manual confirmation
- Add to collection
- Optional immediate pricing refresh

**Explicitly deferred:**
- Live camera recognition (continuous/real-time)
- Continuous scanning / video mode
- AR overlays
- Perceptual-hash search (Strategy B — blocked on the backfill anyway)
- Barcode/product lookup (Strategy C)
- Perspective correction
- Glare removal
- Offline mode
- Batch scanning (multi-photo-per-session queueing)
- Automatic grading estimation

Batch scanning (§6 above) is real, designed, and reuses proven patterns — deferred from V1 specifically to keep the first ship small and the identification pipeline validated against single scans before adding queueing complexity on top, not because it's hard.

## Success metrics — objective V1-ready criteria, not subjective impressions

- Median recognition latency < 5 seconds (capture/upload to a shown result, measured on a real mid-tier Android device per §8, not a dev machine)
- ≥90% top-5 candidate recall on supported sets (the correct variant appears somewhere in the candidate list, even if not ranked first)
- ≥80% top-1 match accuracy on clear, well-lit photos (the correct variant is the highest-ranked candidate)
- Fewer than 3 taps from capture to a confirmed add, for the `HIGH`-confidence path
- Recognition confidence displayed for every single result — no exceptions, matching the "never a bare number, never silently guessed" discipline this ADR inherits from ADR 003
- Zero data added to a user's collection without explicit confirmation — even a `HIGH`-confidence one-tap add is still a real, visible, reversible-before-commit action, never an automatic background write

These are the gate for calling V1 done — measured against real scans of real cards before wider rollout, not asserted from how the pipeline is supposed to behave.

## Resolved decisions (2026-07-23)

Reviewed and approved with the following incorporated above:

1. **OCR strategy**: cloud OCR for V1, not a self-hosted/client-side model — the architectural win is reusing the proven matching engine, not the OCR layer itself, which is deliberately isolated and swappable (§3).
2. **Capture mode**: native camera handoff, not a custom live-preview UI — far less code, better device compatibility, no permission/WebRTC edge cases, defers live-preview to a real future need (live edge detection, continuous recognition, AR) rather than building it speculatively (§1).
3. **Offline**: none in V1 — require network for the identify step; results persist normally once confirmed, no special offline cache layer (§7).
4. **Mobile polish**: no separate blocking phase — Scanner is designed mobile-first from its first screen, which resolves the open touch-target/spacing/bottom-sheet backlog as a side effect of building the feature correctly, not as a prerequisite to clear first (§8).

## Consequences

**Positive**: reuses four substantial pieces of already-proven infrastructure (the media pipeline, the migration-matching engine, the `Contribution` review flow, the pricing confidence/display pattern) instead of building a parallel system for any of them — the exact "leverage the foundation" principle this phase was scoped around. The confidence-scored, never-silently-guessing identification model extends a discipline the product already has, rather than introducing a new one.

**Negative / accepted cost**: two of three identification strategies are explicitly deferred (image-hash needs a real backfill; barcode is narrower-scope than it first sounds) — so v1 ships with exactly one identification path. That's a deliberate, honest scope choice, not a hidden limitation. Real OCR accuracy on trading-card fonts (small text, foil backgrounds, glare) is unknown until tested against real photos — worth stating plainly rather than assuming a library's general-purpose accuracy numbers transfer directly to this specific, harder use case.
