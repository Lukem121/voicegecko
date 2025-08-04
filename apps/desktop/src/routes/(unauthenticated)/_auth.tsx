import { log } from '@acme/observability';
import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useAuth } from '~/hooks/use-auth';

export const Route = createFileRoute('/(unauthenticated)/_auth')({
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const auth = useAuth();

  // If user is authenticated, redirect away from auth pages
  useEffect(() => {
    log.info('Auth layout useEffect', auth.isAuthenticated, auth.isLoading);
    if (auth.isAuthenticated && !auth.isLoading) {
      router.navigate({ to: '/' });
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);

  return (
    <div className="relative grid h-dvh flex-col items-center justify-center lg:max-w-none lg:px-0">
      <div className="-z-10 absolute top-0 left-0 h-full w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="sm:-top-80 pointer-events-none absolute inset-x-0 transform-gpu overflow-hidden blur-[120px]"
        >
          <div
            className="-translate-x-1/2 relative left-[calc(50%)] aspect-[1155/678] w-[36.125rem] rotate-[45deg] bg-gradient-to-tr from-[#6E9C4A] via-[#6E9C4A]/60 via-[#6E9C4A]/80 to-[#6E9C4A]/40 to-primary-muted opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="-z-10 pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] transform-gpu overflow-hidden blur-[120px] sm:top-[calc(100%-30rem)]"
        >
          <div
            className="-translate-x-1/2 relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-[#6E9C4A]/70 via-[#6E9C4A]/60 via-[#6E9C4A]/85 to-[#6E9C4A]/90 opacity-25 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
