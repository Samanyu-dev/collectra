# 3. Price Engine Architecture

Date: 2026-07-22

## Status

**Accepted (2026-07-22).** Reviewed; four scope decisions and one additional requirement (graceful degradation) incorporated below — see "Resolved decisions" near the end. Ready for implementation, starting with the phased rollout plan.

## Context

### What "pricing" currently is in Collectra: a schema with nothing behind it

```prisma
model MarketListing {
  id          String   @id @default(cuid())
  type        String   // e.g., RETAIL, MARKETPLACE, AUCTION, HISTORICAL
  source      String   // e.g., TCGPlayer, eBay, Pokemon Center
  price       Float
  currency    String   @default("USD")
  url         String?
  inStock     Boolean  @default(true)
  updatedAt   DateTime @default(now())
  variantId   String?
  variant     Variant? @relation(fields: [variantId], references: [id])
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
}
```

Confirmed by search: **zero files write to `prisma.marketListing`.** Every `market: true` include across the app (`statistics/page.tsx`, `vault/page.tsx`, `wishlist/page.tsx`, `shelf/page.tsx`, `intelligence/metrics/calculate.ts`, `intelligence/insights/generator.ts`) queries a table that has never had a row inserted by app code. In production today, every one of those `Math.max(...variant.market.map(m => m.price))` calls returns `-Infinity`-guarded-to-fallback, and the app silently falls back to `purchasePrice` or `null` everywhere. "Portfolio value" today is really "sum of what you told us you paid," not a market valuation. This ADR is not "improve the price pipeline" — it's "build it," and fix every downstream read site that was written against a table nobody populates.

Also confirmed: `type` and `source` are free-text strings with no enum, no currency-normalization column, no confidence/provenance fields, and no time dimension beyond a single mutable `updatedAt` — the model is shaped for "latest known price," not history. There is exactly one row per (presumably) overwrite-in-place price point, not an append-only series.

### What already exists that this design should reuse, not replace

This matters because the honest failure mode for a design doc is inventing new infrastructure the codebase already has:

1. **A working job queue** (`SyncJob`/`SyncLog` models, `src/ingestion/scheduler/worker.ts`): polling loop, priority ordering, exponential-backoff retry (`nextRunAt = now + retryCount * 5min`, `MAX_RETRIES = 3`), structured error logging. `registerJob(name, handler)` / `enqueueJob(name, payload, priority)`. This is the scheduled-refresh mechanism — no new queue library needed.
2. **A source-trust model** (`DataSource.trustLevel: Int`, already scoped to "higher = more trusted for auto-verification"). The exact shape a price-source confidence system needs; extend, don't duplicate.
3. **A community-correction/review pipeline** (`Contribution` — `submittedByUserId`/`reviewedByUserId`/`status: PENDING|APPROVED|REJECTED|APPLIED`, plus `User.role: USER|MODERATOR|CURATOR|ADMIN` landed in Phase 4). Manual price corrections are a `Contribution` with `entityType: "MarketListing"` (or the new price model), not a new table.
4. **An adapter interface convention**, twice over — `packages/core/adapters/SourceAdapter.ts` (`fetchChanges`/`verify`/`getLicense`, generic catalog ingestion) and `src/lib/migration/adapters/base.ts` (`canHandle`/`normalize`, narrower CSV-import shape). A `PriceSourceAdapter` interface should follow the same spirit.
5. **An unused field already waiting for this work**: `Wishlist.priceAlert: Float?` has existed since Phase 1 with nothing reading it.
6. **A real, free price source already flowing through the pipeline and being discarded.** `src/ingestion/pokemon/fetch-all.ts` fetches from the Pokémon TCG API, and the raw payload includes `cardRaw.tcgplayer.prices` (confirmed in the current code — `prices.normal`, `prices.holofoil`, `prices.reverseHolofoil`) — today used *only* to infer which variants exist (foil vs. non-foil), then thrown away. This is a zero-new-credentials win: wiring this one field through to a price write is Phase 5's cheapest first real data. Scryfall (MTG's source, not yet wired to prices at all) is documented publicly to include a `prices` object per card (USD/USD-foil/EUR/TIX) — worth confirming against the live API at implementation time rather than assumed here, but likely a second zero-cost source.
7. **Zero caching infrastructure, zero rate-limiting code, zero queue library beyond the homegrown one, zero pricing API credentials in `.env*`.** Confirmed by grep. Any design that assumes Redis, a rate-limiter package, or a provisioned TCGPlayer/eBay API key exists today is wrong. This shapes the phasing below.

### Why this file discusses "which marketplaces" but doesn't commit to specific API integration details

