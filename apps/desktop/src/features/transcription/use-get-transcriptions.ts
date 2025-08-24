import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { trpc } from '~/trpc';

export type UseGetTranscriptionsParams = {
  cursor?: number;
  limit?: number;
  search?: string;
};

export const useGetTranscriptions = (
  params: UseGetTranscriptionsParams = {}
) => {
  const { cursor, limit = 20, search } = params;

  const query = useQuery(
    trpc.transcription.getAll.queryOptions({
      cursor,
      limit,
      search,
    })
  );

  const transcriptions = React.useMemo(() => {
    const groups = query.data?.groups;
    if (!groups) {
      return [] as Array<{
        date: string;
        items: Array<{
          id: number;
          timestamp: string;
          content: string;
          status: 'normal' | 'silent';
          createdAt?: string;
        }>;
      }>;
    }

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const getLocalDateLabel = (date: Date) => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (isSameDay(date, today)) {
        return 'TODAY';
      }
      if (isSameDay(date, yesterday)) {
        return 'YESTERDAY';
      }

      return date
        .toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        .toUpperCase();
    };

    const getLocalTime = (date: Date) =>
      date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

    const groupedMap = new Map<
      string,
      {
        date: string;
        items: Array<{
          id: number;
          timestamp: string;
          content: string;
          status: 'normal' | 'silent';
          createdAt?: string;
        }>;
      }
    >();

    for (const group of groups) {
      for (const item of group.items) {
        const date = item.createdAt ? new Date(item.createdAt) : undefined;
        const dateLabel = date ? getLocalDateLabel(date) : group.date;
        const localTime = date ? getLocalTime(date) : item.timestamp;

        let existing = groupedMap.get(dateLabel);
        if (!existing) {
          existing = { date: dateLabel, items: [] };
          groupedMap.set(dateLabel, existing);
        }

        existing.items.push({
          id: item.id,
          timestamp: localTime,
          content: item.content,
          status: item.status,
          createdAt: item.createdAt,
        });
      }
    }

    const result = Array.from(groupedMap.values()).map((g) => ({
      ...g,
      items: g.items.sort((a, b) => b.id - a.id),
    }));

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
  }, [query.data]);

  return {
    transcriptions,
    hasNextPage: query.data?.hasNextPage ?? false,
    nextCursor: query.data?.nextCursor,
    totalResults: query.data?.totalResults,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
