import {
  BarChart,
  Calendar,
  Clock,
  Download,
  FileText,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

export default function UsagePage() {
  const currentPeriod = {
    transcriptions: { used: 247, limit: "Unlimited" },
    wordsProcessed: 45832,
    timeSaved: 2.4,
    storageUsed: 1.2,
    apiCalls: 1580,
  };

  const recentTranscriptions = [
    {
      name: "Team Meeting Notes",
      duration: "15:32",
      words: 2340,
      accuracy: 98,
      date: "2 hours ago",
    },
    {
      name: "Interview Recording",
      duration: "42:18",
      words: 6890,
      accuracy: 96,
      date: "Yesterday",
    },
    {
      name: "Lecture Notes",
      duration: "28:45",
      words: 4200,
      accuracy: 99,
      date: "2 days ago",
    },
  ];

  const usageStats = [
    { label: "Average Accuracy", value: "97.8%", trend: "+2%" },
    { label: "Avg. Processing Speed", value: "3.2x", trend: "+15%" },
    { label: "Most Active Hour", value: "2-3 PM", trend: "" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-medium">Usage</h1>
        <p className="text-muted-foreground">
          Track your transcription usage and performance metrics
        </p>
      </div>

      {/* Current Usage Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
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
              of {currentPeriod.transcriptions.limit}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
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

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPeriod.timeSaved}h</div>
            <p className="text-muted-foreground mt-1 text-xs">estimated</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <BarChart className="h-4 w-4" />
              API Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPeriod.apiCalls.toLocaleString()}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Performance Stats */}
        <Card className="border-0 shadow-sm">
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
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export Usage Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              View Detailed Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BarChart className="mr-2 h-4 w-4" />
              Compare Previous Months
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
