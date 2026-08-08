-- Beckett/TCDB-grade variant modeling (2026-08-07, Turbo Attax 2025 India +
-- Premier League 2025/26 parallel/odds project). Consolidated field set —
-- see the plan/report for why Printing Technology/Surface Finish/Card
-- Material were deliberately not added as dedicated columns.

-- AlterTable
ALTER TABLE "Parallel" ADD COLUMN     "group" TEXT;
ALTER TABLE "Parallel" ADD COLUMN     "finish" TEXT;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "msrpUsd" DOUBLE PRECISION;
