import { useMutation } from '@tanstack/react-query';

import { trpc } from '~/trpc';

export const useCreateDictation = () => {
  const options = trpc.dictation.create.mutationOptions();
  const mutation = useMutation(options);

  return {
    ...mutation,
    createDictation: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
};
