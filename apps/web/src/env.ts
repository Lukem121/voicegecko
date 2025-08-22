import { authEnv } from '@acme/auth/env';
import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  extends: [authEnv(), vercel()],
  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    GITHUB_TOKEN: z.string().min(1, 'GitHub token is required for updater'),
    GITHUB_OWNER: z.string().min(1, 'GitHub repository owner is required'),
    GITHUB_REPO: z.string().min(1, 'GitHub repository name is required'),
    SENDGRID_API_KEY: z.string().min(1).startsWith('SG.'),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1),
    STRIPE_PRICE_ID_PRO_YEARLY: z.string().min(1),
    STRIPE_PRICE_ID_TEAM_MONTHLY: z.string().min(1),
    STRIPE_PRICE_ID_TEAM_YEARLY: z.string().min(1),
    REVALIDATE_SECRET: z
      .string()
      .min(1, 'Revalidation secret is required for ISR'),
    SENTRY_AUTH_TOKEN: z.string().min(1, 'Sentry auth token is required'),
    // Google Tag Manager server-side configuration
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_VOICEGECKO_URL: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_VOICEGECKO_URL: process.env.NEXT_PUBLIC_VOICEGECKO_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
});
