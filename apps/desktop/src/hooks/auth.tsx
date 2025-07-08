import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isRegistered, register } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";

import { authClient } from "~/lib/client";

export const signIn = async () => {
  const signInUrl = `${import.meta.env.VITE_API_URL}/api/auth/signin?redirect=voicegecko://login`;
  await openUrl(signInUrl);
};

export const useUser = () => {
  const session = authClient.useSession();
  return session.data?.user ?? null;
};

/**
 * Check if user is authenticated (for use in components)
 */
export const useIsAuthenticated = () => {
  const { data: session, isPending, error } = authClient.useSession();

  console.log("useIsAuthenticated", session, isPending, error);

  useEffect(() => {
    if (error) {
      console.error("Auth error", error);
    }
  }, [error]);

  return {
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    user: session?.user ?? null,
  };
};

export const useSignIn = () => {
  const router = useRouter();
  return async () => {
    if (!(await isRegistered("voicegecko"))) {
      await register("voicegecko");
      console.log('Registered "voicegecko"');
    }

    await signIn();
    return router.navigate({ to: "/" });
  };
};

export const useSignOut = () => {
  const router = useRouter();

  return async () => {
    console.log("🚪 Signing out...");
    await authClient.signOut();
    return router.navigate({ to: "/sign-in", search: { redirect: null } });
  };
};
