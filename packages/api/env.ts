import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export function apiEnv() {
  return createEnv({
    server: {
      OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
      NODE_ENV: z.enum(["development", "production"]).optional(),
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
