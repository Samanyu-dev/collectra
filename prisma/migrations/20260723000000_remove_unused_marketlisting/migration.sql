-- DropForeignKey
ALTER TABLE "MarketListing" DROP CONSTRAINT "MarketListing_productId_fkey";

-- DropForeignKey
ALTER TABLE "MarketListing" DROP CONSTRAINT "MarketListing_variantId_fkey";

-- DropTable
DROP TABLE "MarketListing";

