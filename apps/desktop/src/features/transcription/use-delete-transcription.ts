import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "~/trpc";

export const useDeleteTranscription = () => {
  const mutation = useMutation(
    trpc.transcription.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.transcription.getAll.queryKey(),
        });
      },
    }),
  );

  return {
    deleteTranscription: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
