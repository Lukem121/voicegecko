# Phase 3: API Layer

## Overview

Implement the tRPC API routes for transcription management, usage tracking, and OpenAI Whisper integration.

## Tasks

### 1. Transcription Router

Create `packages/api/src/router/transcription.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, desc, eq } from "@acme/db";
import {
  recordings,
  transcriptions,
  transcriptionStatusEnum,
} from "@acme/db/schema";

import { TranscriptionService } from "../services/transcription/transcription.service";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const transcriptionService = new TranscriptionService();

export const transcriptionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        audioFilePath: z.string(),
        audioFileSize: z.number(),
        audioDuration: z.number(),
        title: z.string().optional(),
        language: z.string().default("en"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const transcription = await ctx.db
        .insert(transcriptions)
        .values({
          userId: ctx.session.user.id,
          audioFilePath: input.audioFilePath,
          audioFileSize: input.audioFileSize,
          audioDuration: input.audioDuration,
          title: input.title,
          language: input.language,
          status: "pending",
        })
        .returning();

      // Queue for processing
      await transcriptionService.queueTranscription(transcription[0]);

      return transcription[0];
    }),

  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["pending", "processing", "completed", "failed"])
          .optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(transcriptions.userId, ctx.session.user.id)];

      if (input.status) {
        conditions.push(eq(transcriptions.status, input.status));
      }

      const items = await ctx.db
        .select()
        .from(transcriptions)
        .where(and(...conditions))
        .orderBy(desc(transcriptions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await ctx.db
        .select({ count: count() })
        .from(transcriptions)
        .where(and(...conditions));

      return {
        items,
        total: total[0].count,
        hasMore: input.offset + items.length < total[0].count,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transcription = await ctx.db
        .select()
        .from(transcriptions)
        .where(
          and(
            eq(transcriptions.id, input.id),
            eq(transcriptions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!transcription[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transcription not found",
        });
      }

      return transcription[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isFavorite: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const updated = await ctx.db
        .update(transcriptions)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transcriptions.id, id),
            eq(transcriptions.userId, ctx.session.user.id),
          ),
        )
        .returning();

      if (!updated[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transcription not found",
        });
      }

      return updated[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get transcription first to delete audio file
      const transcription = await ctx.db
        .select()
        .from(transcriptions)
        .where(
          and(
            eq(transcriptions.id, input.id),
            eq(transcriptions.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!transcription[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transcription not found",
        });
      }

      // Delete audio file
      await transcriptionService.deleteAudioFile(
        transcription[0].audioFilePath,
      );

      // Delete from database
      await ctx.db
        .delete(transcriptions)
        .where(eq(transcriptions.id, input.id));

      return { success: true };
    }),
});
```

### 2. Usage Tracking Router

Create `packages/api/src/router/usage.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, gte, lte } from "@acme/db";
import { usageTracking, userPreferences } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const usageRouter = createTRPCRouter({
  getCurrentUsage: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const usage = await ctx.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.userId, ctx.session.user.id),
          gte(usageTracking.periodStart, weekStart),
          lte(usageTracking.periodEnd, weekEnd),
        ),
      )
      .limit(1);

    if (!usage[0]) {
      // Create new usage record for this week
      const newUsage = await ctx.db
        .insert(usageTracking)
        .values({
          userId: ctx.session.user.id,
          periodStart: weekStart,
          periodEnd: weekEnd,
          wordsUsed: 0,
          minutesTranscribed: 0,
          apiCallsCount: 0,
          localProcessingCount: 0,
          subscriptionTier: "free",
        })
        .returning();

      return newUsage[0];
    }

    return usage[0];
  }),

  checkQuota: protectedProcedure
    .input(
      z.object({
        estimatedWords: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const usage = await ctx.db
        .select()
        .from(usageTracking)
        .where(eq(usageTracking.userId, ctx.session.user.id))
        .limit(1);

      const currentUsage = usage[0]?.wordsUsed || 0;
      const limit = usage[0]?.subscriptionTier === "free" ? 2000 : Infinity;

      return {
        allowed: currentUsage + input.estimatedWords <= limit,
        currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage),
      };
    }),

  trackUsage: protectedProcedure
    .input(
      z.object({
        wordsUsed: z.number(),
        minutesTranscribed: z.number(),
        isApiCall: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUsage = await this.getCurrentUsage.query({ ctx });

      await ctx.db
        .update(usageTracking)
        .set({
          wordsUsed: currentUsage.wordsUsed + input.wordsUsed,
          minutesTranscribed:
            currentUsage.minutesTranscribed + input.minutesTranscribed,
          apiCallsCount: currentUsage.apiCallsCount + (input.isApiCall ? 1 : 0),
          localProcessingCount:
            currentUsage.localProcessingCount + (input.isApiCall ? 0 : 1),
          updatedAt: new Date(),
        })
        .where(eq(usageTracking.id, currentUsage.id));

      return { success: true };
    }),
});
```

