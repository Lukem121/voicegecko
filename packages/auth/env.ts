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
    },
    experimental__runtimeEnv: {
      AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
      AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
      AUTH_SECRET: process.env.AUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    },
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
