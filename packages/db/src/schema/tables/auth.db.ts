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
