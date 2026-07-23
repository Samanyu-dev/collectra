-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insert" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Insert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_name_key" ON "Competition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Season_label_key" ON "Season"("label");

-- CreateIndex
CREATE INDEX "Insert_setId_idx" ON "Insert"("setId");

-- AddForeignKey
ALTER TABLE "Insert" ADD CONSTRAINT "Insert_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Set gains optional Competition/Season links
ALTER TABLE "Set" ADD COLUMN     "competitionId" TEXT,
ADD COLUMN     "seasonId" TEXT;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Team gains club-vs-national distinction
ALTER TABLE "Team" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'CLUB',
ADD COLUMN     "country" TEXT;

-- AlterTable: Variant gains Insert link + relic flag
ALTER TABLE "Variant" ADD COLUMN     "insertId" TEXT,
ADD COLUMN     "isRelic" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_insertId_fkey" FOREIGN KEY ("insertId") REFERENCES "Insert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Instance gains per-copy serial number (distinct from Variant.serialTo, the catalog print-run denominator)
ALTER TABLE "Instance" ADD COLUMN     "serialNumber" TEXT;
