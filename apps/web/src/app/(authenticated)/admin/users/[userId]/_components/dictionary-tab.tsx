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

type DictionaryTabProps = {
  userId: string;
};

export function DictionaryTab({ userId }: DictionaryTabProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [newWord, setNewWord] = useState('');

  const dictQuery = useQuery(
    trpc.admin.dictionary.listByUser.queryOptions({ userId })
  );

  const addMutation = useMutation(
    trpc.admin.dictionary.add.mutationOptions({
      onSuccess: async () => {
        toast.success('Dictionary entry added successfully');
        const key = trpc.admin.dictionary.listByUser.queryKey();
        await queryClient.invalidateQueries({ queryKey: key });
        setNewWord('');
      },
      onError: (error) => {
        toast.error(`Failed to add dictionary entry: ${error.message}`);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.admin.dictionary.delete.mutationOptions({
      onSuccess: async () => {
        toast.success('Dictionary entry deleted successfully');
        const key = trpc.admin.dictionary.listByUser.queryKey();
        await queryClient.invalidateQueries({ queryKey: key });
      },
      onError: (error) => {
        toast.error(`Failed to delete dictionary entry: ${error.message}`);
      },
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dictionary</CardTitle>
      </CardHeader>
      <CardContent>
        {dictQuery.isLoading && (
          <div className="text-muted-foreground text-sm">Loading…</div>
        )}
        <div className="mb-3 flex gap-2">
          <Input
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add word"
            value={newWord}
          />
          <Button
            disabled={addMutation.isPending || !newWord.trim()}
            onClick={() => {
              if (newWord.trim()) {
                addMutation.mutate({ userId, word: newWord.trim() });
              }
            }}
            type="button"
          >
            {addMutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
        {dictQuery.data?.entries?.length ? (
          <ul className="list-inside list-disc text-sm">
            {dictQuery.data.entries.map((w) => (
              <li key={w.id}>
                {w.word}
                <Button
                  className="ml-2"
                  disabled={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate({ entryId: w.id, userId })
                  }
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-muted-foreground text-sm">No entries</div>
        )}
      </CardContent>
    </Card>
  );
}
