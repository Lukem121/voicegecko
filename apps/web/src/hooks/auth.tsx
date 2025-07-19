import { useRouter } from "next/navigation";

import { authClient } from "~/lib/auth/client";

export const useSignIn = () => {
  const router = useRouter();
  return () => router.push("/sign-in");
};

export const useUser = () => {
  const session = authClient.useSession();
  return session.data?.user ?? null;
};

export const useSignOut = () => {
  const router = useRouter();

  return async () => {
    await authClient.signOut();
    return router.push("/sign-in");
  };
};
