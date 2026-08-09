import Stripe from 'stripe';

import { paymentEnv } from '../env';

const apiKey = paymentEnv().STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripeClient = new Stripe(apiKey, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});
