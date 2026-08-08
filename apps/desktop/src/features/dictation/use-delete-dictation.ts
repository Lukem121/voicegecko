import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

import { analytics } from '~/lib/analytics/posthog-analytics';

export const useDeleteDictation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string }) => {
      await invoke('delete_local_dictation', { id: input.id });
      return input;
    },
    onSuccess: (_data, variables) => {
      analytics.track('dictation_deleted', {
        dictation_id: variables.id,
        method: 'user_action',
      });

      void queryClient.invalidateQueries({ queryKey: ['local-dictations'] });
    },
  });

  return {
    deleteDictation: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
};
