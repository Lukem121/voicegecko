'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import { Label } from '@acme/ui/components/ui/label';
import { toast } from '@acme/ui/components/ui/sonner';
import { Switch } from '@acme/ui/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { authClient } from '~/lib/auth/client';
import { useTRPC } from '~/trpc/react';

type ModerationTabProps = {
  userId: string;
};

export function ModerationTab({ userId }: ModerationTabProps) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const userQuery = useQuery(trpc.admin.users.byId.queryOptions({ userId }));
  const banned = userQuery.data?.user?.banned ?? false;
  const [banReason, setBanReason] = useState('');
  const [banUntil, setBanUntil] = useState('');

  const banUser = useMutation({
    mutationFn: async ({
      banReason: reason,
      banExpiresIn,
    }: {
      banReason?: string | null;
      banExpiresIn?: number | null;
    }) => {
      const { error } = await authClient.admin.banUser({
        userId,
        banReason: reason ?? undefined,
        banExpiresIn: banExpiresIn ?? undefined,
      });
      if (error) {
        throw new Error(error.message ?? 'Failed to ban user');
      }
    },
    onSuccess: async () => {
      toast.success('User banned successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
    },
    onError: (error) => {
      toast.error(`Failed to ban user: ${error.message}`);
    },
  });

  const unbanUser = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.admin.unbanUser({ userId });
      if (error) {
        throw new Error(error.message ?? 'Failed to unban user');
      }
    },
    onSuccess: async () => {
      toast.success('User unbanned successfully');
      await queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
    },
    onError: (error) => {
      toast.error(`Failed to unban user: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderation</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <Label>Ban</Label>
          <div className="mt-2 flex items-center gap-3">
            <Switch
              checked={banned}
              onCheckedChange={(checked) => {
                if (checked) {
                  banUser.mutate({
                    banReason: banReason || null,
                    banExpiresIn: null,
                  });
                } else {
                  unbanUser.mutate();
                }
              }}
            />
            <Input
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason (optional)"
              value={banReason}
            />
            <Input
              onChange={(e) => setBanUntil(e.target.value)}
              type="datetime-local"
              value={banUntil}
            />
            <Button
              onClick={() => {
                const expiresInSeconds = banUntil
                  ? Math.max(
                      0,
                      Math.floor(
                        (new Date(banUntil).getTime() - Date.now()) / 1000
                      )
                    )
                  : undefined;
                banUser.mutate({
                  banReason: banReason || null,
                  banExpiresIn: expiresInSeconds ?? null,
                });
              }}
              type="button"
            >
              Save ban details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
