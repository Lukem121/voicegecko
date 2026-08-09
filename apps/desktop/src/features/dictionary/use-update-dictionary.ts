import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { dictionaryService } from '~/services/dictionary.service';

export const useUpdateDictionary = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string; word: string }) => {
      return await invoke<{ id: string; word: string; createdAt: number }>(
        'update_local_dictionary_word',
        { id: input.id, word: input.word }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['local-dictionary'] });
      await dictionaryService.refreshPromptCache();
    },
  });

  return {
    updateWord: async (input: { id: string; word: string }) => {
      return await mutation.mutateAsync(input);
    },
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
};
