'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useTRPC } from '~/trpc/react';

export default function AdminDictationsPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState('');

  const query = useInfiniteQuery(
    trpc.admin.dictations.listAll.infiniteQueryOptions(
      { limit: 20, search: search || undefined },
      {
        getNextPageParam: (last) => last.nextCursor ?? undefined,
      }
    )
  );

  const items = (query.data?.pages ?? []).flatMap((p) => p.dictations);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <h1 className="font-semibold text-2xl tracking-tight">All Dictations</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dictations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content"
              value={search}
            />
          </div>
          <div className="divide-y">
            {items.map((d) => (
              <div className="py-3 text-sm" key={d.id}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-medium">#{d.id}</div>
                  <div className="text-muted-foreground">
                    {d.createdAt.toLocaleString()}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  <Link className="underline" href={`/admin/users/${d.userId}`}>
                    {d.userDisplayName ?? 'Unknown'} • {d.userEmail}
                  </Link>
                </div>
                <div className="line-clamp-3 pt-1">{d.content}</div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-6 text-center text-muted-foreground text-sm">
                No results
              </div>
            )}
            {query.hasNextPage && (
              <div className="py-4 text-center">
                <button
                  className="rounded bg-primary px-3 py-2 text-primary-foreground"
                  disabled={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                  type="button"
                >
                  {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
