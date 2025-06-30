import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isRegistered, register } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";

import { authClient } from "~/auth/client";
import { clearSession, setSessionMetadata, setToken } from "~/stores/auth";
import { getAPIUrl } from "~/util/api";

export const signIn = async () => {
  const signInUrl = `${getAPIUrl()}/api/auth/signin?redirect=voicegecko://login`;
  await openUrl(signInUrl);
};

export const useUser = () => {
  const session = authClient.useSession();
  return session.data?.user ?? null;
};

/**
 * Custom hook to sync better-auth session with Tauri store
 * This enables fast, synchronous token access for tRPC headers
 */
export const useAuthSync = () => {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    const syncSession = async () => {
      if (isPending) {
        console.log("⏳ Session loading...");
        return;
      }

      console.log("🔄 Syncing session:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasToken: !!session?.session.token,
        userId: session?.user.id,
      });

      if (session?.session.token) {
        // Session exists - cache the token and metadata
        console.log("✅ Valid session found, caching token...");
        await setToken(session.session.token);
        await setSessionMetadata({
          userId: session.user.id,
          expiresAt: session.session.expiresAt.toISOString(),
        });
      } else {
        // No session - clear the store
        console.log("❌ No valid session, clearing store...");
        await clearSession();
      }
    };

    void syncSession();
  }, [session, isPending]);

  return {
    session,
    isPending,
    isAuthenticated: !!session?.user,
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
    await clearSession(); // Clear all session data from store
    return router.navigate({ to: "/" });
  };
};
