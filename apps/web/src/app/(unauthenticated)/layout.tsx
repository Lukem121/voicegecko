import { unstable_cache } from 'next/cache';
import type { ReactNode } from 'react';
import FooterSection from '~/app/_components/landing/sections/footer';
import Navigation from '~/app/_components/landing/sections/navigation';
import { getDownloadsData } from '~/lib/downloads';
import type { DownloadsData } from '~/lib/downloads-utils';

const getCachedDownloadsData = unstable_cache(
  async (): Promise<DownloadsData> => {
    return await getDownloadsData();
  },
  ['unauth-downloads'],
  {
    revalidate: 3600,
    tags: ['downloads', 'unauth-layout'],
  }
);

export default async function UnauthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  let downloadsData: DownloadsData | null = null;
  let downloadError: string | undefined;

  try {
    downloadsData = await getCachedDownloadsData();
  } catch (err) {
    downloadError = err instanceof Error ? err.message : 'Unable to load';
  }

  return (
    <div className="relative">
      <Navigation downloadError={downloadError} downloadsData={downloadsData} />
      {children}
      <FooterSection />
    </div>
  );
}

