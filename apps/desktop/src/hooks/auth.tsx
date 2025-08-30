import { log } from '@acme/observability/log';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { isRegistered, register } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useEffect } from 'react';

import { authClient } from '~/lib/client';
import { queryClient, trpc } from '~/trpc';

/**
 * Utility function to check if an error is likely network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  let errorMessage: string;
  if (error instanceof Error) {
    errorMessage = error.message.toLowerCase();
  } else if (typeof error === 'string') {
    errorMessage = error.toLowerCase();
  } else {
    errorMessage = JSON.stringify(error).toLowerCase();
  }

  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('unreachable') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('load failed') ||
    errorMessage.includes('no internet')
  );
}

export const signIn = async () => {
  const signInUrl = `${import.meta.env.VITE_PUBLIC_VOICEGECKO_URL}/api/auth/signin?redirect=voicegecko://login`;
  await openUrl(signInUrl);
};

export const useSession = () => {
  const options = trpc.auth.getSession.queryOptions();
  const query = useQuery(options);
  const session = query.data;

  return {
    session,
    query,
  };
};

export const useUser = () => {
  const { session } = useSession();
  return session?.user ?? null;
};

/**
 * Pure auth hook without connectivity concerns
 */
export const useAuth = () => {
  const {
    session,
    query: { isPending, error },
  } = useSession();

  useEffect(() => {
    if (error) {
      log.error(error, 'Auth error');
    }
  }, [error]);

  return {
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    user: session?.user ?? null,
    error,
  };
};

export const useSignIn = () => {
  const router = useRouter();
  return async () => {
    if (!(await isRegistered('voicegecko'))) {
      await register('voicegecko');
      log.info('Registered "voicegecko"');
    }

    await signIn();
    return router.navigate({ to: '/' });
  };
};

export const useSignOut = () => {
  const router = useRouter();
  const options = trpc.auth.getSession.queryKey();
  return async () => {
    log.info('🚪 Signing out...');
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: options });
    return router.navigate({ to: '/sign-in', search: { redirect: null } });
  };
};
