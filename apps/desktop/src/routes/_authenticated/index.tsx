import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import Fuse from "fuse.js";
import {
  Copy,
  Info,
  Loader2,
  MessageSquare,
  Mic,
  MoreVertical,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import { Card, CardContent } from "@acme/ui/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@acme/ui/components/ui/dropdown-menu";
import { Input } from "@acme/ui/components/ui/input";
import { Textarea } from "@acme/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/components/ui/tooltip";
import { cn } from "@acme/ui/lib/utils";

import { useDeleteTranscription } from "~/features/transcription/use-delete-transcription";
import { useGetTranscriptions } from "~/features/transcription/use-get-transcriptions";
import { useUser } from "~/hooks/auth";
import { useDebouncedSearch } from "~/hooks/use-debounced-search";
import { recordingService } from "~/services/recording.service";
import { useEventStore } from "~/stores/event.store";
import { trpc } from "~/trpc";

export const Route = createFileRoute("/_authenticated/")({
  component: RecordingPage,
});

function RecordingPage() {
  const user = useUser();
  const { transcriptions } = useGetTranscriptions();
  const { deleteTranscription } = useDeleteTranscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Search functionality
  const search = useDebouncedSearch({ delay: 300 });

  // External state from main event store
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const transcript = useEventStore((state) => state.transcript);
  const transcriptionStatus = useEventStore(
    (state) => state.transcriptionStatus,
  );
  const transcriptionError = useEventStore((state) => state.transcriptionError);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  // Fetch usage status
  const { data: usageStatus } = useQuery(trpc.usage.getStatus.queryOptions());

  const isAtLimit =
    usageStatus && !usageStatus.isUnlimited && !usageStatus.canTranscribe;

  // Flatten all transcriptions for search
  const allTranscriptions = transcriptions.flatMap((section) => section.items);

  // Filter and limit recent transcriptions for display
  const filteredTranscriptions = (() => {
    if (!search.debouncedSearchTerm) {
      // No search - show recent 5 items
      return allTranscriptions.slice(0, 5);
    }

    // Perform fuzzy search on all transcriptions
    const fuse = new Fuse(allTranscriptions, {
      keys: ["content"],
      threshold: 0.4,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(search.debouncedSearchTerm);

    // Return up to 10 search results (more than normal since user is actively searching)
    return fuzzyResults.slice(0, 10).map((result) => result.item);
  })();

  console.log(
    "[RecordingPage] Component render - transcript:",
    transcript,
    "transcriptionStatus:",
    transcriptionStatus,
    "recordingStatus:",
    recordingStatus,
    "error:",
    transcriptionError,
  );

  const handleMicClick = async () => {
    console.log(
      "[Recording] 🎯 handleMicClick called, status:",
      recordingStatus,
    );

    if (recordingStatus === "recording") {
      setIsProcessing(true);
    }

    try {
      console.log(
        "[Recording] 🚀 Calling recordingService.toggleRecording()...",
      );
      await recordingService.toggleRecording();
      console.log("[Recording] ✅ Recording toggled successfully");
    } catch (error) {
      console.error("[Recording] ❌ Error during recording flow:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
  };

  const handleSendFeedback = (id: number) => {
    console.log("Send feedback for:", id);
  };

  const handleDeleteTranscript = async (id: number) => {
    try {
      await deleteTranscription({ id });
    } catch (error) {
      console.error("Failed to delete transcription:", error);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Record</h1>
        <Card>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Start typing or click the microphone to record..."
                  className="min-h-[200px] resize-none border-0 text-base focus-visible:ring-0"
                  value={transcript ?? ""}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isRecording ? "destructive" : "secondary"}
                      size="icon"
                      className={cn(
                        `absolute top-3 right-3 h-10 w-10 rounded-full`,
                        isRecording && "animate-pulse",
                      )}
                      onClick={handleMicClick}
                      disabled={isTranscribing || isProcessing}
                    >
                      {isTranscribing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isRecording ? (
                        <Square className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isAtLimit ? (
                      <p>
                        Usage limit reached. Recording allowed but transcription
                        may be blocked.
                      </p>
                    ) : usageStatus && !usageStatus.isUnlimited ? (
                      <p>
                        {usageStatus.wordsUsed.toLocaleString()} /{" "}
                        {usageStatus.wordsLimit.toLocaleString()} words used
                        this week
                      </p>
                    ) : (
                      <p>Click to start recording</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-wide text-gray-500 uppercase">
              RECENTS
            </h2>
            <div className="flex items-center gap-1">
              {isSearchExpanded ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Search transcriptions..."
                      value={search.searchTerm}
                      onChange={(e) => search.setSearchTerm(e.target.value)}
                      className="h-8 w-64 pr-8"
                      autoFocus
                    />
                    {search.searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={search.clearSearch}
                        className="absolute top-0 right-1 h-8 w-8 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsSearchExpanded(false);
                      search.clearSearch();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsSearchExpanded(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search results info */}
          {search.debouncedSearchTerm && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>
                Found {filteredTranscriptions.length} result
                {filteredTranscriptions.length !== 1 ? "s" : ""} for "
                {search.debouncedSearchTerm}"
              </span>
            </div>
          )}

          {/* Recent Transcriptions */}
          <div className="overflow-hidden rounded-lg border">
            {filteredTranscriptions.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center">
                {search.debouncedSearchTerm ? (
                  <>
                    <p>
                      No transcriptions found matching "
                      {search.debouncedSearchTerm}".
                    </p>
                    <p className="text-sm">Try adjusting your search terms.</p>
                  </>
                ) : (
                  <>
                    <p>No recent transcriptions yet.</p>
                    <p className="text-sm">
                      Start recording to see your transcriptions here.
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredTranscriptions.map((item, index) => (
                <div
                  key={item.id}
                  className={`group hover:bg-muted/50 flex items-start justify-between border-transparent p-3 transition-colors ${
                    index < filteredTranscriptions.length - 1
                      ? "border-border border-b"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3 pr-4">
                    <div className="text-muted-foreground text-sm whitespace-nowrap">
                      {item.timestamp}
                    </div>
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div
                        className={`text-sm leading-relaxed ${
                          item.status === "silent"
                            ? "text-muted-foreground italic"
                            : "text-foreground"
                        }`}
                      >
                        {item.content.length > 80
                          ? `${item.content.substring(0, 80)}...`
                          : item.content}
                      </div>
                      {item.status === "silent" && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>No audio detected during this recording</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {item.status !== "silent" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.content);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy transcription</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendFeedback(item.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send feedback</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleDeleteTranscript(item.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete transcription
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View all transcriptions link */}
          {(search.debouncedSearchTerm || allTranscriptions.length > 5) && (
            <div className="flex justify-center py-2">
              <Link
                to="/transcriptions"
                search={
                  search.debouncedSearchTerm
                    ? { search: search.debouncedSearchTerm }
                    : {}
                }
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {search.debouncedSearchTerm
                  ? "View all search results in transcriptions →"
                  : "View all transcriptions →"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
