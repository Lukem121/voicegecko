import { useQuery } from '@tanstack/react-query';

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

  return {
    transcriptions: query.data?.groups ?? [],
    hasNextPage: query.data?.hasNextPage ?? false,
    nextCursor: query.data?.nextCursor,
    totalResults: query.data?.totalResults,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
