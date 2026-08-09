import { log } from '@acme/observability/log';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useEffect, useRef } from 'react';

type MouseMovePayload = {
  x: number;
  y: number;
};

/**
 * Enables click-through on transparent areas of the Gecko Bar window by
 * toggling window.setIgnoreCursorEvents based on whether the global cursor
 * is inside the provided hitbox element.
 */
export function useGeckoBarClickthrough(
  hitboxRef: React.RefObject<HTMLElement | null>,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const cachedIsIgnoredRef = useRef<boolean | null>(null);
  const windowPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const webview = getCurrentWebviewWindow();
    let cleanupFns: Array<() => void> = [];
    let isMounted = true;

    async function init() {
      try {
        // Initialize with non-ignored so UI remains interactive until first event
        await webview.setIgnoreCursorEvents(false);

        // Cache the current window position (physical pixels)
        try {
          const pos = await webview.outerPosition();
          windowPosRef.current = { x: pos.x, y: pos.y };
        } catch (e) {
          log.error(e, '[Clickthrough] Failed to get window position');
        }

        // Update cached window position on move
        const unlistenMove = await webview.listen('tauri://move', async () => {
          try {
            const pos = await webview.outerPosition();
            windowPosRef.current = { x: pos.x, y: pos.y };
          } catch (err) {
            // non-fatal
            log.error(err, '[Clickthrough] Failed to refresh window position');
          }
        });
        cleanupFns.push(unlistenMove);

        // Listen to global device mouse moves from Rust
        const unlistenMouse = await listen<MouseMovePayload>(
          'device-mouse-move',
          ({ payload }) => {
            if (!isMounted) {
              return;
            }

            const element = hitboxRef.current;
            if (!element) {
              return;
            }

            const rect = element.getBoundingClientRect();

            // Map device (physical) coords to local CSS pixels
            const localX =
              (payload.x - windowPosRef.current.x) / window.devicePixelRatio;
            const localY =
              (payload.y - windowPosRef.current.y) / window.devicePixelRatio;

            const inHitbox =
              localX >= rect.left &&
              localX <= rect.right &&
              localY >= rect.top &&
              localY <= rect.bottom;

            const shouldIgnore = !inHitbox;
            if (cachedIsIgnoredRef.current !== shouldIgnore) {
              cachedIsIgnoredRef.current = shouldIgnore;
              // Best-effort; ignore failures
              webview.setIgnoreCursorEvents(shouldIgnore).catch((err) => {
                log.error(err, '[Clickthrough] setIgnoreCursorEvents failed');
              });
            }
          }
        );
        cleanupFns.push(unlistenMouse);
      } catch (error) {
        log.error(error, '[Clickthrough] Initialization failed');
      }
    }

    init();

    return () => {
      isMounted = false;
      // Ensure interactions are re-enabled on unmount
      webview.setIgnoreCursorEvents(false).catch((err) => {
        log.error(err, '[Clickthrough] Failed to reset ignore cursor events');
      });
      for (const fn of cleanupFns) {
        fn();
      }
      cleanupFns = [];
    };
  }, [enabled, hitboxRef]);
}
