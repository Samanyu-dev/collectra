import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "../../../../lib/media/resolve";


/** GET /api/media/<mediaId> — redirects to the resolved URL for a specific, already-known Media row. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  return NextResponse.redirect(mediaUrl(media), { status: 307 });
}
