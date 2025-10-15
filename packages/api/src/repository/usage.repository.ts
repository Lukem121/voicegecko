import { and, eq, gte, sql } from '@acme/db';
import { db } from '@acme/db/client';
import {
  DictationTable,
  subscription as SubscriptionTable,
  TeamMemberTable,
  TeamTable,
  UsageTable,
  user as UserTable,
} from '@acme/db/schema';
import { stripeClient } from '@acme/payment/stripe';
import { apiEnv } from '../../env';

export type UsageData = {
  userId: string;
  weekStartDate: Date;
  wordsUsed: number;
  dictationCount: number;
};

export type UserSubscriptionInfo = {
  stripeCustomerId: string | null;
  subscription: {
    status: string | null;
    cancelAtPeriodEnd: boolean | null;
  } | null;
};

class UsageRepository {
  async findByUserId(userId: string) {
    const [result] = await db
      .select()
      .from(UsageTable)
      .where(eq(UsageTable.userId, userId));

    return result;
  }

  async upsert(data: UsageData) {
    const [result] = await db
      .insert(UsageTable)
      .values({
        ...data,
        lastResetAt: new Date(),
      })
      .onConflictDoUpdate({
        target: UsageTable.userId,
        set: {
          weekStartDate: data.weekStartDate,
          wordsUsed: data.wordsUsed,
          dictationCount: data.dictationCount,
          lastResetAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  async incrementUsage(userId: string, wordCount: number) {
    const currentUsage = await this.findByUserId(userId);

    if (!currentUsage) {
      // Create new usage record with current week start
      const weekStart = this.getWeekStartDate();
      return this.upsert({
        userId,
        weekStartDate: weekStart,
        wordsUsed: wordCount,
        dictationCount: 1,
      });
    }

    // Increment existing usage
    const [result] = await db
      .update(UsageTable)
      .set({
        wordsUsed: currentUsage.wordsUsed + wordCount,
        dictationCount: currentUsage.dictationCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(UsageTable.userId, userId))
      .returning();

    return result;
  }

  async getUserSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo> {
    const [userRecord] = await db
      .select({ stripeCustomerId: UserTable.stripeCustomerId })
      .from(UserTable)
      .where(eq(UserTable.id, userId));

    if (!userRecord?.stripeCustomerId) {
      // No personal customer; check team membership by owner
      return await this.getTeamBackedSubscriptionInfo(userId);
    }

    // Get all subscriptions for this customer
    const subscriptions = await db
      .select({
        status: SubscriptionTable.status,
        cancelAtPeriodEnd: SubscriptionTable.cancelAtPeriodEnd,
        periodEnd: SubscriptionTable.periodEnd,
      })
      .from(SubscriptionTable)
      .where(
        eq(SubscriptionTable.stripeCustomerId, userRecord.stripeCustomerId)
      );

    // Sort in JavaScript: active subscriptions first, then by period end date
    const sortedSubscriptions = subscriptions.sort((a, b) => {
      // First, prioritize active subscriptions
      if (a.status === 'active' && b.status !== 'active') {
        return -1;
      }
      if (a.status !== 'active' && b.status === 'active') {
        return 1;
      }

      // Then sort by period end date (furthest in future first)
      if (!(a.periodEnd || b.periodEnd)) {
        return 0;
      }
      if (!a.periodEnd) {
        return 1;
      }
      if (!b.periodEnd) {
        return -1;
      }
      return b.periodEnd.getTime() - a.periodEnd.getTime();
    });

    // Get the first subscription (which will be active if one exists)
    const subscription = sortedSubscriptions[0];

    const personal = {
      stripeCustomerId: userRecord.stripeCustomerId,
      subscription: subscription
        ? {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    } satisfies UserSubscriptionInfo;

    // Only treat personal subscription as effective if active/trialing
    if (
      personal.subscription &&
      (personal.subscription.status === 'active' ||
        personal.subscription.status === 'trialing')
    ) {
      return personal;
    }

    // Fallback: query Stripe live for personal customer
    if (userRecord.stripeCustomerId) {
      const list = await stripeClient.subscriptions.list({
        customer: userRecord.stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      const active = list.data.at(0) ?? null;
      if (active) {
        return {
          stripeCustomerId: userRecord.stripeCustomerId,
          subscription: {
            status: active.status,
            cancelAtPeriodEnd: active.cancel_at_period_end ?? false,
          },
        };
      }
    }

    // Fallback to team-backed subscription
    return await this.getTeamBackedSubscriptionInfo(userId);
  }

  /**
   * Resolve subscription via team owner if user is an active team member
   */
  private async getTeamBackedSubscriptionInfo(
    userId: string
  ): Promise<UserSubscriptionInfo> {
    // Find teams where this user is an active member
    const members = await db
      .select({ teamId: TeamMemberTable.teamId })
      .from(TeamMemberTable)
      .where(eq(TeamMemberTable.userId, userId));

    if (members.length === 0) {
      return { stripeCustomerId: null, subscription: null };
    }

    // For simplicity, use the first team
    const teamId = members[0]?.teamId;
    if (!teamId) {
      return { stripeCustomerId: null, subscription: null };
    }

    // Get owner of the team
    const [team] = await db
      .select({ ownerUserId: TeamTable.ownerUserId })
      .from(TeamTable)
      .where(eq(TeamTable.id, teamId));

    if (!team?.ownerUserId) {
      return { stripeCustomerId: null, subscription: null };
    }

    // Get owner's stripe customer id
    const [owner] = await db
      .select({ stripeCustomerId: UserTable.stripeCustomerId })
      .from(UserTable)
      .where(eq(UserTable.id, team.ownerUserId));

    if (!owner?.stripeCustomerId) {
      return { stripeCustomerId: null, subscription: null };
    }

    const subscriptions = await db
      .select({
        status: SubscriptionTable.status,
        cancelAtPeriodEnd: SubscriptionTable.cancelAtPeriodEnd,
        plan: SubscriptionTable.plan,
      })
      .from(SubscriptionTable)
      .where(eq(SubscriptionTable.stripeCustomerId, owner.stripeCustomerId));

    // Prefer team plan with active or trialing status; do not grant via owner's individual plan
    const effective =
      subscriptions.find(
        (s) =>
          (s.status === 'active' || s.status === 'trialing') &&
          s.plan === 'voice gecko team'
      ) ?? null;

    if (effective) {
      return {
        stripeCustomerId: owner.stripeCustomerId,
        subscription: {
          status: effective.status,
          cancelAtPeriodEnd: effective.cancelAtPeriodEnd,
        },
      };
    }

    // Fallback: query Stripe live for owner's customer to detect active team sub
    const list = await stripeClient.subscriptions.list({
      customer: owner.stripeCustomerId,
      status: 'active',
      limit: 5,
      expand: ['data.items'],
    });
    const activeStripe = list.data.find((s) => s.items?.data?.length);
    const item = activeStripe?.items?.data?.[0];
    const priceId = item?.price?.id;
    const isTeam =
      priceId === apiEnv().STRIPE_PRICE_ID_TEAM_MONTHLY ||
      priceId === apiEnv().STRIPE_PRICE_ID_TEAM_YEARLY;
    if (activeStripe && isTeam) {
      return {
        stripeCustomerId: owner.stripeCustomerId,
        subscription: {
          status: activeStripe.status,
          cancelAtPeriodEnd: activeStripe.cancel_at_period_end ?? false,
        },
      };
    }

    return { stripeCustomerId: owner.stripeCustomerId, subscription: null };
  }

  async getTotalUsageStats(userId: string) {
    const [result] = await db
      .select({
        totalWords: sql<number>`COALESCE(SUM(${DictationTable.wordCount}), 0)`,
        totalDictations: sql<number>`COUNT(*)`,
      })
      .from(DictationTable)
      .where(eq(DictationTable.userId, userId));

    return {
      totalWords: Number(result?.totalWords || 0),
      totalDictations: Number(result?.totalDictations || 0),
    };
  }

  async getMonthlyUsageStats(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [result] = await db
      .select({
        monthlyWords: sql<number>`COALESCE(SUM(${DictationTable.wordCount}), 0)`,
        monthlyDictations: sql<number>`COUNT(*)`,
      })
      .from(DictationTable)
      .where(
        and(
          eq(DictationTable.userId, userId),
          gte(DictationTable.createdAt, startOfMonth)
        )
      );

    return {
      monthlyWords: Number(result?.monthlyWords || 0),
      monthlyDictations: Number(result?.monthlyDictations || 0),
    };
  }

  async getUserWordsPerMinute(userId: string) {
    const [result] = await db
      .select({
        totalWords: sql<number>`COALESCE(SUM(${DictationTable.wordCount}), 0)`,
        totalDurationSeconds: sql<number>`COALESCE(SUM(${DictationTable.durationSeconds}), 0)`,
      })
      .from(DictationTable)
      .where(
        and(
          eq(DictationTable.userId, userId),
          sql`${DictationTable.durationSeconds} IS NOT NULL AND ${DictationTable.durationSeconds} > 0`
        )
      );

    const totalWords = Number(result?.totalWords || 0);
    const totalDurationSeconds = Number(result?.totalDurationSeconds || 0);

    if (totalDurationSeconds === 0 || totalWords === 0) {
      return 0; // No data available
    }

    // Calculate words per minute: (words / seconds) * 60
    return Math.round((totalWords / totalDurationSeconds) * 60);
  }

  private getWeekStartDate(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysUntilMonday);
    weekStart.setUTCHours(0, 0, 0, 0);
    return weekStart;
  }
}

export const usageRepository = new UsageRepository();
