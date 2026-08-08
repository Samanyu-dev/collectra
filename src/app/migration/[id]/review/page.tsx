import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { getImagesForEntities } from '@/lib/media/resolve';
import { pickPrimaryImage } from '@/lib/media/pick-primary-image';
import { MigrationReviewClient } from './migration-review-client';

export const dynamic = 'force-dynamic';

export default async function MigrationReview(props: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await props.params;
  const user = await requireUser();

  const session = await prisma.migrationSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) notFound();

  const [reviewRowsRemaining, matchedCount] = await Promise.all([
    prisma.migrationRow.count({ where: { sessionId, status: 'STAGED_REVIEW' } }),
    prisma.migrationRow.count({ where: { sessionId, status: { in: ['STAGED_MATCH', 'COMMITTED'] } } }),
  ]);

  const nextRow = await prisma.migrationRow.findFirst({
    where: { sessionId, status: 'STAGED_REVIEW' },
    orderBy: { id: 'asc' },
  });

  let currentRow = null;
  if (nextRow) {
    const candidates: { variantId: string; confidence: number }[] = nextRow.matchCandidates
      ? JSON.parse(nextRow.matchCandidates)
      : [];

    const variants = candidates.length > 0
      ? await prisma.variant.findMany({
          where: { id: { in: candidates.map((c) => c.variantId) } },
          include: { card: true, printing: true, parallel: true },
        })
      : [];

    const cardImages = await getImagesForEntities('Card', variants.map((v) => v.cardId));

    currentRow = {
      id: nextRow.id,
      originalData: JSON.parse(nextRow.originalData) as Record<string, string>,
      confidenceScore: nextRow.confidenceScore ?? 0,
      reasons: nextRow.confidenceReasons ? (JSON.parse(nextRow.confidenceReasons) as string[]) : [],
      candidates: candidates.map((c) => {
        const variant = variants.find((v) => v.id === c.variantId);
        const images = variant ? cardImages.get(variant.cardId) ?? [] : [];
        const image = pickPrimaryImage(images);
        let name = variant?.card.name ?? 'Unknown card';
        // "Base" is the near-universal default Printing and conveys nothing
        // next to an actual parallel name (e.g. "(Base Glitter Holiday)"
        // reads backwards) — only show it when there's no parallel to pair
        // it with, i.e. it's the only descriptor available.
        const printingLabel = variant?.printing?.name && variant.printing.name.toLowerCase() !== 'base' ? variant.printing.name : null;
        const descriptor = variant?.parallel?.name ? [printingLabel, variant.parallel.name].filter(Boolean).join(' ') : (printingLabel ?? variant?.printing?.name);
        if (descriptor) {
          name += ` (${descriptor})`;
        }
        return { variantId: c.variantId, confidence: c.confidence, name, imageUrl: image?.url ?? null };
      }),
    };
  }

  return (
    <MigrationReviewClient
      sessionId={session.id}
      sessionStatus={session.status}
      fileLabel={session.sourceAdapter}
      matchedCount={matchedCount}
      reviewRemaining={reviewRowsRemaining}
      isDone={!nextRow}
      currentRow={currentRow}
    />
  );
}
