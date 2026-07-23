# 6. Notification & Activity Architecture

Date: 2026-07-23

## Status

**Proposed — first draft for review, not accepted.** Per the user's own instruction, kept intentionally small: in-app only, no email/push design work done here beyond naming them as future channels.

## Context

### What actually exists to build on — verified, not assumed

Three real, existing systems look like they might already solve this. None of them do, for specific, checked reasons:

- **`Insight`** (`type`, `category`, `severity`, `score`, `payload`, `status: NEW/VIEWED/DISMISSED/ACTED`, `viewedAt`/`dismissedAt`/`actedAt`) looks like a notification model — it has real unread/read semantics already. But its *temporal behavior* is wrong for this: `generateInsights(userId)` (`src/lib/intelligence/insights/generator.ts`) is called **synchronously on every page load** (`getIntelligenceFeed`, hit by `/` and `/statistics`), and it **deletes and recomputes** every `NEW` insight for its `sourceEngine` each time. It's a recommendation engine ("here's what's worth looking at right now, computed fresh"), not a durable log of discrete things that happened. A real notification ("someone reserved your listing at 3:42pm") must persist exactly once and survive until read — `Insight`'s recompute-and-wipe model would be actively wrong for that, not just unused.
- **`Event`** (`userId`, `instanceId`, `type`, `timestamp`, `metadata`) is the real append-only log every mutation in this app already writes to — Marketplace's own `LISTING_CREATED`/`LISTING_RESERVED`/etc. included. It's already rendered as a simple "Recent Activity" list on the homepage. But `Event.userId` is the **actor**, not necessarily who needs to be told. `reserveListing` creates an event with `userId: <buyer>` — correct for "what did I just do," wrong for "who should be notified," since the party who actually needs to know (the seller) has to be derived by joining through `Instance.userId`, not read directly off the event. `Event` has no read/unread state either. It's the right *source* for notifications, not a substitute for them.
- **`Wishlist.priceAlert`** (a user-set price threshold) exists and is displayed in the UI — but confirmed via search, **nothing anywhere evaluates it against real price changes**. It's inert metadata today, not a working alert. Wiring it up is real, new work, not a bug fix.
- **No realtime infrastructure exists** — confirmed via search: no Supabase Realtime channel subscriptions, no WebSocket code, anywhere in this codebase. "In-app notifications" in this ADR means computed on page load/navigation, not live-pushed to an open tab — the same pull-based pattern `Event`'s activity feed and `Insight`'s recommendation feed already use, not a new real-time transport.
- **No email or push library exists** (confirmed via `package.json`) — no Resend, SendGrid, nodemailer, web-push, Firebase, OneSignal. Consistent with the user's own reasoning: no deliverability/unsubscribe/infrastructure surface to take on for V1.

## Decision

### 0. Delivery channel — decided: in-app only for V1

Per the user's own recommendation: no email infrastructure to stand up, no deliverability/unsubscribe handling, works immediately on the existing web app, and the model below is designed so email/push are additive delivery channels later, not a redesign. Same "validate before building the expensive version" reasoning as Marketplace's off-platform-payment decision and Scanner's single-strategy V1.

### 1. Data model — a new `Notification`, not a repurposed `Insight` or `Event`

Neither existing model fits (Context, above): `Insight`'s recompute-and-wipe semantics would delete unread notifications on the next page load; `Event`'s `userId` is the actor, not the recipient, and it has no read state. A new model, minimal, purpose-built:

