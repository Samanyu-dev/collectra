import { FREE_SCAN_LIMIT_PER_WEEK } from "./limits";

/**
 * User-facing copy for the plain-Error codes entitlements.ts throws
 * ("PAYWALL_SET_LIMIT" / "PAYWALL_SCAN_LIMIT" as `.message`, see its doc
 * comments for why they aren't a custom Error subclass). No "server-only"
 * import here — this module is read from client components too.
 *
 * PAYWALL_SET_LIMIT fires at both the Free (4 sets) and Plus (20 sets)
 * ceiling — deliberately one shared code/message rather than a
 * tier-specific one, since that code is part of the API contract the iOS
 * app already decodes (see entitlements.ts's assertCanAddToSet doc
 * comment). The copy stays generic enough to be true either way; the
 * actual numbers are shown by the UI's own progress bar, not this message.
 */
const PAYWALL_MESSAGES: Record<string, string> = {
  PAYWALL_SET_LIMIT: "You've hit your plan's set limit. Upgrade to Plus for 20 sets, or Pro for unlimited.",
  PAYWALL_SCAN_LIMIT: `You've used all ${FREE_SCAN_LIMIT_PER_WEEK} free scans for this week. Upgrade to Pro for unlimited scanning.`,
};

/** Returns friendly upgrade copy if `error` is one of the paywall codes above, else null. */
export function paywallMessageFor(error: unknown): string | null {
  const message = error instanceof Error ? error.message : null;
  return message && message in PAYWALL_MESSAGES ? PAYWALL_MESSAGES[message] : null;
}
