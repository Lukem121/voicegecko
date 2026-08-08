import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export function apiEnv() {
  return createEnv({
    server: {
      NODE_ENV: z.enum(['development', 'production']).optional(),
      STRIPE_SECRET_KEY: z.string().min(1),
      STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1),
      STRIPE_PRICE_ID_PRO_YEARLY: z.string().min(1),
      // Optional: legacy Team subscribers only (new Team checkout disabled)
      STRIPE_PRICE_ID_TEAM_MONTHLY: z.string().min(1).optional(),
      STRIPE_PRICE_ID_TEAM_YEARLY: z.string().min(1).optional(),
      VOICEGECKO_APP_URL: z.url().optional().default('http://localhost:3000'),
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
  });
}
