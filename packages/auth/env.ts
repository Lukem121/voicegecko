import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      AUTH_DISCORD_ID: z.string().min(1),
      AUTH_DISCORD_SECRET: z.string().min(1),
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),
      NODE_ENV: z.enum(["development", "production"]).optional(),
      STRIPE_WEBHOOK_SECRET: z.string().min(1),
      STRIPE_SECRET_KEY: z.string().min(1),
      STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1),
      STRIPE_PRICE_ID_PRO_YEARLY: z.string().min(1),
      STRIPE_PRICE_ID_TEAM_MONTHLY: z.string().min(1),
      STRIPE_PRICE_ID_TEAM_YEARLY: z.string().min(1),
    },
    client: {
      NEXT_PUBLIC_VOICEGECKO_URL: z.string().min(1),
    },
    experimental__runtimeEnv: {
      NEXT_PUBLIC_VOICEGECKO_URL: process.env.NEXT_PUBLIC_VOICEGECKO_URL,
    },
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
