-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "variantId" TEXT,
    "productId" TEXT,
    "kind" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalRef" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isOutlier" BOOLEAN NOT NULL DEFAULT false,
    "overriddenBy" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentPrice" (
    "id" TEXT NOT NULL,
    "variantId" TEXT,
    "productId" TEXT,
    "marketPriceUsd" DOUBLE PRECISION,
    "lastSoldPriceUsd" DOUBLE PRECISION,
    "soldAverageUsd" DOUBLE PRECISION,
    "lowestListingUsd" DOUBLE PRECISION,
    "highestListingUsd" DOUBLE PRECISION,
    "trend30dPercent" DOUBLE PRECISION,
    "trend90dPercent" DOUBLE PRECISION,
    "observationCount" INTEGER NOT NULL DEFAULT 0,
    "contributingSources" TEXT,
    "latestObservationAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceLabel" TEXT NOT NULL DEFAULT 'NO_DATA',
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "usdRate" DOUBLE PRECISION NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRateLimit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxPerWindow" INTEGER NOT NULL DEFAULT 60,
    "windowSeconds" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "SourceRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceObservation_variantId_observedAt_idx" ON "PriceObservation"("variantId", "observedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_productId_observedAt_idx" ON "PriceObservation"("productId", "observedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_sourceId_externalRef_idx" ON "PriceObservation"("sourceId", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentPrice_variantId_key" ON "CurrentPrice"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentPrice_productId_key" ON "CurrentPrice"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_currency_asOf_key" ON "ExchangeRate"("currency", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRateLimit_sourceId_key" ON "SourceRateLimit"("sourceId");

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentPrice" ADD CONSTRAINT "CurrentPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentPrice" ADD CONSTRAINT "CurrentPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRateLimit" ADD CONSTRAINT "SourceRateLimit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

