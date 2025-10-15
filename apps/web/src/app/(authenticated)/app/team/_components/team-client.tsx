'use client';

import type { RouterOutputs } from '@acme/api/src/root';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@acme/ui/components/ui/alert';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import { toast } from '@acme/ui/components/ui/sonner';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Plus, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTRPC } from '~/trpc/react';

type Member = RouterOutputs['team']['getMembers'][number];
type SeatStatus = RouterOutputs['team']['getSeatStatus'];
type MemberContext = RouterOutputs['team']['getMemberContext'];

export default function TeamClient({
  initialContext,
  initialMembers,
  initialSeats,
}: {
  initialContext: MemberContext;
  initialMembers: Member[];
  initialSeats: SeatStatus | { used: number; total: number; available: number };
}) {
  const router = useRouter();
  const trpc = useTRPC();

  const isOwner = initialContext.role === 'owner';
  const ownerInfo = initialContext.owner ?? null;
  const members = initialMembers;
  const seats = initialSeats;
  const noSeatsAvailable = (seats?.available ?? 0) <= 0;

  const [email, setEmail] = useState('');

  const addMemberMutation = useMutation(
    trpc.team.addMemberByEmail.mutationOptions({
      onSuccess: () => {
        toast.success('Member added');
        router.refresh();
      },
    })
  );

  const removeMemberMutation = useMutation(
    trpc.team.removeMember.mutationOptions({
      onSuccess: () => {
        router.refresh();
      },
    })
  );

  const portalMutation = useMutation(
    trpc.stripe.createBillingPortalSession.mutationOptions()
  );

  const leaveMutation = useMutation(trpc.team.leave.mutationOptions());

  const openBillingPortal = async () => {
    try {
      const { url } = await portalMutation.mutateAsync({});
      if (url) {
        window.location.href = url;
      }
    } catch {
      toast.error('Failed to open billing portal');
    }
  };

  const addMember = () => {
    if (!email) {
      return Promise.resolve();
    }
    return addMemberMutation
      .mutateAsync({ email })
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : 'Failed to add member. Try again.'
        );
      })
      .finally(() => setEmail(''));
  };

  const removeMember = (id: number) => {
    return removeMemberMutation.mutateAsync({ id });
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="mb-1 font-semibold text-2xl tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage your team members and seats
        </p>
      </div>

      {isOwner ? (
        <div className="flex gap-2">
          <Button onClick={openBillingPortal} variant="outline">
            <Plus />
            Increase Seats
          </Button>
        </div>
      ) : (
        ownerInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="font-medium text-base">Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="text-muted-foreground">Managed by</div>
                <div className="font-medium">{ownerInfo.email}</div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-base">Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{seats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">{seats.used}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">{seats.available}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-base">Add Member</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {noSeatsAvailable && (
              <Alert variant="default">
                <AlertTriangle />
                <AlertTitle>No seats available</AlertTitle>
                <AlertDescription>
                  Increase seats in billing to invite more members.
                  <Button
                    onClick={openBillingPortal}
                    size="sm"
                    variant="secondary"
                  >
                    <Plus />
                    Increase Seats
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {!noSeatsAvailable && (
              <>
                <Input
                  disabled={addMemberMutation.isPending || noSeatsAvailable}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />

                <div className="flex items-center gap-2">
                  <Button
                    disabled={
                      addMemberMutation.isPending || noSeatsAvailable || !email
                    }
                    onClick={addMember}
                  >
                    <PlusCircle />
                    Add Member
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              try {
                await leaveMutation.mutateAsync();
                window.location.reload();
              } catch {
                toast.error('Failed to leave team');
              }
            }}
            variant="destructive"
          >
            Leave Team
          </Button>
        </div>
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm">No members yet.</p>
              ) : (
                members.map((m) => (
                  <div className="flex items-center justify-between" key={m.id}>
                    <div className="text-sm">
                      <div className="font-medium">{m.email}</div>
                      <div className="text-muted-foreground">
                        {m.role} • {m.status}
                      </div>
                    </div>
                    {m.role !== 'owner' && (
                      <Button
                        onClick={() => removeMember(m.id)}
                        size="sm"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
