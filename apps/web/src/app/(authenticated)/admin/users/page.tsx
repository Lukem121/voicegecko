'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@acme/ui/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@acme/ui/components/ui/table';
import { useInfiniteQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTRPC } from '~/trpc/react';

export default function AdminUsersPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState('');
  const [activityWindow, setActivityWindow] = useState<7 | 30>(30);

  const query = useInfiniteQuery(
    trpc.admin.users.list.infiniteQueryOptions(
      { limit: 50, activityWindowDays: activityWindow },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    )
  );

  const users = useMemo(() => {
    const pages = query.data?.pages ?? [];
    return pages.flatMap((p) => p.users);
  }, [query.data]);

  const fuse = useMemo(() => {
    return new Fuse(users, {
      keys: ['email', 'username', 'displayUsername', 'name'],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [users]);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      return users;
    }
    return fuse.search(search.trim()).map((r) => r.item);
  }, [fuse, users, search]);

  useEffect(() => {
    const onScroll = () => {
      if (query.isFetchingNextPage || !query.hasNextPage) {
        return;
      }
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      if (scrolledToBottom) {
        query.fetchNextPage();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl tracking-tight">Users</h1>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Users</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              onValueChange={(value) =>
                setActivityWindow(Number(value) as 7 | 30)
              }
              value={activityWindow.toString()}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-full max-w-sm">
              <Input
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username or email"
                value={search}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Recent Words (30d)</TableHead>
                <TableHead>Recent Dictations (30d)</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link
                      className="hover:underline"
                      href={`/admin/users/${u.id}`}
                    >
                      {u.displayUsername ?? u.username}
                    </Link>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.recentWords ?? 0}</TableCell>
                  <TableCell>{u.recentDictations ?? 0}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground text-sm"
                    colSpan={6}
                  >
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {query.isFetchingNextPage && (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Loading more…
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