### 3. Transcription Service

Create `packages/api/src/services/transcription/transcription.service.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";

import { eq } from "@acme/db";
import { db } from "@acme/db/client";
import { transcriptions } from "@acme/db/schema";

import { StorageService } from "../storage/storage.service";

export class TranscriptionService {
  private openai: OpenAI;
  private storageService: StorageService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.storageService = new StorageService();
  }

  async queueTranscription(transcription: typeof transcriptions.$inferSelect) {
    // In production, this would queue to a job system
    // For MVP, we'll process immediately
    setTimeout(() => {
      this.processTranscription(transcription.id).catch(console.error);
    }, 0);
  }

  async processTranscription(transcriptionId: string) {
    const startTime = Date.now();

    try {
      // Update status to processing
      await db
        .update(transcriptions)
        .set({ status: "processing" })
        .where(eq(transcriptions.id, transcriptionId));

      // Get transcription record
      const [record] = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.id, transcriptionId));

      if (!record) {
        throw new Error("Transcription not found");
      }

      // Get audio file
      const audioBuffer = await this.storageService.getAudioFile(
        record.audioFilePath,
      );

      // Convert buffer to File object for OpenAI
      const audioFile = new File([audioBuffer], "audio.webm", {
        type: "audio/webm",
      });

      // Call OpenAI Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: record.language || "en",
        response_format: "json",
      });

      const wordCount = response.text.split(/\s+/).length;
      const processingTime = Date.now() - startTime;

      // Update transcription with results
      await db
        .update(transcriptions)
        .set({
          transcriptionText: response.text,
          wordCount,
          status: "completed",
          modelUsed: "whisper-1",
          processedAt: new Date(),
          processingTime,
          updatedAt: new Date(),
        })
        .where(eq(transcriptions.id, transcriptionId));

      // Track usage
      await this.trackUsage(
        record.userId,
        wordCount,
        record.audioDuration,
        true,
      );
    } catch (error) {
      console.error("Transcription error:", error);

      // Update status to failed
      await db
        .update(transcriptions)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(transcriptions.id, transcriptionId));

      throw error;
    }
  }

  async deleteAudioFile(filePath: string) {
    try {
      await this.storageService.deleteAudioFile(filePath);
    } catch (error) {
      console.error("Error deleting audio file:", error);
    }
  }

  private async trackUsage(
    userId: string,
    wordCount: number,
    duration: number,
    isApiCall: boolean,
  ) {
    // Implementation would call usage tracking service
    // For now, we'll update directly
    const minutesTranscribed = Math.ceil(duration / 60);

    // This would be handled by the usage router in production
    console.log("Track usage:", {
      userId,
      wordCount,
      minutesTranscribed,
      isApiCall,
    });
  }
}
```

### 4. Update Root Router

Update `packages/api/src/root.ts`:

```typescript
import { authRouter } from "./router/auth";
import { transcriptionRouter } from "./router/transcription";
import { usageRouter } from "./router/usage";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  transcription: transcriptionRouter,
  usage: usageRouter,
});

export type AppRouter = typeof appRouter;
```

### 5. Environment Variables

Update `packages/api/env.ts`:

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    AUDIO_STORAGE_PATH: z.string().default("./storage/audio"),
    MAX_FILE_SIZE: z.string().default("500MB"),
    FREE_TIER_WEEKLY_WORDS: z.number().default(2000),
  },
  experimental__runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AUDIO_STORAGE_PATH: process.env.AUDIO_STORAGE_PATH,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    FREE_TIER_WEEKLY_WORDS: process.env.FREE_TIER_WEEKLY_WORDS,
  },
});
```

## Testing the API

Create test file `packages/api/src/router/transcription.test.ts`:

```typescript
// Example test structure
describe("Transcription API", () => {
  it("should create a transcription", async () => {
    // Test implementation
  });

  it("should enforce usage quotas", async () => {
    // Test implementation
  });

  it("should handle OpenAI API errors gracefully", async () => {
    // Test implementation
  });
});
```

## Validation Checklist

- [ ] All tRPC routes are properly typed
- [ ] Authentication is enforced on all routes
- [ ] Usage tracking accurately counts words
- [ ] OpenAI API integration works correctly
- [ ] Error handling provides useful feedback
- [ ] File storage service integrates properly

## Next Steps

Continue with:

- [Phase 4: Recording & Processing](./phase-4-recording.md) - Build the UI
- [Phase 5: Local Processing & UI](./phase-5-local-processing.md) - Local Whisper support
