import { and, eq, gte, sql } from '@acme/db';
import { db } from '@acme/db/client';
import {
  subscription as SubscriptionTable,
  TranscriptionTable,
  UsageTable,
  user as UserTable,
} from '@acme/db/schema';

export interface UsageData {
  userId: string;
  weekStartDate: Date;
  wordsUsed: number;
  transcriptionCount: number;
}

export interface UserSubscriptionInfo {
  stripeCustomerId: string | null;
  subscription: {
    status: string | null;
    cancelAtPeriodEnd: boolean | null;
  } | null;
}

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
          transcriptionCount: data.transcriptionCount,
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
        transcriptionCount: 1,
      });
    }

    // Increment existing usage
    const [result] = await db
      .update(UsageTable)
      .set({
        wordsUsed: currentUsage.wordsUsed + wordCount,
        transcriptionCount: currentUsage.transcriptionCount + 1,
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
      return { stripeCustomerId: null, subscription: null };
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

    return {
      stripeCustomerId: userRecord.stripeCustomerId,
      subscription: subscription
        ? {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  async getTotalUsageStats(userId: string) {
    const [result] = await db
      .select({
        totalWords: sql<number>`COALESCE(SUM(${TranscriptionTable.wordCount}), 0)`,
        totalTranscriptions: sql<number>`COUNT(*)`,
      })
      .from(TranscriptionTable)
      .where(eq(TranscriptionTable.userId, userId));

    return {
      totalWords: Number(result?.totalWords || 0),
      totalTranscriptions: Number(result?.totalTranscriptions || 0),
    };
  }

  async getMonthlyUsageStats(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [result] = await db
      .select({
        monthlyWords: sql<number>`COALESCE(SUM(${TranscriptionTable.wordCount}), 0)`,
        monthlyTranscriptions: sql<number>`COUNT(*)`,
      })
      .from(TranscriptionTable)
      .where(
        and(
          eq(TranscriptionTable.userId, userId),
          gte(TranscriptionTable.createdAt, startOfMonth)
        )
      );

    return {
      monthlyWords: Number(result?.monthlyWords || 0),
      monthlyTranscriptions: Number(result?.monthlyTranscriptions || 0),
    };
  }

  async getUserWordsPerMinute(userId: string) {
    const [result] = await db
      .select({
        totalWords: sql<number>`COALESCE(SUM(${TranscriptionTable.wordCount}), 0)`,
        totalDurationSeconds: sql<number>`COALESCE(SUM(${TranscriptionTable.durationSeconds}), 0)`,
      })
      .from(TranscriptionTable)
      .where(
        and(
          eq(TranscriptionTable.userId, userId),
          sql`${TranscriptionTable.durationSeconds} IS NOT NULL AND ${TranscriptionTable.durationSeconds} > 0`
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
