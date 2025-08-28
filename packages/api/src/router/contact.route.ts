import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { createRateLimiter, slidingWindow } from '@acme/rate-limit';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';

import { publicProcedure } from '../trpc';

const discord = new DiscordAdapter();

// Keep within Discord field limits
const MAX_MESSAGE_LENGTH = 2000;

export const contactRouter = {
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        email: z.email().max(320),
        message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        // Optional client context
        url: z.url().optional(),
        posthogDistinctId: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      // Rate limit: allow small bursts but block spam
      const limiter = createRateLimiter({
        limiter: slidingWindow(3, '30s'),
        prefix: 'contact-submit',
      });
      const key = `contact:${userId ?? input.posthogDistinctId ?? ctx.ip ?? 'unknown'}`;
      const { success: allowed } = await limiter.limit(key);
      if (!allowed) {
        return {
          success: false as const,
          error: {
            message: 'Too many requests. Please wait a bit and try again.',
            code: 'TOO_MANY_REQUESTS' as const,
          },
        };
      }

      await discord.sendContactReport({
        name: input.name,
        email: input.email,
        message: input.message,
        userId,
        url: input.url ?? undefined,
        additionalContext: {
          ip: ctx.ip,
          headers: {
            'user-agent': ctx.headers.get('user-agent') ?? undefined,
            'x-client-version':
              ctx.headers.get('x-client-version') ?? undefined,
          },
          posthogDistinctId: input.posthogDistinctId,
        },
        timestamp: new Date().toISOString(),
      });

      return { success: true as const };
    }),
} satisfies TRPCRouterRecord;
