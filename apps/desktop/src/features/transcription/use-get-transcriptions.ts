import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/trpc";

export const useGetTranscriptions = () => {
  const query = useQuery(trpc.transcription.getAll.queryOptions());

  return {
    transcriptions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
