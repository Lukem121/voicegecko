import { TRPCError } from '@trpc/server';

import { usageRepository } from '../../repository/usage.repository';

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
   * Check if a user can perform a dictation based on their current usage.
   * Voice Gecko is free and open source — all users are unlimited.
   */
  async canUserTranscribe(_userId: string): Promise<boolean> {
    void _userId;
    return true;
  }

  /**
   * Get the current usage status for a user.
   * All users are unlimited; weekly limit fields are kept for API shape compatibility.
   */
  async getUserUsageStatus(_userId: string): Promise<UserUsageStatus> {
    void _userId;
    return this.getUnlimitedUsageStatus();
  }

  /**
   * Update usage after a successful dictation (stats only; never blocks).
   */
  async updateUsageAfterDictation(
    userId: string,
    wordCount: number
  ): Promise<void> {
    const usage = await this.getOrCreateUsageRecord(userId);
    const currentWeekStart = this.getWeekStartDate();
    const needsReset = usage.weekStartDate < currentWeekStart;

    if (needsReset) {
      await usageRepository.upsert({
        userId,
        weekStartDate: currentWeekStart,
        wordsUsed: wordCount,
        dictationCount: 1,
      });
      return;
    }

    await usageRepository.incrementUsage(userId, wordCount);
  }

  /**
   * Get aggregated usage statistics for a user
   */
  async getUserUsageStats(userId: string) {
    const currentStatus = await this.getUserUsageStatus(userId);

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

  /**
   * Get or create usage record for a user
   */
  private async getOrCreateUsageRecord(userId: string) {
    let usage = await usageRepository.findByUserId(userId);

    if (!usage) {
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
