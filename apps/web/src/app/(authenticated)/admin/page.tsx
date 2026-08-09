'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@acme/ui/components/ui/chart';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@acme/ui/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useTRPC } from '~/trpc/react';

export default function AdminDashboardPage() {
  const trpc = useTRPC();

  // Placeholder queries for initial dashboard (can be replaced with real KPIs)
  const usersQuery = useQuery(
    trpc.admin.users.list.queryOptions({ activityWindowDays: 30 })
  );

  const topUsers = useMemo(
    () => usersQuery.data?.users ?? [],
    [usersQuery.data]
  );
  const stats = useQuery(trpc.admin.stats.getDaily.queryOptions({ days: 14 }));
  const daily =
    stats.data?.stats?.map((d) => ({
      day: d.day,
      words: Number(d.words ?? 0),
      dictations: Number(d.dictations ?? 0),
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10">
      <h1 className="font-semibold text-2xl tracking-tight">Admin Dashboard</h1>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-users">Top Users</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-4" value="overview">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-3xl">{topUsers.length}</div>
                <p className="text-muted-foreground text-sm">Total users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Words (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-3xl">
                  {topUsers.reduce((sum, u) => sum + (u.recentWords ?? 0), 0)}
                </div>
                <p className="text-muted-foreground text-sm">
                  sum of recent page
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Dictations (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-3xl">
                  {topUsers.reduce(
                    (sum, u) => sum + (u.recentDictations ?? 0),
                    0
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  sum of recent page
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Last 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-64"
                config={{
                  words: { label: 'Words', color: 'hsl(var(--primary))' },
                  dictations: {
                    label: 'Dictations',
                    color: 'hsl(var(--muted-foreground))',
                  },
                  signups: {
                    label: 'Signups',
                    color: 'hsl(var(--destructive))',
                  },
                }}
              >
                <AreaChart data={daily} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis axisLine={false} dataKey="day" tickLine={false} />
                  <ChartTooltip
                    content={({ content: _content, ...props }) => (
                      <ChartTooltipContent {...props} />
                    )}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="words"
                    fill="var(--color-words)"
                    stroke="var(--color-words)"
                    type="monotone"
                  />
                  <Area
                    dataKey="dictations"
                    fill="var(--color-dictations)"
                    stroke="var(--color-dictations)"
                    type="monotone"
                  />
                  <Area
                    dataKey="signups"
                    fill="var(--color-signups)"
                    stroke="var(--color-signups)"
                    type="monotone"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="top-users">
          <Card>
            <CardHeader>
              <CardTitle>Top users by activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {topUsers.map((u) => (
                  <div
                    className="flex items-center justify-between py-3"
                    key={u.id}
                  >
                    <div>
                      <div className="font-medium">
                        <Link
                          className="hover:underline"
                          href={`/admin/users/${u.id}`}
                        >
                          {u.displayUsername ?? u.username}
                        </Link>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {u.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{u.recentWords ?? 0} words</div>
                      <div className="text-muted-foreground text-xs">
                        {u.recentDictations ?? 0} dictations
                      </div>
                    </div>
                  </div>
                ))}
                {topUsers.length === 0 && (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
