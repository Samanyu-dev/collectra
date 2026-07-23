# 5. Marketplace Architecture

Date: 2026-07-23

## Status

**Accepted (2026-07-23).** Reviewed; all five open questions resolved (see "Resolved decisions" below). Ready for implementation.

## Guiding principle

**Marketplace listings are advertisements for owned instances — not transactions.** Collectra is the catalog, the pricing engine, the discovery platform, and the inventory manager. It is not the financial intermediary. The transaction (payment, shipping) happens outside Collectra until real usage justifies the materially larger investment of becoming one. Every decision below follows from this sentence.

## Context

### What actually exists to build on — verified against the real schema, not the roadmap's own prior claims

`docs/roadmap.md`'s Phase 7 stub claims *"`MarketListing` and the `ProductRelationship` model give this a real foundation already."* Checked directly against `prisma/schema.prisma` — this is wrong on both counts, the same kind of stale claim Phase 5 found with `MarketListing` itself and Phase 6 found with `perceptualHash`:

- **`MarketListing` doesn't exist.** It was fully removed from the schema during Phase 5 after the pricing-engine work proved it had zero real reads or writes. There is currently **no marketplace/listing/trade/offer model of any kind** in the schema (confirmed via grep — the only hits for "listing" are `PriceObservation.externalRef`'s comment and `CurrentPrice.lowestListingUsd`/`highestListingUsd`, both pricing concepts, unrelated to user-to-user trading).
- **`ProductRelationship` is not marketplace infrastructure.** It's a catalog-graph edge between two `Product` rows (`type: SUCCESSOR | PREDECESSOR | ALTERNATIVE | BUNDLE`, e.g. "this box is the successor product to that box") — a catalog fact, not a listing, offer, or transaction between two users. Calling it a Marketplace foundation is a category error worth correcting here so this file doesn't keep repeating it.
- **`Event.type`'s documented (non-exhaustive) vocabulary already includes `TRADE_CREATED`** — this part of the roadmap's claim was accurate. It's never been emitted (nothing produces trades yet), but the activity-feed/audit-trail pattern is real and proven (every `Instance` mutation across auth, collection, and scanner already emits an `Event`).
- **No payment infrastructure exists at all.** Confirmed via `package.json` and the schema: zero Stripe, PayPal, or any payment-processor dependency; no escrow, payout, or transaction-ledger model. This is a bigger gap than any of the eight questions below and changes almost everything downstream — see §0.
- **`Instance`** (`userId`, `variantId`, `condition`, `isGraded`, `certification`, `purchasePrice`, `notes`, `isVaulted`, `isFavorite`, `scanMediaId`) already models exactly one row per physical card a user owns — the natural thing a listing attaches to, not the catalog `Variant` itself (see §1).
- **`Certification`** (1:1 with `Instance`: `company`, `grade`, `certNumber`) is real, existing grading data — directly relevant to "how is grading represented" (§6), not a gap to fill.
- **`Wishlist.priceAlert`** exists (a user-set price threshold on a card/variant) — real precedent for "notify a user when something they want becomes available," relevant to whether a new listing can page interested wishlisters. It has no expiry mechanism either, which is worth naming as a pre-existing gap so Marketplace doesn't quietly repeat it (§4).
- **`User.role`** is `USER | MODERATOR | CURATOR | ADMIN` — no seller/buyer distinction, no reputation or rating field anywhere in the schema. Trust between two trading users is entirely unbuilt today (§5).
- **`Contribution`** (`submittedByUserId`/`reviewedByUserId`, `PENDING/APPROVED/REJECTED/APPLIED`) is a real, proven moderation-queue pattern already in production for catalog edits — reusable if listings ever need review before going live, not a new pattern to invent.
- **`SyncJob`/`SyncLog`** exists as a schema, but its polling worker (`startWorker()`, `src/ingestion/scheduler/worker.ts`) is only ever invoked by standalone local scripts — not `package.json`, not `next build`, not any Vercel Cron entry. **It does not actually run anywhere in this deployment**, a correction made when building the expiry job below, not assumed here. The real, currently-running scheduled-job pattern is what `price-sync` (Phase 5.1) actually uses: Vercel Cron → a `CRON_SECRET`-gated API route → a direct function call, bypassing `SyncJob` entirely. Any scheduled Marketplace task should follow that proven pattern, not the unused one.
- **Private per-user storage convention** (`users/{userId}/...`, RLS-backed bucket policies) is established and proven across Phase 4 (migration uploads) and Phase 6 (scan photos) — but every prior use has been *permanently* private, and a listing photo needs to be public once active. Reused as a *pattern* (same `Media`/`MediaAttachment` shape), not as the same bucket — see Security & Authorization for the two-bucket decision.

