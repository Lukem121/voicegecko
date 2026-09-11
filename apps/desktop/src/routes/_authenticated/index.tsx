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
import { useEffect, useMemo, useState } from 'react';

import { useDeleteDictation } from '~/features/dictation/use-delete-dictation';
import { useGetDictations } from '~/features/dictation/use-get-dictations';
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

type DictationItem = {
  id: string;
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
  filteredDictations,
}: {
  search: {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    debouncedSearchTerm: string;
    clearSearch: () => void;
  };
  isSearchExpanded: boolean;
  setIsSearchExpanded: (expanded: boolean) => void;
  filteredDictations: DictationItem[];
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
                  placeholder="Search dictations..."
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
            Found {filteredDictations.length} result
            {filteredDictations.length !== 1 ? 's' : ''} for "
            {search.debouncedSearchTerm}"
          </span>
        </div>
      )}
    </div>
  );
}

// Individual dictation item component
function DictationItem({
  item,
  index,
  totalItems,
  onCopy,
  onSendFeedback,
  onDelete,
}: {
  item: DictationItem;
  index: number;
  totalItems: number;
  onCopy: (content: string) => void;
  onSendFeedback: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
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
              <p>Copy dictation</p>
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
              Delete dictation
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
              placeholder="Click the mic or press Ctrl+Shift+Z, then speak…"
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
  const { dictations, refetch: refetchDictations } = useGetDictations();
  const { deleteDictation } = useDeleteDictation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Search functionality
  const search = useDebouncedSearch({ delay: 300 });

  // External state from main event store
  const recordingStatus = useEventStore((state) => state.recordingStatus);
  const transcript = useEventStore((state) => state.transcript);
  const dictationStatus = useEventStore((state) => state.dictationStatus);
  const dictationError = useEventStore((state) => state.dictationError);
  const isRecording = useEventStore((state) => state.isRecording());
  const isTranscribing = useEventStore((state) => state.isTranscribing());

  // Fetch usage status
  const { data: usageStatus } = useQuery(trpc.usage.getStatus.queryOptions());

  const isAtLimit = Boolean(
    usageStatus && !usageStatus.isUnlimited && !usageStatus.canTranscribe
  );

  // Flatten all dictations for search
  const allDictations = dictations.flatMap((section) => section.items);

  // Map dictation id to section date for grouping in recents/search
  const itemIdToDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of dictations) {
      for (const item of section.items) {
        map.set(item.id, section.date);
      }
    }
    return map;
  }, [dictations]);

  // Filter and limit recent dictations for display
  const filteredDictations = (() => {
    if (!search.debouncedSearchTerm) {
      // No search - show recent 5 items
      return allDictations.slice(0, 5);
    }

    // Perform fuzzy search on all dictations
    const fuse = new Fuse(allDictations, {
      keys: ['content'],
      threshold: 0.4,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(search.debouncedSearchTerm);

    // Return up to 10 search results (more than normal since user is actively searching)
    return fuzzyResults.slice(0, 10).map((result) => result.item);
  })();

  // Group filtered dictations by date (to match dictations page styling)
  const groupedFilteredDictations = useMemo(() => {
    const groups = new Map<string, DictationItem[]>();
    for (const item of filteredDictations) {
      const date = itemIdToDate.get(item.id) ?? 'Unknown Date';
      const arrayForDate = groups.get(date) ?? [];
      arrayForDate.push(item);
      groups.set(date, arrayForDate);
    }
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }, [filteredDictations, itemIdToDate]);

  log.info(
    '[RecordingPage] Component render - transcript:',
    transcript,
    'dictationStatus:',
    dictationStatus,
    'recordingStatus:',
    recordingStatus,
    'error:',
    dictationError
  );

  // Ensure recents update immediately after a dictation completes
  useEffect(() => {
    if (dictationStatus === 'complete') {
      refetchDictations();
    }
  }, [dictationStatus, refetchDictations]);

  const handleMicClick = async () => {
    log.info(recordingStatus, '[Recording] 🎯 handleMicClick called, status:');

    if (recordingStatus === 'recording') {
      setIsProcessing(true);
    }

    try {
      log.info('[Recording] 🚀 Calling recordingService.toggleRecording()...');
      await recordingService.toggleRecording();
      log.info('[Recording] ✅ Recording toggled successfully');
    } catch (error) {
      log.error(error, '[Recording] ❌ Error during recording flow:');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleSendFeedback = (id: string) => {
    log.info(id, 'Send feedback for:');
  };

  const handleDeleteTranscript = async (id: string) => {
    try {
      await deleteDictation({ id });
    } catch (error) {
      log.error(error, 'Failed to delete dictation:');
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
            filteredDictations={filteredDictations}
            isSearchExpanded={isSearchExpanded}
            search={search}
            setIsSearchExpanded={setIsSearchExpanded}
          />

          {/* Recent Dictations - grouped by day/date like dictations page */}
          {filteredDictations.length === 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <div className="p-8 text-center text-muted-foreground">
                {search.debouncedSearchTerm ? (
                  <>
                    <p>
                      No dictations found matching "{search.debouncedSearchTerm}
                      " .
                    </p>
                    <p className="text-sm">Try adjusting your search terms.</p>
                  </>
                ) : (
                  <>
                    <p>No recent dictations yet.</p>
                    <p className="text-sm">
                      Start recording to see your dictations here.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            groupedFilteredDictations.map((section) => (
              <div className="space-y-3" key={`section-${section.date}`}>
                <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
                  {section.date}
                </h2>
                <div className="overflow-hidden rounded-lg border">
                  {section.items.map((item, index) => (
                    <DictationItem
                      index={index}
                      item={item}
                      key={item.id}
                      onCopy={handleCopy}
                      onDelete={handleDeleteTranscript}
                      onSendFeedback={handleSendFeedback}
                      totalItems={section.items.length}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {/* View all dictations link */}
          {(search.debouncedSearchTerm || allDictations.length > 5) && (
            <div className="flex justify-center py-2">
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                search={
                  search.debouncedSearchTerm
                    ? { search: search.debouncedSearchTerm }
                    : {}
                }
                to="/dictations"
              >
                {search.debouncedSearchTerm
                  ? 'View all search results in dictations →'
                  : 'View all dictations →'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
