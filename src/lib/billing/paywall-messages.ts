import { FREE_SET_LIMIT, FREE_SCAN_LIMIT_PER_WEEK } from "./limits";

/**
 * User-facing copy for the plain-Error codes entitlements.ts throws
 * ("PAYWALL_SET_LIMIT" / "PAYWALL_SCAN_LIMIT" as `.message`, see its doc
 * comments for why they aren't a custom Error subclass). No "server-only"
 * import here — this module is read from client components too.
 */
const PAYWALL_MESSAGES: Record<string, string> = {
  PAYWALL_SET_LIMIT: `Free accounts can track cards from up to ${FREE_SET_LIMIT} different sets. Upgrade to Pro for unlimited sets.`,
  PAYWALL_SCAN_LIMIT: `You've used all ${FREE_SCAN_LIMIT_PER_WEEK} free scans for this week. Upgrade to Pro for unlimited scanning.`,
};

/** Returns friendly upgrade copy if `error` is one of the paywall codes above, else null. */
export function paywallMessageFor(error: unknown): string | null {
  const message = error instanceof Error ? error.message : null;
  return message && message in PAYWALL_MESSAGES ? PAYWALL_MESSAGES[message] : null;
}
