import { TRPCError } from "@trpc/server";

import type {
  CreateTranscriptionData,
  TranscriptionItem,
} from "../../repository/transcription.repository";
import { transcriptionRepository } from "../../repository/transcription.repository";
import { countWords } from "../../utils/word-counter";

export interface TranscriptionGroup {
  date: string;
  items: {
    id: number;
    timestamp: string;
    content: string;
    status: "normal" | "silent";
  }[];
}

export class TranscriptionService {
  async createTranscription(data: Omit<CreateTranscriptionData, "wordCount">) {
    try {
      // Count words in the content
      const wordCount = countWords(data.content);

      const result = await transcriptionRepository.create({
        ...data,
        wordCount,
      });
      return result;
    } catch (error) {
      console.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save transcription",
      });
    }
  }

  async getUserTranscriptions(userId: string): Promise<TranscriptionGroup[]> {
    const transcriptions = await transcriptionRepository.findByUserId(userId);

    // Group transcriptions by date
    const grouped = this.groupTranscriptionsByDate(transcriptions);

    return grouped;
  }

  async deleteTranscription(id: number, userId: string) {
    const result = await transcriptionRepository.deleteById(id, userId);

    if (!result) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Transcription not found or you don't have permission to delete it",
      });
    }

    return { success: true };
  }

  private groupTranscriptionsByDate(
    transcriptions: TranscriptionItem[],
  ): TranscriptionGroup[] {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = new Map<string, TranscriptionGroup>();

    for (const transcription of transcriptions) {
      const date = new Date(transcription.createdAt);
      let dateLabel: string;

      if (this.isSameDay(date, today)) {
        dateLabel = "TODAY";
      } else if (this.isSameDay(date, yesterday)) {
        dateLabel = "YESTERDAY";
      } else {
        dateLabel = date
          .toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
          .toUpperCase();
      }

      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, {
          date: dateLabel,
          items: [],
        });
      }

      const group = groups.get(dateLabel)!;
      group.items.push({
        id: transcription.id,
        timestamp: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        content: transcription.content,
        status: transcription.status,
      });
    }

    // Convert to array and sort by date (TODAY first)
    const result = Array.from(groups.values());

    // Custom sort to ensure TODAY is first, YESTERDAY second, then others
    result.sort((a, b) => {
      if (a.date === "TODAY") return -1;
      if (b.date === "TODAY") return 1;
      if (a.date === "YESTERDAY") return -1;
      if (b.date === "YESTERDAY") return 1;
      return 0;
    });

    return result;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}

export const transcriptionService = new TranscriptionService();
