import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/trpc";

export const useGetTranscriptions = () => {
  const options = trpc.transcription.getAll.queryOptions();
  const query = useQuery(options);

  return {
    ...query,
    transcriptions: query.data ?? [],
  };
};
