import { useMutation } from "@tanstack/react-query";

import { trpc } from "~/trpc";

export const useSendFeedback = () => {
  const mutation = useMutation(
    trpc.transcription.sendFeedback.mutationOptions(),
  );

  return {
    sendFeedback: async (input: { transcriptionId: number; feedback: string }) => {
      const result = await mutation.mutateAsync(input);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    isSending: mutation.isPending,
    error: mutation.error,
  };
}; 