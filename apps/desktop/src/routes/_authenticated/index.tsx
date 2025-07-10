import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  FileText,
  Mic,
  Pause,
  Play,
  Square,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Progress } from "@acme/ui/components/ui/progress";

import { useSignOut, useUser } from "~/hooks/auth";
import { trpc } from "~/trpc";

const Home = () => {
  const user = useUser();
  const signOut = useSignOut();

  const secretMessage = useMutation(
    trpc.auth.getSecretMessage.mutationOptions({
      onSuccess: (data) => {
        console.log("secretMessage", data);
      },
      onError: (error) => {
        console.error("error", error);
      },
    }),
  );

  // Mock data for the dashboard
  const stats = [
    {
      title: "Total Transcriptions",
      value: "1,234",
      description: "All time",
      icon: FileText,
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "This Month",
      value: "89",
      description: "New transcriptions",
      icon: TrendingUp,
      trend: "+23%",
      trendUp: true,
    },
    {
      title: "Hours Transcribed",
      value: "342",
      description: "Total time",
      icon: Clock,
      trend: "+8%",
      trendUp: true,
    },
    {
      title: "Active Sessions",
      value: "3",
      description: "Currently recording",
      icon: Mic,
      trend: "Live",
      trendUp: true,
    },
  ];

  const recentTranscriptions = [
    {
      id: 1,
      title: "Meeting Notes - Q4 Planning",
      duration: "45:23",
      status: "completed",
      createdAt: "2 hours ago",
    },
    {
      id: 2,
      title: "Interview with John Smith",
      duration: "32:15",
      status: "processing",
      createdAt: "4 hours ago",
    },
    {
      id: 3,
      title: "Lecture Recording - AI Ethics",
      duration: "78:42",
      status: "completed",
      createdAt: "1 day ago",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your transcriptions today.
          </p>
        </div>
        <Button size="lg" className="gap-2">
          <Mic className="h-4 w-4" />
          Start Recording
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <span>{stat.description}</span>
                {stat.trend && (
                  <Badge
                    variant={stat.trendUp ? "default" : "secondary"}
                    className="ml-auto"
                  >
                    {stat.trend}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Transcriptions */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Transcriptions</CardTitle>
            <CardDescription>
              Your latest transcription activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="grid gap-1">
                      <p className="text-sm leading-none font-medium">
                        {transcription.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {transcription.createdAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        transcription.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {transcription.status}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {transcription.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" variant="outline">
              <Mic className="h-4 w-4" />
              Start New Recording
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <FileText className="h-4 w-4" />
              Upload Audio File
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <TrendingUp className="h-4 w-4" />
              View Analytics
            </Button>

            {/* Current Recording Status */}
            <div className="bg-muted mt-6 rounded-lg p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Current Recording</span>
                <Badge variant="outline">Live</Badge>
              </div>
              <p className="text-muted-foreground mb-2 text-xs">
                Meeting Notes - Daily Standup
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Pause className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline">
                  <Square className="h-3 w-3" />
                </Button>
                <span className="text-muted-foreground ml-auto text-xs">
                  23:45
                </span>
              </div>
              <Progress value={65} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Test Section - Development Only */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Development Tools</CardTitle>
          <CardDescription>
            Test API connections and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() =>
                secretMessage.mutate({
                  message: "Hello from authenticated user!",
                })
              }
              disabled={secretMessage.isPending}
              variant="outline"
            >
              {secretMessage.isPending ? "Loading..." : "Test Protected API"}
            </Button>

            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>

          {secretMessage.data && (
            <div className="rounded border border-green-200 bg-green-50 p-3">
              <strong>API Response:</strong>{" "}
              {JSON.stringify(secretMessage.data, null, 2)}
            </div>
          )}

          {secretMessage.error && (
            <div className="rounded border border-red-200 bg-red-50 p-3">
              <strong>API Error:</strong> {secretMessage.error.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});
