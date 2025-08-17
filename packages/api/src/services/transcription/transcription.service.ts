import { log } from '@acme/observability/log';
import { TRPCError } from '@trpc/server';

import type {
  CreateTranscriptionData,
  TranscriptionItem,
} from '../../repository/transcription.repository';
import { transcriptionRepository } from '../../repository/transcription.repository';
import { countWords } from '../../utils/word-counter';

export type TranscriptionGroup = {
  date: string;
  items: {
    id: number;
    timestamp: string;
    content: string;
    status: 'normal' | 'silent';
  }[];
};

export type PaginationParams = {
  cursor?: number;
  limit: number;
  search?: string;
};

export type PaginatedTranscriptionsResult = {
  groups: TranscriptionGroup[];
  hasNextPage: boolean;
  nextCursor?: number;
  totalResults?: number;
};

export class TranscriptionService {
  async createTranscription(data: Omit<CreateTranscriptionData, 'wordCount'>) {
    try {
      // Count words in the content
      const wordCount = countWords(data.content);

      const result = await transcriptionRepository.create({
        ...data,
        wordCount,
      });
      return result;
    } catch (error) {
      log.error(error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save transcription',
      });
    }
  }

  async getUserTranscriptions(
    userId: string,
    params: PaginationParams = { limit: 20 }
  ): Promise<PaginatedTranscriptionsResult> {
    const { cursor, limit, search } = params;

    // Fetch transcriptions with pagination and search
    const result = await transcriptionRepository.findByUserIdPaginated(userId, {
      cursor,
      limit: limit + 1, // Fetch one extra to check if there's a next page
      search,
    });

    const { transcriptions, totalResults } = result;

    // Check if there are more results
    const hasNextPage = transcriptions.length > limit;
    const items = hasNextPage ? transcriptions.slice(0, limit) : transcriptions;

    // Group transcriptions by date
    const grouped = this.groupTranscriptionsByDate(items);

    // Determine next cursor (ID of the last item)
    const nextCursor =
      hasNextPage && items.length > 0 ? items.at(-1)?.id : undefined;

    return {
      groups: grouped,
      hasNextPage,
      nextCursor,
      totalResults,
    };
  }

  async getTranscriptionById(id: number, userId: string) {
    const transcription = await transcriptionRepository.findById(id, userId);

    if (!transcription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message:
          "Transcription not found or you don't have permission to access it",
      });
    }

    return transcription;
  }

  async deleteTranscription(id: number, userId: string) {
    const result = await transcriptionRepository.deleteById(id, userId);

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message:
          "Transcription not found or you don't have permission to delete it",
      });
    }

    return { success: true };
  }

  private groupTranscriptionsByDate(
    transcriptions: TranscriptionItem[]
  ): TranscriptionGroup[] {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = new Map<string, TranscriptionGroup>();

    for (const transcription of transcriptions) {
      const date = new Date(transcription.createdAt);
      let dateLabel: string;

      if (this.isSameDay(date, today)) {
        dateLabel = 'TODAY';
      } else if (this.isSameDay(date, yesterday)) {
        dateLabel = 'YESTERDAY';
      } else {
        dateLabel = date
          .toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          .toUpperCase();
      }

      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, {
          date: dateLabel,
          items: [],
        });
      }

      const group = groups.get(dateLabel);
      if (!group) {
        continue;
      }

      group.items.push({
        id: transcription.id,
        timestamp: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
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
      if (a.date === 'TODAY') {
        return -1;
      }
      if (b.date === 'TODAY') {
        return 1;
      }
      if (a.date === 'YESTERDAY') {
        return -1;
      }
      if (b.date === 'YESTERDAY') {
        return 1;
      }
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
