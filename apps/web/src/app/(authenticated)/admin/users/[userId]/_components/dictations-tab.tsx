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

type DictationsTabProps = {
  userId: string;
};

export function DictationsTab({ userId }: DictationsTabProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const dictationsQuery = useQuery(
    trpc.admin.dictations.listByUser.queryOptions({ userId, limit: 20, search })
  );

  const deleteMutation = useMutation(
    trpc.admin.dictations.delete.mutationOptions({
      onSuccess: async () => {
        toast.success('Dictation deleted successfully');
        const key = trpc.admin.dictations.listByUser.queryKey();
        await queryClient.invalidateQueries({
          queryKey: key,
        });
      },
      onError: (error) => {
        toast.error(`Failed to delete dictation: ${error.message}`);
      },
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dictations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <Input
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dictations"
            value={search}
          />
        </div>
        {dictationsQuery.isLoading && (
          <div className="text-muted-foreground text-sm">Loading…</div>
        )}
        {dictationsQuery.data?.dictations?.length ? (
          <div className="divide-y">
            {dictationsQuery.data.dictations.map((d) => (
              <div className="py-3 text-sm" key={d.id}>
                <div className="mb-1 font-medium">#{d.id}</div>
                <div className="text-muted-foreground text-sm">
                  {d.createdAt.toLocaleString()}
                </div>
                <div className="line-clamp-3">{d.content}</div>
                <div className="mt-2">
                  <Button
                    disabled={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate({ dictationId: d.id, userId })
                    }
                    type="button"
                    variant="destructive"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No dictations</div>
        )}
      </CardContent>
    </Card>
  );
}
