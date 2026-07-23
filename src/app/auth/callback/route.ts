import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Real, missing piece of the auth flow (found auditing why confirmation
 * emails pointed at localhost in production): Supabase's own
 * /auth/v1/verify endpoint validates the emailed token, then redirects the
 * browser here with a fresh `?code=` to exchange for a session — this
 * exchange has to happen server-side, in a Route Handler that can set the
 * resulting session cookies on the response. Landing on any other existing
 * page wouldn't do this: no page in this app calls the browser Supabase
 * client on mount (only inside each auth form's submit handler), so
 * `detectSessionInUrl` never gets a chance to fire just from landing there.
 *
 * Used by every email-based auth flow that needs a real session established
 * before continuing (signup confirmation now; recovery/magic-link could
 * point `redirectTo` here too via `?next=`, though today only signup does).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.redirect(`${origin}${next}`);
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  return response;
}
