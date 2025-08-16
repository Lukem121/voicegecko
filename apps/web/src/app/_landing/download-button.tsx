'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { usePathname } from 'next/navigation';
import { FaWindows } from 'react-icons/fa';
import { APP_ROUTES } from '~/utils/app-routes';

export default function DownloadButton() {
  const pathname = usePathname();
  const isDownload = pathname === APP_ROUTES.MARKETING.DOWNLOAD;
  return (
    <button
      className={cn(
        buttonVariants({ variant: 'default' }),
        'text-white',
        // Responsive sizing: default size on mobile, xl on desktop
        'px-3 py-2 text-sm md:px-6 md:py-3 md:text-base'
      )}
      type="button"
    >
      {isDownload ? (
        "Let's go!"
      ) : (
        <>
          <FaWindows className="hidden h-4 w-4 md:block" />
          <span>Download</span>
        </>
      )}
    </button>
  );
}
