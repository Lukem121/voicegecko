import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export const keys = () => {
  return createEnv({
    server: {
      SENDGRID_API_KEY: z.string().min(1).startsWith('SG.'),
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
  });
};
