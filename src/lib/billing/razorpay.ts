import "server-only";
import Razorpay from "razorpay";

/** One Razorpay client instance, reused across requests — same pattern as ./stripe.ts. */
const globalForRazorpay = globalThis as unknown as { razorpayClient?: Razorpay };

export const razorpay =
  globalForRazorpay.razorpayClient ??
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

if (process.env.NODE_ENV !== "production") globalForRazorpay.razorpayClient = razorpay;
