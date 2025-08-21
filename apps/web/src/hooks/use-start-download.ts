'use client';

import { log } from '@acme/observability/log';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useGTM } from '~/hooks/use-gtm';
import { usePostHog } from '~/hooks/use-posthog';
import type { DownloadsData } from '~/lib/downloads-utils';
import { getPrimaryDownload } from '~/lib/downloads-utils';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';

type StartDownloadOptions = {
  // Where the action originated (for analytics)
  source?: string;
};

/**
 * useStartDownload
 * - Fetches latest release via API
 * - Selects primary Windows asset
 * - Initiates browser download
 * - Redirects to `/download/success` with query params
 */
export function useStartDownload() {
  const router = useRouter();
  const { trackEvent: trackGtm } = useGTM();
  const { trackEvent: trackPh } = usePostHog();

  const startDownload = useCallback(
    async (options?: StartDownloadOptions) => {
      try {
        const res = await fetch('/api/downloads/latest', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to fetch latest downloads (${res.status})`);
        }
        const json: { success: boolean; data?: DownloadsData } =
          await res.json();
        if (!json.data) {
          throw new Error('Unexpected downloads response');
        }

        const windows = json.data.platforms.windows;
        if (!windows.available || windows.assets.length === 0) {
          // If no direct asset, fall back to download page
          router.push('/download');
          return;
        }

        const primary = getPrimaryDownload(windows);
        if (!primary) {
          router.push('/download');
          return;
        }

        // Fire completion analytics similar to download page
        trackGtm({
          event: 'download_completed',
          source: options?.source ?? 'landing_page',
          os_type: 'windows',
          file_name: primary.name,
          timestamp: new Date().toISOString(),
        });
        trackPh({
          event: 'download_completed',
          source: POSTHOG_SOURCES.LANDING_PAGE,
          os_type: 'windows',
          file_name: primary.name,
          timestamp: new Date().toISOString(),
        });

        // Trigger the download
        const a = document.createElement('a');
        a.href = primary.url;
        a.download = primary.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Redirect to success page with metadata
        const params = new URLSearchParams({
          os: 'windows',
          file_name: primary.name,
          file_url: primary.url,
        });
        setTimeout(
          () => router.push(`/download/success?${params.toString()}`),
          50
        );
      } catch (error) {
        log.error('Failed to start download from landing CTA', error);
        // As a fallback, go to the regular download page
        router.push('/download');
      }
    },
    [router, trackGtm, trackPh]
  );

  return { startDownload };
}
