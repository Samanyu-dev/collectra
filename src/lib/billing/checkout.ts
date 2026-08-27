"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";
import { stripe } from "./stripe";
import { razorpay } from "./razorpay";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function getOrCreateStripeCustomerId(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({ email, metadata: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

const TIER_PRICE_ENV: Record<"plus" | "pro", string> = {
  plus: "STRIPE_PLUS_PRICE_ID",
  pro: "STRIPE_PRO_PRICE_ID",
};

/** Random 8-letter suffix for `integration_identifier` — lets the Dashboard tell this checkout flow apart from any other, per Stripe's own labeling convention. */
function randomLetterSuffix(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

/** Redirects the browser to a Stripe-hosted Checkout Session for the given subscription tier. */
export async function createCheckoutSession(tier: "plus" | "pro"): Promise<{ url: string }> {
  const user = await requireUserForAction();
  const origin = await getOrigin();
  const customerId = await getOrCreateStripeCustomerId(user.id, user.email);
  const priceId = process.env[TIER_PRICE_ENV[tier]]!;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    // No payment_method_types — let Stripe pick dynamically per Dashboard config.
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    integration_identifier: `collectra_checkout_${randomLetterSuffix()}`,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  return { url: session.url };
}

/** Redirects the browser to the Stripe Customer Portal for self-service upgrade/cancel/payment-method changes. */
export async function createPortalSession(): Promise<{ url: string }> {
  const user = await requireUserForAction();
  const origin = await getOrigin();

  if (!user.stripeCustomerId) {
    throw new Error("No billing account yet — start a subscription first.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/settings`,
  });

  return { url: session.url };
}

const TIER_PLAN_ENV: Record<"plus" | "pro", string> = {
  plus: "RAZORPAY_PLUS_PLAN_ID",
  pro: "RAZORPAY_PRO_PLAN_ID",
};

/**
 * Creates a Razorpay Subscription in "created" state and hands back its id —
 * unlike Stripe's hosted Checkout, Razorpay collects payment in a client-side
 * modal (Checkout.js), so there's no `url` to redirect to here. The caller
 * (RazorpayUpgradeButton) opens that modal with this subscription id.
 * `RAZORPAY_KEY_ID` is safe to return — it's the publishable half of the
 * pair, the same key already exposed as NEXT_PUBLIC_RAZORPAY_KEY_ID.
 *
 * The webhook (src/app/api/webhooks/razorpay/route.ts) is the source of
 * truth for actually activating the subscription server-side, same as
 * Stripe's checkout.session.completed above — this call never writes to the
 * Subscription table itself.
 */
export async function createRazorpaySubscription(tier: "plus" | "pro"): Promise<{ subscriptionId: string; keyId: string }> {
  const user = await requireUserForAction();
  const planId = process.env[TIER_PLAN_ENV[tier]]!;

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    // Razorpay requires a fixed cycle count rather than "until cancelled" —
    // 120 monthly cycles (10 years) is the standard workaround; the customer
    // can still cancel any time via cancelRazorpaySubscription below.
    total_count: 120,
    notes: { userId: user.id, tier },
  });

  return { subscriptionId: subscription.id, keyId: process.env.RAZORPAY_KEY_ID! };
}

/**
 * Schedules the caller's Razorpay subscription to cancel at the end of the
 * current billing cycle — the closest equivalent to Stripe's portal-driven
 * cancel-at-period-end, since Razorpay has no hosted self-service portal.
 * Only tells Razorpay to schedule the cancellation; the Subscription row's
 * own `status`/`cancelAtPeriodEnd` still update from the webhook, not here.
 */
export async function cancelRazorpaySubscription(): Promise<void> {
  const user = await requireUserForAction();
  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!subscription || subscription.provider !== "razorpay" || !subscription.razorpaySubscriptionId) {
    throw new Error("No Razorpay subscription to cancel.");
  }

  await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, true);
}
