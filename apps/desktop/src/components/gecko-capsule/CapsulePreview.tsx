import { Badge } from '@acme/ui/components/ui/badge';
import { cn } from '@acme/ui/lib/utils';
import { useEffect, useRef } from 'react';
import { useDictationStore } from '~/stores/dictation.store';

const CLOUD_ENGINES = new Set([
  'gpt4o_transcribe',
  'gpt4o_mini_transcribe',
]);

type CapsulePreviewProps = {
  className?: string;
};

export function CapsulePreview({ className }: CapsulePreviewProps) {
  const partialText = useDictationStore((s) => s.partialText);
  const finalText = useDictationStore((s) => s.finalText);
  const phase = useDictationStore((s) => s.phase);
  const lastEngineId = useDictationStore((s) => s.lastEngineId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayText = partialText || finalText;
  const isLive = phase === 'transcribing' && Boolean(partialText);
  const isCloud = lastEngineId ? CLOUD_ENGINES.has(lastEngineId) : false;
  const isPreviewPhase =
    phase === 'recording' || phase === 'transcribing' || phase === 'formatting';

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [displayText]);

  if (!displayText || !isPreviewPhase) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none mb-3 w-[min(480px,calc(100vw-2rem))] rounded-xl border bg-background/95 px-4 py-3 text-foreground shadow-xl backdrop-blur-md',
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {isLive ? 'Live transcript' : 'Transcript'}
        </span>
        {isCloud ? (
          <Badge variant="destructive">Cloud STT</Badge>
        ) : null}
      </div>
      <div
        className={cn(
          'max-h-48 min-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed',
          isLive && 'text-muted-foreground'
        )}
        ref={scrollRef}
      >
        {displayText}
        {isLive ? (
          <span aria-hidden="true" className="ml-0.5 inline-block animate-pulse">
            …
          </span>
        ) : null}
      </div>
    </div>
  );
}
