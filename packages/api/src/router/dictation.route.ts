import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { log } from '@acme/observability/log';
import { createRateLimiter, slidingWindow } from '@acme/rate-limit';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';

import { protectedProcedure } from '../trpc';
import { feedbackError } from '../types/result';

const discordAdapter = new DiscordAdapter();

// Feedback constraints
const MAX_FEEDBACK_LENGTH = 1000; // Stay well under Discord's 1024 character limit

/**
 * User dictation content lives on-device (desktop SQLite) only.
 * This router keeps optional Support feedback — no create/sync of transcripts.
 */
export const dictationRouter = {
  sendFeedback: protectedProcedure
    .input(
      z.object({
        dictationId: z.string().optional(),
        feedback: z.string().min(1).max(MAX_FEEDBACK_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const feedback = input.feedback.trim();

      const limiter = createRateLimiter({
        limiter: slidingWindow(5, '10m'),
        prefix: 'dictation-feedback',
      });
      const { success: allowed } = await limiter.limit(userId);
      if (!allowed) {
        return {
          success: false as const,
          error: feedbackError.internalError(
            'Too many feedback requests. Please try again later.'
          ),
        };
      }

      if (!feedback) {
        return {
          success: false as const,
          error: feedbackError.feedbackEmpty(),
        };
      }

      if (feedback.length > MAX_FEEDBACK_LENGTH) {
        return {
          success: false as const,
          error: feedbackError.feedbackTooLong(
            MAX_FEEDBACK_LENGTH,
            feedback.length
          ),
        };
      }

      try {
        await discordAdapter.sendFeedbackReport({
          feedbackType: 'general',
          message: feedback,
          userId,
          additionalContext: input.dictationId
            ? { dictationId: input.dictationId }
            : undefined,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true as const,
          data: { message: 'Feedback sent successfully' },
        };
      } catch (error) {
        log.error(error, 'Failed to send feedback:');

        if (error instanceof Error && error.message.includes('Discord')) {
          return {
            success: false as const,
            error: feedbackError.discordSendFailed(error.message),
          };
        }

        return {
          success: false as const,
          error: feedbackError.internalError(
            error instanceof Error ? error.message : 'Unknown error occurred'
          ),
        };
      }
    }),
} satisfies TRPCRouterRecord;
