import { useMutation } from '@tanstack/react-query';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { queryClient, trpc } from '~/trpc';

export const useDeleteDictation = () => {
  const mutation = useMutation(
    trpc.dictation.delete.mutationOptions({
      onSuccess: (_data, variables) => {
        // Track dictation deletion
        analytics.track('dictation_deleted', {
          dictation_id: variables.id,
          method: 'user_action',
        });

        queryClient.invalidateQueries({
          queryKey: trpc.dictation.getAll.queryKey(),
        });
      },
    })
  );

  return {
    deleteDictation: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
