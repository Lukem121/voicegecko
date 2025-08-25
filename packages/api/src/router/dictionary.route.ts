import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod/v4';

import { dictionaryRepository } from '../repository/dictionary.repository';
import { dictionaryService } from '../services/dictionary/dictionary.service';
import { protectedProcedure } from '../trpc';
import { dictionaryError } from '../types/result';

// Limit to 75 words to stay safely under the 224 token limit
// Assuming average word length of ~6 characters + comma separator
const MAX_DICTIONARY_ENTRIES = 75;

export const dictionaryRouter = {
  add: protectedProcedure
    .input(
      z.object({
        word: z.string().min(1).max(60).trim(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if user has reached the limit
      const count = await dictionaryRepository.countByUser(userId);
      if (count >= MAX_DICTIONARY_ENTRIES) {
        return {
          success: false as const,
          error: dictionaryError.limitExceeded(MAX_DICTIONARY_ENTRIES),
        };
      }

      const result = await dictionaryRepository.create(userId, input.word);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        word: z.string().min(1).max(60).trim(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const result = await dictionaryRepository.update(
        input.id,
        userId,
        input.word
      );
      return result;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const result = await dictionaryRepository.delete(input.id, userId);
      return result;
    }),

  getAll: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          sortBy: z
            .enum(['alphabetical', 'newest', 'oldest'])
            .optional()
            .default('alphabetical'),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const entries = await dictionaryRepository.getAllByUser(userId, {
        search: input?.search,
        sortBy: input?.sortBy,
      });

      return {
        entries,
        count: entries.length,
        maxEntries: MAX_DICTIONARY_ENTRIES,
      };
    }),

  // Get dictionary as formatted string for dictation prompt
  getPrompt: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Use the dictionary service to get the optimized prompt
    return await dictionaryService.getUserDictionaryPrompt(userId);
  }),
} satisfies TRPCRouterRecord;
