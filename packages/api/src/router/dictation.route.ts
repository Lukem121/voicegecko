import { DiscordAdapter } from '@acme/notifications/discord-adapter';
import { log } from '@acme/observability/log';
import type { TRPCRouterRecord } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';

import { apiEnv } from '../../env';
import { CloudDictationService } from '../services/dictation/cloud-dictation.service';
import { dictationService } from '../services/dictation/dictation.service';
import { dictionaryService } from '../services/dictionary/dictionary.service';
import { usageService } from '../services/usage/usage.service';
import { protectedProcedure } from '../trpc';
import { feedbackError } from '../types/result';
import { convertFloat32ToWav } from '../utils/audio-converter';
import { countWords } from '../utils/word-counter';

const env = apiEnv();
const cloudDictationService = new CloudDictationService(env.OPENAI_API_KEY);
const discordAdapter = new DiscordAdapter();

// Feedback constraints
const MAX_FEEDBACK_LENGTH = 1000; // Stay well under Discord's 1024 character limit

export const dictationRouter = {
  create: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        status: z.enum(['normal', 'silent']),
        durationSeconds: z.number().optional(),
        modelUsed: z.string().optional(),
        sampleRate: z.number().optional(),
        appVersion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await dictationService.createDictation({
        ...input,
        userId,
      });

      // Track usage stats after successful dictation (never blocks)
      if (result) {
        const wordCount = countWords(input.content);
        await usageService.updateUsageAfterDictation(userId, wordCount);
      }

      return result;
    }),

  getAll: protectedProcedure
    .input(
      z
        .object({
          cursor: z.number().optional(), // ID of the last item from previous page
          limit: z.number().min(1).max(50).default(20), // Page size with reasonable limits
          search: z.string().optional(), // Search query
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const params = input ?? { limit: 50 };
      return await dictationService.getUserDictations(userId, params);
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await dictationService.deleteDictation(input.id, userId);
    }),

  cloudTranscribe: protectedProcedure
    .input(
      z.object({
        audioData: z.array(z.number()), // Float32Array as array
        sampleRate: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const dictionaryPrompt =
        await dictionaryService.getUserDictionaryPrompt(userId);

      // Convert Float32Array to WAV buffer
      const audioBuffer = convertFloat32ToWav(
        input.audioData,
        input.sampleRate
      );

      // Transcribe using OpenAI with dictionary prompt
      const transcript = await cloudDictationService.transcribeAudio(
        audioBuffer,
        `audio_${Date.now()}.wav`,
        dictionaryPrompt
      );

      // Calculate duration
      const durationSeconds = input.audioData.length / input.sampleRate;

      // Save dictation to database
      const result = await dictationService.createDictation({
        content: transcript,
        status: transcript.trim() ? 'normal' : 'silent',
        durationSeconds: Math.round(durationSeconds),
        modelUsed: 'whisper-1',
        sampleRate: input.sampleRate,
        userId,
      });

      // Update usage tracking after successful dictation
      if (result) {
        const wordCount = countWords(transcript);
        await usageService.updateUsageAfterDictation(userId, wordCount);
      }

      return {
        transcript,
        dictationId: result?.id,
        modelUsed: 'whisper-1',
      };
    }),
  sendFeedback: protectedProcedure
    .input(
      z.object({
        dictationId: z.number(),
        feedback: z.string().min(1).max(MAX_FEEDBACK_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const feedback = input.feedback.trim();

      // Validate feedback content
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
        // Get the dictation details
        const dictation = await dictationService.getDictationById(
          input.dictationId,
          userId
        );

        // Send feedback via Discord
        await discordAdapter.sendFeedbackReport({
          feedbackType: 'general',
          message: feedback,
          userId,
          additionalContext: {
            dictationId: input.dictationId,
            dictationContent: dictation.content,
            dictationStatus: dictation.status,
            dictationDate: dictation.createdAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });

        return {
          success: true as const,
          data: { message: 'Feedback sent successfully' },
        };
      } catch (error) {
        log.error(error, 'Failed to send feedback:');

        // Handle specific error types
        if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
          return {
            success: false as const,
            error: feedbackError.dictationNotFound(input.dictationId),
          };
        }

        // Handle Discord sending errors
        if (error instanceof Error && error.message.includes('Discord')) {
          return {
            success: false as const,
            error: feedbackError.discordSendFailed(error.message),
          };
        }

        // Generic internal error
        return {
          success: false as const,
          error: feedbackError.internalError(
            error instanceof Error ? error.message : 'Unknown error occurred'
          ),
        };
      }
    }),
} satisfies TRPCRouterRecord;
