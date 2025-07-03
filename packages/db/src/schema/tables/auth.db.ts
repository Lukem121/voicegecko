import { index, pgEnum, pgTable } from "drizzle-orm/pg-core";

export const UserRoleEnum = pgEnum("user_role", ["admin", "user"]);

export const user = pgTable(
  "user",
  (t) => ({
    id: t.text().primaryKey(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    emailVerified: t.boolean().notNull(),
    image: t.text(),
    createdAt: t.timestamp().notNull(),
    updatedAt: t.timestamp().notNull(),
    username: t.text().unique().notNull(),
    displayUsername: t.text(),
    role: UserRoleEnum().default("user"),
    banned: t.boolean(),
    banReason: t.text(),
    banExpires: t.timestamp(),
    phoneNumber: t.text().unique(),
    phoneNumberVerified: t.boolean(),
    twoFactorEnabled: t.boolean(),
  }),
  (table) => [index().on(table.email)],
);

export const session = pgTable(
  "session",
  (t) => ({
    id: t.text().primaryKey(),
    expiresAt: t.timestamp().notNull(),
    token: t.text().notNull().unique(),
    createdAt: t.timestamp().notNull(),
    updatedAt: t.timestamp().notNull(),
    ipAddress: t.text(),
    userAgent: t.text(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: t.text(),
  }),
  (table) => [index().on(table.token), index().on(table.userId)],
);

export const UserTable = user;

export const account = pgTable(
  "account",
  (t) => ({
    id: t.text().primaryKey(),
    accountId: t.text().notNull(),
    providerId: t.text().notNull(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: t.text(),
    refreshToken: t.text(),
    idToken: t.text(),
    accessTokenExpiresAt: t.timestamp(),
    refreshTokenExpiresAt: t.timestamp(),
    scope: t.text(),
    password: t.text(),
    createdAt: t.timestamp().notNull(),
    updatedAt: t.timestamp().notNull(),
  }),
  (table) => [index().on(table.userId)],
);

export const verification = pgTable(
  "verification",
  (t) => ({
    id: t.text().primaryKey(),
    identifier: t.text().notNull(),
    value: t.text().notNull(),
    expiresAt: t.timestamp().notNull(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }),
  (table) => [index().on(table.identifier)],
);

export const twoFactor = pgTable(
  "two_factor",
  (t) => ({
    id: t.text().primaryKey(),
    secret: t.text().notNull(),
    backupCodes: t.text().notNull(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  }),
  (table) => [index().on(table.secret)],
);

// Do not use this table for anything yet!
export const apikey = pgTable(
  "apikey",
  (t) => ({
    id: t.text().primaryKey(),
    name: t.text(),
    start: t.text(),
    prefix: t.text(),
    key: t.text().notNull(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refillInterval: t.integer(),
    refillAmount: t.integer(),
    lastRefillAt: t.timestamp(),
    enabled: t.boolean(),
    rateLimitEnabled: t.boolean(),
    rateLimitTimeWindow: t.integer(),
    rateLimitMax: t.integer(),
    requestCount: t.integer(),
    remaining: t.integer(),
    lastRequest: t.timestamp(),
    expiresAt: t.timestamp(),
    createdAt: t.timestamp().notNull(),
    updatedAt: t.timestamp().notNull(),
    permissions: t.text(),
    metadata: t.text(),
  }),
  (table) => [index().on(table.key)],
);
