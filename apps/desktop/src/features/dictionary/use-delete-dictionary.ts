import { useMutation } from '@tanstack/react-query';

import { queryClient, trpc } from '~/trpc';

export const useDeleteDictionary = () => {
  const mutation = useMutation(
    trpc.dictionary.delete.mutationOptions({
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
    deleteWord: async (input: { id: number }) => {
      const result = await mutation.mutateAsync(input);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
