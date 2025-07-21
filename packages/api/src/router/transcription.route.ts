import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { apiEnv } from "../../env";
import { CloudTranscriptionService } from "../services/transcription/cloud-transcription.service";
import { transcriptionService } from "../services/transcription/transcription.service";
import { usageService } from "../services/usage/usage.service";
import { protectedProcedure } from "../trpc";
import { convertFloat32ToWav } from "../utils/audio-converter";
import { countWords } from "../utils/word-counter";

const env = apiEnv();
const cloudTranscriptionService = new CloudTranscriptionService(
  env.OPENAI_API_KEY,
);

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

      // Check if user can transcribe (under usage limit)
      const canTranscribe = await usageService.canUserTranscribe(userId);
      if (!canTranscribe) {
        // TODO: Implement proper error handling and user-friendly messaging
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Weekly transcription limit exceeded",
        });
      }

      const result = await transcriptionService.createTranscription({
        ...input,
        userId,
      });

      // Update usage tracking after successful transcription
      if (result) {
        const wordCount = countWords(input.content);
        await usageService.updateUsageAfterTranscription(userId, wordCount);
      }

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

  cloudTranscribe: protectedProcedure
    .input(
      z.object({
        audioData: z.array(z.number()), // Float32Array as array
        sampleRate: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if user can transcribe (under usage limit)
      const canTranscribe = await usageService.canUserTranscribe(userId);
      if (!canTranscribe) {
        // TODO: Implement proper error handling and user-friendly messaging
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Weekly transcription limit exceeded",
        });
      }

      // Convert Float32Array to WAV buffer
      const audioBuffer = convertFloat32ToWav(
        input.audioData,
        input.sampleRate,
      );

      // Transcribe using OpenAI
      const transcript = await cloudTranscriptionService.transcribeAudio(
        audioBuffer,
        `audio_${Date.now()}.wav`,
      );

      // Calculate duration
      const durationSeconds = input.audioData.length / input.sampleRate;

      // Save transcription to database
      const result = await transcriptionService.createTranscription({
        content: transcript,
        status: transcript.trim() ? "normal" : "silent",
        durationSeconds: Math.round(durationSeconds),
        modelUsed: "whisper-1",
        sampleRate: input.sampleRate,
        userId,
      });

      // Update usage tracking after successful transcription
      if (result) {
        const wordCount = countWords(transcript);
        await usageService.updateUsageAfterTranscription(userId, wordCount);
      }

      return {
        transcript,
        transcriptionId: result?.id,
        modelUsed: "whisper-1",
      };
    }),
} satisfies TRPCRouterRecord;
