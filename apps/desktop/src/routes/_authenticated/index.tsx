import { log } from '@acme/observability/log';
import { Button } from '@acme/ui/components/ui/button';
import { Card, CardContent } from '@acme/ui/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@acme/ui/components/ui/dropdown-menu';

import { Input } from '@acme/ui/components/ui/input';
import { Textarea } from '@acme/ui/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@acme/ui/components/ui/tooltip';
import { cn } from '@acme/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
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
} from 'lucide-react';
import { useState } from 'react';

import { useDeleteTranscription } from '~/features/transcription/use-delete-transcription';
import { useGetTranscriptions } from '~/features/transcription/use-get-transcriptions';
import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import { recordingService } from '~/services/recording.service';
import { useEventStore } from '~/stores/event.store';
import { trpc } from '~/trpc';

// Types
type UsageStatus = {
  isUnlimited: boolean;
  canTranscribe: boolean;
  wordsUsed: number;
  wordsLimit: number;
};

type TranscriptionItem = {
  id: number;
  content: string;
  timestamp: string;
  status: string;
};

// Helper function to get mic button icon
const getMicButtonIcon = (isTranscribing: boolean, isRecording: boolean) => {
  if (isTranscribing) {
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }
  if (isRecording) {
    return <Square className="h-5 w-5" />;
  }
  return <Mic className="h-5 w-5" />;
};

// Helper function to get tooltip content
const getTooltipContent = (
  isAtLimit: boolean,
  usageStatus: UsageStatus | undefined
) => {
  if (isAtLimit) {
    return <p>Usage limit reached.</p>;
  }
  if (usageStatus && !usageStatus.isUnlimited) {
    return (
      <p>
        {usageStatus.wordsUsed.toLocaleString()} /{' '}
        {usageStatus.wordsLimit.toLocaleString()} words used this week
      </p>
    );
  }
  return <p>Click to start recording</p>;
};

// Search bar component
function SearchBar({
  search,
  isSearchExpanded,
  setIsSearchExpanded,
  filteredTranscriptions,
}: {
  search: {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    debouncedSearchTerm: string;
    clearSearch: () => void;
  };
  isSearchExpanded: boolean;
  setIsSearchExpanded: (expanded: boolean) => void;
  filteredTranscriptions: TranscriptionItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-gray-500 text-lg uppercase tracking-wide">
          RECENTS
        </h2>
        <div className="flex items-center gap-1">
          {isSearchExpanded ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  autoFocus
                  className="h-8 w-64 pr-8"
                  onChange={(e) => search.setSearchTerm(e.target.value)}
                  placeholder="Search transcriptions..."
                  value={search.searchTerm}
                />
                {search.searchTerm && (
                  <Button
                    className="absolute top-0 right-1 h-8 w-8 p-0"
                    onClick={search.clearSearch}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Button
                className="h-8 w-8 p-0"
                onClick={() => {
                  setIsSearchExpanded(false);
                  search.clearSearch();
                }}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              className="h-8 w-8 p-0"
              onClick={() => setIsSearchExpanded(true)}
              size="sm"
              variant="ghost"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search results info */}
      {search.debouncedSearchTerm && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>
            Found {filteredTranscriptions.length} result
            {filteredTranscriptions.length !== 1 ? 's' : ''} for "
            {search.debouncedSearchTerm}"
          </span>
        </div>
      )}
    </div>
  );
}

// Individual transcription item component
function TranscriptionItem({
  item,
  index,
  totalItems,
  onCopy,
  onSendFeedback,
  onDelete,
}: {
  item: TranscriptionItem;
  index: number;
  totalItems: number;
  onCopy: (content: string) => void;
  onSendFeedback: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const isLastItem = index === totalItems - 1;

  return (
    <div
      className={`group flex items-start justify-between border-transparent p-3 transition-colors hover:bg-muted/50 ${
        isLastItem ? '' : 'border-border border-b'
      }`}
      key={item.id}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 pr-4">
        <div className="whitespace-nowrap text-muted-foreground text-sm">
          {item.timestamp}
        </div>
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div
            className={`text-sm leading-relaxed ${
              item.status === 'silent'
                ? 'text-muted-foreground italic'
                : 'text-foreground'
            }`}
          >
            {item.content.length > 80
              ? `${item.content.substring(0, 80)}...`
              : item.content}
          </div>
          {item.status === 'silent' && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>No audio detected during this recording</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {item.status !== 'silent' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(item.content);
                }}
                size="sm"
                variant="ghost"
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
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSendFeedback(item.id);
              }}
              size="sm"
              variant="ghost"
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
            <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete transcription
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Recording area component
function RecordingArea({
  transcript,
  isRecording,
  isTranscribing,
  isProcessing,
  isAtLimit,
  usageStatus,
  onMicClick,
}: {
  transcript: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  isProcessing: boolean;
  isAtLimit: boolean;
  usageStatus: UsageStatus | undefined;
  onMicClick: () => Promise<void>;
}) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Textarea
              className="min-h-[200px] resize-none border-0 text-base focus-visible:ring-0"
              placeholder="Start typing or click the microphone to record..."
              value={transcript ?? ''}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    'absolute top-3 right-3 h-10 w-10 rounded-full',
                    isRecording && 'animate-pulse'
                  )}
                  disabled={isTranscribing || isProcessing || isAtLimit}
                  onClick={onMicClick}
                  size="icon"
                  variant={isRecording ? 'destructive' : 'secondary'}
                >
                  {getMicButtonIcon(isTranscribing, isRecording)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {getTooltipContent(isAtLimit, usageStatus)}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_authenticated/')({
  component: RecordingPage,
});

