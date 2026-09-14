import { cn } from '@acme/ui/lib/utils';
import { formatLatency } from '~/lib/whisper-accuracy';
import { useDictationStore } from '~/stores/dictation.store';

type LatencyBadgeProps = {
  className?: string;
};

export function LatencyBadge({ className }: LatencyBadgeProps) {
  const lastLatencyMs = useDictationStore((s) => s.lastLatencyMs);
  const phase = useDictationStore((s) => s.phase);

  const showBadge =
    lastLatencyMs != null &&
    (phase === 'transcribing' || phase === 'formatting' || phase === 'done');

  if (!showBadge || lastLatencyMs == null) {
    return null;
  }

  return (
    <span
      className={cn(
        'rounded-full bg-primary/20 px-2 py-0.5 font-medium text-primary text-xs',
        className
      )}
    >
      {formatLatency(lastLatencyMs)}
    </span>
  );
}
