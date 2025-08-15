'use client';

import { buttonVariants } from '@acme/ui/components/ui/button';
import { cn } from '@acme/ui/lib/utils';
import { FaWindows } from 'react-icons/fa';

export default function DownloadButton() {
  return (
    <button
      className={cn(
        buttonVariants({ variant: 'default', size: 'xl' }),
        'text-white'
      )}
      type="button"
    >
      <FaWindows className="h-4 w-4" />
      Download
    </button>
  );
}
