import { useInfiniteQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import React, { useMemo } from 'react';

import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import { analytics } from '~/lib/analytics/posthog-analytics';
import { trpc } from '~/trpc';
import { useGetTranscriptions } from './use-get-transcriptions';

export type UseInfiniteTranscriptionsParams = {
  limit?: number;
  searchDelay?: number;
};

type TranscriptionGroup = {
  date: string;
  items: {
    id: number;
    timestamp: string;
    content: string;
    status: 'normal' | 'silent';
    createdAt?: string;
  }[];
};

export const useInfiniteTranscriptions = ({
  limit = 20,
  searchDelay = 300,
}: UseInfiniteTranscriptionsParams = {}) => {
  const search = useDebouncedSearch({ delay: searchDelay });

  // Track search usage
  React.useEffect(() => {
    if (search.debouncedSearchTerm) {
      analytics.track('transcription_searched', {
        search_term_length: search.debouncedSearchTerm.length,
        search_type: 'server_search',
      });

      analytics.trackFeatureFirstUse('transcription_search');
    }
  }, [search.debouncedSearchTerm]);

  // Main infinite query for transcriptions
  const infiniteQuery = useInfiniteQuery(
    trpc.transcription.getAll.infiniteQueryOptions(
      {
        limit,
        search: search.debouncedSearchTerm || undefined,
      },
      {
        getNextPageParam: (lastPage) => {
          return lastPage.hasNextPage ? lastPage.nextCursor : undefined;
        },
      }
    )
  );

  // Fallback query for fuzzy search when server search returns no results
  const shouldUseFuzzySearch =
    search.debouncedSearchTerm &&
    (infiniteQuery.data?.pages[0]?.groups.length === 0 ||
      !infiniteQuery.data) &&
    !infiniteQuery.isLoading;

  const { transcriptions: allTranscriptions } = useGetTranscriptions({
    limit: 50, // Get more for fuzzy search (max allowed by backend is 50)
  });

  // Perform fuzzy search with memoization
  const fuzzySearchResults = useMemo(() => {
    if (
      !(shouldUseFuzzySearch && search.debouncedSearchTerm) ||
      allTranscriptions.length === 0
    ) {
      return [];
    }

    // Flatten all items for fuzzy search
    const allItems = allTranscriptions.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        groupDate: group.date,
      }))
    );

    const fuse = new Fuse(allItems, {
      keys: ['content'],
      threshold: 0.4,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(search.debouncedSearchTerm);

    // Helper functions for local formatting
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

    // Group fuzzy results back by local date
    const groupedResults = fuzzyResults.reduce((acc, { item }) => {
      const date = item.createdAt ? new Date(item.createdAt) : undefined;
      const dateLabel = date ? getLocalDateLabel(date) : item.groupDate;
      const localTime = date ? getLocalTime(date) : item.timestamp;

      const existingGroup = acc.find((g) => g.date === dateLabel);
      if (existingGroup) {
        existingGroup.items.push({
          id: item.id,
          timestamp: localTime,
          content: item.content,
          status: item.status,
          createdAt: item.createdAt,
        });
      } else {
        acc.push({
          date: dateLabel,
          items: [
            {
              id: item.id,
              timestamp: localTime,
              content: item.content,
              status: item.status,
              createdAt: item.createdAt,
            },
          ],
        });
      }
      return acc;
    }, [] as TranscriptionGroup[]);

    return groupedResults;
  }, [shouldUseFuzzySearch, search.debouncedSearchTerm, allTranscriptions]);

  // Flatten, reformat to local, and regroup all items from all pages
  const serverTranscriptions = useMemo(() => {
    if (!infiniteQuery.data) {
      return [];
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

    const allItems = infiniteQuery.data.pages.flatMap((page) =>
      page.groups.flatMap((group) => group.items)
    );

    const groupsMap = new Map<string, TranscriptionGroup>();

    for (const item of allItems) {
      const date = item.createdAt ? new Date(item.createdAt) : undefined;
      const dateLabel = date ? getLocalDateLabel(date) : 'UNKNOWN DATE';
      const localTime = date ? getLocalTime(date) : item.timestamp;

      if (!groupsMap.has(dateLabel)) {
        groupsMap.set(dateLabel, { date: dateLabel, items: [] });
      }

      const group = groupsMap.get(dateLabel);
      if (!group) {
        continue;
      }

      if (!group.items.some((existing) => existing.id === item.id)) {
        group.items.push({
          id: item.id,
          timestamp: localTime,
          content: item.content,
          status: item.status,
          createdAt: item.createdAt,
        });
      }
    }

    const result = Array.from(groupsMap.values()).map((g) => ({
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
  }, [infiniteQuery.data]);

  const transcriptions = shouldUseFuzzySearch
    ? fuzzySearchResults
    : serverTranscriptions;
  const totalResults = shouldUseFuzzySearch
    ? fuzzySearchResults.length
    : infiniteQuery.data?.pages[0]?.totalResults;

  const handleSearch = (value: string) => {
    search.setSearchTerm(value);
  };

  const clearSearch = () => {
    search.clearSearch();
  };

  return {
    // Search state
    searchTerm: search.searchTerm,
    debouncedSearchTerm: search.debouncedSearchTerm,
    isSearching: search.isSearching,
    handleSearch,
    clearSearch,

    // Data
    transcriptions,
    totalResults,

    // Loading states
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: shouldUseFuzzySearch ? false : infiniteQuery.hasNextPage,

    // Actions
    fetchNextPage: infiniteQuery.fetchNextPage,
    refetch: infiniteQuery.refetch,
    error: infiniteQuery.error,

    // Metadata
    isFuzzySearch: shouldUseFuzzySearch,
  };
};
