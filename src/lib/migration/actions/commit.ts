'use server';

import { prisma } from '@/lib/prisma';
import { requireUserForAction } from '@/lib/auth/session';

export async function commitMigration(sessionId: string) {
  const user = await requireUserForAction();

  const session = await prisma.migrationSession.findUnique({
    where: { id: sessionId },
    include: { rows: true }
  });

  if (!session || session.userId !== user.id) {
    throw new Error('Unauthorized or Session not found');
  }

  const userId = user.id;

  if (session.status !== 'STAGED') {
    throw new Error('Session is not ready to commit');
  }

  // Update status to prevent double-commit
  await prisma.migrationSession.update({
    where: { id: sessionId },
    data: { status: 'COMMITTING' }
  });

  let importedCount = 0;

  // Process rows
  for (const row of session.rows) {
    if (row.status === 'STAGED_MATCH' || row.status === 'COMMITTED') {
      if (!row.resolvedVariantId) continue;
      
      // 1. Create the Instance
      const instance = await prisma.instance.create({
        data: {
          userId,
          variantId: row.resolvedVariantId,
          condition: row.condition || 'Unknown',
          purchasePrice: row.purchasePrice,
          purchaseDate: row.purchaseDate,
          isGraded: false
        }
      });

      // 2. Fire the Event for Replay/History
      await prisma.event.create({
        data: {
          userId,
          instanceId: instance.id,
          type: 'IMPORT_COMPLETED',
          metadata: JSON.stringify({ source: session.sourceAdapter, importRowId: row.id })
        }
      });
      
      // Mark row as committed
      await prisma.migrationRow.update({
        where: { id: row.id },
        data: { status: 'COMMITTED' }
      });
      
      importedCount++;
    }
  }

  // Finalize session
  await prisma.migrationSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED' }
  });

  return { success: true, importedCount };
}
