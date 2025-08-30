'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';

type UsageTabProps = {
  userId: string;
};

export function UsageTab({ userId }: UsageTabProps) {
  const trpc = useTRPC();
  const userQuery = useQuery(
    trpc.admin.users.byId.queryOptions(
      { userId },
      {
        enabled: Boolean(userId),
      }
    )
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {userQuery.data?.user && (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div>
              <div className="text-muted-foreground text-sm">Total words</div>
              <div className="font-medium">
                {userQuery.data.user.totalWords}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                Total dictations
              </div>
              <div className="font-medium">
                {userQuery.data.user.totalDictations}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">WPM</div>
              <div className="font-medium">
                {userQuery.data.user.wordsPerMinute}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Monthly words</div>
              <div className="font-medium">
                {userQuery.data.user.monthlyWords}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                Monthly dictations
              </div>
              <div className="font-medium">
                {userQuery.data.user.monthlyDictations}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
