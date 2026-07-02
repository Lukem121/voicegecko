import { TRPCError } from '@trpc/server';

import { usageRepository } from '../../repository/usage.repository';

const FREE_TIER_WEEKLY_WORD_LIMIT = 2000;

export type UserUsageStatus = {
  wordsUsed: number;
  wordsLimit: number;
  dictationCount: number;
  isUnlimited: boolean;
  canTranscribe: boolean;
  weekStartDate: Date;
};

export class UsageService {
  /**
   * Check if a user can perform a dictation based on their current usage
   */
  async canUserTranscribe(userId: string): Promise<boolean> {
    const status = await this.getUserUsageStatus(userId);
    return status.canTranscribe;
  }

  /**
   * Get the current usage status for a user
   */
  async getUserUsageStatus(userId: string): Promise<UserUsageStatus> {
    if (await this.userHasUnlimitedEntitlement(userId)) {
      return this.getUnlimitedUsageStatus();
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
        dictationCount: 0,
      });

      return {
        wordsUsed: 0,
        wordsLimit: FREE_TIER_WEEKLY_WORD_LIMIT,
        dictationCount: 0,
        isUnlimited: false,
        canTranscribe: true,
        weekStartDate: currentWeekStart,
      };
    }

    return {
      wordsUsed: usage.wordsUsed,
      wordsLimit: FREE_TIER_WEEKLY_WORD_LIMIT,
      dictationCount: usage.dictationCount,
      isUnlimited: false,
      canTranscribe: usage.wordsUsed < FREE_TIER_WEEKLY_WORD_LIMIT,
      weekStartDate: usage.weekStartDate,
    };
  }

  /**
   * Update usage after a successful dictation
   */
  async updateUsageAfterDictation(
    userId: string,
    wordCount: number
  ): Promise<void> {
    if (await this.userHasUnlimitedEntitlement(userId)) {
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
        dictationCount: 1,
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
    const [totalStats, monthlyStats, wordsPerMinute] = await Promise.all([
      usageRepository.getTotalUsageStats(userId),
      usageRepository.getMonthlyUsageStats(userId),
      usageRepository.getUserWordsPerMinute(userId),
    ]);

    return {
      current: currentStatus,
      total: {
        words: totalStats.totalWords,
        dictations: totalStats.totalDictations,
        timeSaved: totalStats.totalWords / 40, // minutes (assume 40 words per minute typing speed)
      },
      monthly: {
        words: monthlyStats.monthlyWords,
        dictations: monthlyStats.monthlyDictations,
        timeSaved: monthlyStats.monthlyWords / 40, // minutes
      },
      wordsPerMinute,
    };
  }

  private getUnlimitedUsageStatus(): UserUsageStatus {
    return {
      wordsUsed: 0,
      wordsLimit: 0,
      dictationCount: 0,
      isUnlimited: true,
      canTranscribe: true,
      weekStartDate: new Date(),
    };
  }

  private async userHasUnlimitedEntitlement(userId: string): Promise<boolean> {
    const [hasSubscription, role] = await Promise.all([
      this.userHasActiveSubscription(userId),
      usageRepository.getUserRole(userId),
    ]);

    return hasSubscription || role === 'admin';
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

    // Treat active (and trialing, if Stripe reports it) as entitled.
    // If cancelAtPeriodEnd is true, Stripe keeps status active until period end,
    // so users retain access for the remainder of the billing period.
    const status = subscriptionInfo.subscription.status;
    const entitled = status === 'active' || status === 'trialing';
    return entitled;
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
        dictationCount: 0,
      });

      if (!usage) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create usage record',
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
