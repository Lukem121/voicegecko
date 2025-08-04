import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { BarChart, Clock, FileText, TrendingUp } from 'lucide-react';

import { caller } from '~/trpc/server';

// Format numbers to compact notation (12k, 1.2M, etc.)
const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
};

// Format time intelligently (minutes for < 60min, hours for 60min+)
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`;
};

export default async function UsagePage() {
  const stats = await caller.usage.getStats();

  const currentPeriod = {
    transcriptions: {
      used: stats.current.isUnlimited
        ? stats.monthly.transcriptions
        : stats.current.transcriptionCount,
      limit: stats.current.isUnlimited
        ? 'Unlimited'
        : `${stats.current.wordsLimit} words`,
    },
    wordsProcessed: stats.monthly.words,
    timeSaved: stats.monthly.timeSaved,
    apiCalls: stats.monthly.transcriptions, // Using transcriptions as a proxy for API calls
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

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-medium text-3xl">Usage</h1>
        <p className="text-muted-foreground">
          Track your transcription usage and performance metrics
        </p>
      </div>

      {/* Current Usage Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
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
                : `of ${currentPeriod.transcriptions.limit}`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
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

        <Card className="border-0 shadow-sm">
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
            <p className="mt-1 text-muted-foreground text-xs">estimated</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <BarChart className="h-4 w-4" />
              Total Transcriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCompactNumber(stats.total.transcriptions)}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">all time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Performance Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-medium text-lg">
              Performance Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageStats.map((stat, index) => (
              <div className="flex items-center justify-between" key={index}>
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
      </div>
    </div>
  );
}
