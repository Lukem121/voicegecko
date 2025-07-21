import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export function paymentEnv() {
  return createEnv({
    server: {
      NODE_ENV: z.enum(["development", "production"]).optional(),
      STRIPE_SECRET_KEY: z.string().min(1),
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
