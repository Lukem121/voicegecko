import { index, pgEnum, pgTable } from 'drizzle-orm/pg-core';

import { createdAt, updatedAt } from '../columns/timestamps';
import { user as UserTable } from './auth.db';

export const TeamRoleEnum = pgEnum('team_role', ['owner', 'member']);
export const TeamMemberStatusEnum = pgEnum('team_member_status', [
  'active',
  'invited',
]);

export const TeamTable = pgTable(
  'team',
  (t) => ({
    id: t.text('id').primaryKey(),
    ownerUserId: t
      .text('owner_user_id')
      .notNull()
      .references(() => UserTable.id, { onDelete: 'cascade' }),
    name: t.text('name'),
    createdAt,
    updatedAt,
  }),
  (table) => [index('team_owner_idx').on(table.ownerUserId)]
);

export const TeamMemberTable = pgTable(
  'team_member',
  (t) => ({
    id: t.serial('id').primaryKey(),
    teamId: t
      .text('team_id')
      .notNull()
      .references(() => TeamTable.id, { onDelete: 'cascade' }),
    email: t.text('email').notNull(),
    userId: t.text('user_id').references(() => UserTable.id, {
      onDelete: 'set null',
    }),
    role: TeamRoleEnum('role').notNull().default('member'),
    status: TeamMemberStatusEnum('status').notNull().default('active'),
    createdAt,
    updatedAt,
  }),
  (table) => [
    index('team_member_team_idx').on(table.teamId),
    index('team_member_email_idx').on(table.email),
  ]
);