## Decision — organized around the eight questions raised, plus the payment gap this session's verification surfaced

### 0. The question underneath all eight: what does "Marketplace" actually mean for V1?

Two fundamentally different products hide under one word, and every decision below depends on which one this is:

**(a) Listings/matching layer.** Users list what they own, browse what others are listing, and coordinate the actual sale (payment, shipping) off-platform — closer to classifieds than checkout. Low engineering and legal surface, ships fast, but real trust risk: Collectra shows two strangers to each other and steps back.

**(b) Real transactional marketplace.** In-platform payment (the standard pattern here is Stripe Connect — buyer pays Collectra, funds held/escrowed, seller gets paid out, platform takes a fee), dispute resolution, possibly shipping-label integration. High engineering and legal surface (money transmission adjacent, seller KYC for payouts, chargeback handling) — this is the actual sustainable product, but it's a materially larger build than everything else in this ADR combined.

**Decided: (a).** Not because payment is hard to build, but because it isn't Collectra's differentiator — accurate collection tracking, reliable pricing, the universal card database, the OCR scanner, and collection management are. Supporting in-app payments means also signing up for payment-processor integration, KYC/identity verification, fraud handling, chargebacks, refunds, tax/VAT/GST handling, dispute resolution, seller onboarding, and regional payment compliance — each its own product area, none of which make the core product better. (b) is a real fast-follow (Phase 7.5 or 8) once real usage shows people consistently want to complete purchases inside the app — real data informing the investment instead of building a full commerce stack on speculation.

Everything below is written for (a). The V1 flow:

```
My Collection → Choose an Instance → Create Listing → Visible in Marketplace →
Interested buyer → Message Seller → Deal happens externally → Seller marks Sold
```

Everything in §1–§8 below is written assuming (a).

### 1. What is being listed — individual owned Instances, not catalog Variants

A new `Listing` FKs to `Instance`, not `Variant`. Reasoning: `Instance` already carries the condition, grading, purchase history, and photo provenance for one specific physical card — listing a bare `Variant` would mean re-collecting all of that at listing time redundantly, and would misrepresent what's actually being sold (a real marketplace sells *this exact card*, not "a copy of this card," which is closer to how eBay/other card-trading platforms already model it). Bulk/lot listings (multiple `Instance`s under one listing) are a real, reasonable fast-follow — deferred from V1 to keep the first `Listing` model small.

### 2. Is inventory immutable once listed — decided: listings are full snapshots, always

`Instance` itself stays mutable — it's still the owner's card, notes and location can still change. `Listing` is a **full snapshot** of the fields a buyer is trusting, copied at creation time and never silently updated: condition, grade (from `Certification`, if present), photo references, and a description. If the owner later edits the `Instance` — changes notes, replaces photos, changes recorded condition — the **active listing does not change**. There is deliberately no "sync listing from instance" action in V1; that's a real mechanism with its own edge cases (what happens to a `RESERVED` listing mid-sync?) that isn't needed yet. To reflect a real change, the seller withdraws the listing (`WITHDRAWN`) and creates a new one — reuses the existing lifecycle rather than inventing a refresh mechanism, and keeps buyers from ever seeing a listing change underneath them. Once a buyer reserves (state → `RESERVED`, §7), the listing is additionally locked from withdrawal by the seller unilaterally (see §7) — but it was never mutable in the first place.

### 3. Pricing and negotiation — decided: fixed price + Message Seller, nothing else in V1

**Fixed-price only.** The existing `CurrentPrice`/`toPriceDisplay()`/`PriceTag` infrastructure (ADR 003) shows a suggested price anchor right on the listing form — real proven infra, zero new work. **Negotiation in V1 is entirely out-of-band**: a buyer clicks "Message Seller," the two parties work out price/logistics themselves, off-platform, same as everything else in §0's flow. No offer/counter/accept state machine — that's a real fast-follow once fixed-price listings prove there's demand for in-app negotiation at all. **Auctions explicitly out of scope** — a fundamentally different mechanic (time-boxed, competitive bidding), not a variation on fixed-price.

### 3a. "Message Seller" — the one new piece of in-app interaction V1 actually needs

