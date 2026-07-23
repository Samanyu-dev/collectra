import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { processMediaRow } from "@/ingestion/engine/process-media";

export const maxDuration = 300; // Fluid Compute default cap.

const TIME_BUDGET_MS = 240_000; // leaves buffer under the 300s cap, same convention as price-sync
const BATCH_SIZE = 20;

/**
 * Vercel Cron entry point for the media processing backlog (football
 * database foundation, Phase 3): downloads, analyzes, dedupes, and re-hosts
 * `Media` rows still sitting as unprocessed external hotlinks. Same
 * CRON_SECRET-bearer-token pattern as /api/cron/price-sync.
 *
 * No cursor needed — "perceptualHash IS NULL" is itself the resume marker.
 * A row that fails gets marked FAILED (excluded by the `status: "READY"`
 * filter below) so a permanently dead link can't be retried in a tight loop
 * and burn the whole time budget.
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

  const start = Date.now();
  let processed = 0;
  let duplicates = 0;
  let failed = 0;

  try {
    while (Date.now() - start < TIME_BUDGET_MS) {
      const batch = await prisma.media.findMany({
        where: { provider: "external", perceptualHash: null, status: "READY" },
        take: BATCH_SIZE,
        orderBy: { id: "asc" },
      });
      if (batch.length === 0) break;

      for (const media of batch) {
        if (Date.now() - start >= TIME_BUDGET_MS) break;
        const result = await processMediaRow(media.id);
        if (result.status === "processed") processed++;
        else if (result.status === "duplicate") duplicates++;
        else failed++;
      }
    }

    return NextResponse.json({ ok: true, processed, duplicates, failed });
  } catch (e: unknown) {
    console.error("[cron:media-process] failed", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
