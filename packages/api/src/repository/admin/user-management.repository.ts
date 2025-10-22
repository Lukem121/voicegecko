import { and, eq, gte, inArray, sql } from '@acme/db';
import { db } from '@acme/db/client';
import { DictationTable, UsageTable, user as UserTable } from '@acme/db/schema';

export type UserListParams = {
  search?: string;
  limit?: number;
  cursor?: string;
  activityWindowDays: number;
};

export type UserWithActivity = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
  role: string | null;
  createdAt: Date;
  emailVerified: boolean;
  phoneNumberVerified: boolean | null;
  recentWords?: number;
  recentDictations?: number;
  lastActiveAt?: Date | null;
};

export type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
  role: string | null;
  createdAt: Date;
  emailVerified: boolean;
  phoneNumberVerified: boolean | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  stripeCustomerId: string | null;
  lastActiveAt?: Date | null;
  totalWords: number;
  totalDictations: number;
  monthlyWords: number;
  monthlyDictations: number;
  wordsPerMinute: number;
};

class UserManagementRepository {
  async getUsersWithActivity(params: UserListParams): Promise<{
    users: UserWithActivity[];
    nextCursor?: string;
  }> {
    const { search, limit, cursor, activityWindowDays } = params;

    // Compute start date for recent activity window
    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - activityWindowDays);
    windowStart.setUTCHours(0, 0, 0, 0);

    // Base user selection via Drizzle query API
    const users = await db.query.user.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        username: true,
        displayUsername: true,
        image: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        phoneNumberVerified: true,
      },
      where: (table, { and: _and, or: _or, gt: _gt, ilike: _ilike }) =>
        _and(
          cursor ? _gt(table.id, cursor) : undefined,
          search?.trim()
            ? _or(
                _ilike(table.email, `%${search.trim()}%`),
                _ilike(table.username, `%${search.trim()}%`)
              )
            : undefined
        ),
      orderBy: (table, { asc }) => asc(table.id),
      limit,
    });

    if (users.length === 0) {
      return {
        users: [],
        nextCursor: undefined,
      };
    }

    const userIds = users.map((u) => u.id);

    // Fetch recent activity aggregates for ordering and display
    const activityRows = await db
      .select({
        userId: DictationTable.userId,
        words: sql<number>`COALESCE(SUM(${DictationTable.wordCount}), 0)`,
        dictations: sql<number>`COUNT(*)`,
      })
      .from(DictationTable)
      .where(
        and(
          inArray(DictationTable.userId, userIds),
          gte(DictationTable.createdAt, windowStart)
        )
      )
      .groupBy(DictationTable.userId);

    const usageRows = await db
      .select({
        userId: UsageTable.userId,
        lastResetAt: UsageTable.lastResetAt,
      })
      .from(UsageTable)
      .where(inArray(UsageTable.userId, userIds));

    // Create lookup maps
    const activityMap = new Map(
      activityRows.map((row) => [
        row.userId,
        {
          words: Number(row.words),
          dictations: Number(row.dictations),
        },
      ])
    );

    const usageMap = new Map(
      usageRows.map((row) => [row.userId, row.lastResetAt])
    );

    // Merge data and sort by activity
    const usersWithActivity = users
      .map((user) => ({
        ...user,
        recentWords: activityMap.get(user.id)?.words ?? 0,
        recentDictations: activityMap.get(user.id)?.dictations ?? 0,
        lastActiveAt: usageMap.get(user.id) ?? null,
      }))
      .sort((a, b) => {
        // Sort by recent words (descending), then by recent dictations
        const wordsDiff = (b.recentWords ?? 0) - (a.recentWords ?? 0);
        if (wordsDiff !== 0) {
          return wordsDiff;
        }
        return (b.recentDictations ?? 0) - (a.recentDictations ?? 0);
      });

    const nextCursor = users.length === limit ? users.at(-1)?.id : undefined;

    return {
      users: usersWithActivity,
      nextCursor,
    };
  }

  async getUserById(userId: string): Promise<UserDetail | null> {
    const [user] = await db
      .select({
        id: UserTable.id,
        name: UserTable.name,
        email: UserTable.email,
        username: UserTable.username,
        displayUsername: UserTable.displayUsername,
        image: UserTable.image,
        role: UserTable.role,
        createdAt: UserTable.createdAt,
        emailVerified: UserTable.emailVerified,
        phoneNumberVerified: UserTable.phoneNumberVerified,
        banned: UserTable.banned,
        banReason: UserTable.banReason,
        banExpires: UserTable.banExpires,
        stripeCustomerId: UserTable.stripeCustomerId,
      })
      .from(UserTable)
      .where(eq(UserTable.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Get usage stats
    const [totalStats] = await db
      .select({
        totalWords: sql<number>`COALESCE(SUM(${DictationTable.wordCount}), 0)`,
        totalDictations: sql<number>`COUNT(*)`,
      })
      .from(DictationTable)
      .where(eq(DictationTable.userId, userId));

    // Get monthly stats
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [monthlyStats] = await db
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

    // Get WPM
    const [wpmStats] = await db
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

    const totalWords = Number(wpmStats?.totalWords || 0);
    const totalDurationSeconds = Number(wpmStats?.totalDurationSeconds || 0);
    const wordsPerMinute =
      totalDurationSeconds > 0 && totalWords > 0
        ? Math.round((totalWords / totalDurationSeconds) * 60)
        : 0;

    // Get last active date
    const [lastActive] = await db
      .select({ lastResetAt: UsageTable.lastResetAt })
      .from(UsageTable)
      .where(eq(UsageTable.userId, userId))
      .limit(1);

    return {
      ...user,
      totalWords: Number(totalStats?.totalWords || 0),
      totalDictations: Number(totalStats?.totalDictations || 0),
      monthlyWords: Number(monthlyStats?.monthlyWords || 0),
      monthlyDictations: Number(monthlyStats?.monthlyDictations || 0),
      wordsPerMinute,
      lastActiveAt: lastActive?.lastResetAt ?? null,
    };
  }

  async updateUserProfile(
    userId: string,
    data: { name?: string; displayUsername?: string }
  ): Promise<void> {
    await db
      .update(UserTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, userId));
  }
}

export const userManagementRepository = new UserManagementRepository();
