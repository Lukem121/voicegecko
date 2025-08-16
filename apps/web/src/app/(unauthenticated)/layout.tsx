import { unstable_cache } from 'next/cache';
import type { ReactNode } from 'react';
import { getDownloadsData } from '~/lib/downloads';
import type { DownloadsData } from '~/lib/downloads-utils';
import Footer from '../_landing/footer';
import Header from '../_landing/header';
import RiveGeckoPopup from '../_landing/rive-gecko-popup';

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
      <Header />
      {children}
      <Footer />
      <RiveGeckoPopup />
    </div>
  );
}
