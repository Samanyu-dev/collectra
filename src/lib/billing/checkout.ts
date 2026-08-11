"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUserForAction } from "@/lib/auth/session";
import { stripe } from "./stripe";

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

/** Redirects the browser to a Stripe-hosted Checkout Session for the Pro subscription. */
export async function createCheckoutSession(): Promise<{ url: string }> {
  const user = await requireUserForAction();
  const origin = await getOrigin();
  const customerId = await getOrCreateStripeCustomerId(user.id, user.email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    // No payment_method_types — let Stripe pick dynamically per Dashboard config.
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/pricing`,
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
