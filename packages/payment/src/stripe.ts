import Stripe from 'stripe';

import { paymentEnv } from '../env';

const apiKey = paymentEnv().STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripeClient = new Stripe(apiKey, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});
