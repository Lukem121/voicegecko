import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { transcriptionService } from "../services/transcription/transcription.service";
import { protectedProcedure } from "../trpc";

export const transcriptionRouter = {
  create: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        status: z.enum(["normal", "silent"]),
        durationSeconds: z.number().optional(),
        modelUsed: z.string().optional(),
        sampleRate: z.number().optional(),
        appVersion: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await transcriptionService.createTranscription({
        ...input,
        userId,
      });

      return result;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return transcriptionService.getUserTranscriptions(userId);
  }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return transcriptionService.deleteTranscription(input.id, userId);
    }),
} satisfies TRPCRouterRecord;
