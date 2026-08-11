import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver — the source of truth for Subscription state.
 * Verifies the signature against STRIPE_WEBHOOK_SECRET before touching the
 * payload (per Stripe security guidance: never trust an unverified webhook
 * body). Register this endpoint's URL in the Stripe Dashboard (or via
 * `stripe listen --forward-to .../api/webhooks/stripe` for local dev) to get
 * that secret.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new Response("Webhook not configured", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    console.error("Stripe webhook signature verification failed:", e instanceof Error ? e.message : e);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.customer && session.subscription) {
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: String(session.customer) } });
        if (user) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          await upsertSubscription(user.id, subscription);
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findUnique({ where: { stripeCustomerId: String(subscription.customer) } });
      if (user) {
        await upsertSubscription(user.id, subscription);
      }
      break;
    }

    // invoice.payment_failed needs no separate handling — Stripe already
    // moves the subscription to "past_due"/"unpaid", which arrives via the
    // customer.subscription.updated event above and is reflected as-is.
    default:
      break;
  }

  return new Response("ok", { status: 200 });
}

async function upsertSubscription(userId: string, subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const currentPeriodEnd = new Date((item?.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id ?? "",
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id ?? "",
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}
