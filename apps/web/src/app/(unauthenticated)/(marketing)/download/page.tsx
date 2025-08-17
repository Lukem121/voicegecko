import { log } from '@acme/observability';
import { unstable_cache } from 'next/cache';
import SectionHeader from '~/app/_landing/section-header';
import SectionWrapper from '~/app/_landing/section-wrapper';
import { getDownloadsData } from '~/lib/downloads';
import type { DownloadsData } from '~/lib/downloads-utils';
import DownloadCards from './download-cards';

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
    <div className="bg-background">
      <SectionWrapper className="py-2 md:py-10" useXPadding={false}>
        {/* Main Content */}
        <div className="relative z-10 w-full rounded-3xl bg-[#F9F8F6] p-4 md:p-12 lg:p-16 dark:bg-zinc-900">
          {/* Background Gradient */}
          <div
            className="-inset-x-40 -top-16 pointer-events-none absolute bottom-[-8rem] rounded-[4rem] blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(124, 228, 93, 0.25), transparent)',
            }}
          />

          <div className="relative">
            <SectionHeader
              description="The fastest and most accurate voice dictation experience is here."
              descriptionWidth="normal"
              eyebrow="Get Started"
              heading="Download Voice Gecko"
              headingSize="xl"
            />

            <DownloadCards
              downloadError={downloadError}
              downloadsData={downloadsData}
            />

            {downloadsData && (
              <p className="mt-2 text-muted-foreground text-sm md:mt-4">
                Version {downloadsData.version} • Released{' '}
                {new Date(downloadsData.publishedAt).toLocaleDateString()}
              </p>
            )}

            {downloadError && (
              <div className="mt-8 text-center">
                <p className="text-red-500 text-sm">
                  Unable to load download information. Please try again later.
                </p>
              </div>
            )}

            {/* DEV DEBUG */}
            {/* <pre>{JSON.stringify(downloadsData, null, 2)}</pre>
            <pre>{JSON.stringify(downloadError, null, 2)}</pre> */}
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
