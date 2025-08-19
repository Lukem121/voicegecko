import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export function gtmEnv() {
  return createEnv({
    server: {
      GTM_GCP_PROJECT_ID: z.string().min(1),
      GTM_CONTAINER_ENDPOINT: z.url(),
      NODE_ENV: z.enum(['development', 'production']).optional(),
    },
    client: {},
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
  });
}
