import Stripe from "stripe";

import { authEnv } from "../../env";

const stripeApiKey =
  authEnv().STRIPE_SECRET_KEY || "sk_test_placeholder sympathiqueBuildProcess";

export const getStripeClient = () => {
  return new Stripe(stripeApiKey, {
    apiVersion: "2025-06-30.basil",
    typescript: true,
  });
};
