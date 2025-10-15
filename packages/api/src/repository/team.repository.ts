import { and, count, eq } from '@acme/db';
import { db } from '@acme/db/client';
import {
  subscription as SubscriptionTable,
  TeamMemberTable,
  TeamTable,
  user as UserTable,
} from '@acme/db/schema';

export type TeamMember = {
  id: number;
  teamId: string;
  email: string;
  userId: string | null;
  role: 'owner' | 'member';
  status: 'active' | 'invited';
};

export const teamRepository = {
  async upsertTeam(ownerUserId: string, ownerEmail: string | null | undefined) {
    const teamId = ownerUserId;

    await db
      .insert(TeamTable)
      .values({ id: teamId, ownerUserId })
      .onConflictDoNothing();

    // Ensure owner membership exists (idempotent)
    const existingOwner = await db
      .select({ id: TeamMemberTable.id })
      .from(TeamMemberTable)
      .where(
        and(
          eq(TeamMemberTable.teamId, teamId),
          eq(TeamMemberTable.userId, ownerUserId)
        )
      );

    if (existingOwner.length === 0) {
      await db
        .insert(TeamMemberTable)
        .values({
          teamId,
          email: ownerEmail ?? '',
          userId: ownerUserId,
          role: 'owner',
          status: 'active',
        })
        .onConflictDoNothing();
    }

    // Dedupe any accidental duplicates by keeping the lowest id
    if ((ownerEmail ?? '').length > 0) {
      const duplicates = await db
        .select({ id: TeamMemberTable.id })
        .from(TeamMemberTable)
        .where(
          and(
            eq(TeamMemberTable.teamId, teamId),
            eq(TeamMemberTable.email, ownerEmail as string)
          )
        );
      if (duplicates.length > 1) {
        const keepId = Math.min(...duplicates.map((d) => d.id));
        const removeIds = duplicates
          .map((d) => d.id)
          .filter((id) => id !== keepId);
        if (removeIds.length > 0) {
          await db
            .delete(TeamMemberTable)
            .where(
              and(
                eq(TeamMemberTable.teamId, teamId),
                eq(TeamMemberTable.email, ownerEmail as string)
              )
            );
          await db
            .insert(TeamMemberTable)
            .values({
              id: keepId,
              teamId,
              email: ownerEmail as string,
              userId: ownerUserId,
              role: 'owner',
              status: 'active',
            })
            .onConflictDoNothing();
        }
      }
    }

    return { id: teamId };
  },

  async listMembers(teamId: string) {
    return await db
      .select({
        id: TeamMemberTable.id,
        teamId: TeamMemberTable.teamId,
        email: TeamMemberTable.email,
        userId: TeamMemberTable.userId,
        role: TeamMemberTable.role,
        status: TeamMemberTable.status,
      })
      .from(TeamMemberTable)
      .where(eq(TeamMemberTable.teamId, teamId));
  },

  async countMembers(teamId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(TeamMemberTable)
      .where(eq(TeamMemberTable.teamId, teamId));
    return Number(row?.value ?? 0);
  },

  async getSeatStatus(ownerUserId: string) {
    const teamId = ownerUserId;
    const used = await this.countMembers(teamId);
    const customerId = await this.findOwnerStripeCustomerId(ownerUserId);
    if (!customerId) {
      return { used, total: 0, available: 0 } as const;
    }
    const sub = await this.findActiveTeamSubscriptionByCustomer(customerId);
    const total = sub?.seats ?? 0;
    const available = Math.max(total - used, 0);

    // Debug logs removed

    return { used, total, available } as const;
  },

  async findOwnerStripeCustomerId(ownerUserId: string) {
    const [owner] = await db
      .select({ stripeCustomerId: UserTable.stripeCustomerId })
      .from(UserTable)
      .where(eq(UserTable.id, ownerUserId));
    return owner?.stripeCustomerId ?? null;
  },

  async findActiveTeamSubscriptionByCustomer(stripeCustomerId: string) {
    const subs = await db
      .select({
        seats: SubscriptionTable.seats,
        plan: SubscriptionTable.plan,
        status: SubscriptionTable.status,
        periodEnd: SubscriptionTable.periodEnd,
        stripeSubscriptionId: SubscriptionTable.stripeSubscriptionId,
      })
      .from(SubscriptionTable)
      .where(eq(SubscriptionTable.stripeCustomerId, stripeCustomerId));
    if (!subs || subs.length === 0) {
      return null;
    }
    // Prefer active team subs; if multiple, pick furthest periodEnd
    const candidates = subs.filter(
      (s) =>
        s.plan === 'voice gecko team' &&
        (s.status === 'active' || s.status === 'trialing')
    );
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((a, b) => {
      const aEnd = a.periodEnd ? a.periodEnd.getTime() : 0;
      const bEnd = b.periodEnd ? b.periodEnd.getTime() : 0;
      return bEnd - aEnd;
    });
    const picked = candidates[0] ?? null;
    if (!picked) {
      return null;
    }
    return {
      seats: picked.seats,
      plan: picked.plan,
      status: picked.status,
      stripeSubscriptionId: picked.stripeSubscriptionId,
    } as const;
  },

  async updateSeatsByStripeSubscriptionId(
    stripeSubscriptionId: string,
    seats: number
  ) {
    await db
      .update(SubscriptionTable)
      .set({ seats })
      .where(eq(SubscriptionTable.stripeSubscriptionId, stripeSubscriptionId));
  },

  async findExistingUserByEmail(email: string) {
    const [user] = await db
      .select({ id: UserTable.id })
      .from(UserTable)
      .where(eq(UserTable.email, email));
    return user ?? null;
  },

  async insertMember(
    teamId: string,
    email: string,
    userId: string | null,
    status: 'active' | 'invited'
  ) {
    const existing = await db
      .select({ id: TeamMemberTable.id })
      .from(TeamMemberTable)
      .where(
        and(
          eq(TeamMemberTable.teamId, teamId),
          eq(TeamMemberTable.email, email)
        )
      );
    if (existing.length === 0) {
      await db
        .insert(TeamMemberTable)
        .values({ teamId, email, userId, role: 'member', status })
        .onConflictDoNothing();
    }
    return { success: true } as const;
  },

  async findMemberUnderTeam(id: number, teamId: string) {
    const [member] = await db
      .select({ role: TeamMemberTable.role })
      .from(TeamMemberTable)
      .where(
        and(eq(TeamMemberTable.id, id), eq(TeamMemberTable.teamId, teamId))
      );
    return member ?? null;
  },

  async deleteMember(id: number, teamId: string) {
    await db
      .delete(TeamMemberTable)
      .where(
        and(eq(TeamMemberTable.id, id), eq(TeamMemberTable.teamId, teamId))
      );
    return { success: true } as const;
  },

  async findMembershipByUser(userId: string) {
    const [row] = await db
      .select({
        id: TeamMemberTable.id,
        teamId: TeamMemberTable.teamId,
        role: TeamMemberTable.role,
        email: TeamMemberTable.email,
      })
      .from(TeamMemberTable)
      .where(eq(TeamMemberTable.userId, userId));
    return row ?? null;
  },

  async getTeamOwnerInfo(teamId: string) {
    const [team] = await db
      .select({ ownerUserId: TeamTable.ownerUserId })
      .from(TeamTable)
      .where(eq(TeamTable.id, teamId));
    if (!team?.ownerUserId) {
      return null;
    }
    const [owner] = await db
      .select({
        id: UserTable.id,
        email: UserTable.email,
        name: UserTable.name,
      })
      .from(UserTable)
      .where(eq(UserTable.id, team.ownerUserId));
    return owner ?? null;
  },

  async deleteMembershipByUser(userId: string, teamId: string) {
    await db
      .delete(TeamMemberTable)
      .where(
        and(
          eq(TeamMemberTable.userId, userId),
          eq(TeamMemberTable.teamId, teamId)
        )
      );
    return { success: true } as const;
  },
};
