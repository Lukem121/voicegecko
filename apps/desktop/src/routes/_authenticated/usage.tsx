import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Skeleton } from '@acme/ui/components/ui/skeleton';
import { createCrossPlatformUrl } from '@acme/utils/redirection';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { open } from '@tauri-apps/plugin-shell';
import {
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  TrendingUp,
} from 'lucide-react';
import React from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { trpc } from '~/trpc';

export const Route = createFileRoute('/_authenticated/usage')({
  component: UsagePage,
});

function UsagePage() {
  const { data: stats, isLoading } = useQuery(
    trpc.usage.getStats.queryOptions()
  );

  // Track usage page view and potential business intelligence
  React.useEffect(() => {
    if (stats && !isLoading) {
      analytics.trackFeatureFirstUse('usage_page');
    }
  }, [stats, isLoading]);

  if (isLoading || !stats) {
    return <UsagePageSkeleton />;
  }

  const currentPeriod = {
    wordsUsed: {
      used: stats.current.isUnlimited
        ? stats.monthly.words
        : stats.current.wordsUsed,
      limit: stats.current.isUnlimited ? 'Unlimited' : stats.current.wordsLimit,
    },
    dictations: {
      used: stats.current.isUnlimited
        ? stats.monthly.dictations
        : stats.current.dictationCount,
      limit: stats.current.isUnlimited ? 'Unlimited' : 'this week',
    },
    wordsProcessed: stats.monthly.words,
    timeSaved: stats.monthly.timeSaved,
    totalDictations: stats.total.dictations,
  };

  const usageStats = [
    {
      label: 'Total Words',
      value: stats.total.words.toLocaleString(),
      trend: '',
    },
    {
      label: 'Total Time Saved',
      value: `${stats.total.timeSaved.toFixed(1)}h`,
      trend: '',
    },
    {
      label: 'Avg. Words per Dictation',
      value:
        stats.total.dictations > 0
          ? Math.round(stats.total.words / stats.total.dictations).toString()
          : '0',
      trend: '',
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-semibold text-2xl">Usage</h2>
          <p className="text-muted-foreground text-sm">
            Track your dictation usage and performance metrics
          </p>
        </div>
      </div>

      {/* Current Period Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Words Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.current.isUnlimited
                ? currentPeriod.wordsUsed.used.toLocaleString()
                : currentPeriod.wordsUsed.used.toLocaleString()}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              {stats.current.isUnlimited
                ? 'this month'
                : `of ${currentPeriod.wordsUsed.limit.toLocaleString()} this week`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <FileText className="h-4 w-4" />
              Dictations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {currentPeriod.dictations.used}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              {stats.current.isUnlimited
                ? 'this month'
                : currentPeriod.dictations.limit}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Words Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {currentPeriod.wordsProcessed.toLocaleString()}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {currentPeriod.timeSaved.toFixed(1)}h
            </div>
            <p className="mt-1 text-muted-foreground text-xs">this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-lg">
              Performance Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageStats.map((stat) => (
              <div
                className="flex items-center justify-between"
                key={stat.label}
              >
                <span className="font-medium text-sm">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{stat.value}</span>
                  {stat.trend && (
                    <span className="rounded bg-green-50 px-2 py-1 text-green-600 text-xs">
                      {stat.trend}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              onClick={async () => {
                // Track upgrade prompt interaction
                analytics.track('upgrade_prompt_shown', {
                  trigger: 'usage_page',
                  plan_suggested: 'pro',
                });

                analytics.trackFeatureFirstUse('upgrade_button');

                const websiteUrl =
                  import.meta.env.VITE_PUBLIC_VOICEGECKO_URL ||
                  'https://www.voicegecko.dev';

                // Create cross-platform URL that preserves desktop context
                const upgradeUrl = createCrossPlatformUrl(
                  `${websiteUrl}/app/plans`,
                  {
                    feature: 'upgrade',
                    source: 'desktop',
                    metadata: {
                      trigger: 'upgrade_button',
                      plan_suggested: 'pro',
                    },
                  }
                );

                await open(upgradeUrl);
              }}
              variant="outline"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Support Voice Gecko
              <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsagePageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-semibold text-2xl">Usage</h2>
          <p className="text-muted-foreground text-sm">
            Track your dictation usage and performance metrics
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['dictations', 'words', 'time', 'total'].map((type) => (
          <Card key={`overview-${type}`}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-1 h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {['performance', 'actions'].map((section) => (
          <Card key={`section-${section}`}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {['item-1', 'item-2', 'item-3'].map((item) => (
                <div
                  className="flex items-center justify-between"
                  key={`section-${section}-item-${item}`}
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
