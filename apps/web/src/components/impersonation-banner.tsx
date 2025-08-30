'use client';

import type { Session } from '@acme/auth';
import { Button } from '@acme/ui/components/ui/button';
import { toast } from '@acme/ui/components/ui/sonner';
import { X } from 'lucide-react';
import { useState } from 'react';
import { authClient } from '~/lib/auth/client';

export function ImpersonationBanner({ session }: { session: Session }) {
  const [isLoading, setIsLoading] = useState(false);

  const isImpersonating = session.session.impersonatedBy;
  const impersonatedUser = session.user;

  if (!isImpersonating) {
    return null;
  }

  if (!impersonatedUser) {
    return null;
  }

  const handleStopImpersonation = async () => {
    try {
      setIsLoading(true);
      const { error } = await authClient.admin.stopImpersonating();
      if (error) {
        toast.error(`Failed to stop impersonation: ${error.message}`);
      } else {
        toast.success('Stopped impersonating user');
        // Refresh the page to update the session
        window.location.reload();
      }
    } catch {
      toast.error('Failed to stop impersonation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-amber-200 border-b bg-amber-100 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-medium text-amber-800 text-sm dark:text-amber-200">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            You are impersonating{' '}
            <span className="font-semibold">
              {impersonatedUser.email || impersonatedUser.name || 'User'}
            </span>
          </div>
        </div>
        <Button
          className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
          disabled={isLoading}
          onClick={handleStopImpersonation}
          size="sm"
          variant="outline"
        >
          {isLoading ? (
            'Stopping...'
          ) : (
            <>
              <X className="mr-1 h-3 w-3" />
              Stop Impersonating
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
