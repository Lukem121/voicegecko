import { useMutation } from '@tanstack/react-query';

import { useTRPC } from '~/trpc/react';

export const useCreateBillingPortalSession = () => {
  const trpc = useTRPC();
  const options = trpc.stripe.createBillingPortalSession.mutationOptions();
  const mutation = useMutation(options);
  return mutation;
};
