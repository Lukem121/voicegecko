import type { TRPCRouterRecord } from '@trpc/server';
import { geolocationService } from '../services/geolocation/geolocation.service';
import { publicProcedure } from '../trpc';

export const geolocationRouter = {
  getCurrency: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.ip) {
      return null;
    }
    return await geolocationService.getCurrency(ctx.ip);
  }),
} satisfies TRPCRouterRecord;
