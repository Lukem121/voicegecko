'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import Link from 'next/link';
// import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { FaWindows } from 'react-icons/fa';
import { useGTM } from '~/hooks/use-gtm';
import { usePostHog } from '~/hooks/use-posthog';
import { SOURCES } from '~/lib/gtm/constants';
import { POSTHOG_SOURCES } from '~/lib/posthog/constants';
import { APP_ROUTES } from '~/utils/app-routes';

export default function DownloadButton() {
  const pathname = usePathname();
  const { trackEvent } = useGTM();
  const { trackEvent: trackPostHogEvent } = usePostHog();
  const isDownload = pathname === APP_ROUTES.MARKETING.DOWNLOAD;
  // const router = useRouter();

  const handleDownloadClick = () => {
    const source = pathname === '/' ? SOURCES.LANDING_PAGE : SOURCES.HEADER;
    const posthogSource =
      pathname === '/' ? POSTHOG_SOURCES.LANDING_PAGE : POSTHOG_SOURCES.HEADER;

    trackEvent({
      event: 'download_initiated',
      source,
      os_type: 'unknown', // Will be determined on download page
      timestamp: new Date().toISOString(),
    });

    // PostHog tracking
    trackPostHogEvent({
      event: 'download_initiated',
      source: posthogSource,
      os_type: 'unknown',
      cta_location: pathname === '/' ? 'landing_hero' : 'header',
      timestamp: new Date().toISOString(),
    });
  };

  if (isDownload) {
    return (
      <Link
        className={cn(
          buttonVariants({ variant: 'default' }),
          'text-white',
          'px-3 py-2 text-sm md:px-6 md:py-3 md:text-base'
        )}
        href={APP_ROUTES.MARKETING.DOWNLOAD}
        onClick={handleDownloadClick}
      >
        Let's go!
      </Link>
    );
  }

  return (
    <Link
      className={cn(
        buttonVariants({ variant: 'default' }),
        'text-white',
        // Responsive sizing: default size on mobile, xl on desktop
        'px-3 py-2 text-sm md:px-6 md:py-3 md:text-base'
      )}
      href={APP_ROUTES.MARKETING.DOWNLOAD}
      onClick={handleDownloadClick}
    >
      <FaWindows className="hidden h-4 w-4 md:block" />
      <span>Download</span>
    </Link>
  );
}
