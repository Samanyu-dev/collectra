import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSubscriptionTier, type SubscriptionTier } from "@/lib/billing/entitlements";
import { FREE_SET_LIMIT, PLUS_SET_LIMIT, FREE_SCAN_LIMIT_PER_WEEK } from "@/lib/billing/limits";
import { UpgradeButton } from "@/components/billing/billing-actions";

export const dynamic = "force-dynamic";

const FREE_FEATURES = [
  `Track cards from up to ${FREE_SET_LIMIT} different sets`,
  `${FREE_SCAN_LIMIT_PER_WEEK} confirmed scans per week`,
  "Full catalog browsing & pricing",
  "Wishlist, vault, and public profile",
];

const PLUS_FEATURES = [
  `Track cards from up to ${PLUS_SET_LIMIT} different sets`,
  `${FREE_SCAN_LIMIT_PER_WEEK} confirmed scans per week`,
  "Everything in Free",
];

const PRO_FEATURES = [
  "Unlimited sets",
  "Unlimited scans",
  "Everything in Plus",
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const tier: SubscriptionTier = user ? await getSubscriptionTier(user) : "free";

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">Simple pricing</h1>
        <p className="text-foreground/50 max-w-md mx-auto">
          Start free. Upgrade whenever your collection outgrows the limits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-foreground/5 border border-foreground/10 rounded-3xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Free</h2>
            <p className="mt-2">
              <span className="text-3xl font-display font-bold text-foreground">$0</span>
              <span className="text-foreground/50 text-sm"> / forever</span>
            </p>
          </div>
          <ul className="space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/70">
                <Check size={16} className="text-foreground/40 shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
          {!user && (
            <Link
              href="/signup"
              className="block text-center px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors"
            >
              Sign up free
            </Link>
          )}
        </div>

        <div className="bg-foreground/5 border border-foreground/10 rounded-3xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Plus</h2>
            <p className="mt-2">
              <span className="text-3xl font-display font-bold text-foreground">$5</span>
              <span className="text-foreground/50 text-sm"> / month</span>
            </p>
          </div>
          <ul className="space-y-3">
            {PLUS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/70">
                <Check size={16} className="text-foreground/40 shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>

          {tier === "plus" ? (
            <Link
              href="/settings"
              className="block text-center px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors"
            >
              You&apos;re on Plus — manage billing
            </Link>
          ) : tier === "pro" ? (
            <Link
              href="/settings"
              className="block text-center px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors opacity-60"
            >
              Included in your Pro plan
            </Link>
          ) : user ? (
            <UpgradeButton
              tier="plus"
              label="Upgrade to Plus"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-bold transition-colors disabled:opacity-50"
            />
          ) : (
            <Link
              href="/signup"
              className="block text-center px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-bold transition-colors"
            >
              Sign up to upgrade
            </Link>
          )}
        </div>

        <div className="relative bg-primary/5 border border-primary/30 rounded-3xl p-8 space-y-6">
          <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
            <Sparkles size={12} /> Pro
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Pro</h2>
            <p className="mt-2">
              <span className="text-3xl font-display font-bold text-foreground">$20</span>
              <span className="text-foreground/50 text-sm"> / month</span>
            </p>
          </div>
          <ul className="space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/70">
                <Check size={16} className="text-primary shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>

          {tier === "pro" ? (
            <Link
              href="/settings"
              className="block text-center px-5 py-2.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-sm font-medium transition-colors"
            >
              You&apos;re on Pro — manage billing
            </Link>
          ) : user ? (
            <UpgradeButton
              tier="pro"
              label="Upgrade to Pro"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            />
          ) : (
            <Link
              href="/signup"
              className="block text-center px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Sign up to upgrade
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
