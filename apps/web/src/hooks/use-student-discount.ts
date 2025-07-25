import { useMutation } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useStudentDiscount = () => {
  const trpc = useTRPC();
  const options = trpc.stripe.requestStudentDiscount.mutationOptions();
  const mutation = useMutation(options);
  return {
    requestDiscount: mutation.mutate,
    isRequesting: mutation.isPending,
    result: mutation.data,
    reset: mutation.reset,
  };
};