- `recipientUserId` — who this is for (not who caused it — the whole reason `Event` doesn't fit).
- `type` — `LISTING_RESERVED`, `LISTING_SOLD`, `LISTING_EXPIRED`, `INQUIRY_RECEIVED`, `INQUIRY_REPLIED`, `WISHLIST_MATCH`, `PRICE_ALERT_TRIGGERED` (V1 set, §3).
- `payload` — JSON, same "structured data, not a pre-rendered string" convention `Insight.payload` and `PriceObservation` already use.
- `linkUrl` — where clicking it should go (the listing, the wishlist card, etc.) — without this, a notification is just noise; every V1 notification type has one real, obvious destination, so this is required, not optional.
- `readAt` — nullable, set once. This is the one piece of "preferences" this ADR treats as non-optional (§4) — everything else about preferences is deliberately deferred.
- `createdAt`.

No `severity`/`score`/`category` fields — those exist on `Insight` for ranking *recommendations* against each other; a notification list is chronological (most recent first), not ranked, so they'd be dead weight here.

### 2. Who creates a Notification — inline at the point of the real event, not a separate listener/queue

Every V1 notification type already corresponds to a real mutation this app performs (a marketplace action, a price recompute, a wishlist check). The action that causes it also creates the `Notification` row, in the same transaction/request where reasonable — no event bus, no pub/sub, no new infrastructure. This mirrors exactly how `Event` rows are already created today (inline in the mutating Server Action), not a new pattern.

### 3. Event model — the six the user named, all wired to a real trigger point that already exists

| Notification type | Real trigger (already exists) |
|---|---|
| `LISTING_RESERVED` | `reserveListing` (`src/lib/actions/marketplace.ts`) — recipient is the listing's `sellerId` |
| `LISTING_SOLD` | Not the seller (they performed the action) — the buyer, if `reservedByUserId` is set, via `markListingSold` |
| `LISTING_EXPIRED` | `expireStaleListings` (`src/lib/marketplace/expire-listings.ts`, the new cron job) — recipient is `sellerId` |
| `INQUIRY_RECEIVED` | `createListingInquiry` — recipient is the listing's `sellerId` |
| `INQUIRY_REPLIED` | `replyToInquiry` — recipient is the inquiry's `buyerId` |
| `WISHLIST_MATCH` | `publishListing` — check `Wishlist` rows matching the listing's card/variant, notify each wishlister. Real new query, not existing today (`Wishlist.priceAlert` was confirmed unevaluated) |
| `PRICE_ALERT_TRIGGERED` | `recomputeCurrentPriceForVariant`/`recomputeCurrentPricesForVariants` (ADR 003) — compare the new price against every `Wishlist.priceAlert` for that variant, notify if crossed. The first real use of `priceAlert` since it was added |

"Price drops" from the user's list is `PRICE_ALERT_TRIGGERED` scoped to a user-set threshold, not every price movement on every card anyone owns — an unscoped version would be noise, not signal, and there's no existing "which price changes matter to which user" concept beyond the wishlist alert.

### 4. Preferences — decided: none in V1 beyond read/unread

Per-event toggles and digest-vs-immediate are real, reasonable features — and exactly the kind of configurability this project has repeatedly deferred until real usage shows it's needed (Scanner shipped with no settings; Marketplace shipped with no offer negotiation). Building a preferences UI for a notification type that's never been seen in production yet would be designing against a guess. **V1: every notification is immediate (created at the moment of the trigger), every notification is in-app only, and the only per-notification state is read/unread.** Preferences are a named, explicit fast-follow once there's real signal on which notification types people actually want less of.

### 5. Read/unread semantics

`readAt: DateTime?`. Unread = `readAt IS NULL`. Marked read on click-through (the `linkUrl` navigation) or an explicit "mark all read" action. An unread count (`WHERE recipientUserId = ? AND readAt IS NULL`) drives a bell-icon badge — computed per page load/navigation (§0's pull-based decision), not live-updated.

### 6. Retention

**Decided: no automatic deletion in V1.** A real cleanup job (purge old read notifications past N days) is a reasonable future addition, but building it now would be scheduling infrastructure ahead of any evidence the table needs pruning — the same "don't build ahead of validated need" reasoning as everything else deferred in this ADR. Named as a future item, not solved here.

## Schema gap analysis

| Concept | Exists today | Gap |
|---|---|---|
| Recipient-targeted, read/unread, persistent item | Nothing (`Insight` recomputes/wipes; `Event`'s `userId` is the actor) | New `Notification` model |
| Marketplace trigger points | All six real actions already exist (`src/lib/actions/marketplace.ts`, `expire-listings.ts`) | New: create a `Notification` at each one |
| Wishlist → listing match | `Wishlist` exists; matching logic doesn't | New: query at `publishListing` time |
| Price alert evaluation | `Wishlist.priceAlert` exists, confirmed unused | New: check at price-recompute time (ADR 003) |
| Unread count / bell UI | Nothing | New — pull-based, no realtime infra needed |
| Email/push delivery | Nothing (no library, by design) | Explicitly out of scope for V1 — named fast-follow |
| Per-event preferences, digesting | Nothing | Explicitly out of scope for V1 — needs real usage data first |
| Retention/cleanup | Nothing | Explicitly deferred — no evidence it's needed yet |

## Rollout plan

1. `Notification` model + migration.
2. Wire the six trigger points (table in §3) — each is a small addition to an already-existing, already-tested action, not new subsystems.
3. Unread count + a simple notification list UI (bell icon, dropdown or dedicated `/notifications` page).
4. Mark-as-read on click-through + "mark all read."
5. Everything in §4/§6 (preferences, retention) — explicitly out of scope, not bundled into this rollout.

## Security & authorization

- A `Notification` is only ever readable by its `recipientUserId` — same ownership-check pattern as every other per-user row in this app.
- Creating a `Notification` happens server-side, inline in the already-authenticated action that triggers it — no new authorization surface.

## V1 scope

**Included**: the six notification types in §3, in-app only, unread count + list, mark-as-read.

**Explicitly deferred**: email delivery, push delivery, per-event preferences, digest mode, retention/cleanup job, real-time (live-push) delivery to an open tab.

## Resolved decisions (pending review)

To be filled in once reviewed — left open deliberately rather than asserting a decision as final before the user has weighed in, per the same "draft first, accept after review" pattern as ADR 004 and 005.

## Consequences

**Positive**: every V1 notification type hooks into an action that's already built, tested, and live-verified (Marketplace) or already-proven (pricing recompute) — no new subsystem to design from scratch, just a recipient-aware row written at points that already exist. `Insight` and `Event` both stay exactly as they are; this doesn't touch either.

**Negative / accepted cost**: pull-based unread counts mean a notification won't visibly update in an already-open tab until the user navigates — a real, named limitation of skipping realtime infrastructure, not a hidden one. No preferences means every user gets every notification type for every relevant action, which could feel noisy at real volume — accepted for V1 on the same "don't build configurability before there's evidence it's needed" basis as everything else deferred here.