Concrete third-party API shapes (TCGPlayer's actual auth flow, eBay Finding API terms, etc.) aren't something to fabricate into an architecture doc from training data — this codebase's own house rule (`AGENTS.md`) is "verify against real docs, don't assume." Section 2 below scopes *tiers* of integration and what each requires; the actual per-provider integration work (reading real API docs, provisioning real keys, checking real ToS) happens at implementation time for whichever tier is greenlit first.

## Decision

### 1. Conceptual model

Four distinct concepts get conflated today into one `price: Float` column. Separating them is the load-bearing decision everything else depends on:

| Concept | Meaning | Example |
|---|---|---|
| **Listing price** | An ask — what a seller currently wants, not what anything sold for | A TCGPlayer seller's $45 listing |
| **Sold / last-sold price** | A completed transaction | eBay sold comp: $38 on 2026-07-15 |
| **Market price (derived)** | Collectra's computed "the price" for a variant right now — an aggregate over recent listings/sold comps, not a single row | Median of last 10 sold comps, or lowest active listing, depending on source mix |
| **Historical price point** | A market-price snapshot at a point in time, kept forever (or per retention policy) for trend charts | "$40 on 2026-06-01, $38 on 2026-07-01" |

The schema (§4) stores **observations** (listings and sold comps, individually, with provenance) as the source of truth, and **derives** "current market price" from them rather than storing it as its own mutable field that different writers race to overwrite — which is the actual bug class the current `MarketListing.updatedAt`-as-only-time-dimension design invites.

### 2. Supported marketplaces — tiered by what it actually costs to integrate

**Decided: Tier 0 only for this phase.** No paid/credentialed API integration until Tier 0 is fully wired and validated against real usage. Four Tier 0 sources, all reusing infrastructure that already exists:

1. **Pokémon TCG API's `tcgplayer.prices`** — already flowing through `fetch-all.ts`, currently discarded (§ above). The concrete first slice.
2. **Existing ingestion sources generally** — the same principle applies to any pipeline that already fetches price-bearing data as a byproduct, not just Pokémon: Scryfall (MTG's source, not yet wired to prices at all) is documented publicly to include a `prices` object per card (USD/USD-foil/EUR/TIX) — worth confirming against the live API at implementation time rather than assumed here, but likely a second zero-cost source once `mtg-sync` is checked.
3. **Curated imports** — every migration-engine CSV import (`src/lib/migration/actions/create-session.ts`) already carries a real `purchasePrice`/`purchaseDate` per row (what a real collector actually paid). Treated as a legitimate, low-trust `PriceSourceAdapter` (`DataSource.kind: USER_IMPORT`, low `trustLevel`) — not authoritative on its own, but real data that widens observation coverage for exactly the long-tail variants official APIs are weakest on.
4. **Community/manual pricing** — the `Contribution`-based correction pipeline (§10), already designed to be part of this ADR, is itself a Tier 0 source, not a bolt-on: a human-submitted, moderator-reviewed price is real data with its own trust level, same as an API response.

**Tier 1 (official paid/credentialed APIs — TCGPlayer direct, eBay sold comps) and Tier 2 (scraping-based sources) are explicitly deferred**, not scoped for this phase. Revisit once Tier 0 is fully integrated and the product's real usage validates that the free sources aren't sufficient — each needs its own future decision (developer account, real ToS/legal review, credential provisioning), not a default assumed here.

### 3. Price source adapter interface

Mirrors `SourceAdapter`'s shape (`packages/core/adapters/SourceAdapter.ts`) rather than inventing new conventions:

```ts
// packages/core/adapters/PriceSourceAdapter.ts
export interface RawPriceObservation {
  variantExternalId?: string;   // the source's own id for this variant/card, if it has one
  productExternalId?: string;
  kind: "LISTING" | "SOLD";
  price: number;
  currency: string;             // ISO 4217, as reported by the source — normalized later, not here
  observedAt: Date;             // when the source says this was true (listing seen / sale completed)
  url?: string;
  raw: unknown;                 // the untouched source payload, kept for debugging/re-normalization
}

export interface PriceSourceAdapter {
  sourceId: string;             // matches a DataSource.identifier, e.g. "tcgplayer_api"
  trustLevel: number;           // mirrors DataSource.trustLevel — seeds initial confidence (§8)
  supportsVariant(variant: { cardId: string; printingId: string | null; parallelId: string | null }): boolean;
  fetchObservations(target: { variantId: string; externalRef?: string }): Promise<RawPriceObservation[]>;
  resolveVariant(raw: RawPriceObservation): Promise<string | null>; // externalId -> Collectra variantId, or null if unmatched
}
```

`resolveVariant` deliberately mirrors `MigrationMatchingEngine`'s job (matching an external row to a real `Variant`) — same problem, same kind of confidence-scored matching, reusable approach, not a reusable class (the match keys differ: migration matches from a CSV row's free text, price adapters match from a source's own stable external id where available).

**What actually got built**: `RawPriceObservation` (§4) is real and used. The formal `PriceSourceAdapter` *interface* above was never implemented and was removed from `src/lib/pricing/types.ts` as dead code once ESLint flagged it unused — with exactly one real source implemented (`src/ingestion/pokemon/sync-prices.ts`), a plain async function doing fetch → resolve → write → recompute is simpler and equally correct; the interface was premature abstraction for a single implementer. Revisit and reintroduce a real interface once a second, meaningfully different adapter (Tier 1, or MTG/Scryfall) exists and the shared shape is actually known from two real examples, not guessed from one.

### 4. Schema changes

```prisma
// New model — append-only, one row per observed price point, never mutated after insert.
model PriceObservation {
  id            String   @id @default(cuid())
  variantId     String?
  variant       Variant? @relation(fields: [variantId], references: [id])
  productId     String?
  product       Product? @relation(fields: [productId], references: [id])

  kind          String   // LISTING | SOLD
  price         Float    // in original currency, unmodified
  currency      String   // ISO 4217 as reported by the source
  priceUsd      Float    // normalized at write time (§7) — this is what every read/aggregate query uses

  sourceId      String
  source        DataSource @relation(fields: [sourceId], references: [id])
  sourceUrl     String?
  externalRef   String?  // the source's own listing/transaction id, for dedup + debugging

  confidence    Float    @default(1.0)   // 0–1, see §8
  isOutlier     Boolean  @default(false) // set by the outlier pass (§11), never deleted — kept for audit, excluded from aggregates
  overriddenBy  String?  // Contribution.id, if a MODERATOR+ correction superseded this observation's weight — see §10

  observedAt    DateTime // when the source says this was true
  createdAt     DateTime @default(now()) // when Collectra ingested it — different from observedAt for backfills

  @@index([variantId, observedAt])
  @@index([productId, observedAt])
  @@index([sourceId, externalRef]) // dedup key for re-ingesting the same listing/sale
}

// Cheap current-price cache, rebuilt by the aggregation job (§6) — not hand-written by any adapter.
// Exists so every page read is an indexed point lookup, not a live aggregate over PriceObservation.
// Deliberately NOT a single number — every field below is its own concept (§6), each independently
// nullable when there isn't enough real data to support it, rather than one number standing in for all of them.
model CurrentPrice {
  id                String   @id @default(cuid())
  variantId         String?  @unique
  variant           Variant? @relation(fields: [variantId], references: [id])
  productId         String?  @unique
  product           Product? @relation(fields: [productId], references: [id])

  marketPriceUsd    Float?   // "estimated market value" — the headline number, see §6 for derivation
  lastSoldPriceUsd  Float?   // most recent single SOLD observation
  soldAverageUsd    Float?   // mean of SOLD observations in the trailing window — distinct stat from the median-based marketPriceUsd
  lowestListingUsd  Float?   // min active LISTING observation
  highestListingUsd Float?   // max active LISTING observation
  trend30dPercent   Float?   // % change: current window's aggregate vs. the prior 30-day window's — null until 60+ days of real observations exist
  trend90dPercent   Float?   // same, 90-day window

  observationCount     Int      @default(0)
  contributingSources   String? // JSON array of DataSource names/ids folded into this aggregate — the "Source" in the UI contract (§8)
  latestObservationAt   DateTime? // freshest observedAt among contributing observations — the honest "Last updated", distinct from computedAt below
  confidence            Float    @default(0)   // 0–1 aggregate score, see §8
  confidenceLabel        String   @default("NO_DATA") // HIGH | MEDIUM | LOW | NO_DATA — precomputed so every read site renders the same label from the same formula
  computedAt             DateTime @updatedAt // when this row was last recomputed (job-run time, not data freshness)
}
```

`MarketListing` is **deprecated, not deleted in the same migration** — see §15 rollout. Existing FK references (`Variant.market`, `Product.market`) stay until every read site is migrated to `CurrentPrice`, exactly the same "land the plumbing behind existing behavior first" discipline Phase 4 used for `DEFAULT_USER_ID`.

**Exchange rates** — a small, honestly-scoped table, not a live-rate-API integration for V1:

```prisma
model ExchangeRate {
  id        String   @id @default(cuid())
  currency  String   // e.g. "EUR"
  usdRate   Float    // 1 <currency> = usdRate USD
  asOf      DateTime
  @@unique([currency, asOf])
}
```

### 5. Historical price storage / time-series design

`PriceObservation` *is* the time series — append-only, indexed on `(variantId, observedAt)`. Two things follow from that:

- **No separate "PriceHistory" table.** A second table duplicating the same rows would just be a cache with a staleness problem. Trend charts query `PriceObservation` directly (indexed, so this is cheap) or a rollup (next point) for long ranges.
- **Retention/rollup, not unbounded raw storage.** Raw per-listing observations are useful for ~90 days of detail; older than that, a rollup job (same `SyncJob` mechanism) collapses each variant's observations into one row per day (`min`/`max`/`median`/`count`) into a `PriceHistoryDaily` rollup table, and prunes the raw rows past the retention window. This is a **V2 concern** — not needed until real observation volume makes it needed, but the schema shape should be designed now so it's an additive table later, not a redesign:

```prisma
// Not created in the initial migration — documented here so the raw-retention
// cutoff doesn't require a schema redesign when it's actually needed.
model PriceHistoryDaily {
  id         String   @id @default(cuid())
  variantId  String?
  productId  String?
  date       DateTime // day granularity
  medianUsd  Float
  minUsd     Float
  maxUsd     Float
  sampleSize Int
  @@unique([variantId, date])
  @@unique([productId, date])
}
```

### 6. Deriving current / last-sold / listing prices — six concepts, not one number

A scheduled job (`recomputeCurrentPrice`, same `SyncJob` pattern), triggered after any adapter writes new `PriceObservation` rows for a variant/product (or invoked directly and synchronously by the "Refresh Now" action, §9), recomputes every field on that variant's `CurrentPrice` row from the underlying observations. Only non-`isOutlier` observations (§11) count toward any of them:

- **`marketPriceUsd`** ("estimated market value", the headline number): median of `SOLD` observations from the trailing 30 days if any exist (most honest "what it's actually worth" signal); falls back to median of active `LISTING` observations if no sold comps exist yet; `null` if neither — **never a guessed constant**, matching the existing "no fabricated numbers" discipline already in `calculate.ts`'s comments.
- **`lastSoldPriceUsd`**: most recent single `SOLD` observation by `observedAt`.
- **`soldAverageUsd`**: mean (not median) of `SOLD` observations in the trailing 30 days — a deliberately different statistic from `marketPriceUsd`, since mean vs. median disagree exactly when there's a real skew worth surfacing (e.g. one outlier-adjacent-but-not-excluded high sale).
- **`lowestListingUsd`** / **`highestListingUsd`**: min/max active `LISTING` observations — the real current ask range, not a single figure.
- **`trend30dPercent`** / **`trend90dPercent`**: `(currentWindowAggregate - priorWindowAggregate) / priorWindowAggregate * 100`, where each window's aggregate is the same median-of-`SOLD`-falling-back-to-`LISTING` logic as `marketPriceUsd`, computed by re-querying `PriceObservation` with a shifted `observedAt` range — no separate rollup storage needed for this (§5 already covers why raw retention is enough for V1 volume). `null` until there's enough real historical spread (a fresh variant with only this week's observations has no "30 days ago" to compare against) — not backfilled with a guess.

Every field is independently nullable — a variant with exactly one Tier 0 listing and no sold comps yet correctly has `marketPriceUsd` set, `lastSoldPriceUsd`/`soldAverageUsd`/trends all `null`, and a low `confidence` (§8), rather than the schema forcing a single number to stand in for six different questions. The Pokémon TCG API's price object is documented to carry `low`/`mid`/`high`/`market` sub-fields per variant type — worth confirming against a live sample at implementation time, but if accurate it maps almost directly onto `lowestListingUsd`/`highestListingUsd`/`marketPriceUsd` for Tier 0 with minimal derivation work.

This replaces every `Math.max(...variant.market.map(m => m.price))` call site (`calculate.ts`, `generator.ts`, `statistics/page.tsx`, `vault/page.tsx`, `wishlist/page.tsx`) with a single indexed `CurrentPrice` read — simpler code, not just more correct data.

### 7. Currency normalization

Every `PriceObservation.priceUsd` is computed at write time: `priceUsd = price * ExchangeRate.usdRate` (rate `asOf` closest to `observedAt`, USD itself always rate `1.0` with no table lookup needed). Normalizing at write time, not read time, means every downstream aggregate (§6) and every gain/loss calc (§12) is a plain sum over already-comparable numbers — no per-query currency joins. The original `price`/`currency` are kept on the row for provenance/audit, never discarded.

**Rate source**: not a live-updating forex API integration for V1 — a small manually-updated or free-tier-API-refreshed table (monthly cadence is plenty for a collectibles price engine; card prices don't move on intraday FX noise). Concrete provider TBD at implementation time.

### 8. Confidence scores & provenance — the full model, not a placeholder number

Every `PriceObservation` carries:
- `sourceId` → `DataSource.trustLevel` seeds the observation's starting `confidence`.
- `confidence` itself can be adjusted independently per-observation (e.g., discounted if the outlier pass flags it "borderline" rather than "excluded" — see §11).
- `overriddenBy` links to a `Contribution` when a moderator correction supersedes it (§10) — the original observation is never deleted, only outweighed, so the audit trail (`sourceUrl`, `externalRef`, `raw`) stays intact.

**`CurrentPrice.confidence` — a transparent, four-factor formula, not a black box:**

```
confidence = clamp(0, 1,
    0.4 * min(1, observationCount / 5)        // more corroborating observations = more confidence, saturates at 5
  + 0.3 * recencyFactor                       // 1.0 if latestObservationAt is within the refresh cadence (§9); decays linearly to 0 over ~14 days stale
  + 0.2 * avgContributingSourceTrust           // mean DataSource.trustLevel of contributing sources, normalized 0–1
  + 0.1 * (1 - outlierRatio)                   // fraction of this variant's recent observations that were NOT flagged isOutlier
)
```

Each term is independently inspectable (not tuned-and-forgotten): a variant with 5+ recent, trusted, agreeing observations scores near 1.0; a single week-old listing from a low-trust source scores low. `confidenceLabel` is precomputed from the score at the same time so every read site renders identically:

| Score | Label | Meaning |
|---|---|---|
| `observationCount == 0` | `NO_DATA` | Never conflate with "worthless" or "$0" — see §17 |
| `< 0.35` | `LOW` | Thin or stale evidence — shown, but visually de-emphasized (§17) |
| `0.35 – 0.7` | `MEDIUM` | Real data, some gaps (few observations, or aging toward stale) |
| `>= 0.7` | `HIGH` | Multiple recent, trusted, agreeing observations |

**UI contract** — every place a price renders shows the same five things, not just the number, so the transparency is structural rather than a per-page convention someone has to remember to add:

```ts
interface PriceDisplay {
  valueUsd: number | null;       // marketPriceUsd, or whichever concept this display is for (§6)
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW" | "NO_DATA";
  observationCount: number;
  lastUpdated: Date | null;      // CurrentPrice.latestObservationAt
  sources: string[];             // parsed from contributingSources
}
```

e.g. "Estimated Market Value — $42.15 — Confidence: High — Based on 18 observations — Last updated 2 hours ago" is a direct, mechanical rendering of one `CurrentPrice` row, not hand-assembled per page.

### 9. Scheduled refresh jobs

Reuses `registerJob`/`enqueueJob`/`startWorker` as-is — no new scheduling mechanism. New job handlers in `src/ingestion/scheduler/jobs/`:

- `price-sync-pokemon` / `price-sync-mtg` (Tier 0): runs alongside the existing `pokemon-sync`/`mtg-sync` jobs (or as a follow-up step reading the same fetched payload, avoiding a second API round-trip), writes `PriceObservation` rows from the `tcgplayer.prices`/Scryfall `prices` fields already being fetched.
- `price-recompute-current`: the §6 aggregation, enqueued per-variant after new observations land, or swept in batches.
- `price-outlier-scan`: the §11 pass, run after ingestion, before recompute.

**Refresh cadence — decided:**

- **Daily by default** for Tier 0 sources — a nightly sweep job (`price-sync-pokemon` etc.) re-fetches and writes fresh `PriceObservation` rows for every variant that's been observed before, plus new variants as they're ingested.
- **Tiered by relevance within that daily sweep**: variants someone actually owns (`Instance.variantId`) or has wishlisted refresh first / at higher priority — `SyncJob.priority` already exists for exactly this, no schema change needed. The long tail of the catalog nobody owns or wants still refreshes daily, just enqueued after the relevant ones.
- **"Refresh Now"** — a Server Action (`refreshVariantPrice(variantId)`) on a card/variant detail view and (batched) on a collection view, gated by `requireUserForAction()`. Runs the adapter fetch + `recomputeCurrentPrice` **synchronously in the action**, not via the job queue — a bounded, single-variant (or small-batch) operation where the user is actively waiting for a result, unlike the background sweep. Shares the same adapter/aggregation functions as the scheduled job (no duplicated logic, two callers).
- **Cadence is configurable, not hardcoded**: read from an environment variable (`PRICE_REFRESH_INTERVAL_HOURS`, default `24`) at job-enqueue time and by the confidence-recency calculation (§8) — changeable via Vercel env vars without a code change. Not worth a DB-backed admin-settings table yet since nothing else needs runtime-configurable settings today; graduate to one later if an admin UI ever needs to expose it live.

**Trigger mechanism — shipped, verified locally, not yet proven in production.** `vercel.json` (not `vercel.ts` — see note below) declares one daily cron: `{ "path": "/api/cron/price-sync", "schedule": "0 6 * * *" }`. The route (`src/app/api/cron/price-sync/route.ts`) requires `Authorization: Bearer $CRON_SECRET`, 401s without it. Verified end-to-end against the local dev server: no header → 401, wrong secret → 401, correct secret → genuinely invokes `syncPokemonPrices()` (observation count measurably increased during the request). **Not yet verified against the actual deployed Vercel project** — this repo's only git commit predates all of Phase 4/5, so none of this code has been deployed, and `CRON_SECRET` isn't set on the Vercel project's env vars in any environment (confirmed via `vercel env ls`). Vercel Cron only fires against Production deployments, so this can't be confirmed working end-to-end until both are true. See the roadmap/session report for the exact blocker and required next step.

*Why `vercel.json`, not `vercel.ts`*: this session initially wrote `vercel.ts` (per a coding-environment hint that it's the newer, recommended config format), but the Vercel-functions skill's own authoritative cron documentation shows only `vercel.json`, with no mention of `vercel.ts` for crons specifically. Given the real stakes of a cron silently not registering, the switch to the unambiguously-documented path was the safer call.

### 10. Manual overrides & community corrections

No new table. A price correction is a `Contribution` with `entityType: "PriceObservation"` (or `"CurrentPrice"` for a direct override), `payload` holding the proposed value + reasoning, reviewed by `role IN ('MODERATOR','CURATOR','ADMIN')` exactly like every other contribution — the review/apply pipeline (`PENDING → APPROVED/REJECTED → APPLIED`) already exists and already has authorization gating designed (Phase 4 closed the gap where `reviewedByUserId` had no role check behind it). Applying an approved price correction writes a new high-confidence `PriceObservation` with `sourceId` pointing at a `DataSource` representing "community-verified" (`kind: CURATOR` per the existing `DataSource.kind` enum) rather than mutating history.

### 11. Outlier detection

A per-variant statistical pass over recent observations (median absolute deviation is the standard robust choice — resistant to the exact kind of single-bad-listing skew a naive stdev check would miss): flag any observation more than ~3.5 MAD from the trailing-30-day median as `isOutlier = true`. Flagged rows are **never deleted** (kept for audit — a "$5 Buy It Now" listing that was actually a scam/typo is still useful provenance data) but excluded from `CurrentPrice` aggregation (§6) and get their `confidence` reduced rather than zeroed, in case a human reviewer disagrees with the automated flag. This is a statistics-only first pass — no ML model, no external service, consistent with "no unnecessary abstractions."

### 12. Portfolio valuation & gain/loss — unrealized only, decided

Extends `recalculateUserMetrics` (`src/lib/intelligence/metrics/calculate.ts`), not a new engine. **Scope decision: unrealized gain/loss only for this phase** — no realized-gain tracking, no "mark as sold" flow, no `Instance.soldPrice`/`soldDate` columns. Realized gains need sale tracking, partial disposals, and (eventually) fees/tax considerations — a genuinely separate feature, not a field addition, and explicitly not part of this ADR.

What ships:

- **Per-instance unrealized gain/loss**: `currentValue (from CurrentPrice.marketPriceUsd) - purchasePrice`, `null` if either side is missing — same "omit, don't fabricate" discipline already in this file's docstring.
- **Per-instance gain/loss percent**: `(currentValue - purchasePrice) / purchasePrice * 100`, `null` under the same condition (also `null`, not `Infinity`, if `purchasePrice` is `0`).
- **Portfolio-level**: `portfolioValue` (sum of `currentValue`, falling back to `purchasePrice` per-instance exactly as today when no market data exists yet), `costBasis` (unchanged, already correct), new `unrealizedGain = portfolioValue - costBasis`, new `unrealizedGainPercent = unrealizedGain / costBasis * 100`.

### 13. Collection analytics

The existing `statistics/page.tsx` "portfolio history" chart is currently a **fake time series** — a cumulative sum of *acquisition-time* values ordered by `purchaseDate`, not actual historical market movement (its own code comment already says as much: "cumulative sum of ... falling back to purchase price"). Once `PriceObservation` exists, this becomes a real chart: sum of `CurrentPrice`-equivalent-at-each-past-date across owned instances, sourced from `PriceObservation`/`PriceHistoryDaily` at each historical point — a genuinely different, more valuable chart, not a cosmetic tweak.

### 14. Wishlist value tracking & alerts — detection only, no delivery, decided

`Wishlist.priceAlert: Float?` already exists and is already collected by the UI (`toggleWishlist(cardId, priceAlert)`) — it has just never been read by anything. **Scope decision: store the alert definition (already exists) and compute whether it would trigger — no notification delivery of any kind this phase.**

What ships:

- **No new table for alert definitions** — `Wishlist.priceAlert` already *is* the alert definition (threshold price); nothing new to store.
- **A computed "would this trigger" check**, exposed as a read, not a background push: `wishlistAlertStatus(userId)` — for every `Wishlist` row with a non-null `priceAlert`, compares it against the card's cheapest variant's `CurrentPrice.marketPriceUsd` and returns whether the threshold is currently met. Computed on read (the Wishlist page query) or refreshed alongside `price-recompute-current` into a cheap boolean if read-time computation ever becomes too expensive — not decided which yet, deferred to implementation since it's a two-line difference either way.
- **Surfaced in-app only, on the Wishlist page itself** (e.g., a "🔔 At or below your alert price" badge on the existing wishlist card) — no new `Notification` model, no bell icon, no push, no email. A user has to visit `/wishlist` to see it, same as every other piece of data in the app today.
- **No delivery mechanism of any kind is built** — confirmed there's no email-sending or push infra in this codebase at all; building one is out of scope for this ADR entirely, not deferred-with-a-placeholder.

### 15. API rate limiting — implemented and verified, not deferred

**Shipped**, not just designed. `src/lib/pricing/rate-limit.ts` enforces the Pokémon TCG API's real, documented limits for the unauthenticated tier this project actually runs on (confirmed: no `POKEMON_TCG_API_KEY` is configured) — **30 requests/minute and 1,000/day** (`docs.pokemontcg.io/getting-started/rate-limits`), not an assumed number. `SourceRateLimit` moved from single-window-per-source to `@@unique([sourceId, windowSeconds])`, since one source needs both windows checked simultaneously.

`throttleRequest(sourceId, windows, client, maxWaitMs)` is a fixed-window limiter, stored in Postgres (not in-process memory, for the reason originally noted: the worker/app can run as multiple instances). Called before every outbound request in both `sync-prices.ts` (the scheduled sweep — `maxWaitMs: Infinity`, nothing is waiting on it) and `refreshVariantPrice` (the "Refresh Now" action — `maxWaitMs: 5000`, fails fast with a clear `RateLimitExceededError` rather than hanging a user-facing request for up to a day). TCGPlayer and Cardmarket prices come from the *same* HTTP endpoint, so both are correctly metered against one shared budget, not two independent ones.

**Verified with a real integration test**, not just unit-mocked: a tight window (2 requests per 15s) forced genuine contention — requests 1–2 went through immediately, request 3 logged `[rate-limit] ... waiting 9.3s` and actually slept the real wall-clock duration, request 4 then went through on the reset window. Real production values (1000/day, 30/min) are far looser than anything hit during actual testing (a 413-variant, 6-request sync run used 6/1000 daily and never touched the per-minute cap).

### 16. Caching strategy

No caching infra exists today (confirmed). Layered, cheapest-first:

1. **`CurrentPrice` itself is the cache** (§6) — the expensive aggregation already happens once, asynchronously, off the request path. Every page read is a plain indexed Postgres lookup, which at this data volume needs no additional caching layer at all.
2. **Next.js's own data cache** (`fetch`/`unstable_cache` or this version's Cache Components primitives per the `vercel:next-cache-components` conventions, worth a real docs check at implementation time rather than assumed here) for the rendered page output itself, tagged for invalidation when `price-recompute-current` updates a variant — standard Next.js pattern, no new infra.
3. **A real shared cache (Vercel Marketplace Redis/Upstash) is a V2 concern**, only if/when read volume or external-API cost actually justifies it — not provisioned speculatively.

### 17. Graceful degradation — a pricing engine must fail honestly, never plausibly-wrong

A wrong price silently presented with the same confidence as a good one is worse than no price at all. Five concrete failure modes, each with a decided behavior:

**All price sources fail (API down, adapter error, whole sync job fails).** `CurrentPrice` is never cleared or zeroed on a failed refresh — it's only ever overwritten by a *successful* `recomputeCurrentPrice` run. A failed sweep just leaves the last-known-good row in place and logs to `SyncLog` via the worker's existing retry/backoff (`worker.ts` already does this — no new failure-handling code needed, just don't add a code path that writes `null`/zero on error). The UI naturally shows a stale-but-real price with a low `confidenceLabel` (§8's recency factor already decays it) rather than an empty state, unless nothing was ever successfully fetched (true `NO_DATA`, see below).

**Prices are stale.** Staleness is a **read-time computation from `latestObservationAt`**, never a stored boolean (a stored flag could itself go stale if the job that sets it doesn't run). Threshold is tied to the configurable cadence (§9): `stale` = age > 2× `PRICE_REFRESH_INTERVAL_HOURS` (48h at the default daily cadence). The confidence formula (§8) already factors recency continuously, so "stale" isn't a separate signal to compute — it falls naturally out of `confidenceLabel` dropping to `LOW` as `recencyFactor` decays. The UI still shows the number (§8's `lastUpdated` field makes the age visible), it just doesn't present it with `HIGH`/`MEDIUM` visual weight.

**UI states — three, not two.** Every price display (§8's `PriceDisplay` contract) renders one of exactly three states, never a fourth ad-hoc one invented per-page:
1. **Real, current** — value + `HIGH`/`MEDIUM` confidence badge, normal visual weight.
2. **Real, degraded** — value + `LOW` confidence badge (stale and/or thin evidence), value shown but visually de-emphasized (muted color/smaller weight) so it reads as "here's our best guess, not a fact."
3. **No data** (`confidenceLabel: NO_DATA`, `observationCount: 0`) — explicit "Price not yet available" copy. **Never** `$0.00`, **never** a blank cell — both are real prior bugs-in-waiting (a $0 card reads as "worthless" or "free," a blank cell in a table reads as a loading glitch, not "we genuinely don't know").

**Conflicting prices across sources.** Not last-write-wins, not first-source-wins. Reconciliation *is* the median-based aggregation (§6) plus outlier exclusion (§11) already designed — a $200 listing next to nine $40 listings gets statistically excluded or down-weighted, not averaged in naively. When sources disagree *without* a clean outlier (e.g., two clusters of genuinely different but plausible prices — say a stale reprint vs. a first-print premium that the variant-matching missed), that disagreement shows up as higher variance, which the confidence formula doesn't currently penalize directly — flagged as a real limitation: `outlierRatio` catches single bad points, not bimodal disagreement. Worth a variance-based confidence penalty in a later pass once real data shows this happening; not fixed here since it's speculative until then.

**Low-confidence display.** The confidence label is **never hidden** — even a `LOW` or `NO_DATA` price is shown with its label, not silently upgraded in appearance to look as trustworthy as a `HIGH` one. This is the same "don't fabricate, don't hide the uncertainty" discipline `calculate.ts`'s own docstring already commits to for the existing metrics — extended to pricing rather than invented fresh here.

## Schema gap analysis

| Concept | Exists today | Gap |
|---|---|---|
| Listing/sold price storage | `MarketListing` (unpopulated) | New `PriceObservation` (append-only, typed `kind`) |
| Current price (fast read) | Nothing (`Math.max` over empty table) | New `CurrentPrice` |
| Historical time series | Nothing real (fake acquisition-cost chart) | `PriceObservation` is the series; `PriceHistoryDaily` rollup deferred to V2 |
| Currency normalization | `MarketListing.currency` field exists, unused | New `priceUsd` write-time normalization + `ExchangeRate` |
| Confidence/provenance | Nothing | New `confidence`, `sourceUrl`, `externalRef`, `raw` |
| Price source trust | `DataSource.trustLevel` (exists, used for catalog data) | Reuse as-is for price adapters |
| Scheduled jobs | `SyncJob`/`SyncLog` + `worker.ts` (exists, working) | New job handlers only, no new mechanism |
| Manual/community correction | `Contribution` + `User.role` (exists, gated since Phase 4) | Reuse as-is with `entityType: "PriceObservation"` |
| Outlier detection | Nothing | New, statistics-only pass |
| Unrealized gain/loss | `Instance.purchasePrice` exists; no current-value comparison | Extend `recalculateUserMetrics` |
| Realized gain (sold instances) | No `soldPrice`/`soldDate` on `Instance` | **Decided out of scope** — not built this phase, not a gap to close now |
| Wishlist alerts | `Wishlist.priceAlert` field exists, never read | **Decided: detection-only.** New read-time check against `CurrentPrice`; no delivery mechanism built |
| Rate limiting | Nothing | New `SourceRateLimit`, Postgres-backed |
| Caching | Nothing | `CurrentPrice` table + Next.js data cache; Redis deferred |
| Refresh cadence config | Nothing | New `PRICE_REFRESH_INTERVAL_HOURS` env var, default 24h |
| Graceful degradation | Nothing (current `Math.max` reads fail silently to `null`) | §17 — never-clear-on-failure, read-time staleness, three-state UI contract |

## Rollout plan

1. **Migration 1**: add `PriceObservation`, `CurrentPrice` (full six-concept shape from §4/§6, not a partial version to be widened later), `ExchangeRate`, `SourceRateLimit` — additive, `MarketListing` untouched, nothing reads the new tables yet (same "land plumbing behind existing behavior" discipline as Phase 4).
2. **Tier 0 adapters**: wire `tcgplayer.prices` out of the existing `pokemon-sync` payload into `PriceObservation` writes; add the curated-import (`purchasePrice` from migration rows) and community-correction (`Contribution`) adapters. Verify each against real data before touching any read path.
3. **Aggregation job**: `price-recompute-current` (§6/§8) — all six price concepts plus confidence/label, populated for the now-real Pokémon observations first.
4. **Graceful degradation built in from the start, not bolted on**: the job's failure path (never clear `CurrentPrice` on error) and the `PriceDisplay` three-state contract (§17) ship with step 3/5, not as a follow-up hardening pass.
5. **Migrate one read site at a time** to `CurrentPrice`, starting with `intelligence/metrics/calculate.ts` (highest-leverage, feeds everything downstream), verifying real numbers change sensibly before moving to the next site — not a big-bang swap.
6. **Outlier pass** once there's enough real observation volume to be worth tuning against (tuning MAD thresholds against an empty/tiny dataset is guessing, not engineering).
7. **Unrealized gain/loss + wishlist alert detection** as follow-on, additive work once the core pipeline is proven against real data.
8. **"Refresh Now" action** once the adapter + aggregation functions it calls directly are proven via the scheduled path.
9. Tier 1/2 marketplaces, realized gains, and notification delivery are explicitly **out of scope** for this phase (decided above), not deferred-with-a-placeholder.

## Security & authorization

- Price-correction `Contribution`s reuse the exact role-gating (`MODERATOR`+) Phase 4 already built — no new authorization surface.
- `PriceObservation.raw` (unprocessed source payload) is server-only data — never sent to the client, same as existing `SUPABASE_SERVICE_ROLE_KEY` handling discipline.
- `refreshVariantPrice` (the "Refresh Now" action, §9) is gated by `requireUserForAction()` like every other Server Action — no special-cased public endpoint that could be hammered to bypass rate limiting.
- Deferred: any Tier 1 API keys, if that phase ever starts, go in `.env.local`/Vercel env only, never `NEXT_PUBLIC_*`, matching this codebase's existing convention.

## Resolved decisions (2026-07-22)

Reviewed and approved with the following scope decisions incorporated above:

1. **Marketplace tier**: Tier 0 only (Pokémon TCG API, other existing ingestion sources, curated CSV imports, community corrections). No paid API integration this phase (§2).
2. **Notifications**: alert *definitions* and *detection* only (`Wishlist.priceAlert`, already exists, plus a read-time trigger check). No delivery mechanism — no email, no push, no new `Notification` model (§14).
3. **Realized gains**: out of scope entirely this phase. Unrealized gain/loss, cost basis, and gain percent only (§12).
4. **Refresh cadence**: daily default for Tier 0, tiered by owned/wishlisted priority, plus a synchronous "Refresh Now" action, cadence configurable via env var rather than hardcoded (§9).
5. **Confidence model**: expanded into a full four-factor formula, a precomputed label, and a shared `PriceDisplay` UI contract (value, confidence, observation count, last-updated, sources) so transparency is structural, not per-page (§8).
6. **Multiple price concepts**: `CurrentPrice` carries all six (`marketPriceUsd`, `lastSoldPriceUsd`, `soldAverageUsd`, `lowestListingUsd`, `highestListingUsd`, `trend30dPercent`/`trend90dPercent`) from the first migration, independently nullable, so no schema churn as sources richen (§4/§6).
7. **Graceful degradation**: new §17 — never clear `CurrentPrice` on a failed refresh, read-time (not stored) staleness, a three-state UI contract (`real`/`degraded`/`no data`, never `$0`/blank), reconciliation via the existing median+outlier aggregation rather than last-write-wins, confidence label never hidden.

## Implementation status (2026-07-23) — the launch-readiness record

Everything below is either **verified against real data** or **explicitly flagged as unverified**, not assumed. This section is the authoritative "is it actually done" answer — treat the design sections above as intent, this as fact.

**Shipped and verified with real data:**
- Schema: `PriceObservation`, `CurrentPrice` (all six concepts), `ExchangeRate`, `SourceRateLimit` (multi-window), `UserMetrics.unrealizedGain(Percent)` — all migrated onto the live database.
- Two real Tier 0 sources, same API call: TCGPlayer (USD) and Cardmarket (EUR, real ECB-sourced exchange rate, not guessed). Verified: exact price match against a live API sample, exact currency conversion (69.94 EUR → $79.79), multi-source aggregation combining both into one `CurrentPrice`.
- Outlier exclusion verified against a **real** case, not synthetic: TCGPlayer's own `high` field returned $9999 for a card actually worth ~$40–70; the MAD pass correctly flagged and excluded it.
- Confidence formula hand-verified against real output (0.7267 computed vs. 0.7267 by hand) and against real stale data (a month-old Cardmarket observation correctly decayed to `MEDIUM`).
- `MarketListing` fully removed (not deprecated-and-kept) after proving zero reads and zero writes across two independent full-repo audits, one before and one after the removal migration.
- Every price display goes through one shared path: `toPriceDisplay()` (`src/lib/pricing/display.ts`) → `<PriceTag>` (`src/components/ui/price-tag.tsx`) — wired into Wishlist, card detail, and both card-grid contexts (collections and the main `/cards` browse). Vault's per-item figure is a *derived* valuation (market price × grade multiplier), not a direct quote, so it intentionally shows the number without the confidence badge — a deliberate, not accidental, scope boundary.
- Rate limiting: real, enforced, integration-tested (§15) — not schema-only anymore.
- Performance: 158.7s → 82.5s (1.9x) on an identical Base Set workload after batching + the bulk-SQL outlier fix; the retry storm (~120 `[db-retry]` lines) dropped to zero. Re-measured on a larger, realistic run (5 sets, 413 variants, 1,721 observations, with rate limiting active): 497ms/variant — faster than the single-set number, confirming the fix holds up at scale rather than being a small-sample artifact.
- 53 tests passing across 9 files: outlier detection, confidence scoring, multi-source reconciliation, stale-data handling, wishlist/rows/commit ownership, cron auth (401/401/200/500 paths), rate-limit window creation/increment/reset/exceeded, and admin-page role-gating/formatting logic.

**Explicitly NOT verified — the one open item before this can be called done:**
- **Production cron execution.** `vercel.json` and the cron route are correct and locally verified, but this repository's only git commit predates all of Phase 4 and Phase 5 — nothing from either phase has ever been pushed or deployed. Confirmed directly: the current production deployment 404s on both `/login` (Phase 4) and `/api/cron/price-sync` (Phase 5). `CRON_SECRET` is not set on the Vercel project in any environment (`vercel env ls` confirmed). Vercel Cron only fires against Production. **Closing this requires, in order: (1) committing this work, (2) setting `CRON_SECRET` in the Vercel project's Production env, (3) deploying to production, (4) confirming the route responds correctly on the live URL.** None of these were done unilaterally — each is a real, hard-to-reverse action on shared production infrastructure, held for explicit sign-off rather than assumed as part of "finish the pricing engine."

## Consequences

**Positive**: every downstream consumer of "price" (Statistics, Vault, Wishlist, Shelf, the Intelligence engine's `portfolioValue`/insights) gets real, provenance-backed, currency-correct numbers instead of silently-always-null reads — without inventing new infrastructure the codebase doesn't already have a version of (job queue, trust model, correction pipeline, adapter convention all reused). Tier 0 alone (zero new credentials) already fixes the two TCGs with the most real ingested data (Pokémon 20,257 cards, MTG 4,984 cards). The confidence/graceful-degradation model means every number shown is honestly qualified rather than presented as gospel — a deliberate trust-building choice, not just a technical one.

**Negative / accepted cost**: `PriceObservation` volume grows unbounded until the V2 rollup/retention job exists — acceptable at current data scale, flagged so it isn't forgotten. `trend30dPercent`/`trend90dPercent` will be `null` for most variants for the first ~60 days after this ships (not enough historical spread yet) — an honest limitation of shipping before Tier 0 has accumulated history, not a bug. Realized gains, notification delivery, and Tier 1 sourcing are real product gaps left open by this phase's scope decisions — each is a known, named follow-up, not a silently dropped requirement. `MarketListing` was removed outright rather than deprecated-and-kept, once both zero-writes (Phase 5 start) and zero-reads (Phase 5 end, after full migration) were independently proven — a slightly bigger single migration than the gradual `DEFAULT_USER_ID` pattern Phase 4 used, justified because the table never held real data to begin with.
