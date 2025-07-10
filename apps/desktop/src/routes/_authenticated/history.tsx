import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Download,
  FileText,
  Filter,
  History,
  Play,
  Search,
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
import { Input } from "@acme/ui/components/ui/input";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const transcriptions = [
    {
      id: 1,
      title: "Meeting Notes - Q4 Planning",
      duration: "45:23",
      status: "completed",
      createdAt: "2023-12-20T10:30:00Z",
      size: "2.1 MB",
      language: "English",
    },
    {
      id: 2,
      title: "Interview with John Smith",
      duration: "32:15",
      status: "completed",
      createdAt: "2023-12-19T14:20:00Z",
      size: "1.8 MB",
      language: "English",
    },
    {
      id: 3,
      title: "Lecture Recording - AI Ethics",
      duration: "78:42",
      status: "completed",
      createdAt: "2023-12-18T09:15:00Z",
      size: "4.2 MB",
      language: "English",
    },
    {
      id: 4,
      title: "Customer Call - Support Issue",
      duration: "15:30",
      status: "completed",
      createdAt: "2023-12-17T16:45:00Z",
      size: "890 KB",
      language: "English",
    },
    {
      id: 5,
      title: "Team Standup - Daily",
      duration: "12:05",
      status: "completed",
      createdAt: "2023-12-17T09:00:00Z",
      size: "650 KB",
      language: "English",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Transcription History
          </h1>
          <p className="text-muted-foreground">
            View and manage all your past transcriptions
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search transcriptions..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transcriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-muted-foreground text-xs">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-muted-foreground text-xs">December 2023</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142h</div>
            <p className="text-muted-foreground text-xs">Audio processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34m</div>
            <p className="text-muted-foreground text-xs">Per transcription</p>
          </CardContent>
        </Card>
      </div>

      {/* Transcriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transcriptions
          </CardTitle>
          <CardDescription>Your transcription history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transcriptions.map((transcription) => (
              <div
                key={transcription.id}
                className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">{transcription.title}</h4>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <span>{transcription.duration}</span>
                      <span>•</span>
                      <span>{transcription.size}</span>
                      <span>•</span>
                      <span>{transcription.language}</span>
                      <span>•</span>
                      <span>
                        {new Date(transcription.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{transcription.status}</Badge>
                  <Button variant="ghost" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing 1-5 of 247 transcriptions
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
