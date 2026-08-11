"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createCheckoutSession, createPortalSession } from "@/lib/billing/checkout";

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

export function UpgradeButton({ className }: { className?: string }) {
  const { run, isPending, error } = useRedirectAction(createCheckoutSession);
  return (
    <div className="space-y-2">
      <button onClick={run} disabled={isPending} className={className}>
        {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        {isPending ? "Redirecting…" : "Upgrade to Pro"}
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
