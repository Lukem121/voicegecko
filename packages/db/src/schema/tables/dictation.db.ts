import { index, pgEnum, pgTable } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from '../columns/timestamps';
import { user as UserTable } from './auth.db';

export const DictationStatus = pgEnum('dictation_status', ['normal', 'silent']);

export const DictationTable = pgTable(
  'dictation',
  (t) => ({
    id: t.serial('id').primaryKey(),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => UserTable.id, { onDelete: 'cascade' }),
    content: t.text().notNull(),
    status: DictationStatus('status').notNull(),
    durationSeconds: t.integer('duration_seconds'),
    modelUsed: t.text('model_used'),
    sampleRate: t.integer('sample_rate'),
    appVersion: t.text('app_version'),
    wordCount: t.integer('word_count').notNull().default(0),
    createdAt,
    updatedAt,
  }),
  (table) => [
    index('dictation_user_created_idx').on(
      table.userId,
      table.createdAt.desc()
    ),
  ]
);
