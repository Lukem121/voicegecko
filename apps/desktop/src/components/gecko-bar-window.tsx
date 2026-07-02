import { log } from '@acme/observability/log';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef, useState } from 'react';
import { initializeGeckoBarDictationBridge } from '~/lib/dictation-event-bridge';
import { isLocalOnlyMode } from '~/lib/local-mode';
import { useGeckoBarClickthrough } from '~/hooks/use-gecko-bar-clickthrough';
import { GeckoBarApp } from './gecko-bar/gecko-bar-app';

/**
 * Simple component that listens for auth events and shows/hides gecko bar accordingly
 */
export function GeckoBarWindow() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create a hitbox ref that spans the entire window for click-through when logged out
  const loggedOutHitboxRef = useRef<HTMLDivElement>(null);

  // Always enable click-through, even when logged out
  // When logged out, we use a full-window hitbox so the entire (invisible) window is click-through
  useGeckoBarClickthrough(loggedOutHitboxRef, { enabled: !isAuthenticated });

  useEffect(() => {
    async function initializeGeckoBarWindow() {
      try {
        const localOnly = await isLocalOnlyMode();
        if (localOnly) {
          setIsAuthenticated(true);
        }

        await initializeGeckoBarDictationBridge();

        // Listen for auth state changes from main window
        await listen('auth-state-changed', (event) => {
          const payload = event.payload as {
            isAuthenticated: boolean;
            hasUser: boolean;
          };
          if (localOnly) {
            setIsAuthenticated(true);
            return;
          }
          setIsAuthenticated(payload.isAuthenticated);
        });

        setIsInitialized(true);
      } catch (error) {
        log.warn(error, '[GeckoBar] Init failed, rendering anyway');
        setIsInitialized(true);
      }
    }

    initializeGeckoBarWindow();
  }, []);

  // Show loading while initializing
  if (!isInitialized) {
    return null;
  }

  // When not authenticated, render a zero-size element for click-through
  // This ensures the click-through hook has a valid hitbox ref, but since the
  // element has no dimensions, the cursor will never be "inside" it, making
  // the entire window click-through
  if (!isAuthenticated) {
    return (
      <div
        ref={loggedOutHitboxRef}
        style={{
          position: 'fixed',
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
    );
  }

  // Show gecko bar when authenticated
  return <GeckoBarApp />;
}
