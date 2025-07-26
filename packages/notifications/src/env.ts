import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export function notificationsEnv() {
  return createEnv({
    server: {
      DISCORD_ERROR_REPORT_WEBHOOK_URL: z.url(),
      DISCORD_FEEDBACK_WEBHOOK_URL: z.url(),
      DISCORD_USER_SIGNUP_WEBHOOK_URL: z.url(),
    },
    experimental__runtimeEnv: {},
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
