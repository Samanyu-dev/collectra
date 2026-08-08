-- Purely additive: one new table for catalog-level graded reference prices
-- (e.g. "PSA 10 copies of this card trade around $659"). Deliberately separate
-- from PriceObservation/CurrentPrice rather than a nullable grade column on
-- those, so the existing ungraded pipeline (ADR-003, recompute job, eBay/
-- Pokémon syncs) is untouched by this migration. No other table is altered.

-- CreateTable
CREATE TABLE "GradedPriceObservation" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalRef" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradedPriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradedPriceObservation_variantId_company_grade_observedAt_idx" ON "GradedPriceObservation"("variantId", "company", "grade", "observedAt");

-- CreateIndex
CREATE INDEX "GradedPriceObservation_sourceId_externalRef_idx" ON "GradedPriceObservation"("sourceId", "externalRef");

-- AddForeignKey
ALTER TABLE "GradedPriceObservation" ADD CONSTRAINT "GradedPriceObservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradedPriceObservation" ADD CONSTRAINT "GradedPriceObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
