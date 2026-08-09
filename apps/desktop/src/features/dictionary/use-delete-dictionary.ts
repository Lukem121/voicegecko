import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { dictionaryService } from '~/services/dictionary.service';

export const useDeleteDictionary = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string }) => {
      await invoke('delete_local_dictionary_word', { id: input.id });
      return { id: input.id };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['local-dictionary'] });
      await dictionaryService.refreshPromptCache();
    },
  });

  return {
    deleteWord: async (input: { id: string }) => {
      return await mutation.mutateAsync(input);
    },
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
