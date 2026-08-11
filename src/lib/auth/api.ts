import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { migrateLegacyDataIfNeeded } from "./session";
import { ApiRequestError, ApiErrorCodes } from "@/lib/api/response";
import type { User } from "@prisma/client";

/**
 * Stateless anon-key client used ONLY to validate a caller-supplied access
 * token via `auth.getUser(token)` — never reads/writes cookies or any
 * implicit session, so it's safe to share across requests/instances (unlike
 * `src/lib/supabase/server.ts`'s createClient(), which is cookie-bound and
 * per-request). This is intentionally the anon key, never the service-role
 * key: token validation only needs to ask "is this JWT valid," which the
 * anon key is sufficient and safe for.
 */
const supabaseAuthClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `auth.getUser(token)` is a live network call to Supabase's Auth API with
 * no retry of its own — confirmed live (twice) during Phase 2 verification:
 * a valid token got rejected, then succeeded immediately on retry with the
 * identical token. This project's Supabase instance already has documented
 * intermittent connectivity (see src/lib/prisma.ts's own retry wrapper for
 * the same class of issue on the DB side). Since this call gates every
 * authenticated /api/v1 request, a transient blip would otherwise look like
 * a spurious 401 to the client.
 *
 * Retries on BOTH a thrown/network-level failure AND a soft `{error}`
 * response — the Supabase JS SDK doesn't always throw for a transient
 * upstream failure, it can surface it as a normal-looking error result
 * instead (confirmed live: the second observed flake had no exception, just
 * `error` set). The cost of retrying a *genuinely* invalid/expired token a
 * couple of extra times is a few hundred ms of latency before the correct
 * 401 — never a security issue, since it still always ends up rejected.
 */
async function getUserWithRetry(token: string) {
  const maxAttempts = 3;
  // Tracks which failure mode we're carrying, since Supabase's AuthError
  // (returned in `result.error`) is itself an Error subclass — `instanceof
  // Error` can't distinguish "a soft {error} response" from "a genuinely
  // thrown exception" (confirmed live: using that check to decide whether to
  // re-throw wrongly re-threw a normal AuthError as an uncaught exception,
  // turning an expected 401 into a 500 — see this function's other doc comment).
  let lastResult: Awaited<ReturnType<typeof supabaseAuthClient.auth.getUser>> | null = null;
  let lastThrown: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await supabaseAuthClient.auth.getUser(token);
      if (!result.error) return result;
      lastResult = result;
      lastThrown = null;
      console.warn(`[auth-retry] getUser attempt ${attempt}/${maxAttempts} returned an error: ${result.error.message}`);
    } catch (e) {
      lastThrown = e;
      lastResult = null;
      console.warn(`[auth-retry] getUser attempt ${attempt}/${maxAttempts} threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (attempt < maxAttempts) await sleep(300 * attempt);
  }

  if (lastResult) return lastResult; // exhausted retries on a soft {error} response — let callers handle it via `error`, same shape as always
  throw lastThrown; // exhausted retries on a genuinely thrown exception — this IS exceptional, let withApiErrorHandling's 500 path catch it
}

/**
 * Resolves the Collectra `User` row for the caller's Supabase access token —
 * the Bearer-token analog of `getCurrentUser()` (src/lib/auth/session.ts),
 * same upsert-on-missing-row + legacy-migration semantics, just token-sourced
 * instead of cookie-sourced (a native client has no cookie jar to read).
 *
 * Never trusts anything the client claims about identity beyond this token:
 * the Collectra User.id used for every downstream query is always
 * Supabase's own validated `authUser.id`, never a client-supplied field.
 *
 * Returns null for "no/invalid token" rather than throwing — callers that
 * allow anonymous access (e.g. public catalog reads) use this directly;
 * `requireApiUser` below is the throwing variant for routes that require auth.
 */
export async function getApiUser(req: Request): Promise<User | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const { data, error } = await getUserWithRetry(token);
  const authUser = data.user;
  if (error || !authUser || !authUser.email) return null;

  await migrateLegacyDataIfNeeded(authUser.id, authUser.email);

  return prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: { id: authUser.id, email: authUser.email },
  });
}

/**
 * For routes that require authentication: throws a typed 401 ApiRequestError
 * (caught by `withApiErrorHandling`) distinguishing "no/malformed header" from
 * "a token was supplied but Supabase rejected it" — never leaks *why* beyond
 * that. Also throws 403 FORBIDDEN if the account is banned (see
 * requireUserForAction's doc comment in session.ts for what that means —
 * same rule, API side).
 */
export async function requireApiUser(req: Request): Promise<User> {
  const token = extractBearerToken(req);
  if (!token) {
    throw new ApiRequestError(401, ApiErrorCodes.UNAUTHENTICATED, "Missing or malformed Authorization header. Expected: Bearer <token>.");
  }

  const { data, error } = await getUserWithRetry(token);
  const authUser = data.user;
  if (error || !authUser || !authUser.email) {
    throw new ApiRequestError(401, ApiErrorCodes.INVALID_TOKEN, "Invalid or expired access token.");
  }

  await migrateLegacyDataIfNeeded(authUser.id, authUser.email);

  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: { id: authUser.id, email: authUser.email },
  });

  if (user.bannedAt) {
    throw new ApiRequestError(403, ApiErrorCodes.FORBIDDEN, "This account has been suspended.");
  }

  return user;
}
