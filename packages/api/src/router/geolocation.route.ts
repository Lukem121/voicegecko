import { createRateLimiter, slidingWindow } from '@acme/rate-limit';
import type { TRPCRouterRecord } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { geolocationService } from '../services/geolocation/geolocation.service';
import { publicProcedure } from '../trpc';

export const geolocationRouter = {
  getCurrency: publicProcedure.query(async ({ ctx }) => {
    const limiter = createRateLimiter({
      limiter: slidingWindow(30, '1m'),
      prefix: 'geolocation-currency',
    });
    const key = ctx.ip ?? ctx.session?.user?.id ?? 'unknown';
    const { success } = await limiter.limit(key);
    if (!success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many geolocation requests. Please try again later.',
      });
    }

    return await geolocationService.getCurrency(ctx.headers);
  }),
} satisfies TRPCRouterRecord;
