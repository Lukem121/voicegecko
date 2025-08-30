import { and, desc, eq, sql } from '@acme/db';
import { db } from '@acme/db/client';
import { DictationTable, user as UserTable } from '@acme/db/schema';

class ContentRepository {
  async getAllDictationsPaginated(params: {
    cursor?: number;
    limit: number;
    search?: string;
  }) {
    const { cursor, limit, search } = params;

    // Build the base query
    let query = db
      .select({
        id: DictationTable.id,
        content: DictationTable.content,
        createdAt: DictationTable.createdAt,
        userId: DictationTable.userId,
        userEmail: UserTable.email,
        userDisplayName: UserTable.displayUsername,
      })
      .from(DictationTable)
      .innerJoin(UserTable, eq(DictationTable.userId, UserTable.id))
      .$dynamic();

    // Add cursor-based pagination
    if (cursor) {
      query = query.where(sql`${DictationTable.id} < ${cursor}`);
    }

    // Add search filter if provided
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        and(
          cursor ? sql`${DictationTable.id} < ${cursor}` : sql`true`,
          sql`${DictationTable.content} ILIKE ${searchTerm}`
        )
      );
    }

    // Execute the query
    const dictations = await query
      .orderBy(desc(DictationTable.createdAt))
      .limit(limit + 1); // Fetch one extra to check if there's a next page

    const hasNextPage = dictations.length > limit;
    const items = hasNextPage ? dictations.slice(0, limit) : dictations;
    const nextCursor =
      hasNextPage && items.length > 0 ? items.at(-1)?.id : undefined;

    return {
      dictations: items,
      hasNextPage,
      nextCursor,
    };
  }
}

export const contentRepository = new ContentRepository();
