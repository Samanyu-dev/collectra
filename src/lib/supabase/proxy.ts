import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/" used to be exact-matched here too (the dashboard is personal data), but
// it's now a dual-purpose route — src/app/page.tsx itself branches on
// getCurrentUser() and renders the public marketing homepage for signed-out
// visitors, the dashboard for signed-in ones. Gating it here would redirect
// signed-out visitors to /login before that branch ever runs.
const PROTECTED_PREFIXES = ["/settings", "/shelf", "/vault", "/wishlist", "/projects", "/statistics", "/migration", "/admin", "/scan", "/marketplace/new", "/marketplace/selling"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

/**
 * Refreshes the Supabase session cookie on every request (access tokens expire
 * ~hourly; without this, users get silently logged out mid-session) and gates
 * protected routes. This is UX only — every Server Action re-checks
 * authorization independently, since a matcher change here could silently stop
 * covering a route.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getClaims() verifies the JWT locally against the project's signing key —
  // cheap, and the currently-recommended way to check auth state in
  // proxy/server code (do not use getSession() here; it trusts an unverified cookie).
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = !!data?.claims;

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