The flow in §0 has exactly one step that happens inside Collectra between two users: a buyer expressing interest. This needs a real, minimal mechanism — not full chat/DMs, just enough to (1) let a buyer reach a seller without scraping their email off a public listing, and (2) produce the real data behind the "response rate" trust signal in §5 (which doesn't mean anything if nothing in-app is ever actually measured). A new `ListingInquiry` model: `listingId`, `buyerId`, `message`, `createdAt`, `respondedAt` (nullable, set the first time the seller replies). Deliberately not a full conversation/thread model — one inquiry row per buyer per listing is enough for V1; the actual back-and-forth after the first reply can happen by whatever means the two parties prefer (the seller's reply can just include their real contact info once they choose to share it).

### 4. Preventing duplicate/stale listings

An `Instance` can have **at most one `ACTIVE` `Listing`** at a time (a partial unique index on `instanceId` where `status = 'ACTIVE'`) — structurally prevents double-listing the same physical card. **Staleness**: a listing auto-expires into an `EXPIRED` state via a Vercel Cron entry (`/api/cron/marketplace-expire`, `CRON_SECRET`-gated), the same proven pattern `price-sync` already uses in production — not `SyncJob`, which turned out not to be wired into anything (see Context). Worth naming directly: `Wishlist` has no equivalent expiry today, a real pre-existing gap — Marketplace shouldn't quietly copy it.

### 5. Trust model — decided: objective facts, deliberately never a score

No reputation/rating field, no verified-seller concept, no dispute mechanism exists anywhere in the schema today. **Decided: no star rating or computed reputation score, in V1 or as a planned fast-follow — full stop.** A score implies precision Collectra doesn't have and is exactly the kind of number this project has refused to fabricate everywhere else (pricing confidence, OCR confidence): a 4.8-star seller with 3 trades and a 4.8-star seller with 300 look identical in a single number, and a star rating is also the easiest kind of signal to game with a handful of friendly trades. Instead, show real, independently-verifiable facts, each backed by a field or count that already exists or is trivial to compute — nothing invented to "feel like" a trust score:

- **Member since** — `User.createdAt` (exists, zero new work).
- **Collection size** — count of the user's `Instance` rows (exists, zero new work).
- **Verified scans** — count of `Instance`s with `scanMediaId` set (Phase 6) — a real, hard-to-fake signal that a real physical card was actually photographed, not just typed in.
- **Completed sales** — count of that user's `Listing`s with `status = SOLD` (new, but a trivial count once `Listing` exists).
- **Response rate** — % of `ListingInquiry` rows with `respondedAt` set, per seller (§3a) — genuinely unavailable until `ListingInquiry` exists and has real data; shows as "not enough data yet" rather than a fabricated 100%, the same honest-`NO_DATA` posture pricing and scanning already use.

