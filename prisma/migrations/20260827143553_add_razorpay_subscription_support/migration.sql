-- Multi-provider billing: Subscription rows can now be owned by either
-- Stripe or Razorpay. Purely additive/relaxing — a new defaulted "provider"
-- column, the two new Razorpay columns are nullable, and the two existing
-- Stripe columns are relaxed from NOT NULL to nullable (every existing row
-- keeps its real Stripe values, so this is safe against the live shared
-- database without a backfill).

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'stripe',
ADD COLUMN     "razorpaySubscriptionId" TEXT,
ADD COLUMN     "razorpayPlanId" TEXT,
ALTER COLUMN "stripeSubscriptionId" DROP NOT NULL,
ALTER COLUMN "stripePriceId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "Subscription"("razorpaySubscriptionId");
