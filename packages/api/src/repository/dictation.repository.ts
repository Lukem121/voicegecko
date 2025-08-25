import { and, count, desc, eq, ilike, lt, sql } from '@acme/db';
import { db } from '@acme/db/client';
import { DictationTable } from '@acme/db/schema';

export type CreateDictationData = {
  userId: string;
  content: string;
  status: 'normal' | 'silent';
  durationSeconds?: number;
  modelUsed?: string;
  sampleRate?: number;
  appVersion?: string;
  wordCount: number;
};

export type DictationItem = {
  id: number;
  content: string;
  status: 'normal' | 'silent';
  createdAt: Date;
};

export type FindPaginatedParams = {
  cursor?: number;
  limit: number;
  search?: string;
};

export type PaginatedResult = {
  dictations: DictationItem[];
  totalResults?: number;
};

class DictationRepository {
  async create(data: CreateDictationData) {
    const [result] = await db.insert(DictationTable).values(data).returning();

    return result;
  }

  async findByUserId(userId: string, limit = 100) {
    return await db
      .select({
        id: DictationTable.id,
        content: DictationTable.content,
        status: DictationTable.status,
        createdAt: DictationTable.createdAt,
      })
      .from(DictationTable)
      .where(eq(DictationTable.userId, userId))
      .orderBy(desc(DictationTable.createdAt))
      .limit(limit)
      .then((results) =>
        results.map((row) => ({
          ...row,
          status: row.status,
        }))
      );
  }

  async findByUserIdPaginated(
    userId: string,
    params: FindPaginatedParams
  ): Promise<PaginatedResult> {
    const { cursor, limit, search } = params;

    // Build the base query
    let query = db
      .select({
        id: DictationTable.id,
        content: DictationTable.content,
        status: DictationTable.status,
        createdAt: DictationTable.createdAt,
      })
      .from(DictationTable)
      .where(eq(DictationTable.userId, userId))
      .$dynamic();

    // Add cursor-based pagination (older than cursor ID)
    if (cursor) {
      query = query.where(
        and(eq(DictationTable.userId, userId), lt(DictationTable.id, cursor))
      );
    }

    // Add search filter if provided
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        and(
          eq(DictationTable.userId, userId),
          ilike(DictationTable.content, searchTerm),
          cursor ? lt(DictationTable.id, cursor) : sql`true`
        )
      );
    }

    // Execute the main query
    const dictations = await query
      .orderBy(desc(DictationTable.createdAt))
      .limit(limit)
      .then((results) =>
        results.map((row) => ({
          ...row,
          status: row.status,
        }))
      );

    // Get total count for search results (optional, only when searching)
    let totalResults: number | undefined;
    if (search?.trim()) {
      const countResult = await db
        .select({ count: count() })
        .from(DictationTable)
        .where(
          and(
            eq(DictationTable.userId, userId),
            ilike(DictationTable.content, `%${search.trim()}%`)
          )
        );

      totalResults = countResult[0]?.count ?? 0;
    }

    return {
      dictations,
      totalResults,
    };
  }

  async findById(id: number, userId: string) {
    const [result] = await db
      .select({
        id: DictationTable.id,
        content: DictationTable.content,
        status: DictationTable.status,
        createdAt: DictationTable.createdAt,
        userId: DictationTable.userId,
      })
      .from(DictationTable)
      .where(and(eq(DictationTable.id, id), eq(DictationTable.userId, userId)))
      .limit(1);

    return result;
  }

  async deleteById(id: number, userId: string) {
    const [result] = await db
      .delete(DictationTable)
      .where(and(eq(DictationTable.id, id), eq(DictationTable.userId, userId)))
      .returning();

    return result;
  }
}

export const dictationRepository = new DictationRepository();
