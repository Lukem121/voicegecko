'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import { toast } from '@acme/ui/components/ui/sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC } from '~/trpc/react';

type ProfileTabProps = {
  userId: string;
};

export function ProfileTab({ userId }: ProfileTabProps) {
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
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">User ID: {userId}</div>
          {userQuery.isLoading && (
            <div className="text-muted-foreground text-sm">Loading…</div>
          )}
          {userQuery.data?.user && (
            <ProfileEditor
              defaultDisplayUsername={
                userQuery.data.user.displayUsername ??
                userQuery.data.user.username
              }
              defaultName={userQuery.data.user.name ?? ''}
              email={userQuery.data.user.email}
              emailVerified={Boolean(userQuery.data.user.emailVerified)}
              joined={userQuery.data.user.createdAt.toLocaleDateString()}
              role={userQuery.data.user.role ?? 'user'}
              userId={userId}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileEditor({
  userId,
  defaultDisplayUsername,
  defaultName,
  email,
  joined,
  emailVerified,
  role,
}: {
  userId: string;
  defaultDisplayUsername: string | null;
  defaultName: string;
  email: string;
  joined: string;
  emailVerified: boolean;
  role: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState(defaultName);
  const [displayUsername, setDisplayUsername] = useState(
    defaultDisplayUsername ?? ''
  );

  const update = useMutation(
    trpc.admin.users.updateProfile.mutationOptions({
      onSuccess: async () => {
        toast.success('Profile updated successfully');
        const key = trpc.admin.users.byId.queryKey();
        await queryClient.invalidateQueries({ queryKey: key });
      },
      onError: (error) => {
        toast.error(`Failed to update profile: ${error.message}`);
      },
    })
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div className="text-muted-foreground text-sm">Display name</div>
        <Input onChange={(e) => setName(e.target.value)} value={name} />
      </div>
      <div>
        <div className="text-muted-foreground text-sm">Username</div>
        <Input
          onChange={(e) => setDisplayUsername(e.target.value)}
          value={displayUsername}
        />
      </div>
      <div>
        <div className="text-muted-foreground text-sm">Email</div>
        <div>{email}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-sm">Role</div>
        <div>{role}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-sm">Joined</div>
        <div>{joined}</div>
      </div>
      <div>
        <div className="text-muted-foreground text-sm">Email Verified</div>
        <div>{emailVerified ? 'Yes' : 'No'}</div>
      </div>
      <div className="sm:col-span-2">
        <Button
          disabled={update.isPending}
          onClick={() => update.mutate({ userId, name, displayUsername })}
          type="button"
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
