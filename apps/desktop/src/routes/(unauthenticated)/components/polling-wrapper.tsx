'use client';

import { APP_ROUTES } from '@/app/utils/app-routes';
import { authClient } from '@repo/auth/client';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePolling } from '../hooks/use-polling-refresh';

const POLL_INTERVAL = 5000;

type PollingAuthWrapperProps = {
  readonly children: ReactNode;
};

export default function PollingAuthWrapper({
  children,
}: PollingAuthWrapperProps) {
  const router = useRouter();
  const auth = authClient.useSession();

  useEffect(() => {
    if (auth.data?.session !== undefined) {
      router.push(APP_ROUTES.HOME);
    }
  }, [auth.data?.session, router]);

  const refreshSession = () => {
    auth.refetch();
  };

  usePolling(refreshSession, POLL_INTERVAL);

  return children;
}
