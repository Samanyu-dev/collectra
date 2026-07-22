import { NextResponse, type NextRequest } from "next/server";
import { syncPokemonPrices } from "@/ingestion/pokemon/sync-prices";

export const maxDuration = 300; // Fluid Compute default cap — a full-catalog sync may need more; see docs/adr/003 rollout notes.

/**
 * Vercel Cron entry point for the Tier 0 price sweep (ADR §9/§14). Vercel
 * signs cron-triggered requests with `Authorization: Bearer $CRON_SECRET`
 * when CRON_SECRET is set on the project — required so this route can't be
 * hit publicly to trigger an expensive sync or exhaust the Pokémon TCG API's
 * rate limit. CRON_SECRET must be set in the Vercel project's environment
 * variables (see docs/adr/003-price-engine-architecture.md §9 for the full
 * deployment checklist) — this route 401s until it is.
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
    const result = await syncPokemonPrices();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("[cron:price-sync] failed", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
