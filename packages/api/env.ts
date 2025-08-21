import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export function apiEnv() {
  return createEnv({
    server: {
      OPENAI_API_KEY: z.string().min(1).startsWith('sk-'),
      NODE_ENV: z.enum(['development', 'production']).optional(),
      STRIPE_SECRET_KEY: z.string().min(1),
      STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1),
      STRIPE_PRICE_ID_PRO_YEARLY: z.string().min(1),
      STRIPE_PRICE_ID_TEAM_MONTHLY: z.string().min(1),
      STRIPE_PRICE_ID_TEAM_YEARLY: z.string().min(1),
      VOICEGECKO_APP_URL: z.url().optional().default('http://localhost:3000'),
      IPFLARE_API_KEY: z.string().min(1),
      // Google Tag Manager server-side configuration
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
  });
}
