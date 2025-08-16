import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Progress } from '@acme/ui/components/ui/progress';
import { Skeleton } from '@acme/ui/components/ui/skeleton';
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

      // Track usage patterns for business intelligence
      const usagePercentage = stats.current.isUnlimited
        ? 0
        : (stats.current.wordsUsed / stats.current.wordsLimit) * 100;

      if (!stats.current.isUnlimited && usagePercentage >= 80) {
        analytics.track('usage_limit_approached', {
          limit_type: 'transcription',
          current_usage: stats.current.wordsUsed,
          limit_value: stats.current.wordsLimit,
          percentage_used: usagePercentage,
        });
      }
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
    transcriptions: {
      used: stats.current.isUnlimited
        ? stats.monthly.transcriptions
        : stats.current.transcriptionCount,
      limit: stats.current.isUnlimited ? 'Unlimited' : 'this week',
    },
    wordsProcessed: stats.monthly.words,
    timeSaved: stats.monthly.timeSaved,
    totalTranscriptions: stats.total.transcriptions,
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
      label: 'Avg. Words per Transcription',
      value:
        stats.total.transcriptions > 0
          ? Math.round(
              stats.total.words / stats.total.transcriptions
            ).toString()
          : '0',
      trend: '',
    },
  ];

  // Calculate usage percentage for free users
  const usagePercentage = stats.current.isUnlimited
    ? 0
    : (stats.current.wordsUsed / stats.current.wordsLimit) * 100;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="font-semibold text-2xl">Usage</h2>
          <p className="text-muted-foreground text-sm">
            Track your transcription usage and performance metrics
          </p>
        </div>
      </div>

      {/* Usage Limit Progress for Free Users */}
      {!stats.current.isUnlimited && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-base">
              Weekly Usage Limit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Words Used</span>
              <span className="font-medium">
                {stats.current.wordsUsed.toLocaleString()} /{' '}
                {stats.current.wordsLimit.toLocaleString()}
              </span>
            </div>
            <Progress className="h-2" value={usagePercentage} />
            {usagePercentage >= 90 && (
              <p className="text-amber-600 text-sm">
                {usagePercentage >= 100
                  ? 'Usage limit reached. Upgrade to Pro for unlimited words.'
                  : 'Approaching usage limit'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
              Transcriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {currentPeriod.transcriptions.used}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              {stats.current.isUnlimited
                ? 'this month'
                : currentPeriod.transcriptions.limit}
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
                  'https://www.voicegecko.io';
                await open(`${websiteUrl}/app/plans`);
              }}
              variant="outline"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade to Pro
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
            Track your transcription usage and performance metrics
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['transcriptions', 'words', 'time', 'total'].map((type) => (
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
