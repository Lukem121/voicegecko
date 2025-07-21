import { TRPCError } from "@trpc/server";

import { usageRepository } from "../../repository/usage.repository";

const FREE_TIER_WEEKLY_WORD_LIMIT = 2000;

export interface UserUsageStatus {
  wordsUsed: number;
  wordsLimit: number;
  transcriptionCount: number;
  isUnlimited: boolean;
  canTranscribe: boolean;
  weekStartDate: Date;
}

export class UsageService {
  /**
   * Check if a user can perform a transcription based on their current usage
   */
  async canUserTranscribe(userId: string): Promise<boolean> {
    const status = await this.getUserUsageStatus(userId);
    return status.canTranscribe;
  }

  /**
   * Get the current usage status for a user
   */
  async getUserUsageStatus(userId: string): Promise<UserUsageStatus> {
    // Check if user has a subscription
    const hasSubscription = await this.userHasActiveSubscription(userId);

    if (hasSubscription) {
      // Pro users have unlimited usage
      return {
        wordsUsed: 0,
        wordsLimit: 0,
        transcriptionCount: 0,
        isUnlimited: true,
        canTranscribe: true,
        weekStartDate: new Date(),
      };
    }

    // Get or create usage record
    const usage = await this.getOrCreateUsageRecord(userId);

    // Check if we need to reset (new week)
    const currentWeekStart = this.getWeekStartDate();
    const needsReset = usage.weekStartDate < currentWeekStart;

    if (needsReset) {
      // Reset usage for new week
      await usageRepository.upsert({
        userId,
        weekStartDate: currentWeekStart,
        wordsUsed: 0,
        transcriptionCount: 0,
      });

      return {
        wordsUsed: 0,
        wordsLimit: FREE_TIER_WEEKLY_WORD_LIMIT,
        transcriptionCount: 0,
        isUnlimited: false,
        canTranscribe: true,
        weekStartDate: currentWeekStart,
      };
    }

    return {
      wordsUsed: usage.wordsUsed,
      wordsLimit: FREE_TIER_WEEKLY_WORD_LIMIT,
      transcriptionCount: usage.transcriptionCount,
      isUnlimited: false,
      canTranscribe: usage.wordsUsed < FREE_TIER_WEEKLY_WORD_LIMIT,
      weekStartDate: usage.weekStartDate,
    };
  }

  /**
   * Update usage after a successful transcription
   */
  async updateUsageAfterTranscription(
    userId: string,
    wordCount: number,
  ): Promise<void> {
    // Skip tracking for pro users
    const hasSubscription = await this.userHasActiveSubscription(userId);
    if (hasSubscription) {
      return;
    }

    // Check if we need to reset before updating
    const usage = await this.getOrCreateUsageRecord(userId);
    const currentWeekStart = this.getWeekStartDate();
    const needsReset = usage.weekStartDate < currentWeekStart;

    if (needsReset) {
      // Reset and then add new usage
      await usageRepository.upsert({
        userId,
        weekStartDate: currentWeekStart,
        wordsUsed: wordCount,
        transcriptionCount: 1,
      });
    } else {
      // Increment existing usage
      await usageRepository.incrementUsage(userId, wordCount);
    }
  }

  /**
   * Get aggregated usage statistics for a user
   */
  async getUserUsageStats(userId: string) {
    // Get current usage status
    const currentStatus = await this.getUserUsageStatus(userId);

    // Get usage stats from repository
    const [totalStats, monthlyStats] = await Promise.all([
      usageRepository.getTotalUsageStats(userId),
      usageRepository.getMonthlyUsageStats(userId),
    ]);

    return {
      current: currentStatus,
      total: {
        words: totalStats.totalWords,
        transcriptions: totalStats.totalTranscriptions,
        timeSaved: totalStats.totalWords / 40 / 60, // hours (assume 40 words per minute typing speed)
      },
      monthly: {
        words: monthlyStats.monthlyWords,
        transcriptions: monthlyStats.monthlyTranscriptions,
        timeSaved: monthlyStats.monthlyWords / 40 / 60, // hours
      },
    };
  }

  /**
   * Check if user has an active subscription
   */
  private async userHasActiveSubscription(userId: string): Promise<boolean> {
    const subscriptionInfo =
      await usageRepository.getUserSubscriptionInfo(userId);

    if (!subscriptionInfo.subscription) {
      return false;
    }

    // Check if subscription is active and not cancelled
    return (
      subscriptionInfo.subscription.status === "active" &&
      !subscriptionInfo.subscription.cancelAtPeriodEnd
    );
  }

  /**
   * Get or create usage record for a user
   */
  private async getOrCreateUsageRecord(userId: string) {
    let usage = await usageRepository.findByUserId(userId);

    if (!usage) {
      // Create initial usage record
      const weekStart = this.getWeekStartDate();
      usage = await usageRepository.upsert({
        userId,
        weekStartDate: weekStart,
        wordsUsed: 0,
        transcriptionCount: 0,
      });

      if (!usage) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create usage record",
        });
      }
    }

    return usage;
  }

  /**
   * Get the start date of the current week (Monday at 00:00 UTC)
   */
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

export const usageService = new UsageService();
