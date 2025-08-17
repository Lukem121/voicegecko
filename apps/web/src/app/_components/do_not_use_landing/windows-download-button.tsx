'use client';

import { log } from '@acme/observability/log';
import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { FaWindows } from 'react-icons/fa';
import type { DownloadsData } from '~/lib/downloads-utils';
import { getPrimaryDownload } from '~/lib/downloads-utils';

export default function WindowsDownloadButton({
  downloadsData,
  downloadError,
  className = '',
  text = 'Download',
}: {
  downloadsData: DownloadsData | null;
  downloadError?: string;
  className?: string;
  text?: string;
}) {
  const handleDownload = () => {
    if (!downloadsData || downloadError) {
      alert(downloadError ?? 'Download currently unavailable');
      return;
    }

    const windowsPlatform = downloadsData.platforms.windows;
    const primaryDownload = getPrimaryDownload(windowsPlatform);

    if (primaryDownload) {
      const link = document.createElement('a');
      link.href = primaryDownload.url;
      link.download = primaryDownload.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      log.info('Download initiated:', primaryDownload.name);
    } else {
      alert('Windows download not available');
    }
  };

  const isAvailable =
    downloadsData &&
    !downloadError &&
    downloadsData.platforms.windows.available;

  return (
    <button
      className={cn(
        isAvailable
          ? cn(
              buttonVariants({ variant: 'default', size: 'xl' }),
              '!border-black dark:!border-none inline-flex items-center gap-2 rounded-lg border-2 bg-primary/80 font-semibold text-sm tracking-tight transition-all will-change-transform hover:scale-[1.02]'
            )
          : cn(
              buttonVariants({ variant: 'default', size: 'xl' }),
              '!border-gray-600 inline-flex cursor-not-allowed items-center gap-2 rounded-lg border-2 bg-gray-400 font-semibold text-sm tracking-tight'
            ),
        className
      )}
      disabled={!isAvailable}
      onClick={handleDownload}
      type="button"
    >
      <FaWindows className="h-4 w-4" />
      {isAvailable ? text : 'Download Unavailable'}
    </button>
  );
}
