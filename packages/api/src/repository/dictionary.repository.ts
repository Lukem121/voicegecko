import { and, asc, desc, eq, ilike } from "drizzle-orm";

import { db } from "@acme/db/client";
import { dictionary as DictionaryTable } from "@acme/db/schema";

import type { Result } from "../types/result";
import { dictionaryError, error, success } from "../types/result";

export const dictionaryRepository = {
  async getAllByUser(
    userId: string,
    params?: {
      search?: string;
      sortBy?: "alphabetical" | "newest" | "oldest";
    },
  ) {
    let query = db
      .select()
      .from(DictionaryTable)
      .where(eq(DictionaryTable.userId, userId))
      .$dynamic();

    if (params?.search) {
      query = query.where(ilike(DictionaryTable.word, `%${params.search}%`));
    }

    if (params?.sortBy === "alphabetical") {
      query = query.orderBy(asc(DictionaryTable.word));
    } else if (params?.sortBy === "newest") {
      query = query.orderBy(desc(DictionaryTable.createdAt));
    } else if (params?.sortBy === "oldest") {
      query = query.orderBy(asc(DictionaryTable.createdAt));
    } else {
      query = query.orderBy(asc(DictionaryTable.word));
    }

    return query;
  },

  async create(
    userId: string,
    word: string,
  ): Promise<Result<typeof DictionaryTable.$inferSelect>> {
    try {
      const existing = await db
        .select()
        .from(DictionaryTable)
        .where(
          and(
            eq(DictionaryTable.userId, userId),
            eq(DictionaryTable.word, word.trim()),
          ),
        );

      if (existing.length > 0) {
        return error(dictionaryError.duplicateWord(word.trim()));
      }

      const [result] = await db
        .insert(DictionaryTable)
        .values({
          userId,
          word: word.trim(),
        })
        .returning();

      if (!result) {
        return error(dictionaryError.databaseError("Failed to create word"));
      }

      return success(result);
    } catch (err) {
      return error(
        dictionaryError.databaseError(
          err instanceof Error ? err.message : "Unknown database error",
        ),
      );
    }
  },

  async update(
    id: number,
    userId: string,
    word: string,
  ): Promise<Result<typeof DictionaryTable.$inferSelect>> {
    try {
      const existing = await db
        .select()
        .from(DictionaryTable)
        .where(
          and(
            eq(DictionaryTable.userId, userId),
            eq(DictionaryTable.word, word.trim()),
          ),
        );

      if (existing.length > 0 && existing[0]?.id !== id) {
        return error(dictionaryError.duplicateWord(word.trim()));
      }

      const [result] = await db
        .update(DictionaryTable)
        .set({
          word: word.trim(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(DictionaryTable.id, id), eq(DictionaryTable.userId, userId)),
        )
        .returning();

      if (!result) {
        return error(dictionaryError.wordNotFound(id));
      }

      return success(result);
    } catch (err) {
      return error(
        dictionaryError.databaseError(
          err instanceof Error ? err.message : "Unknown database error",
        ),
      );
    }
  },

  async delete(
    id: number,
    userId: string,
  ): Promise<Result<typeof DictionaryTable.$inferSelect>> {
    try {
      const [result] = await db
        .delete(DictionaryTable)
        .where(
          and(eq(DictionaryTable.id, id), eq(DictionaryTable.userId, userId)),
        )
        .returning();

      if (!result) {
        return error(dictionaryError.wordNotFound(id));
      }

      return success(result);
    } catch (err) {
      return error(
        dictionaryError.databaseError(
          err instanceof Error ? err.message : "Unknown database error",
        ),
      );
    }
  },

  async countByUser(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(DictionaryTable)
      .where(eq(DictionaryTable.userId, userId));

    return result.length;
  },
};
