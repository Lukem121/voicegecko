import Stripe from "stripe";

import { apiEnv } from "../../env";

const apiKey = apiEnv().STRIPE_SECRET_KEY || "sk_test_placeholder";

export const stripeClient = new Stripe(apiKey, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});
