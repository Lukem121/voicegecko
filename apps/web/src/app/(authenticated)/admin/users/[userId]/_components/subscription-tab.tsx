'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { toast } from '@acme/ui/components/ui/sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';

type SubscriptionTabProps = {
  userId: string;
};

export function SubscriptionTab({ userId }: SubscriptionTabProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const billingQuery = useQuery(
    trpc.admin.billing.getLatestSubscription.queryOptions(
      { userId },
      {
        enabled: Boolean(userId),
      }
    )
  );

  const restoreSubMutation = useMutation(
    trpc.admin.billing.restoreSubscription.mutationOptions({
      onSuccess: async () => {
        toast.success('Subscription restored successfully');
        const key = trpc.admin.billing.getLatestSubscription.queryKey();
        await queryClient.invalidateQueries({ queryKey: key });
      },
      onError: (error) => {
        toast.error(`Failed to restore subscription: ${error.message}`);
      },
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription & Billing</CardTitle>
      </CardHeader>
      <CardContent>
        {billingQuery.isLoading && (
          <div className="text-muted-foreground text-sm">Loading…</div>
        )}
        {!(billingQuery.data?.subscription || billingQuery.isLoading) && (
          <div className="text-muted-foreground text-sm">No subscription</div>
        )}
        {billingQuery.data?.subscription && (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground text-sm">Status</div>
              <div className="font-medium">
                {billingQuery.data.subscription.status}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-sm">
                Cancel at period end
              </div>
              <div className="font-medium">
                {billingQuery.data.subscription.cancelAtPeriodEnd
                  ? 'Yes'
                  : 'No'}
              </div>
            </div>
            {billingQuery.data.subscription.latestInvoice && (
              <div className="sm:col-span-2">
                <div className="text-muted-foreground text-sm">
                  Latest invoice
                </div>
                <div>
                  {billingQuery.data.subscription.latestInvoice.id} •{' '}
                  {billingQuery.data.subscription.latestInvoice.amountPaid /
                    100}{' '}
                  {billingQuery.data.subscription.latestInvoice.currency.toUpperCase()}
                </div>
              </div>
            )}
            {billingQuery.data.subscription.cancelAtPeriodEnd && (
              <div className="sm:col-span-2">
                <Button
                  disabled={restoreSubMutation.isPending}
                  onClick={() => {
                    restoreSubMutation.mutate({ userId });
                  }}
                  type="button"
                >
                  {restoreSubMutation.isPending
                    ? 'Restoring…'
                    : 'Restore subscription'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
