# Phase 1: Foundation Setup

## Overview

Set up the core infrastructure needed for the VoiceGecko application including database schema, environment configuration, and initial migrations.

## Tasks

### 1. Environment Configuration

Create `.env.example` and `.env` files with the following variables:

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here

# Storage Paths
AUDIO_STORAGE_PATH=./storage/audio
WHISPER_MODEL_PATH=./storage/models

# Limits
MAX_FILE_SIZE=500MB
MAX_RECORDING_DURATION=7200 # 2 hours in seconds

# Transcription Settings
DEFAULT_LANGUAGE=en
DEFAULT_WHISPER_MODEL=whisper-1

# Usage Limits
FREE_TIER_WEEKLY_WORDS=2000
```

### 2. Database Schema Design

Create the following schema files in `packages/db/src/schema/tables/`:

#### `transcriptions.db.ts`

```typescript
import { createId } from "@paralleldrive/cuid2";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const transcriptionStatusEnum = pgEnum("transcription_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const transcriptionModelEnum = pgEnum("transcription_model", [
  "whisper-1", // OpenAI
  "whisper-tiny",
  "whisper-base",
  "whisper-small",
  "whisper-medium",
  "whisper-large",
]);

export const transcriptions = pgTable("transcriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // File information
  audioFilePath: text("audio_file_path").notNull(),
  audioFileSize: integer("audio_file_size").notNull(), // in bytes
  audioDuration: integer("audio_duration").notNull(), // in seconds

  // Transcription data
  transcriptionText: text("transcription_text"),
  wordCount: integer("word_count").default(0),
  language: text("language").default("en"),

  // Processing information
  status: transcriptionStatusEnum("status").default("pending").notNull(),
  modelUsed: transcriptionModelEnum("model_used"),
  processedAt: timestamp("processed_at"),
  processingTime: integer("processing_time"), // in milliseconds

  // User metadata
  title: text("title"),
  notes: text("notes"),
  tags: text("tags").array(),
  isFavorite: boolean("is_favorite").default(false),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### `recordings.db.ts`

```typescript
export const recordingStatusEnum = pgEnum("recording_status", [
  "recording",
  "paused",
  "completed",
  "cancelled",
]);

export const recordings = pgTable("recordings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Recording session data
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds

  // File information
  filePath: text("file_path"),
  fileFormat: text("file_format").default("webm"),

  // Status
  status: recordingStatusEnum("status").default("recording").notNull(),

  // Linked transcription
  transcriptionId: text("transcription_id").references(() => transcriptions.id),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### `usage.db.ts`

```typescript
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "enterprise",
]);

export const usageTracking = pgTable("usage_tracking", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Period tracking
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Usage data
  wordsUsed: integer("words_used").default(0).notNull(),
  minutesTranscribed: integer("minutes_transcribed").default(0).notNull(),
  apiCallsCount: integer("api_calls_count").default(0).notNull(),
  localProcessingCount: integer("local_processing_count").default(0).notNull(),

  // Subscription info
  subscriptionTier: subscriptionTierEnum("subscription_tier")
    .default("free")
    .notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),

  // Audio preferences
  defaultLanguage: text("default_language").default("en"),
  preferredModel:
    transcriptionModelEnum("preferred_model").default("whisper-1"),
  audioQuality: text("audio_quality").default("standard"), // standard, high
  autoSave: boolean("auto_save").default(true),

  // Processing preferences
  useLocalModels: boolean("use_local_models").default(true),
  autoTranscribe: boolean("auto_transcribe").default(true),

  // UI preferences
  defaultExportFormat: text("default_export_format").default("txt"),
  showWaveform: boolean("show_waveform").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 3. Update Schema Index

Update `packages/db/src/schema/index.ts`:

```typescript
export * from "./tables/auth.db";
export * from "./tables/transcriptions.db";
export * from "./tables/recordings.db";
export * from "./tables/usage.db";
```

### 4. Create and Run Migrations

```bash
# Generate migration
pnpm db:generate

# Push to database
pnpm db:push

# Verify with Drizzle Studio
pnpm db:studio
```

### 5. Update TypeScript Configuration

Add path aliases to `tsconfig.json` in the root:

```json
{
  "compilerOptions": {
    "paths": {
      "@acme/transcription": ["./packages/transcription/src"]
    }
  }
}
```

## Validation Checklist

- [ ] Environment variables are set in `.env`
- [ ] All database tables are created successfully
- [ ] Migrations run without errors
- [ ] Foreign key relationships are properly established
- [ ] Indexes are created for frequently queried fields
- [ ] Drizzle Studio shows all tables correctly

## Next Steps

Once Phase 1 is complete, you can proceed to:

- [Phase 2: Core Infrastructure](./phase-2-infrastructure.md) (Tauri audio module)
- [Phase 3: API Layer](./phase-3-api-layer.md) (Can be done in parallel with Phase 2)
