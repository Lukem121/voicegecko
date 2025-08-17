import { log } from '@acme/observability/log';
import { CopyButton } from '@acme/ui/components/copy';
import { Button } from '@acme/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@acme/ui/components/ui/dropdown-menu';

import { Input } from '@acme/ui/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@acme/ui/components/ui/tooltip';
import { createFileRoute } from '@tanstack/react-router';
import {
  Info,
  Loader2,
  MessageSquare,
  MoreVertical,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { FeedbackModal } from '~/components/feedback-modal';
import { TranscriptionSkeleton } from '~/components/transcription-skeleton';
import { useDeleteTranscription } from '~/features/transcription/use-delete-transcription';
import { useInfiniteTranscriptions } from '~/features/transcription/use-infinite-transcriptions';
import { useInfiniteScroll } from '~/hooks/use-infinite-scroll';
import { analytics } from '~/lib/analytics/posthog-analytics';

type TranscriptionItemData = {
  id: number;
  timestamp: string;
  content: string;
  status: 'normal' | 'silent';
};

export const Route = createFileRoute('/_authenticated/transcriptions')({
  component: TranscriptionsPage,
});

// Empty state when no transcriptions exist
function EmptyTranscriptionsState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-2 font-semibold text-lg">No transcriptions yet</h3>
      <p className="mb-4 max-w-md text-muted-foreground">
        Start recording to see your transcriptions appear here. Your voice
        recordings will be automatically transcribed and organized by date.
      </p>
    </div>
  );
}

// Empty state when search returns no results
function NoSearchResultsState({
  searchTerm,
  clearSearch,
}: {
  searchTerm: string;
  clearSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-2 font-semibold text-lg">No transcriptions found</h3>
      <p className="mb-4 max-w-md text-muted-foreground">
        We couldn't find any transcriptions matching "{searchTerm}". Try
        adjusting your search terms.
      </p>
      <Button
        className="mt-2"
        onClick={clearSearch}
        size="sm"
        variant="outline"
      >
        Clear search
      </Button>
    </div>
  );
}

