import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Progress } from '@acme/ui/components/ui/progress';
import { Clock, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { caller } from '~/trpc/server';

const REGEX_NUM_FORMAT = /\.?0$/;

// Format numbers to compact notation (12k, 1.2M, etc.)
const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(REGEX_NUM_FORMAT, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(REGEX_NUM_FORMAT, '')}k`;
  }
  return num.toString();
};

// Format time intelligently (minutes for < 60min, hours for 60min+)
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1).replace(REGEX_NUM_FORMAT, '')}h`;
};

export default async function UsagePage() {
  const stats = await caller.usage.getStats();

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
  };

  const usageStats = [
    {
      label: 'Total Words',
      value: formatCompactNumber(stats.total.words),
      trend: '',
    },
    {
      label: 'Total Time Saved',
      value: formatTime(stats.total.timeSaved),
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
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Usage</h1>
        <p className="text-muted-foreground">
          Track your transcription usage and performance metrics
        </p>
      </div>

      {/* Usage Limit Progress for Free Users */}
      {!stats.current.isUnlimited && (
        <section>
          <Card>
            <CardHeader className="">
              <CardTitle className="font-medium text-base">
                Weekly Usage Limit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>Words Used</span>
                <span className="font-medium">
                  {stats.current.wordsUsed.toLocaleString()} /{' '}
                  {stats.current.wordsLimit.toLocaleString()}
                </span>
              </div>
              <Progress className="mt-2 h-2" value={usagePercentage} />
              {usagePercentage >= 90 && (
                <div className="mt-2 space-y-2">
                  <p className="text-amber-600 text-sm">
                    {usagePercentage >= 100
                      ? 'Usage limit reached. Upgrade to Pro for unlimited words.'
                      : 'Approaching usage limit.'}
                  </p>
                  {usagePercentage >= 90 && (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/app/plans">Upgrade to Pro</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Current Usage Overview */}
      <section>
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-xl">Current Period</h2>
          <p className="text-muted-foreground text-sm">
            Your usage statistics for this week and month
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Words Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {stats.current.isUnlimited
                  ? formatCompactNumber(currentPeriod.wordsUsed.used)
                  : currentPeriod.wordsUsed.used.toLocaleString()}
              </div>
              <p className="mt-1 text-muted-foreground text-xs">
                {stats.current.isUnlimited
                  ? 'this month'
                  : `of ${currentPeriod.wordsUsed.limit.toLocaleString()} this week`}
              </p>
            </CardContent>
          </Card>

          <Card className="">
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

          <Card className="">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Words Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatCompactNumber(currentPeriod.wordsProcessed)}
              </div>
              <p className="mt-1 text-muted-foreground text-xs">this month</p>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                Time Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatTime(currentPeriod.timeSaved)}
              </div>
              <p className="mt-1 text-muted-foreground text-xs">this month</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-xl">All Time Performance</h2>
          <p className="text-muted-foreground text-sm">
            Your overall usage patterns and efficiency metrics
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold text-lg">
                Performance Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {usageStats.map((stat, index) => (
                <div
                  className="flex items-center justify-between py-2"
                  key={`${stat.label}-${index}`}
                >
                  <span className="font-medium text-muted-foreground text-sm">
                    {stat.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">
                      {stat.value}
                    </span>
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
        </div>
      </section>
    </div>
  );
}
