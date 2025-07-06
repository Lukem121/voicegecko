import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const keys = () =>
  createEnv({
    server: {
      SENDGRID_API_KEY: z.string().min(1).startsWith("SG."),
    },
    experimental__runtimeEnv: {
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    },
  });
