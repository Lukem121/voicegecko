import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { apiEnv } from "../../env";
import { DiscordAdapter } from "../adapters/discord.adapter";
import { dictionaryService } from "../services/dictionary/dictionary.service";
import { CloudTranscriptionService } from "../services/transcription/cloud-transcription.service";
import { transcriptionService } from "../services/transcription/transcription.service";
import { usageService } from "../services/usage/usage.service";
import { protectedProcedure } from "../trpc";
import { feedbackError } from "../types/result";
import { convertFloat32ToWav } from "../utils/audio-converter";
import { countWords } from "../utils/word-counter";

const env = apiEnv();
const cloudTranscriptionService = new CloudTranscriptionService(
  env.OPENAI_API_KEY,
);
const discordAdapter = new DiscordAdapter();

// Feedback constraints
const MAX_FEEDBACK_LENGTH = 1000; // Stay well under Discord's 1024 character limit

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

  getAll: protectedProcedure
    .input(
      z
        .object({
          cursor: z.number().optional(), // ID of the last item from previous page
          limit: z.number().min(1).max(50).default(20), // Page size with reasonable limits
          search: z.string().optional(), // Search query
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const params = input ?? { limit: 50 };
      return transcriptionService.getUserTranscriptions(userId, params);
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

      // Execute independent operations in parallel for better performance
      const [canTranscribe, dictionaryPrompt] = await Promise.all([
        usageService.canUserTranscribe(userId),
        dictionaryService.getUserDictionaryPrompt(userId),
      ]);

      // Check if user can transcribe (under usage limit)
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

      // Transcribe using OpenAI with dictionary prompt
      const transcript = await cloudTranscriptionService.transcribeAudio(
        audioBuffer,
        `audio_${Date.now()}.wav`,
        dictionaryPrompt,
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
  sendFeedback: protectedProcedure
    .input(
      z.object({
        transcriptionId: z.number(),
        feedback: z.string().min(1).max(MAX_FEEDBACK_LENGTH),
      }),
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
            feedback.length,
          ),
        };
      }

      try {
        // Get the transcription details
        const transcription = await transcriptionService.getTranscriptionById(
          input.transcriptionId,
          userId,
        );

        // Send feedback via Discord
        await discordAdapter.sendFeedbackReport({
          feedbackType: "general",
          message: feedback,
          userId: userId,
          additionalContext: {
            transcriptionId: input.transcriptionId,
            transcriptionContent: transcription.content,
            transcriptionStatus: transcription.status,
            transcriptionDate: transcription.createdAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });

        return {
          success: true as const,
          data: { message: "Feedback sent successfully" },
        };
      } catch (error) {
        console.error("Failed to send feedback:", error);

        // Handle specific error types
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return {
            success: false as const,
            error: feedbackError.transcriptionNotFound(input.transcriptionId),
          };
        }

        // Handle Discord sending errors
        if (error instanceof Error && error.message.includes("Discord")) {
          return {
            success: false as const,
            error: feedbackError.discordSendFailed(error.message),
          };
        }

        // Generic internal error
        return {
          success: false as const,
          error: feedbackError.internalError(
            error instanceof Error ? error.message : "Unknown error occurred",
          ),
        };
      }
    }),
} satisfies TRPCRouterRecord;
