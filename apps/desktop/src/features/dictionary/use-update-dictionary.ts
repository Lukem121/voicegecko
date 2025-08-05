import { useMutation } from '@tanstack/react-query';

import { queryClient, trpc } from '~/trpc';

export const useUpdateDictionary = () => {
  const mutation = useMutation(
    trpc.dictionary.update.mutationOptions({
      onSuccess: async (result) => {
        if (result.success) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: trpc.dictionary.getAll.queryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: trpc.dictionary.getPrompt.queryKey(),
            }),
          ]);
        }
      },
    })
  );

  return {
    updateWord: async (input: { id: number; word: string }) => {
      const result = await mutation.mutateAsync(input);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
};
