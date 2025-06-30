import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(({ input }) => {
      return "you can see this secret message!";
    }),
} satisfies TRPCRouterRecord;
