-- DropIndex
DROP INDEX "SourceRateLimit_sourceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "SourceRateLimit_sourceId_windowSeconds_key" ON "SourceRateLimit"("sourceId", "windowSeconds");