Every listing state transition still emits a real `Event` (`LISTING_CREATED`, `TRADE_CREATED`, etc.) for a genuine audit trail from day one — not a dispute-resolution mechanism (there isn't one in V1, per the Guiding Principle), just a real record of what happened.

Whether Collectra ever mediates (holds funds, verifies shipment, resolves disputes) doesn't apply in V1 at all — mediation only becomes a question if (b) from §0 is ever built.

### 6. Condition, photos, grading, provenance — reuse existing infrastructure, don't reinvent it

- **Condition**: `Instance.condition` (existing string field) — a listing shows the same value already recorded, not a separate re-entry.
- **Grading**: `Certification` (`company`, `grade`, `certNumber`, 1:1 with `Instance`) is real, already-modeled grading data — a graded card's listing surfaces this directly.
- **Photos**: same `Media`/`MediaAttachment` model shape as scans and migration uploads, but a **separate storage bucket** — see Security & Authorization (decided: `marketplace-media`, not a public/private toggle on the existing bucket). A `Listing` requires ≥1 attached `Media` with a new usage value (e.g. `LISTING_PHOTO`).
- **Provenance**: `Instance.scanMediaId` (Phase 6) already lets a listing surface "this is the actual photo this exact card was scanned from" as a real trust signal a generic stock photo wouldn't carry — worth highlighting in the listing UI once Scanner has real adoption, not built as a Marketplace-specific feature.

### 7. Listing lifecycle

`DRAFT → ACTIVE → RESERVED → SOLD`, plus `WITHDRAWN` (seller-cancelled) and `EXPIRED` (auto, §4). `RESERVED` is a real, distinct state — not collapsing straight from `ACTIVE` to `SOLD` — because the gap between "a buyer commits" and "the transaction actually completes" (payment clears, item ships, both sides confirm) is exactly where trust matters most; collapsing it away would hide the hardest part of the problem, not solve it.

**What "Sold" does and doesn't do, made explicit rather than assumed**: marking a listing `SOLD` is a seller-initiated action that retires the listing — it does **not** automatically reassign the underlying `Instance.userId` to a buyer. Reasoning ties directly to the Guiding Principle: the buyer transacted off-platform and may not even have a Collectra account, so there's no reliable "other account" to transfer ownership *to*. The seller marking `SOLD` is prompted (not forced) to also remove the card from their own collection via the existing `toggleCardOwned`/instance-delete flow (`src/lib/actions/collection.ts`), if they want their Collectra collection to reflect that they no longer own it — a separate, already-existing action, not something `Listing` needs to orchestrate. If a buyer who *is* a Collectra user wants the card reflected in their own collection, that's their own add action (scan, search, manual entry) — Collectra doesn't broker an ownership-transfer object between two accounts in V1.

### 8. Global vs. region-aware

**Global from day one** — no shipping-zone or currency-region gating in the data model; browsing can filter by `shipsTo`/country client-side without the schema itself being regional. **Currency**: reuse ADR 003's existing `normalizeToUsd`/currency-conversion path to display a listing's price in a buyer's preferred currency — real infra, not new.

**Shipping — decided: a single descriptive tag, not real logistics.** `Listing.shipsTo` is a plain string (matching this schema's existing convention of documented-vocabulary strings over Prisma enums — see `Event.type`, `Media.status`), e.g. `"Worldwide"`, `"Europe"`, `"India"`, `"Local pickup"`. No cost calculation, no label generation, no carrier integration — real shipping logistics only becomes worth modeling once money actually flows through Collectra (i.e. if/when (b) from §0 is ever built), per the same "don't build infrastructure ahead of validated need" reasoning as everything else in this ADR.

## Schema gap analysis

| Concept | Exists today | Gap |
|---|---|---|
| The thing being sold | `Instance` (owned physical card, condition, grading, provenance) | New `Listing` model, FK to `Instance` |
| Listing lifecycle | Nothing | New: `DRAFT/ACTIVE/RESERVED/SOLD/WITHDRAWN/EXPIRED` status field |
| Duplicate-listing prevention | Nothing | New: partial unique index (one `ACTIVE` listing per `Instance`) |
| Listing photos | `Media`/`MediaAttachment` pipeline (Phase 4/6) | New `MediaAttachment.usage` value (e.g. `LISTING_PHOTO`); reuse pipeline as-is |
| Grading on a listing | `Certification` (real, 1:1 with `Instance`) | None — reuse as-is |
| Price anchor | `CurrentPrice`/`PriceTag`/`toPriceDisplay()` (ADR 003) | None — reuse as-is for a suggested-price display |
| Currency display | `normalizeToUsd` (ADR 003) | None — reuse as-is |
| Staleness/expiry | Vercel Cron + `CRON_SECRET` pattern (proven by `price-sync`) | New cron route; `Wishlist` has the same gap today, unaddressed |
| Trust signals | `User.createdAt`, `Instance` count, `Instance.scanMediaId` count all exist | New: `Listing`-`SOLD` count, `ListingInquiry` response-rate — see §5. Deliberately no score/rating field, ever |
| Buyer↔seller contact | Nothing | New, minimal `ListingInquiry` model (§3a) — not a full messaging system |
| Payment/escrow/payout | **Nothing at all** | **Explicitly out of scope for V1** — off-platform by design (§0), not a gap to fill |
| Audit trail | `Event` (already anticipates `TRADE_CREATED`) | New emission points; model itself needs no change |
| Offers/negotiation | Nothing | **Explicitly out of scope for V1** — "Message Seller" only (§3) |
| Shipping | Nothing | New: `Listing.shipsTo` plain string tag, no logistics (§8) |
| Wishlist → listing notification | `Wishlist.priceAlert` (real precedent) | New: notify wishlisters when a matching listing goes `ACTIVE` |

## Rollout plan

1. `Listing` model (snapshotted fields per §2) + `DRAFT/ACTIVE/RESERVED/SOLD/WITHDRAWN/EXPIRED` lifecycle, FK to `Instance`, partial unique index for "one active listing per instance."
2. `marketplace-media` bucket + listing photos via the existing `Media`/`MediaAttachment` shape.
3. Browse/search listings — reuses existing search infrastructure patterns rather than a parallel search stack; filterable by `shipsTo`.
4. `ListingInquiry` ("Message Seller") — the one new interactive piece (§3a).
5. Buyer reservation flow (`ACTIVE` → `RESERVED`) — intent only, no payment.
6. Seller "Mark Sold" action (`RESERVED`/`ACTIVE` → `SOLD`), prompting (not forcing) the existing collection-removal action (§7).
7. `LISTING_CREATED`/`TRADE_CREATED` `Event` emission — real audit trail from the first listing.
8. Expiry job via Vercel Cron (the proven `price-sync` pattern, not `SyncJob`).
9. Trust-signal display (§5) — all derivable from data that exists by step 6.

## Security & authorization

- Listing create/edit/withdraw goes through `requireUserForAction()`, same as every other mutation in the app.
- Only the `Instance`'s owner can list it — an ownership check identical in shape to every other `Instance` mutation already in production.
- **Decided: two separate storage buckets, not one bucket with a state-dependent RLS policy.** Every prior use of the `users/{userId}/...` private-storage convention (migration uploads, scan photos) has been *permanently* private to the uploader — making that same bucket's visibility depend on a `Listing`'s current status would mean the storage layer's access policy has to stay in sync with application state, a real, easy-to-get-wrong coupling. Instead: `private-media` (existing bucket — collection photos, purchase receipts, scan photos, notes, unchanged) stays exactly as it is today; a new `marketplace-media` bucket is public by default and holds only `LISTING_PHOTO` uploads. Simpler operationally — a photo's visibility is a fact about which bucket it's in, not a policy that has to react to a status change.
- `ListingInquiry` messages are private to the two participants (buyer, seller) — same `requireUserForAction()` + ownership-check pattern as everything else, no new authorization model needed.
- No payment credentials or PII handling in V1. Contact information beyond what a seller chooses to share in a `ListingInquiry` reply is never surfaced automatically.

## Resolved decisions (2026-07-23)

Reviewed and approved with the following incorporated above:

1. **(a) listings-only, not (b) transactional marketplace** — decided for V1, on product-focus grounds (Guiding Principle), not because payment is technically hard. (b) is a real, named fast-follow (Phase 7.5/8) once real usage justifies it (§0).
2. **No payment processor integration in V1** — direct consequence of #1.
3. **No reputation score, ever** — objective facts instead (member since, collection size, verified scans, completed sales, response rate), each backed by a real field or count, never a computed/gameable number (§5).
4. **No offers/negotiation state machine in V1** — fixed price + a minimal "Message Seller" mechanism (`ListingInquiry`) only; negotiation happens off-platform (§3/§3a).
5. **Shipping is a descriptive tag, not logistics** — `Listing.shipsTo` (Worldwide/Europe/India/Local pickup, freeform string), no cost calculation or carrier integration (§8).
6. **Listings are immutable snapshots** — never silently reflect a later `Instance` edit; withdraw-and-relist is the only way to update one (§2).
7. **Two storage buckets, not one bucket with dynamic visibility** — `private-media` (existing, unchanged) and a new public `marketplace-media` for listing photos only (Security & Authorization).
8. **"Sold" retires the listing; it does not transfer `Instance` ownership between accounts** — the seller is prompted to separately remove the card from their own collection if they choose to; Collectra doesn't broker an ownership-transfer object in V1 (§7).

## Consequences

**Positive**: reuses `Instance`, `Media`/`MediaAttachment`, `Certification`, `Event`, and the proven Vercel Cron pattern directly — no parallel system built for any of them, the same "leverage the foundation" discipline every prior phase in this project has followed. Correcting the roadmap's stale `MarketListing`/`ProductRelationship` claim here (and this ADR's own initial, unverified `SyncJob` claim, caught while actually building the expiry job) means this phase starts from real, checked infrastructure, not assumed infrastructure. The trust signals (§5) all come from data the app already has or trivially derives — nothing fabricated, nothing that needs its own separate scoring system to maintain.

**Negative / accepted cost**: Collectra facilitates discovery and matching, not the actual transaction — a real, stated limitation, not implied to be a full checkout experience when it isn't. No in-platform payment protection means two strangers trading collectibles are trusting each other, not Collectra, for the transaction itself — an honest tradeoff for staying focused on the product's actual differentiator, but a real risk worth naming plainly: a bad first off-platform experience could sour a user on the feature before Phase 7.5/8 payment infrastructure would ever be justified by the data to build.
