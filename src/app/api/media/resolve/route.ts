import { NextRequest, NextResponse } from "next/server";
import { getPrimaryMedia, mediaUrl } from "../../../../lib/media/resolve";

/**
 * GET /api/media/resolve?entityType=Card&entityId=<id>&usage=OFFICIAL_ARTWORK
 *
 * Same-origin indirection so the rest of the app never needs to know (or
 * next.config.ts remotePatterns never needs to allowlist) the actual source
 * domain for an entity's image — swapping a hotlink for a verified upload
 * requires no frontend change, only a new higher-priority Media row.
 */
export async function GET(req: NextRequest) {
  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  const usage = req.nextUrl.searchParams.get("usage") || undefined;

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const media = await getPrimaryMedia(entityType, entityId, usage);
  if (!media) {
    return NextResponse.json({ error: "No media found for entity" }, { status: 404 });
  }

  return NextResponse.redirect(await mediaUrl(media), { status: 307 });
}
