import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';

import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import analytics from '~/lib/analytics/posthog-analytics';
import { trpc } from '~/trpc';

export type SortBy = 'alphabetical' | 'newest' | 'oldest';

export const useGetDictionary = () => {
  const [sortBy, setSortBy] = useState<SortBy>('alphabetical');
  const search = useDebouncedSearch({ delay: 300 });

  // Fetch dictionary entries
  const query = useQuery(
    trpc.dictionary.getAll.queryOptions({
      sortBy,
    })
  );

  // Perform client-side fuzzy search when search term is present
  const filteredEntries = useMemo(() => {
    if (!query.data?.entries) { return []; }
    if (!search.debouncedSearchTerm) { return query.data.entries; }

    const fuse = new Fuse(query.data.entries, {
      keys: ['word'],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(search.debouncedSearchTerm);
    const filteredResults = results.map((result) => result.item);

    // Track search usage
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
    maxEntries: query.data?.maxEntries ?? 75,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Search functionality
    searchTerm: search.searchTerm,
    debouncedSearchTerm: search.debouncedSearchTerm,
    isSearching: search.isSearching,
    setSearchTerm: search.setSearchTerm,
    clearSearch: search.clearSearch,

    // Sort functionality
    sortBy,
    setSortBy,
  };
};
