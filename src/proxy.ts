import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // TEMP PROFILING (2026-08-06 /cards Phase-1.5 investigation) — remove after gathering data.
  const __t0 = performance.now();
  const response = await updateSession(request);
  if (request.nextUrl.pathname === "/cards") {
    console.log(`[PROFILE middleware /cards] ${(performance.now() - __t0).toFixed(1)}ms`);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"],
};
