import { prisma as appPrisma } from "@/lib/prisma";
import type { PricingPrismaClient } from "./db";

export interface RateLimitWindow {
  windowSeconds: number;
  maxPerWindow: number;
}

// Real, documented limits (https://docs.pokemontcg.io/getting-started/rate-limits)
// for the tier this project actually runs on today — no POKEMON_TCG_API_KEY is
// configured (confirmed: grep found none in .env*), so every request is
// unauthenticated and bound by both the per-minute AND the per-day cap
// simultaneously, not just whichever one is more convenient to check.
export const POKEMON_TCG_API_WINDOWS: RateLimitWindow[] = [
  { windowSeconds: 60, maxPerWindow: 30 },
  { windowSeconds: 86400, maxPerWindow: 1000 },
];

async function getOrCreateWindow(sourceId: string, window: RateLimitWindow, client: PricingPrismaClient) {
  const existing = await client.sourceRateLimit.findUnique({
    where: { sourceId_windowSeconds: { sourceId, windowSeconds: window.windowSeconds } },
  });
  if (existing) return existing;
  try {
    return await client.sourceRateLimit.create({
      data: { sourceId, windowSeconds: window.windowSeconds, maxPerWindow: window.maxPerWindow, requestCount: 0, windowStartAt: new Date() },
    });
  } catch {
    // Lost a create race — the row exists now, read it.
    return client.sourceRateLimit.findUniqueOrThrow({
      where: { sourceId_windowSeconds: { sourceId, windowSeconds: window.windowSeconds } },
    });
  }
}

export class RateLimitExceededError extends Error {
  constructor(public sourceId: string, public retryAfterMs: number) {
    super(`Rate limit exceeded for ${sourceId}; retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "RateLimitExceededError";
  }
}

/**
 * Blocks (sleeps) until a request against `sourceId` is safe to make under
 * every configured window, then atomically records the request having been
 * made. Never lets a caller silently exceed a documented limit — this is the
 * real enforcement behind the SourceRateLimit table, which previously existed
 * as schema only.
 *
 * `maxWaitMs` bounds how long a single call will block before giving up and
 * throwing `RateLimitExceededError` instead — the background sync job passes
 * `Infinity` (nothing is waiting on it), but a user-facing "Refresh Now"
 * action should fail fast with a clear error rather than hang a request for
 * up to a full day if the daily window is exhausted.
 */
export async function throttleRequest(
  sourceId: string,
  windows: RateLimitWindow[] = POKEMON_TCG_API_WINDOWS,
  client: PricingPrismaClient = appPrisma,
  maxWaitMs: number = Infinity
): Promise<void> {
  for (const window of windows) {
    // Re-check in a loop: another window's wait, or another concurrent
    // caller, can push this window's count back over the limit by the time
    // we get here.
    for (;;) {
      const row = await getOrCreateWindow(sourceId, window, client);
      const now = Date.now();
      const windowStart = row.windowStartAt.getTime();
      const windowEnd = windowStart + window.windowSeconds * 1000;

      if (now >= windowEnd) {
        await client.sourceRateLimit.update({
          where: { id: row.id },
          data: { windowStartAt: new Date(now), requestCount: 1 },
        });
        break;
      }

      if (row.requestCount < row.maxPerWindow) {
        await client.sourceRateLimit.update({ where: { id: row.id }, data: { requestCount: { increment: 1 } } });
        break;
      }

      const waitMs = windowEnd - now + 250; // small buffer past the window boundary
      if (waitMs > maxWaitMs) {
        throw new RateLimitExceededError(sourceId, waitMs);
      }
      console.warn(
        `[rate-limit] ${sourceId} at ${row.requestCount}/${row.maxPerWindow} per ${window.windowSeconds}s — waiting ${(waitMs / 1000).toFixed(1)}s before the next request`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export interface RateLimitStatus {
  windowSeconds: number;
  maxPerWindow: number;
  requestCount: number;
  windowResetAt: Date;
}

/** Read-only current usage, for the admin page — never mutates state. */
export async function getRateLimitStatus(sourceId: string, client: PricingPrismaClient = appPrisma): Promise<RateLimitStatus[]> {
  const rows = await client.sourceRateLimit.findMany({ where: { sourceId } });
  return rows.map((r) => ({
    windowSeconds: r.windowSeconds,
    maxPerWindow: r.maxPerWindow,
    requestCount: r.requestCount,
    windowResetAt: new Date(r.windowStartAt.getTime() + r.windowSeconds * 1000),
  }));
}
