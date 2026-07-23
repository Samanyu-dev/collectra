import { NextResponse, type NextRequest } from "next/server";
import { expireStaleListings } from "@/lib/marketplace/expire-listings";

export const maxDuration = 60;

/**
 * Vercel Cron entry point for listing expiry (ADR 005 §4). Same
 * CRON_SECRET-bearer-token pattern as /api/cron/price-sync — this route
 * 401s until CRON_SECRET is set on the Vercel project.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on this deployment" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireStaleListings();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("[cron:marketplace-expire] failed", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
