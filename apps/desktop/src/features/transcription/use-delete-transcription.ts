import { useMutation } from '@tanstack/react-query';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { queryClient, trpc } from '~/trpc';

export const useDeleteTranscription = () => {
  const mutation = useMutation(
    trpc.transcription.delete.mutationOptions({
      onSuccess: (data, variables) => {
        // Track transcription deletion
        analytics.track('transcription_deleted', {
          transcription_id: variables.id,
          method: 'user_action',
        });

        void queryClient.invalidateQueries({
          queryKey: trpc.transcription.getAll.queryKey(),
        });
      },
    })
  );

  return {
    deleteTranscription: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
