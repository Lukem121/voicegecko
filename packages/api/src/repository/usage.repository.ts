import { and, eq, gte, sql } from "@acme/db";
import { db } from "@acme/db/client";
import {
  subscription as SubscriptionTable,
  TranscriptionTable,
  UsageTable,
  user as UserTable,
} from "@acme/db/schema";

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

    const [subscription] = await db
      .select({
        status: SubscriptionTable.status,
        cancelAtPeriodEnd: SubscriptionTable.cancelAtPeriodEnd,
      })
      .from(SubscriptionTable)
      .where(
        eq(SubscriptionTable.stripeCustomerId, userRecord.stripeCustomerId),
      );

    return {
      stripeCustomerId: userRecord.stripeCustomerId,
      subscription: subscription || null,
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
          gte(TranscriptionTable.createdAt, startOfMonth),
        ),
      );

    return {
      monthlyWords: Number(result?.monthlyWords || 0),
      monthlyTranscriptions: Number(result?.monthlyTranscriptions || 0),
    };
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
