import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Download,
  Info,
  MessageSquare,
  MoreVertical,
  RotateCcw,
  Search,
  Trash2,
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

import { useGetTranscriptions } from "~/features/transcription/use-get-transcriptions";

export const Route = createFileRoute("/_authenticated/transcriptions")({
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  const { transcriptions, isLoading } = useGetTranscriptions();

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
  };

  const handleSendFeedback = (id: string) => {
    console.log("Send feedback for:", id);
  };

  const handleRetryTranscript = (id: string) => {
    console.log("Retry transcript for:", id);
  };

  const handleDeleteTranscript = (id: string) => {
    console.log("Delete transcript for:", id);
  };

  const handleDownloadAudio = (id: string) => {
    console.log("Download audio for:", id);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
            <Input placeholder="Search transcriptions..." className="pl-10" />
          </div>
        </div>

        <div className="space-y-6">
          {transcriptions.map((section) => (
            <div key={section.date} className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                {section.date}
              </h2>
              <div className="overflow-hidden rounded-lg border">
                {section.items.map((item, index) => (
                  <ContextMenu key={item.id}>
                    <ContextMenuTrigger>
                      <div
                        className={`group hover:bg-muted/50 flex items-start justify-between border-transparent p-3 transition-colors ${
                          index < section.items.length - 1
                            ? "border-border border-b"
                            : ""
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="text-muted-foreground text-sm whitespace-nowrap">
                            {item.timestamp}
                          </div>
                          <div className="flex min-w-0 flex-1 items-start gap-2">
                            <div
                              className={`text-sm leading-relaxed ${
                                item.status === "silent" ||
                                item.status === "dismissed"
                                  ? "text-muted-foreground italic"
                                  : "text-foreground"
                              }`}
                            >
                              {item.content}
                            </div>
                            {(item.status === "silent" ||
                              item.status === "dismissed") && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {item.status === "silent"
                                      ? "No audio detected during this recording"
                                      : "This transcription was manually dismissed"}
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
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={() => handleCopy(item.content)}>
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
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
