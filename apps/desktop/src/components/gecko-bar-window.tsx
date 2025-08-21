import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { GeckoBarApp } from './gecko-bar/gecko-bar-app';

/**
 * Simple component that listens for auth events and shows/hides gecko bar accordingly
 */
export function GeckoBarWindow() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeGeckoBarWindow() {
      try {
        // Listen for auth state changes from main window
        await listen('auth-state-changed', (event) => {
          const payload = event.payload as {
            isAuthenticated: boolean;
            hasUser: boolean;
          };
          setIsAuthenticated(payload.isAuthenticated);
        });

        setIsInitialized(true);
      } catch {
        // Still allow rendering on error
        setIsInitialized(true);
      }
    }

    initializeGeckoBarWindow();
  }, []);

  // Show loading while initializing
  if (!isInitialized) {
    return null;
  }

  // Hide gecko bar if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show gecko bar
  return <GeckoBarApp />;
}
