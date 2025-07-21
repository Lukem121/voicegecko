import type { TRPCRouterRecord } from "@trpc/server";

import { usageService } from "../services/usage/usage.service";
import { protectedProcedure } from "../trpc";

export const usageRouter = {
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return usageService.getUserUsageStatus(userId);
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return usageService.getUserUsageStats(userId);
  }),
} satisfies TRPCRouterRecord;
