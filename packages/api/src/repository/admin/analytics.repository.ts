import { gte, sql } from '@acme/db';
import { db } from '@acme/db/client';
import { DictationTable, user as UserTable } from '@acme/db/schema';

export type DailyStats = {
  day: string;
  words: number;
  dictations: number;
  signups: number;
};

class AnalyticsRepository {
  async getDailyStats(days: number): Promise<DailyStats[]> {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    // Get dictation/word stats
    const dictationStats = await db
      .select({
        day: sql<string>`DATE(${DictationTable.createdAt})`,
        words: sql<number>`COALESCE(SUM(${DictationTable.wordCount}), 0)`,
        dictations: sql<number>`COUNT(*)`,
      })
      .from(DictationTable)
      .where(gte(DictationTable.createdAt, startDate))
      .groupBy(sql`DATE(${DictationTable.createdAt})`)
      .orderBy(sql`DATE(${DictationTable.createdAt})`);

    // Get signup stats
    const signupStats = await db
      .select({
        day: sql<string>`DATE(${UserTable.createdAt})`,
        signups: sql<number>`COUNT(*)`,
      })
      .from(UserTable)
      .where(gte(UserTable.createdAt, startDate))
      .groupBy(sql`DATE(${UserTable.createdAt})`)
      .orderBy(sql`DATE(${UserTable.createdAt})`);

    // Merge the data
    const dictationMap = new Map(
      dictationStats.map((row) => [
        row.day,
        {
          words: Number(row.words),
          dictations: Number(row.dictations),
        },
      ])
    );

    const signupMap = new Map(
      signupStats.map((row) => [row.day, Number(row.signups)])
    );

    // Generate all days in range
    const result: DailyStats[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + i);
      const dayStr = date.toISOString().split('T')[0];

      if (!dayStr) {
        continue;
      }

      const dictationData = dictationMap.get(dayStr);
      const signupCount = signupMap.get(dayStr) || 0;

      result.push({
        day: dayStr,
        words: dictationData?.words || 0,
        dictations: dictationData?.dictations || 0,
        signups: signupCount,
      });
    }

    return result;
  }
}

export const analyticsRepository = new AnalyticsRepository();
