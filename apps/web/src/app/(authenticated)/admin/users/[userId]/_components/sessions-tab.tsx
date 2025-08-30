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

type SessionsTabProps = {
  userId: string;
};

export function SessionsTab({ userId }: SessionsTabProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery(
    trpc.admin.sessions.listByUser.queryOptions({ userId })
  );

  const revokeSession = useMutation(
    trpc.admin.sessions.revoke.mutationOptions({
      onSuccess: async () => {
        toast.success('Session revoked successfully');
        await queryClient.invalidateQueries({
          queryKey: trpc.admin.sessions.listByUser.queryKey({ userId }),
        });
      },
      onError: (error) => {
        toast.error(`Failed to revoke session: ${error.message}`);
      },
    })
  );

  const revokeAll = useMutation(
    trpc.admin.sessions.revokeAll.mutationOptions({
      onSuccess: async () => {
        toast.success('All sessions revoked successfully');
        await queryClient.invalidateQueries({
          queryKey: trpc.admin.sessions.listByUser.queryKey({ userId }),
        });
      },
      onError: (error) => {
        toast.error(`Failed to revoke all sessions: ${error.message}`);
      },
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <Button
            disabled={revokeAll.isPending}
            onClick={() => {
              revokeAll.mutate({ userId });
            }}
            type="button"
          >
            {revokeAll.isPending ? 'Revoking all…' : 'Revoke all sessions'}
          </Button>
        </div>
        {sessionsQuery.isLoading && (
          <div className="text-muted-foreground text-sm">Loading…</div>
        )}
        {sessionsQuery.data?.sessions?.length ? (
          <div className="divide-y">
            {sessionsQuery.data.sessions.map((s) => (
              <div
                className="flex items-center justify-between py-3 text-sm"
                key={s.id}
              >
                <div>
                  <div>{s.createdAt.toLocaleString()}</div>
                  <div className="text-muted-foreground text-sm">
                    {s.ipAddress ?? 'unknown'} •{' '}
                    {s.userAgent?.slice(0, 60) ?? 'n/a'}
                  </div>
                </div>
                <div>
                  <Button
                    disabled={revokeSession.isPending}
                    onClick={() => revokeSession.mutate({ sessionId: s.id })}
                    type="button"
                    variant="destructive"
                  >
                    {revokeSession.isPending ? 'Revoking…' : 'Revoke'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No sessions</div>
        )}
      </CardContent>
    </Card>
  );
}
