import Stripe from "stripe";

import { authEnv } from "../../env";

export const stripeClient = new Stripe(authEnv().STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});
