import { pgTable } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from '../columns/timestamps';
import { user } from './auth.db';

export const dictionary = pgTable('dictionary', (t) => ({
  id: t.serial('id').primaryKey(),
  userId: t
    .text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  word: t.text('word').notNull(),
  createdAt,
  updatedAt,
}));
