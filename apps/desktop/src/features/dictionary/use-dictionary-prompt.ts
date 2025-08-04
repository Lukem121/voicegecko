import { useQuery } from '@tanstack/react-query';

import { trpc } from '~/trpc';

export const useDictionaryPrompt = () => {
  const query = useQuery(trpc.dictionary.getPrompt.queryOptions());

  return {
    prompt: query.data ?? '',
    isLoading: query.isLoading,
    error: query.error,
  };
};
