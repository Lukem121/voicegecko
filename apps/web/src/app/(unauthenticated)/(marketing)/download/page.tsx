import { log } from '@acme/observability';
import { unstable_cache } from 'next/cache';
import { getDownloadsData } from '~/lib/downloads';
import type { DownloadsData } from '~/lib/downloads-utils';

// ISR configuration - revalidate every hour
export const revalidate = 3600; // 1 hour in seconds

// Cache downloads data with ISR tag for on-demand revalidation
const getCachedDownloadsData = unstable_cache(
  async (): Promise<DownloadsData> => {
    return await getDownloadsData();
  },
  ['landing-downloads'],
  {
    revalidate: 3600, // 1 hour
    tags: ['downloads', 'landing-page'],
  }
);

export default async function DownloadPage() {
  let downloadsData: DownloadsData | null = null;
  let downloadError: string | undefined;

  try {
    downloadsData = await getCachedDownloadsData();
  } catch (err) {
    downloadError =
      err instanceof Error ? err.message : 'Unable to load download data';
    log.error('Failed to fetch downloads data:', err);
  }

  return (
    <div>
      DownloadPage
      <pre>{JSON.stringify(downloadsData, null, 2)}</pre>
      <pre>{JSON.stringify(downloadError, null, 2)}</pre>
    </div>
  );
}
