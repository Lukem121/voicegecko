import { and, count, desc, eq, ilike, lt, sql } from "@acme/db";
import { db } from "@acme/db/client";
import { TranscriptionTable } from "@acme/db/schema";

export interface CreateTranscriptionData {
  userId: string;
  content: string;
  status: "normal" | "silent";
  durationSeconds?: number;
  modelUsed?: string;
  sampleRate?: number;
  appVersion?: string;
  wordCount: number;
}

export interface TranscriptionItem {
  id: number;
  content: string;
  status: "normal" | "silent";
  createdAt: Date;
}

export interface FindPaginatedParams {
  cursor?: number;
  limit: number;
  search?: string;
}

export interface PaginatedResult {
  transcriptions: TranscriptionItem[];
  totalResults?: number;
}

class TranscriptionRepository {
  async create(data: CreateTranscriptionData) {
    const [result] = await db
      .insert(TranscriptionTable)
      .values(data)
      .returning();

    return result;
  }

  async findByUserId(userId: string, limit = 100) {
    return db
      .select({
        id: TranscriptionTable.id,
        content: TranscriptionTable.content,
        status: TranscriptionTable.status,
        createdAt: TranscriptionTable.createdAt,
      })
      .from(TranscriptionTable)
      .where(eq(TranscriptionTable.userId, userId))
      .orderBy(desc(TranscriptionTable.createdAt))
      .limit(limit)
      .then((results) =>
        results.map((row) => ({
          ...row,
          status: row.status,
        })),
      );
  }

  async findByUserIdPaginated(
    userId: string,
    params: FindPaginatedParams,
  ): Promise<PaginatedResult> {
    const { cursor, limit, search } = params;

    // Build the base query
    let query = db
      .select({
        id: TranscriptionTable.id,
        content: TranscriptionTable.content,
        status: TranscriptionTable.status,
        createdAt: TranscriptionTable.createdAt,
      })
      .from(TranscriptionTable)
      .where(eq(TranscriptionTable.userId, userId))
      .$dynamic();

    // Add cursor-based pagination (older than cursor ID)
    if (cursor) {
      query = query.where(
        and(
          eq(TranscriptionTable.userId, userId),
          lt(TranscriptionTable.id, cursor),
        ),
      );
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        and(
          eq(TranscriptionTable.userId, userId),
          ilike(TranscriptionTable.content, searchTerm),
          cursor ? lt(TranscriptionTable.id, cursor) : sql`true`,
        ),
      );
    }

    // Execute the main query
    const transcriptions = await query
      .orderBy(desc(TranscriptionTable.createdAt))
      .limit(limit)
      .then((results) =>
        results.map((row) => ({
          ...row,
          status: row.status,
        })),
      );

    // Get total count for search results (optional, only when searching)
    let totalResults: number | undefined;
    if (search && search.trim()) {
      const countResult = await db
        .select({ count: count() })
        .from(TranscriptionTable)
        .where(
          and(
            eq(TranscriptionTable.userId, userId),
            ilike(TranscriptionTable.content, `%${search.trim()}%`),
          ),
        );

      totalResults = countResult[0]?.count ?? 0;
    }

    return {
      transcriptions,
      totalResults,
    };
  }

  async deleteById(id: number, userId: string) {
    const [result] = await db
      .delete(TranscriptionTable)
      .where(
        and(
          eq(TranscriptionTable.id, id),
          eq(TranscriptionTable.userId, userId),
        ),
      )
      .returning();

    return result;
  }
}

export const transcriptionRepository = new TranscriptionRepository();