// Individual transcription item component
function TranscriptionItem({
  item,
  index,
  sectionLength,
  deletingId,
  openDropdownId,
  handleSendFeedback,
  handleDeleteTranscript,
  setOpenDropdownId,
  isDeleting,
}: {
  item: TranscriptionItemData;
  index: number;
  sectionLength: number;
  deletingId: number | null;
  openDropdownId: number | null;
  handleSendFeedback: (id: number, content: string) => void;
  handleDeleteTranscript: (id: number) => void;
  setOpenDropdownId: (id: number | null) => void;
  isDeleting: boolean;
}) {
  const isBeingDeleted = deletingId === item.id;

  return (
    <div
      className={`group flex items-start justify-between border-transparent p-3 transition-all will-change-auto hover:bg-muted/50 ${
        index < sectionLength - 1 ? 'border-border border-b' : ''
      } ${isBeingDeleted ? 'pointer-events-none bg-muted/30 opacity-50' : ''}`}
      key={item.id}
      style={{ minHeight: '60px' }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
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
            {item.content}
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
      <div
        className={`flex items-center gap-1 transition-opacity ${
          isBeingDeleted || openDropdownId === item.id
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {isBeingDeleted && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Deleting...</span>
          </div>
        )}
        {!isBeingDeleted && (
          <>
            {item.status !== 'silent' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CopyButton
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      analytics.track('transcription_copied', {
                        transcript_length: item.content.length,
                        method: 'button',
                      });
                      analytics.trackFeatureFirstUse('copy_transcription');
                    }}
                    text={item.content}
                    variant="ghost"
                  />
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
                    handleSendFeedback(item.id, item.content);
                    analytics.trackFeatureFirstUse('feedback_modal');
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
            <DropdownMenu
              onOpenChange={(open) => {
                setOpenDropdownId(open ? item.id : null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  disabled={isDeleting}
                  onClick={() => handleDeleteTranscript(item.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete transcription
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    transcriptionId: number;
    content: string;
  }>({
    isOpen: false,
    transcriptionId: 0,
    content: '',
  });

  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold: 800,
  });

  const handleSendFeedback = (id: number, content: string) => {
    setFeedbackModal({
      isOpen: true,
      transcriptionId: id,
      content,
    });

    analytics.track('feedback_submitted', {
      type: 'transcription_quality',
      rating: undefined,
      has_text: content.length > 0,
    });
  };

  const handleDeleteTranscript = async (id: number) => {
    try {
      log.info('Deleting transcription:', id);
      setDeletingId(id);
      setOpenDropdownId(null);
      await deleteTranscription({ id });
    } catch (error) {
      log.error('Failed to delete transcription:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Determine which content to render
  const getMainContent = () => {
    if (isLoading && transcriptions.length === 0) {
      return <TranscriptionSkeleton />;
    }

    if (transcriptions.length === 0 && searchTerm && !isLoading) {
      return (
        <NoSearchResultsState
          clearSearch={clearSearch}
          searchTerm={searchTerm}
        />
      );
    }

    if (transcriptions.length === 0 && !searchTerm && !isLoading) {
      return <EmptyTranscriptionsState />;
    }

    return transcriptions.map((section) => (
      <div className="space-y-3" key={`section-${section.date}`}>
        <h2 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
          {section.date}
        </h2>
        <div className="overflow-hidden rounded-lg border">
          {section.items.map((item, index) => (
            <TranscriptionItem
              deletingId={deletingId}
              handleDeleteTranscript={handleDeleteTranscript}
              handleSendFeedback={handleSendFeedback}
              index={index}
              isDeleting={isDeleting}
              item={item}
              key={item.id}
              openDropdownId={openDropdownId}
              sectionLength={section.items.length}
              setOpenDropdownId={setOpenDropdownId}
            />
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex h-10 items-center justify-between">
        <h1 className="font-bold text-2xl tracking-tight">Recent activity</h1>
        <div className="flex items-center gap-1">
          {isSearchExpanded ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  className="w-80 pr-12 pl-10"
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search transcriptions..."
                  value={searchTerm}
                />
                <div className="-translate-y-1/2 absolute top-1/2 right-1 flex items-center gap-1">
                  {/* Show subtle loading spinner while searching */}
                  {searchTerm && isLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                  {searchTerm && (
                    <Button
                      className="h-7 w-7 p-0"
                      onClick={clearSearch}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <Button
                className="h-8 w-8 p-0"
                onClick={() => {
                  setIsSearchExpanded(false);
                  clearSearch();
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
              onClick={() => {
                setIsSearchExpanded(true);
                analytics.trackFeatureFirstUse('transcription_search');
              }}
              size="sm"
              variant="ghost"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search results info - only show when we have actual results */}
      {searchTerm && transcriptions.length > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span>
            {totalResults !== undefined
              ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''}`
              : `${transcriptions.reduce((acc, section) => acc + section.items.length, 0)} result${transcriptions.reduce((acc, section) => acc + section.items.length, 0) !== 1 ? 's' : ''}`}
            {isFuzzySearch && ' (fuzzy search)'}
          </span>
        </div>
      )}

      <div className="space-y-6">{getMainContent()}</div>

      {/* Infinite scroll trigger element */}
      <div className="h-1" ref={loadMoreRef} />

      {/* Loading more skeleton */}
      {isFetchingNextPage && !isFuzzySearch && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Loading more...
              </span>
            </div>

            {/* Skeleton for loading items */}
            <div className="overflow-hidden rounded-lg border">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  className={`flex items-start justify-between p-3 ${
                    index < 1 ? 'border-border border-b' : ''
                  }`}
                  key={`loading-skeleton-${Date.now()}-${index}`}
                  style={{ minHeight: '60px' }}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="h-5 w-16 flex-shrink-0 animate-pulse rounded bg-muted" />
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-5 w-full animate-pulse rounded bg-muted" />
                        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                  <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                    <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                    <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
                    <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
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
            className="text-muted-foreground hover:text-foreground"
            onClick={() => fetchNextPage()}
            size="sm"
            variant="ghost"
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() =>
          setFeedbackModal({ isOpen: false, transcriptionId: 0, content: '' })
        }
        transcriptionContent={feedbackModal.content}
        transcriptionId={feedbackModal.transcriptionId}
      />
    </div>
  );
}
