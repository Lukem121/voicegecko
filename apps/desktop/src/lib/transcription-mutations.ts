import { queryClient, trpc, trpcClient } from "~/trpc";

export interface CreateTranscriptionInput {
  id: string;
  content: string;
  status: "normal" | "silent";
  durationSeconds?: number;
  modelUsed?: string;
  sampleRate?: number;
  appVersion?: string;
}

/**
 * Create a transcription using tRPC mutation outside of React components
 */
export async function createTranscription(input: CreateTranscriptionInput) {
  const result = await trpcClient.transcription.create.mutate(input);

  // Invalidate queries to refresh the list and usage status
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.transcription.getAll.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.usage.getStatus.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.usage.getStats.queryKey(),
    }),
  ]);

  return result;
}

/**
 * Delete a transcription using tRPC mutation outside of React components
 */
export async function deleteTranscription(id: number) {
  const result = await trpcClient.transcription.delete.mutate({ id });

  // Invalidate queries to refresh the list
  await queryClient.invalidateQueries({
    queryKey: trpc.transcription.getAll.queryKey(),
  });

  return result;
}
