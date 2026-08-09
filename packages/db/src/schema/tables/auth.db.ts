import { index, pgEnum, pgTable } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from '../columns/timestamps';

export const UserRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const user = pgTable(
  'user',
  (t) => ({
    id: t.text('id').primaryKey(),
    name: t.text('name').notNull(),
    email: t.text('email').notNull().unique(),
    emailVerified: t
      .boolean('email_verified')
      .$defaultFn(() => false)
      .notNull(),
    image: t.text('image'),
    createdAt,
    updatedAt,
    username: t.text('username').unique().notNull(),
    displayUsername: t.text('display_username'),
    stripeCustomerId: t.text('stripe_customer_id'),
    role: UserRoleEnum().default('user'),
    banned: t.boolean('banned'),
    banReason: t.text('ban_reason'),
    banExpires: t.timestamp('ban_expires'),
    phoneNumber: t.text('phone_number').unique(),
    phoneNumberVerified: t.boolean('phone_number_verified'),
    twoFactorEnabled: t.boolean('two_factor_enabled'),
  }),
  (table) => [index().on(table.email)]
);

export const session = pgTable(
  'session',
  (t) => ({
    id: t.text('id').primaryKey(),
    expiresAt: t.timestamp('expires_at').notNull(),
    token: t.text('token').notNull().unique(),
    createdAt: t
      .timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
    ipAddress: t.text('ip_address'),
    userAgent: t.text('user_agent'),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: t.text('impersonated_by'),
  }),
  (table) => [index().on(table.token), index().on(table.userId)]
);

export const account = pgTable(
  'account',
  (t) => ({
    id: t.text('id').primaryKey(),
    accountId: t.text('account_id').notNull(),
    providerId: t.text('provider_id').notNull(),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: t.text('access_token'),
    refreshToken: t.text('refresh_token'),
    idToken: t.text('id_token'),
    accessTokenExpiresAt: t.timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: t.timestamp('refresh_token_expires_at'),
    scope: t.text('scope'),
    password: t.text('password'),
    createdAt: t
      .timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (table) => [index().on(table.userId)]
);

export const verification = pgTable(
  'verification',
  (t) => ({
    id: t.text('id').primaryKey(),
    identifier: t.text('identifier').notNull(),
    value: t.text('value').notNull(),
    expiresAt: t.timestamp('expires_at').notNull(),
    createdAt,
    updatedAt,
  }),
  (table) => [index().on(table.identifier)]
);

export const subscription = pgTable('subscription', (t) => ({
  id: t.text('id').primaryKey(),
  plan: t.text('plan').notNull(),
  referenceId: t.text('reference_id').notNull(),
  stripeCustomerId: t.text('stripe_customer_id'),
  stripeSubscriptionId: t.text('stripe_subscription_id'),
  status: t.text('status').default('incomplete'),
  periodStart: t.timestamp('period_start'),
  periodEnd: t.timestamp('period_end'),
  cancelAtPeriodEnd: t.boolean('cancel_at_period_end'),
  seats: t.integer('seats'),
}));

export const twoFactor = pgTable('two_factor', (t) => ({
  id: t.text('id').primaryKey(),
  secret: t.text('secret').notNull(),
  backupCodes: t.text('backup_codes').notNull(),
  userId: t
    .text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
}));
