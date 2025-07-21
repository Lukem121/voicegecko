import { index, pgTable } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "../columns/timestamps";
import { user as UserTable } from "./auth.db";

export const UsageTable = pgTable(
  "usage",
  (t) => ({
    id: t.serial("id").primaryKey(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => UserTable.id, { onDelete: "cascade" })
      .unique(),
    weekStartDate: t
      .timestamp("week_start_date", { withTimezone: true })
      .notNull(),
    wordsUsed: t.integer("words_used").notNull().default(0),
    transcriptionCount: t.integer("transcription_count").notNull().default(0),
    lastResetAt: t
      .timestamp("last_reset_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt,
    updatedAt,
  }),
  (table) => [
    index("usage_user_idx").on(table.userId),
    index("usage_week_start_idx").on(table.weekStartDate),
  ],
);
