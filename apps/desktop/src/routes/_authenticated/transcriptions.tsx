import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Download,
  Info,
  Loader2,
  MessageSquare,
  MoreVertical,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@acme/ui/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@acme/ui/components/ui/dropdown-menu";
import { Input } from "@acme/ui/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/components/ui/tooltip";

import {
  TranscriptionPageSkeleton,
  TranscriptionSkeleton,
} from "~/components/transcription-skeleton";
import { useDeleteTranscription } from "~/features/transcription/use-delete-transcription";
import { useInfiniteTranscriptions } from "~/features/transcription/use-infinite-transcriptions";
import { useInfiniteScroll } from "~/hooks/use-infinite-scroll";

export const Route = createFileRoute("/_authenticated/transcriptions")({
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  const {
    transcriptions,
    isLoading,
    isFetchingNextPage,
    searchTerm,
    handleSearch,
    clearSearch,
    hasNextPage,
    fetchNextPage,
    totalResults,
    isFuzzySearch,
  } = useInfiniteTranscriptions({ limit: 20 });

  const { deleteTranscription, isDeleting } = useDeleteTranscription();

  // Set up infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold: 800, // Start loading when 800px from bottom
  });

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content.trim());
  };

  const handleSendFeedback = (id: number) => {
    console.log("Send feedback for:", id);
  };

  const handleRetryTranscript = (id: number) => {
    console.log("Retry transcript for:", id);
  };

  const handleDeleteTranscript = async (id: number) => {
    try {
      await deleteTranscription({ id });
    } catch (error) {
      console.error("Failed to delete transcription:", error);
    }
  };

  const handleDownloadAudio = (id: number) => {
    console.log("Download audio for:", id);
  };

  // Remove the full page replacement - we'll handle loading in-place

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Recent activity
            </h1>
          </div>
          <div className="relative w-80">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search transcriptions..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pr-12 pl-10"
            />
            <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-1">
              {/* Show subtle loading spinner while searching */}
              {searchTerm && isLoading && (
                <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
              )}
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Search results info - only show when we have actual results */}
        {searchTerm && transcriptions.length > 0 && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>
              {totalResults !== undefined
                ? `Found ${totalResults} result${totalResults !== 1 ? "s" : ""}`
                : `${transcriptions.reduce((acc, section) => acc + section.items.length, 0)} result${transcriptions.reduce((acc, section) => acc + section.items.length, 0) !== 1 ? "s" : ""}`}
              {isFuzzySearch && " (fuzzy search)"}
            </span>
          </div>
        )}

        <div className="space-y-6">
          {/* Show skeleton content while loading initial data */}
          {isLoading && transcriptions.length === 0 ? (
            <TranscriptionSkeleton />
          ) : transcriptions.length === 0 && searchTerm && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted mb-4 rounded-full p-3">
                <MessageSquare className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                No transcriptions found
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                We couldn't find any transcriptions matching "{searchTerm}". Try
                adjusting your search terms.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                className="mt-2"
              >
                Clear search
              </Button>
            </div>
          ) : transcriptions.length === 0 && !searchTerm && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted mb-4 rounded-full p-3">
                <MessageSquare className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                No transcriptions yet
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Start recording to see your transcriptions appear here. Your
                voice recordings will be automatically transcribed and organized
                by date.
              </p>
            </div>
          ) : (
            transcriptions.map((section: any) => (
              <div key={`section-${section.date}`} className="space-y-3">
                <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  {section.date}
                </h2>
                <div className="overflow-hidden rounded-lg border">
                  {section.items.map((item: any, index: number) => (
                    <ContextMenu key={`item-${item.id}`}>
                      <ContextMenuTrigger>
                        <div
                          className={`group hover:bg-muted/50 flex items-start justify-between border-transparent p-3 transition-colors will-change-auto ${
                            index < section.items.length - 1
                              ? "border-border border-b"
                              : ""
                          }`}
                          style={{ minHeight: "60px" }} // Ensure consistent minimum height
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
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
                                {item.content}
                              </div>
                              {item.status === "silent" && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      No audio detected during this recording
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                                  onClick={() =>
                                    handleDeleteTranscript(item.id)
                                  }
                                  className="text-red-600 focus:text-red-600"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  Delete transcription
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuItem
                          onClick={() => handleCopy(item.content)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy transcription
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => handleSendFeedback(item.id)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Send feedback
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleRetryTranscript(item.id)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry transcription
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => handleDeleteTranscript(item.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete transcription
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleDownloadAudio(item.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download audio
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Infinite scroll trigger element */}
        <div ref={loadMoreRef} className="h-1" />

        {/* Loading more skeleton */}
        {isFetchingNextPage && !isFuzzySearch && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
                <span className="text-muted-foreground text-xs tracking-wide uppercase">
                  Loading more...
                </span>
              </div>

              {/* Skeleton for loading items */}
              <div className="overflow-hidden rounded-lg border">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`loading-skeleton-${index}`}
                    className={`flex items-start justify-between p-3 ${
                      index < 1 ? "border-border border-b" : ""
                    }`}
                    style={{ minHeight: "60px" }}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="bg-muted h-5 w-16 flex-shrink-0 animate-pulse rounded" />
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <div className="flex-1 space-y-1.5">
                          <div className="bg-muted h-5 w-full animate-pulse rounded" />
                          <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                      <div className="bg-muted h-8 w-8 animate-pulse rounded-md" />
                      <div className="bg-muted h-8 w-8 animate-pulse rounded-md" />
                      <div className="bg-muted h-8 w-8 animate-pulse rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fallback Load More Button (in case infinite scroll doesn't work) */}
        {hasNextPage && !isFetchingNextPage && !isFuzzySearch && (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              className="text-muted-foreground hover:text-foreground"
            >
              Load More
            </Button>
          </div>
        )}

        {/* End of results indicator */}
        {!hasNextPage && transcriptions.length > 0 && !searchTerm && (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground text-sm">
              You've reached the end of your transcriptions
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
