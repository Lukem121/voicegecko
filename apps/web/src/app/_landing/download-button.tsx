'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { FaWindows } from 'react-icons/fa';

export default function DownloadButton() {
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
      <FaWindows className="h-4 w-4" />
      <span>Download</span>
    </button>
  );
}
