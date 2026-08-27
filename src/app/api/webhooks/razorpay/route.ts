import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver — the source of truth for Razorpay-provider
 * Subscription rows, same role as src/app/api/webhooks/stripe/route.ts plays
 * for Stripe ones. Verifies the raw body against the signature header using
 * RAZORPAY_WEBHOOK_SECRET (set on the Dashboard when the webhook is
 * created, Settings → Webhooks) before touching the payload.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return new Response("Webhook not configured", { status: 400 });
  }

  const body = await req.text();

  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  const signatureValid =
    expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!signatureValid) {
    console.error("Razorpay webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body) as {
    event: string;
    payload: { subscription?: { entity: Subscriptions.RazorpaySubscription } };
  };

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.updated":
    case "subscription.cancelled":
    case "subscription.halted":
    case "subscription.completed": {
      const subscription = event.payload.subscription?.entity;
      if (subscription) await upsertSubscription(subscription);
      break;
    }

    default:
      break;
  }

  return new Response("ok", { status: 200 });
}

async function upsertSubscription(subscription: Subscriptions.RazorpaySubscription) {
  const userId = subscription.notes?.userId as string | undefined;
  if (!userId) {
    console.error(`Razorpay subscription ${subscription.id} has no notes.userId — created outside createRazorpaySubscription?`);
    return;
  }

  const periodEndSeconds = subscription.current_end ?? subscription.charge_at ?? subscription.end_at;
  const currentPeriodEnd = new Date(periodEndSeconds * 1000);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      provider: "razorpay",
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: subscription.plan_id,
      status: subscription.status,
      currentPeriodEnd,
      // A cancel-at-cycle-end schedule doesn't flip `status` away from
      // "active" until the cycle actually ends — this only catches a
      // subscription that has already fully terminated, not one that's
      // scheduled to.
      cancelAtPeriodEnd: subscription.status === "cancelled",
    },
    update: {
      provider: "razorpay",
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: subscription.plan_id,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.status === "cancelled",
    },
  });
}
