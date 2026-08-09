import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import React from 'react';

export type UseGetDictationsParams = {
  cursor?: string;
  limit?: number;
  search?: string;
};

type LocalDictationRow = {
  id: string;
  content: string;
  engineId?: string | null;
  mode?: string | null;
  createdAt: string;
};

export const useGetDictations = (params: UseGetDictationsParams = {}) => {
  const { cursor, limit = 20, search } = params;

  const query = useQuery({
    queryKey: ['local-dictations', 'get', cursor, limit, search],
    queryFn: async () => {
      const rows = await invoke<LocalDictationRow[]>('list_local_dictations', {
        limit,
        search: search || null,
        cursor: cursor || null,
      });
      const totalResults = await invoke<number>('count_local_dictations', {
        search: search || null,
      });
      return { rows, totalResults, hasNextPage: rows.length === limit };
    },
  });

  const dictations = React.useMemo(() => {
    const rows = query.data?.rows;
    if (!rows) {
      return [] as Array<{
        date: string;
        items: Array<{
          id: string;
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
          id: string;
          timestamp: string;
          content: string;
          status: 'normal' | 'silent';
          createdAt?: string;
        }>;
      }
    >();

    for (const item of rows) {
      const date = item.createdAt ? new Date(item.createdAt) : new Date();
      const dateLabel = getLocalDateLabel(date);
      const localTime = getLocalTime(date);
      const status: 'normal' | 'silent' =
        item.content === 'Audio is silent.' ? 'silent' : 'normal';

      let existing = groupedMap.get(dateLabel);
      if (!existing) {
        existing = { date: dateLabel, items: [] };
        groupedMap.set(dateLabel, existing);
      }

      existing.items.push({
        id: item.id,
        timestamp: localTime,
        content: item.content,
        status,
        createdAt: item.createdAt,
      });
    }

    const result = Array.from(groupedMap.values()).map((g) => ({
      ...g,
      items: g.items.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
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
    dictations,
    hasNextPage: query.data?.hasNextPage ?? false,
    totalResults: query.data?.totalResults,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
