import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { isRegistered, register } from "@tauri-apps/plugin-deep-link";
import { open } from "@tauri-apps/plugin-shell";

import { deleteToken, setToken } from "~/stores/auth";
import { trpc } from "~/trpc";
import { getAPIUrl } from "~/util/api";

export const signIn = () =>
  new Promise<string>((res) => {
    const signInUrl = `${getAPIUrl()}/api/auth/signin?redirect=acme://login`;

    void open(signInUrl);
    // onOpenUrlj(console.log).finally(console.log);
    void listen<string>("session-token", (e) => {
      console.log(e);
      const url = new URL(e.payload);
      const sessionToken = url.searchParams.get("session_token");
      if (!sessionToken) return;
      void setToken(sessionToken);
      res(sessionToken);
    });
  });

export const useUser = () => {
  const { data: session } = useQuery(trpc.auth.getSession.queryOptions());
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
  const utils = api.useUtils();
  const signOut = api.auth.signOut.useMutation();
  const signOut = useMutation(trpc.auth.signOut);
  const router = useRouter();

  return async () => {
    const res = await signOut.mutateAsync();
    if (!res.success) return;
    await deleteToken();
    await utils.invalidate();
    return router.navigate({ to: "/" });
  };
};
