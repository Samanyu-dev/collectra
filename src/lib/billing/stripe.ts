import "server-only";
import Stripe from "stripe";

/**
 * One StripeClient instance, reused across requests — never the deprecated
 * global `Stripe.setApiKey` pattern. STRIPE_SECRET_KEY comes from the Stripe
 * Vercel Marketplace integration (`vercel integration add stripe`), pulled
 * into env via `vercel env pull`.
 */
const globalForStripe = globalThis as unknown as { stripeClient?: Stripe };

export const stripe =
  globalForStripe.stripeClient ??
  new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-07-29.dahlia",
  });

if (process.env.NODE_ENV !== "production") globalForStripe.stripeClient = stripe;
