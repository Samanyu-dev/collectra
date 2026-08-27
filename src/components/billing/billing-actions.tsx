"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createCheckoutSession, createPortalSession, createRazorpaySubscription, cancelRazorpaySubscription } from "@/lib/billing/checkout";

// Loaded lazily by RazorpayUpgradeButton — Razorpay's Checkout is a
// client-side modal (unlike Stripe's hosted-redirect Checkout Session), so
// there's no server-issued `url` to send the browser to here.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Razorpay checkout. Check your connection and try again."));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

function useRedirectAction(action: () => Promise<{ url: string }>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const { url } = await action();
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  }

  return { run, isPending, error };
}

export function UpgradeButton({ tier, label, className }: { tier: "plus" | "pro"; label: string; className?: string }) {
  const { run, isPending, error } = useRedirectAction(() => createCheckoutSession(tier));
  return (
    <div className="space-y-2">
      <button onClick={run} disabled={isPending} className={className}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        {isPending ? "Redirecting…" : label}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ManageBillingButton({ className }: { className?: string }) {
  const { run, isPending, error } = useRedirectAction(createPortalSession);
  return (
    <div className="space-y-2">
      <button onClick={run} disabled={isPending} className={className}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        {isPending ? "Redirecting…" : "Manage billing"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Opens Razorpay's client-side Checkout modal for the given tier — the
 * Razorpay analog of `UpgradeButton` above. Payment success only closes the
 * modal and redirects; it does NOT confirm the subscription is active
 * server-side (the webhook is the source of truth, same as Stripe's), so
 * `/settings` may briefly still show "free" right after a successful
 * payment until the webhook lands.
 */
export function RazorpayUpgradeButton({ tier, label, className }: { tier: "plus" | "pro"; label: string; className?: string }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setIsPending(true);
    try {
      const [{ subscriptionId, keyId }] = await Promise.all([createRazorpaySubscription(tier), loadRazorpayScript()]);
      const razorpay = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: "Collectra",
        description: `Collectra ${tier === "pro" ? "Pro" : "Plus"} — monthly`,
        handler: () => {
          window.location.href = "/settings?upgraded=1";
        },
        modal: { ondismiss: () => setIsPending(false) },
      });
      razorpay.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={run} disabled={isPending} className={className}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        {isPending ? "Opening Razorpay…" : label}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Razorpay has no hosted self-service portal like Stripe's — this schedules
 * cancellation at the end of the current billing cycle directly (see
 * cancelRazorpaySubscription's doc comment) instead of redirecting anywhere.
 */
export function CancelRazorpaySubscriptionButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelRazorpaySubscription();
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  }

  if (done) {
    return <p className="text-xs text-foreground/50">Cancellation scheduled — you&apos;ll keep access until the current period ends.</p>;
  }

  return (
    <div className="space-y-2">
      <button onClick={run} disabled={isPending} className={className}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        {isPending ? "Cancelling…" : "Cancel subscription"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
