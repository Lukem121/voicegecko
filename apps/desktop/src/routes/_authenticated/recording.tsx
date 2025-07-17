import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Download,
  Info,
  List,
  Loader2,
  MessageSquare,
  Mic,
  MoreVertical,
  RotateCw,
  Search,
  Square,
  Trash2,
} from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import { Card, CardContent } from "@acme/ui/components/ui/card";
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
import { Textarea } from "@acme/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/components/ui/tooltip";
import { cn } from "@acme/ui/lib/utils";

import { recordingService } from "~/services/recording.service";
import { useEventStore } from "~/stores/event.store";

export const Route = createFileRoute("/_authenticated/recording")({
  component: RecordingPage,
});

interface RecentTranscription {
  id: string;
  timestamp: string;
  content: string;
  status: "normal" | "silent" | "dismissed";
}

const recentTranscriptions: RecentTranscription[] = [
  {
    id: "1",
    timestamp: "09:40 PM",
    content: "Cats and dogs make fun-looking frogs.",
    status: "normal",
  },
  {
    id: "2",
    timestamp: "09:39 PM",
    content: "Audio is silent.",
    status: "silent",
  },
  {
    id: "3",
    timestamp: "09:38 PM",
    content:
      "This is a test, and I'm interested to see how it handles both mine and your transcription.",
    status: "normal",
  },
  {
    id: "4",
    timestamp: "09:37 PM",
    content: "The transcription was dismissed.",
    status: "dismissed",
  },
];

function RecordingPage() {
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const transcript = useEventStore((state) => state.transcript);
  const transcriptionStatus = useEventStore(
    (state) => state.transcriptionStatus,
  );
  const transcriptionError = useEventStore((state) => state.transcriptionError);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSendFeedback = (id: string) => {
    console.log("Send feedback for:", id);
  };

  const handleDeleteTranscript = (id: string) => {
    console.log("Delete transcript for:", id);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6">
        {/* Main Note Input */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Start typing or click the microphone to record..."
                  className="min-h-[200px] resize-none border-0 text-base focus-visible:ring-0"
                  value={transcript ?? ""}
                  readOnly
                />
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
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Removed spinner section */}
                </div>
                <Button variant="secondary">Finish</Button>
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
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Recent Transcriptions */}
          <div className="overflow-hidden rounded-lg border">
            {recentTranscriptions.map((item, index) => (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger>
                  <div
                    className={`group hover:bg-muted/50 flex items-start justify-between border-transparent p-3 transition-colors ${
                      index < recentTranscriptions.length - 1
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
                          {item.content.length > 80
                            ? `${item.content.substring(0, 80)}...`
                            : item.content}
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
                  <ContextMenuItem onClick={() => handleSendFeedback(item.id)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send feedback
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleDeleteTranscript(item.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete transcription
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
