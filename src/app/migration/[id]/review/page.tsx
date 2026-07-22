import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { getImagesForEntities } from '@/lib/media/resolve';
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
        const image = images.find((i) => i.type === 'OFFICIAL_ARTWORK') || images.find((i) => i.type === 'THUMBNAIL');
        let name = variant?.card.name ?? 'Unknown card';
        if (variant?.printing?.name || variant?.parallel?.name) {
          name += ` (${[variant.printing?.name, variant.parallel?.name].filter(Boolean).join(' ')})`;
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
