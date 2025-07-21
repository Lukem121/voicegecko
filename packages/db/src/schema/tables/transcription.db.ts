import { index, pgEnum, pgTable } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "../columns/timestamps";
import { user as UserTable } from "./auth.db";

export const TranscriptionStatus = pgEnum("transcription_status", [
  "normal",
  "silent",
]);

export const TranscriptionTable = pgTable(
  "transcription",
  (t) => ({
    id: t.serial("id").primaryKey(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" }),
    content: t.text().notNull(),
    status: TranscriptionStatus("status").notNull(),
    durationSeconds: t.integer("duration_seconds"),
    modelUsed: t.text("model_used"),
    sampleRate: t.integer("sample_rate"),
    appVersion: t.text("app_version"),
    wordCount: t.integer("word_count").notNull().default(0),
    createdAt,
    updatedAt,
  }),
  (table) => [
    index("transcription_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
  ],
);
