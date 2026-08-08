import { useInfiniteQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import React, { useMemo } from 'react';

import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import { analytics } from '~/lib/analytics/posthog-analytics';

export type UseInfiniteDictationsParams = {
  limit?: number;
  searchDelay?: number;
};

type LocalDictationRow = {
  id: string;
  content: string;
  engineId?: string | null;
  mode?: string | null;
  createdAt: string;
};

type DictationGroup = {
  date: string;
  items: {
    id: string;
    timestamp: string;
    content: string;
    status: 'normal' | 'silent';
    createdAt?: string;
  }[];
};

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

const groupRows = (rows: LocalDictationRow[]): DictationGroup[] => {
  const groupsMap = new Map<string, DictationGroup>();

  for (const row of rows) {
    const date = row.createdAt ? new Date(row.createdAt) : new Date();
    const dateLabel = getLocalDateLabel(date);
    const localTime = getLocalTime(date);
    const status: 'normal' | 'silent' =
      row.content === 'Audio is silent.' ? 'silent' : 'normal';

    if (!groupsMap.has(dateLabel)) {
      groupsMap.set(dateLabel, { date: dateLabel, items: [] });
    }

    const group = groupsMap.get(dateLabel);
    if (!group) {
      continue;
    }

    if (!group.items.some((existing) => existing.id === row.id)) {
      group.items.push({
        id: row.id,
        timestamp: localTime,
        content: row.content,
        status,
        createdAt: row.createdAt,
      });
    }
  }

  const result = Array.from(groupsMap.values()).map((g) => ({
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
};

export const useInfiniteDictations = ({
  limit = 20,
  searchDelay = 300,
}: UseInfiniteDictationsParams = {}) => {
  const search = useDebouncedSearch({ delay: searchDelay });

  React.useEffect(() => {
    if (search.debouncedSearchTerm) {
      analytics.track('dictation_searched', {
        search_term_length: search.debouncedSearchTerm.length,
        search_type: 'local_search',
      });

      analytics.trackFeatureFirstUse('dictation_search');
    }
  }, [search.debouncedSearchTerm]);

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['local-dictations', limit, search.debouncedSearchTerm],
    queryFn: async ({ pageParam }) => {
      const rows = await invoke<LocalDictationRow[]>('list_local_dictations', {
        limit,
        search: search.debouncedSearchTerm || null,
        cursor: pageParam ?? null,
      });
      const totalResults = await invoke<number>('count_local_dictations', {
        search: search.debouncedSearchTerm || null,
      });
      const nextCursor =
        rows.length === limit ? (rows.at(-1)?.id ?? undefined) : undefined;
      return { rows, totalResults, nextCursor };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const dictations = useMemo(() => {
    if (!infiniteQuery.data) {
      return [];
    }
    const allRows = infiniteQuery.data.pages.flatMap((page) => page.rows);
    return groupRows(allRows);
  }, [infiniteQuery.data]);

  const totalResults = infiniteQuery.data?.pages[0]?.totalResults;

  return {
    searchTerm: search.searchTerm,
    debouncedSearchTerm: search.debouncedSearchTerm,
    isSearching: search.isSearching,
    handleSearch: search.setSearchTerm,
    clearSearch: search.clearSearch,
    dictations,
    totalResults,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
    error: infiniteQuery.error,
    isFuzzySearch: false,
  };
};
