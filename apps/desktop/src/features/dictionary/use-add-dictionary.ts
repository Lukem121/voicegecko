import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { dictionaryService } from '~/services/dictionary.service';

export const useAddDictionary = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { word: string }) => {
      return await invoke<{ id: string; word: string; createdAt: number }>(
        'add_local_dictionary_word',
        { word: input.word }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['local-dictionary'] });
      await dictionaryService.refreshPromptCache();
    },
  });

  return {
    addWord: async (input: { word: string }) => {
      return await mutation.mutateAsync(input);
    },
    isAdding: mutation.isPending,
    error: mutation.error,
  };
};
