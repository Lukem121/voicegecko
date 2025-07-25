import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "~/trpc";

export const useAddDictionary = () => {
  const mutation = useMutation(
    trpc.dictionary.add.mutationOptions({
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
    }),
  );

  return {
    addWord: async (input: { word: string }) => {
      const result = await mutation.mutateAsync(input);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    isAdding: mutation.isPending,
    error: mutation.error,
  };
};
