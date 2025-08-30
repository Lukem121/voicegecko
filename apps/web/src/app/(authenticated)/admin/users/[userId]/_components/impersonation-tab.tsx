'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { toast } from '@acme/ui/components/ui/sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '~/lib/auth/client';

type ImpersonationTabProps = {
  userId: string;
};

export function ImpersonationTab({ userId }: ImpersonationTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impersonation</CardTitle>
      </CardHeader>
      <CardContent>
        <ImpersonationControls userId={userId} />
      </CardContent>
    </Card>
  );
}

function ImpersonationControls({ userId }: { userId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button
        disabled={isLoading}
        onClick={async () => {
          try {
            setIsLoading(true);
            const { error } = await authClient.admin.impersonateUser({
              userId,
            });
            if (error) {
              toast.error(`Failed to start impersonation: ${error.message}`);
            } else {
              toast.success('Started impersonating user');
              router.refresh();
            }
          } finally {
            setIsLoading(false);
          }
        }}
        type="button"
      >
        {isLoading ? 'Starting…' : 'Impersonate'}
      </Button>
      <Button
        disabled={isLoading}
        onClick={async () => {
          try {
            setIsLoading(true);
            const { error } = await authClient.admin.stopImpersonating();
            if (error) {
              toast.error(`Failed to stop impersonation: ${error.message}`);
            } else {
              toast.success('Stopped impersonating user');
              router.refresh();
            }
          } finally {
            setIsLoading(false);
          }
        }}
        type="button"
        variant="secondary"
      >
        {isLoading ? 'Stopping…' : 'Stop impersonation'}
      </Button>
    </div>
  );
}
