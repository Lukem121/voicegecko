import Stripe from "stripe";

import { authEnv } from "../../env";

const apiKey = authEnv().STRIPE_SECRET_KEY || "sk_test_placeholder";

export const stripeClient = new Stripe(apiKey, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});
