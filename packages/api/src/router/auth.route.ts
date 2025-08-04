import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';

import { AuthService } from '../services/auth/auth.service';
import { protectedProcedure, publicProcedure } from '../trpc';

const authService = new AuthService();

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
      })
    )
    .mutation(({ input }) => {
      return 'you can see this secret message!';
    }),
  getBanStatus: publicProcedure
    .input(z.email())
    .mutation(async ({ input: email }) => {
      const result = await authService.getBanStatus(email);
      return result;
    }),
} satisfies TRPCRouterRecord;
