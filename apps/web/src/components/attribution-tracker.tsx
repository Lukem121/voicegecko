'use client';

import { useEffect } from 'react';
import { registerPostHogSuperProperties, upsertAttribution } from '~/lib/attribution';

export default function AttributionTracker() {
  useEffect(() => {
    const stored = upsertAttribution();
    registerPostHogSuperProperties(stored);

    // Optionally push to GTM dataLayer if available
    try {
      // biome-ignore lint/suspicious/noExplicitAny: dataLayer is window-typed
      const w = window as any;
      if (Array.isArray(w.dataLayer) && stored) {
        w.dataLayer.push({
          event: 'attribution_init',
          attribution: {
            initial: stored.initial,
            last: stored.last,
          },
        });
      }
    } catch {
      // noop
    }
  }, []);

  return null;
}


