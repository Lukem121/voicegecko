import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart,
  Calendar,
  Clock,
  Download,
  FileText,
  TrendingUp,
} from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Progress } from "@acme/ui/components/ui/progress";
import { Skeleton } from "@acme/ui/components/ui/skeleton";

import { trpc } from "~/trpc";

export const Route = createFileRoute("/_authenticated/usage")({
  component: UsagePage,
});

function UsagePage() {
  const { data: stats, isLoading } = useQuery(
    trpc.usage.getStats.queryOptions(),
  );

  if (isLoading || !stats) {
    return <UsagePageSkeleton />;
  }

  const currentPeriod = {
    transcriptions: {
      used: stats.current.isUnlimited
        ? stats.monthly.transcriptions
        : stats.current.transcriptionCount,
      limit: stats.current.isUnlimited
        ? "Unlimited"
        : `${stats.current.wordsLimit} words`,
    },
    wordsProcessed: stats.monthly.words,
    timeSaved: stats.monthly.timeSaved,
    totalTranscriptions: stats.total.transcriptions,
  };

  const usageStats = [
    {
      label: "Total Words",
      value: stats.total.words.toLocaleString(),
      trend: "",
    },
    {
      label: "Total Time Saved",
      value: `${stats.total.timeSaved.toFixed(1)}h`,
      trend: "",
    },
    {
      label: "Avg. Words per Transcription",
      value:
        stats.total.transcriptions > 0
          ? Math.round(
              stats.total.words / stats.total.transcriptions,
            ).toString()
          : "0",
      trend: "",
    },
  ];

  // Calculate usage percentage for free users
  const usagePercentage = !stats.current.isUnlimited
    ? (stats.current.wordsUsed / stats.current.wordsLimit) * 100
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">Usage</h2>
          <p className="text-muted-foreground text-sm">
            Track your transcription usage and performance metrics
          </p>
        </div>
      </div>

      {/* Usage Limit Progress for Free Users */}
      {!stats.current.isUnlimited && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Weekly Usage Limit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Words Used</span>
              <span className="font-medium">
                {stats.current.wordsUsed.toLocaleString()} /{" "}
                {stats.current.wordsLimit.toLocaleString()}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            {usagePercentage >= 90 && (
              <p className="text-sm text-amber-600">
                {usagePercentage >= 100
                  ? "Usage limit reached. Upgrade to Pro for unlimited words."
                  : "Approaching usage limit"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Period Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Transcriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPeriod.transcriptions.used}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.current.isUnlimited
                ? "this month"
                : `of ${currentPeriod.transcriptions.limit}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Words Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPeriod.wordsProcessed.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPeriod.timeSaved.toFixed(1)}h
            </div>
            <p className="text-muted-foreground mt-1 text-xs">estimated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <BarChart className="h-4 w-4" />
              Total Transcriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPeriod.totalTranscriptions.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">all time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Performance Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{stat.value}</span>
                  {stat.trend && (
                    <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-600">
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
            <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export Usage Report
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Calendar className="mr-2 h-4 w-4" />
              View Detailed Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <BarChart className="mr-2 h-4 w-4" />
              Compare Previous Months
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
          <h2 className="text-2xl font-semibold">Usage</h2>
          <p className="text-muted-foreground text-sm">
            Track your transcription usage and performance metrics
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
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
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
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
