-- AlterTable
ALTER TABLE "UserMetrics" ADD COLUMN     "unrealizedGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unrealizedGainPercent" DOUBLE PRECISION;

