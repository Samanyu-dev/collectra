import Stripe from "stripe";

/**
 * One-off, idempotent setup script — creates the single "Collectra Pro"
 * Product + its one recurring monthly Price if they don't already exist, and
 * prints the Price ID to put in STRIPE_PRO_PRICE_ID. Per Stripe's own
 * guidance, each pricing tier is its own Product (never multiple tiers'
 * Prices stacked on one Product) — this app only has one paid tier, so this
 * is the only Product/Price pair it will ever need.
 *
 * Run once: `npx tsx src/scripts/stripe-setup.ts`
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" });

const PRODUCT_NAME = "Collectra Pro";
const MONTHLY_PRICE_USD = 4.99;

async function main() {
  const existingProducts = await stripe.products.search({ query: `name:"${PRODUCT_NAME}" AND active:"true"` });
  let product = existingProducts.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: "Unlimited sets and unlimited card scans.",
    });
    console.log(`Created product: ${product.id}`);
  } else {
    console.log(`Found existing product: ${product.id}`);
  }

  const existingPrices = await stripe.prices.list({ product: product.id, active: true, type: "recurring" });
  let price = existingPrices.data.find((p) => p.unit_amount === Math.round(MONTHLY_PRICE_USD * 100) && p.recurring?.interval === "month");
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: Math.round(MONTHLY_PRICE_USD * 100),
      recurring: { interval: "month" },
    });
    console.log(`Created price: ${price.id}`);
  } else {
    console.log(`Found existing price: ${price.id}`);
  }

  console.log(`\nSet this in .env.local:\nSTRIPE_PRO_PRICE_ID=${price.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
