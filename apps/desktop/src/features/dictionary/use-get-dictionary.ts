import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';

import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import analytics from '~/lib/analytics/posthog-analytics';

export type SortBy = 'alphabetical' | 'newest' | 'oldest';

export type LocalDictionaryEntry = {
  id: string;
  word: string;
  createdAt: number;
};

type LocalDictionaryRow = {
  id: string;
  word: string;
  createdAt: number;
};

export const useGetDictionary = () => {
  const [sortBy, setSortBy] = useState<SortBy>('alphabetical');
  const search = useDebouncedSearch({ delay: 300 });

  const query = useQuery({
    queryKey: ['local-dictionary', sortBy],
    queryFn: async () => {
      const rows = await invoke<LocalDictionaryRow[]>('list_local_dictionary', {
        sortBy,
      });
      return {
        entries: rows.map((row) => ({
          id: row.id,
          word: row.word,
          createdAt: row.createdAt,
        })),
        count: rows.length,
        maxEntries: 10_000,
      };
    },
  });

  const filteredEntries = useMemo(() => {
    if (!query.data?.entries) {
      return [];
    }
    if (!search.debouncedSearchTerm) {
      return query.data.entries;
    }

    const fuse = new Fuse(query.data.entries, {
      keys: ['word'],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(search.debouncedSearchTerm);
    const filteredResults = results.map((result) => result.item);

    analytics.track('dictionary_searched', {
      search_term_length: search.debouncedSearchTerm.length,
      results_count: filteredResults.length,
      search_type: 'fuzzy',
    });

    return filteredResults;
  }, [query.data?.entries, search.debouncedSearchTerm]);

  return {
    entries: filteredEntries,
    count: query.data?.count ?? 0,
    maxEntries: query.data?.maxEntries ?? 10_000,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    searchTerm: search.searchTerm,
    debouncedSearchTerm: search.debouncedSearchTerm,
    isSearching: search.isSearching,
    setSearchTerm: search.setSearchTerm,
    clearSearch: search.clearSearch,
    sortBy,
    setSortBy,
  };
};
