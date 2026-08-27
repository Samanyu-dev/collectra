import "server-only";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { FREE_SET_LIMIT, PLUS_SET_LIMIT, FREE_SCAN_LIMIT_PER_WEEK } from "./limits";

export { FREE_SET_LIMIT, PLUS_SET_LIMIT, FREE_SCAN_LIMIT_PER_WEEK };

const ABUSE_LOOKBACK_DAYS = 30;
const ABUSE_BAN_THRESHOLD = 3;

export type SubscriptionTier = "free" | "plus" | "pro";

/**
 * Three-tier resolution keyed off whichever provider's plan/price id the
 * subscription is actually on vs. that provider's `*_PRO_*`/`*_PLUS_*` env
 * ids — the Stripe webhook (src/app/api/webhooks/stripe/route.ts) and the
 * Razorpay webhook (src/app/api/webhooks/razorpay/route.ts) both store
 * whatever plan the subscription is actually on, id-agnostically, so no
 * schema change is needed to add a tier. An unrecognized (e.g.
 * stale/archived) id fails closed to "free" rather than open to "pro".
 * "active"/"trialing" cover Stripe's statuses; Razorpay's equivalent for
 * "currently paying" is just "active" (it has no separate trial status here
 * since no plan is configured with a free trial period).
 */
export async function getSubscriptionTier(user: User): Promise<SubscriptionTier> {
  if (user.role === "ADMIN") return "pro";
  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!subscription) return "free";
  const active = (subscription.status === "active" || subscription.status === "trialing") && subscription.currentPeriodEnd > new Date();
  if (!active) return "free";

  if (subscription.provider === "razorpay") {
    if (subscription.razorpayPlanId === process.env.RAZORPAY_PRO_PLAN_ID) return "pro";
    if (subscription.razorpayPlanId === process.env.RAZORPAY_PLUS_PLAN_ID) return "plus";
    return "free";
  }

  if (subscription.stripePriceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (subscription.stripePriceId === process.env.STRIPE_PLUS_PRICE_ID) return "plus";
  return "free";
}

/**
 * Still used everywhere that only cares about the top tier (scan limits —
 * out of scope for the Plus tier, which keeps the same weekly scan quota as
 * Free; only Pro is unlimited scans). Kept as its own function rather than
 * inlining `getSubscriptionTier(user) === "pro"` at every call site.
 */
export async function isPro(user: User): Promise<boolean> {
  return (await getSubscriptionTier(user)) === "pro";
}

/** `Infinity` for Pro — callers should compare with `>=`, never assume a finite number. */
export function getSetLimitForTier(tier: SubscriptionTier): number {
  if (tier === "pro") return Infinity;
  if (tier === "plus") return PLUS_SET_LIMIT;
  return FREE_SET_LIMIT;
}

/** Exported for commitMigration's batched variant — see its doc comment for why. */
export async function getOwnedSetIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.instance.findMany({
    where: { userId },
    select: { variant: { select: { card: { select: { setId: true } } } } },
  });
  return new Set(rows.map((r) => r.variant.card.setId));
}

/**
 * Throws a plain Error with message "PAYWALL_SET_LIMIT" if a user is about
 * to own a card from a set beyond their tier's ceiling (4 for Free, 20 for
 * Plus, unlimited for Pro). Already owning something in `setId` is always
 * allowed, at any count. Kept as the same error string across both the
 * Free and Plus ceilings — that exact string is part of the API contract
 * the iOS app already decodes (APIError.swift), so this stays a single
 * code rather than growing a second, tier-specific one. A plain Error
 * rather than a custom subclass — Server Action error identity doesn't
 * survive the client boundary in this app (see OcrNotConfiguredError's doc
 * comment in scanner.ts), but `.message` does, so callers match on the
 * string prefix.
 */
export async function assertCanAddToSet(userId: string, setId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const limit = getSetLimitForTier(await getSubscriptionTier(user));
  if (limit === Infinity) return;

  const ownedSetIds = await getOwnedSetIds(userId);
  if (ownedSetIds.has(setId)) return;
  if (ownedSetIds.size >= limit) {
    throw new Error("PAYWALL_SET_LIMIT");
  }
}

/** Throws "PAYWALL_SCAN_LIMIT" if a free-tier user has already confirmed 25 scans in the trailing 7 days. */
export async function assertCanScan(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (await isPro(user)) return;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const confirmedThisWeek = await prisma.scanAttempt.count({
    where: { userId, status: "CONFIRMED", createdAt: { gte: sevenDaysAgo } },
  });
  if (confirmedThisWeek >= FREE_SCAN_LIMIT_PER_WEEK) {
    throw new Error("PAYWALL_SCAN_LIMIT");
  }
}

/**
 * Read-only counterpart to assertCanScan — added for Phase 6C's pre-flight
 * mobile gate ("don't open the camera at all if the quota's already spent").
 * Note the scan pipeline itself only ever charges quota at CONFIRMED (see
 * assertCanScan's callers and resolveScanAttempt in scanner.ts) — identifying
 * a card is always free. This lets a client show the paywall before burning
 * a camera session on a scan it can never confirm, without duplicating the
 * threshold logic itself (still lives only in assertCanScan).
 */
export async function getScanQuotaStatus(userId: string): Promise<{
  isPro: boolean;
  canScan: boolean;
  scansUsedThisWeek: number;
  scanLimitPerWeek: number;
}> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const pro = await isPro(user);
  if (pro) {
    return { isPro: true, canScan: true, scansUsedThisWeek: 0, scanLimitPerWeek: FREE_SCAN_LIMIT_PER_WEEK };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const scansUsedThisWeek = await prisma.scanAttempt.count({
    where: { userId, status: "CONFIRMED", createdAt: { gte: sevenDaysAgo } },
  });
  return {
    isPro: false,
    canScan: scansUsedThisWeek < FREE_SCAN_LIMIT_PER_WEEK,
    scansUsedThisWeek,
    scanLimitPerWeek: FREE_SCAN_LIMIT_PER_WEEK,
  };
}

/**
 * Detects the specific abuse pattern this app is guarding against: a user
 * rejects a scan match (to dodge the quota) and then adds that exact same
 * card to their collection through any other path — proving the match they
 * called "wrong" was actually correct. Call this AFTER an Instance is
 * successfully created, from every creation path (manual add, scan confirm,
 * migration import).
 *
 * Not a gate — never throws. 3 confirmed strikes bans the account (enforced
 * everywhere via requireUserForAction()/requireUser() checking bannedAt).
 * Each REJECTED ScanAttempt can only trigger one warning (resolvedAt marks it
 * consumed), so repeatedly adding/removing the same card doesn't rack up
 * warnings off a single reject.
 */
export async function checkRejectedScanAbuse(userId: string, variantId: string): Promise<void> {
  const lookback = new Date(Date.now() - ABUSE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const rejected = await prisma.scanAttempt.findFirst({
    where: { userId, status: "REJECTED", matchedVariantId: variantId, createdAt: { gte: lookback }, resolvedAt: null },
  });
  if (!rejected) return;

  await prisma.scanAttempt.update({ where: { id: rejected.id }, data: { resolvedAt: new Date() } });

  const { scanAbuseWarnings } = await prisma.user.update({
    where: { id: userId },
    data: { scanAbuseWarnings: { increment: 1 } },
    select: { scanAbuseWarnings: true },
  });

  if (scanAbuseWarnings >= ABUSE_BAN_THRESHOLD) {
    await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date() } });
  }
}
