import { SidebarInset, SidebarProvider } from '@acme/ui/components/ui/sidebar';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { AppSidebar } from '~/components/app-sidebar';
import {
  ConnectivityError,
  ConnectivityIndicator,
} from '~/components/connectivity-error';
import { TitleBar } from '~/components/custom-title-bar';
import { useAuthWithConnectivity } from '~/hooks/use-auth-with-connectivity';
import { useSettingsStore } from '~/stores/settings.store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const authIssueType = context.auth.getAuthIssueType?.() ?? 'loading';

    // If it's a connectivity issue, let the component handle it (don't redirect)
    if (authIssueType === 'connectivity') {
      return;
    }

    // Only redirect to sign-in for actual auth issues or unauthenticated users
    if (authIssueType === 'auth' || authIssueType === 'unauthenticated') {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      });
    }

    // Check onboarding completion and redirect if needed
    let settingsInitialized = false;
    try {
      const settingsStore = useSettingsStore.getState();

      // Initialize settings if not already done
      if (!settingsStore.isInitialized) {
        await settingsStore.initialize();
      }

      settingsInitialized = true;
    } catch (_error) {
      // If settings initialization fails, continue to main app
      return;
    }

    // Redirect to onboarding if not completed
    if (settingsInitialized) {
      const currentState = useSettingsStore.getState();

      if (!currentState.settings.onboarding.completed) {
        throw redirect({
          to: '/onboarding',
        });
      }
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const auth = useAuthWithConnectivity();
  const authIssueType = auth.getAuthIssueType();
  const { isInitialized } = useSettingsStore();

  // Show connectivity error when there are network issues
  if (authIssueType === 'connectivity' || authIssueType === 'loading') {
    return (
      <ConnectivityError
        diagnosis={auth.connectivity.diagnosis}
        isApiReachable={auth.connectivity.isApiReachable}
        isChecking={auth.connectivity.isChecking}
        isOnline={auth.connectivity.isOnline}
        lastSuccessfulCheck={auth.connectivity.lastSuccessfulCheck}
        onRetry={() => {
          auth.connectivity.checkConnectivity();
        }}
      />
    );
  }

  // Show loading screen only if settings are not initialized yet
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
          <p className="text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Render the authenticated content with sidebar
  return (
    <SidebarProvider>
        <TitleBar />
        <AppSidebar />
        <SidebarInset className="!ml-0 !shadow-none pt-8">
          {/* Show connectivity indicator only for serious internet issues */}
          <div className="absolute top-10 right-4 z-50">
            <ConnectivityIndicator
              diagnosis={auth.connectivity.diagnosis}
              isApiReachable={auth.connectivity.isApiReachable}
              isChecking={auth.connectivity.isChecking}
              isOnline={auth.connectivity.isOnline}
              lastChecked={auth.connectivity.lastSuccessfulCheck}
            />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
  );
}