function RecordingPage() {
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
    (state) => state.transcriptionStatus
  );
  const transcriptionError = useEventStore((state) => state.transcriptionError);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  // Fetch usage status
  const { data: usageStatus } = useQuery(trpc.usage.getStatus.queryOptions());

  const isAtLimit = Boolean(
    usageStatus && !usageStatus.isUnlimited && !usageStatus.canTranscribe
  );

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
      keys: ['content'],
      threshold: 0.4,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(search.debouncedSearchTerm);

    // Return up to 10 search results (more than normal since user is actively searching)
    return fuzzyResults.slice(0, 10).map((result) => result.item);
  })();

  log.info(
    '[RecordingPage] Component render - transcript:',
    transcript,
    'transcriptionStatus:',
    transcriptionStatus,
    'recordingStatus:',
    recordingStatus,
    'error:',
    transcriptionError
  );

  const handleMicClick = async () => {
    log.info('[Recording] 🎯 handleMicClick called, status:', recordingStatus);

    if (recordingStatus === 'recording') {
      setIsProcessing(true);
    }

    try {
      log.info('[Recording] 🚀 Calling recordingService.toggleRecording()...');
      await recordingService.toggleRecording();
      log.info('[Recording] ✅ Recording toggled successfully');
    } catch (error) {
      log.error('[Recording] ❌ Error during recording flow:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleSendFeedback = (id: number) => {
    log.info('Send feedback for:', id);
  };

  const handleDeleteTranscript = async (id: number) => {
    try {
      await deleteTranscription({ id });
    } catch (error) {
      log.error('Failed to delete transcription:', error);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex h-10 items-center justify-between">
          <h1 className="font-bold text-2xl tracking-tight">Record</h1>
        </div>
        <RecordingArea
          isAtLimit={isAtLimit}
          isProcessing={isProcessing}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          onMicClick={handleMicClick}
          transcript={transcript}
          usageStatus={usageStatus}
        />

        {/* Recents Section */}
        <div className="space-y-4">
          <SearchBar
            filteredTranscriptions={filteredTranscriptions}
            isSearchExpanded={isSearchExpanded}
            search={search}
            setIsSearchExpanded={setIsSearchExpanded}
          />

          {/* Recent Transcriptions */}
          <div className="overflow-hidden rounded-lg border">
            {filteredTranscriptions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
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
                <TranscriptionItem
                  index={index}
                  item={item}
                  key={item.id}
                  onCopy={handleCopy}
                  onDelete={handleDeleteTranscript}
                  onSendFeedback={handleSendFeedback}
                  totalItems={filteredTranscriptions.length}
                />
              ))
            )}
          </div>

          {/* View all transcriptions link */}
          {(search.debouncedSearchTerm || allTranscriptions.length > 5) && (
            <div className="flex justify-center py-2">
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                search={
                  search.debouncedSearchTerm
                    ? { search: search.debouncedSearchTerm }
                    : {}
                }
                to="/transcriptions"
              >
                {search.debouncedSearchTerm
                  ? 'View all search results in transcriptions →'
                  : 'View all transcriptions →'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
