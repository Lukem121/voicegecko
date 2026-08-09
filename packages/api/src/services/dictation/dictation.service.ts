import { log } from '@acme/observability/log';
import { TRPCError } from '@trpc/server';

import type {
  CreateDictationData,
  DictationItem,
} from '../../repository/dictation.repository';
import { dictationRepository } from '../../repository/dictation.repository';
import { countWords } from '../../utils/word-counter';

export type DictationGroup = {
  date: string;
  items: {
    id: number;
    timestamp: string;
    content: string;
    status: 'normal' | 'silent';
    createdAt: string;
  }[];
};

export type PaginationParams = {
  cursor?: number;
  limit: number;
  search?: string;
};

export type PaginatedDictationsResult = {
  groups: DictationGroup[];
  hasNextPage: boolean;
  nextCursor?: number;
  totalResults?: number;
};

export class DictationService {
  async createDictation(data: Omit<CreateDictationData, 'wordCount'>) {
    try {
      // Count words in the content
      const wordCount = countWords(data.content);

      const result = await dictationRepository.create({
        ...data,
        wordCount,
      });
      return result;
    } catch (error) {
      log.error(error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save dictation',
      });
    }
  }

  async getUserDictations(
    userId: string,
    params: PaginationParams = { limit: 20 }
  ): Promise<PaginatedDictationsResult> {
    const { cursor, limit, search } = params;

    // Fetch dictations with pagination and search
    const result = await dictationRepository.findByUserIdPaginated(userId, {
      cursor,
      limit: limit + 1, // Fetch one extra to check if there's a next page
      search,
    });

    const { dictations, totalResults } = result;

    // Check if there are more results
    const hasNextPage = dictations.length > limit;
    const items = hasNextPage ? dictations.slice(0, limit) : dictations;

    // Group dictations by date
    const grouped = this.groupDictationsByDate(items);

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

  async getDictationById(id: number, userId: string) {
    const dictation = await dictationRepository.findById(id, userId);

    if (!dictation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message:
          "Dictation not found or you don't have permission to access it",
      });
    }

    return dictation;
  }

  async deleteDictation(id: number, userId: string) {
    const result = await dictationRepository.deleteById(id, userId);

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message:
          "Dictation not found or you don't have permission to delete it",
      });
    }

    return { success: true };
  }

  private groupDictationsByDate(dictations: DictationItem[]): DictationGroup[] {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = new Map<string, DictationGroup>();

    for (const dictation of dictations) {
      const date = new Date(dictation.createdAt);
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
        id: dictation.id,
        timestamp: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        content: dictation.content,
        status: dictation.status,
        createdAt: dictation.createdAt.toISOString(),
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

export const dictationService = new DictationService();
