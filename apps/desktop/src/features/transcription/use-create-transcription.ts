import { useMutation } from "@tanstack/react-query";

import { trpc } from "~/trpc";

export const useCreateTranscription = () => {
  const options = trpc.transcription.create.mutationOptions();
  const mutation = useMutation(options);

  return {
    ...mutation,
    createTranscription: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
};
