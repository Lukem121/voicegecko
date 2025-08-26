import { useEffect } from 'react';
import {
  type SetupBetterAuthTauriOptions,
  setupBetterAuthTauri,
} from './client/setup-better-auth-tauri';

// Re-export types for external consumption
export type { FetchError } from './types/fetch-error';

export function useBetterAuthTauri({
  authClient,
  debugLogs,
  mainWindowLabel,
  scheme,
  onError,
  onRequest,
  onSuccess,
}: SetupBetterAuthTauriOptions) {
  useEffect(() => {
    return setupBetterAuthTauri({
      authClient,
      debugLogs,
      mainWindowLabel,
      scheme,
      onError,
      onRequest,
      onSuccess,
    });
  }, [
    authClient,
    debugLogs,
    mainWindowLabel,
    scheme,
    onError,
    onRequest,
    onSuccess,
  ]);
}
