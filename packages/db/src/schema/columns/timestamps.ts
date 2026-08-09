import { timestamp as DrizzleTimestamp } from 'drizzle-orm/pg-core';

const timestamp = (
  name: string,
  options?: Parameters<typeof DrizzleTimestamp>[1]
) => DrizzleTimestamp(name, { withTimezone: true, ...options });

export const createdAt = timestamp('created_at', { withTimezone: true })
  .defaultNow()
  .notNull();

export const updatedAt = timestamp('updated_at', { withTimezone: true })
  .$onUpdate(() => new Date())
  .notNull();
