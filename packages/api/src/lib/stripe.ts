import Stripe from "stripe";

import { apiEnv } from "../../env";

export const getStripeClient = () => {
  return new Stripe(apiEnv().STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });
};
