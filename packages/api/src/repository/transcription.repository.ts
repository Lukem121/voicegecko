import { and, desc, eq } from "@acme/db";
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
