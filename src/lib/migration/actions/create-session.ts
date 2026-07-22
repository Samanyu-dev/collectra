"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUserForAction } from "@/lib/auth/session";
import { parseCsv } from "../csv-parse";
import { TCGPlayerV1Adapter } from "../adapters/tcgplayer";
import { GenericCSVAdapter } from "../adapters/generic";
import { MigrationMatchingEngine } from "../matching-engine";
import { storeMigrationFile } from "../storage";
import type { MigrationAdapter } from "../adapters/base";

const ADAPTERS: MigrationAdapter[] = [TCGPlayerV1Adapter, GenericCSVAdapter];

export async function createMigrationSession(formData: FormData) {
  const user = await requireUserForAction();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a CSV file to upload.");
  }
  const fileName = file.name;
  const fileText = await file.text();

  const adapter = ADAPTERS.find((a) => a.canHandle(fileText)) || GenericCSVAdapter;
  const rawRows = parseCsv(fileText);

  if (rawRows.length === 0) {
    throw new Error("No data rows found in the uploaded file.");
  }

  const { url, checksum } = await storeMigrationFile(user.id, fileName, fileText);

  const session = await prisma.migrationSession.create({
    data: {
      userId: user.id,
      status: "ANALYZING",
      sourceAdapter: adapter.id,
      originalFileUrl: url,
      checksum,
      totalRows: rawRows.length,
    },
  });

  const engine = new MigrationMatchingEngine(prisma as any);

  let matchedRows = 0;
  let reviewRows = 0;
  let unknownRows = 0;
  let estimatedValue = 0;

  for (const rawRow of rawRows) {
    const canonical = adapter.normalize(rawRow);
    const result = await engine.match(canonical);

    let status: string;
    if (result.variantId) {
      status = "STAGED_MATCH";
      matchedRows++;
    } else if (result.matchCandidates && result.matchCandidates.length > 0) {
      status = "STAGED_REVIEW";
      reviewRows++;
    } else {
      status = "STAGED_REVIEW";
      unknownRows++;
    }

    if (canonical.purchasePrice) estimatedValue += canonical.purchasePrice * canonical.quantity;

    await prisma.migrationRow.create({
      data: {
        sessionId: session.id,
        originalData: JSON.stringify(rawRow),
        status,
        confidenceScore: result.confidence,
        confidenceReasons: JSON.stringify(result.reasons),
        matchCandidates: result.matchCandidates ? JSON.stringify(result.matchCandidates) : null,
        resolvedVariantId: result.variantId ?? null,
        resolvedProductId: result.productId ?? null,
        purchasePrice: canonical.purchasePrice,
        purchaseDate: canonical.purchaseDate,
        condition: canonical.condition,
      },
    });
  }

  await prisma.migrationSession.update({
    where: { id: session.id },
    data: { status: "STAGED", matchedRows, reviewRows, unknownRows, estimatedValue },
  });

  redirect(`/migration/${session.id}/review`);
}
