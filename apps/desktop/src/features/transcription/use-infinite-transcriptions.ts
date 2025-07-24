import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";

import { useDebouncedSearch } from "~/hooks/use-debounced-search";
import { trpc } from "~/trpc";
import { useGetTranscriptions } from "./use-get-transcriptions";

export interface UseInfiniteTranscriptionsParams {
  limit?: number;
  searchDelay?: number;
}

interface TranscriptionGroup {
  date: string;
  items: {
    id: number;
    timestamp: string;
    content: string;
    status: "normal" | "silent";
  }[];
}

export const useInfiniteTranscriptions = ({
  limit = 20,
  searchDelay = 300,
}: UseInfiniteTranscriptionsParams = {}) => {
  const search = useDebouncedSearch({ delay: searchDelay });

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
      },
    ),
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
      !shouldUseFuzzySearch ||
      !search.debouncedSearchTerm ||
      allTranscriptions.length === 0
    ) {
      return [];
    }

    // Flatten all items for fuzzy search
    const allItems = allTranscriptions.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        groupDate: group.date,
      })),
    );

    const fuse = new Fuse(allItems, {
      keys: ["content"],
      threshold: 0.4,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(search.debouncedSearchTerm);

    // Group fuzzy results back by date
    const groupedResults = fuzzyResults.reduce((acc, { item }) => {
      const existingGroup = acc.find((g) => g.date === item.groupDate);
      if (existingGroup) {
        existingGroup.items.push({
          id: item.id,
          timestamp: item.timestamp,
          content: item.content,
          status: item.status,
        });
      } else {
        acc.push({
          date: item.groupDate,
          items: [
            {
              id: item.id,
              timestamp: item.timestamp,
              content: item.content,
              status: item.status,
            },
          ],
        });
      }
      return acc;
    }, [] as TranscriptionGroup[]);

    return groupedResults;
  }, [shouldUseFuzzySearch, search.debouncedSearchTerm, allTranscriptions]);

  // Flatten and merge all groups from all pages with stable sorting
  const serverTranscriptions = useMemo(() => {
    if (!infiniteQuery.data) return [];

    const allGroups = infiniteQuery.data.pages.flatMap((page) => page.groups);

    // Merge groups with the same date across pages, maintaining item order
    const mergedGroups = allGroups.reduce((acc, group) => {
      const existingGroup = acc.find((g) => g.date === group.date);
      if (existingGroup) {
        // Ensure stable ordering by checking for duplicates and maintaining sort order
        const newItems = group.items.filter(
          (newItem) =>
            !existingGroup.items.some((existing) => existing.id === newItem.id),
        );
        existingGroup.items.push(...newItems);
        // Sort items by ID to maintain consistent order
        existingGroup.items.sort((a, b) => b.id - a.id);
      } else {
        acc.push({
          ...group,
          items: [...group.items].sort((a, b) => b.id - a.id),
        });
      }
      return acc;
    }, [] as TranscriptionGroup[]);

    return mergedGroups;
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
