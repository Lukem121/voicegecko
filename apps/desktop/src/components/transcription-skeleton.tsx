import { Skeleton } from '@acme/ui/components/ui/skeleton';

export function TranscriptionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Date header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />

        {/* Transcription cards container */}
        <div className="overflow-hidden rounded-lg border">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className={`flex items-start justify-between p-3 ${
                index < 2 ? 'border-border border-b' : ''
              }`}
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton components with static content can safely use index as key
              key={index}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {/* Timestamp skeleton - matches text-sm */}
                <Skeleton className="h-5 w-16 flex-shrink-0" />

                {/* Content skeleton - matches the nested structure and text-sm leading-relaxed */}
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-5 w-3/5" />
                  </div>
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Second section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />

        <div className="overflow-hidden rounded-lg border">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              className={`flex items-start justify-between p-3 ${
                index < 1 ? 'border-border border-b' : ''
              }`}
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton components with static content can safely use index as key
              key={index}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Skeleton className="h-5 w-16 flex-shrink-0" />
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                </div>
              </div>

              <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TranscriptionPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-48" /> {/* Title */}
        </div>
        <Skeleton className="h-10 w-80" /> {/* Search input */}
      </div>

      {/* Content skeleton */}
      <TranscriptionSkeleton />
    </div>
  );
}
