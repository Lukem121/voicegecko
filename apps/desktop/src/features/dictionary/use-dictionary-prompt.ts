import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export const useDictionaryPrompt = () => {
  const query = useQuery({
    queryKey: ['local-dictionary-prompt'],
    queryFn: async () => {
      return (await invoke<string | null>('get_local_dictionary_prompt')) ?? '';
    },
  });

  return {
    prompt: query.data ?? '',
    isLoading: query.isLoading,
    error: query.error,
  };
};
