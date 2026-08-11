/**
 * Free-tier limits — split out from entitlements.ts (which has a
 * "server-only" import) so this file stays importable from client
 * components too, e.g. paywall-messages.ts and the pricing/settings UI.
 */
export const FREE_SET_LIMIT = 4;
export const FREE_SCAN_LIMIT_PER_WEEK = 25;
