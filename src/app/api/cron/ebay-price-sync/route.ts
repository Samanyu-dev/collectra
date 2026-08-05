import { NextResponse, type NextRequest } from "next/server";
import { sweepEbayCatalog } from "@/ingestion/ebay/sweep-catalog";

export const maxDuration = 300; // Fluid Compute default cap.

/**
 * Vercel Cron entry point for the eBay Browse API price+image sweep (Tier 1,
 * docs/adr/003-price-engine-architecture.md). Mirrors
 * /api/cron/price-sync/route.ts's shape exactly — same CRON_SECRET gate,
 * same maxDuration.
 *
 * IMPORTANT — read src/ingestion/ebay/sweep-catalog.ts's file header before
 * assuming this alone will lap the 32,107-card catalog in ~6-7 days: at real
 * observed per-card latency, one 300s-capped invocation gets through roughly
 * 100-150 cards, not eBay's ~4,800/day quota — the serverless duration cap is
 * the binding constraint here, not the API's own rate limit. A daily cron
 * alone will take months to complete a full lap. Reaching a faster initial
 * sweep requires running sweep-catalog.ts's CLI entry point (--unbounded) as
 * a long-lived process outside this route's constraints.
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
    const result = await sweepEbayCatalog();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("[cron:ebay-price-sync] failed", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
