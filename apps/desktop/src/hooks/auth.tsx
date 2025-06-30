import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { isRegistered, register } from "@tauri-apps/plugin-deep-link";
import { open } from "@tauri-apps/plugin-shell";

import { deleteToken, setToken } from "~/stores/auth";
import { trpc } from "~/trpc";
import { getAPIUrl } from "~/util/api";
import { openUrl } from "@tauri-apps/plugin-opener";

export const signIn = () =>
  new Promise<string>((res, rej) => {
    const signInUrl = `${getAPIUrl()}/api/auth/signin?redirect=voicegecko://login`;

    await openUrl(signInUrl);
    void listen<string>("session-token", (e) => {
      console.log(e);
      const url = new URL(e.payload);
      const sessionToken = url.searchParams.get("session_token");
      if (!sessionToken) {
        rej(new Error("No session token received"));
        return;
      }
      void setToken(sessionToken);
      res(sessionToken);
    });
  });

export const useUser = () => {
  const { data: session, error } = useQuery(
    trpc.auth.getSession.queryOptions(),
  );
  if (error) return null;
  return session?.user ?? null;
};

export const useSignIn = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    if (!(await isRegistered("acme"))) {
      await register("acme");
      console.log('Registered "acme"');
    }

    await signIn();
    const myQueryKey = trpc.auth.getSession.queryKey();
    await queryClient.invalidateQueries({ queryKey: myQueryKey });
    return router.navigate({ to: "/" });
  };
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const signOut = useMutation(trpc.auth.signOut);
  const router = useRouter();

  return async () => {
    await signOut.mutateAsync();
    await deleteToken();
    await queryClient.invalidateQueries();
    return router.navigate({ to: "/" });
  };
};
