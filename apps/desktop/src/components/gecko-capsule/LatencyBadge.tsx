import { cn } from '@acme/ui/lib/utils';
import { useDictationStore } from '~/stores/dictation.store';

type LatencyBadgeProps = {
  className?: string;
};

export function LatencyBadge({ className }: LatencyBadgeProps) {
  const lastLatencyMs = useDictationStore((s) => s.lastLatencyMs);
  const phase = useDictationStore((s) => s.phase);

  if (lastLatencyMs == null || phase === 'idle') {
    return null;
  }

  return (
    <span
      className={cn(
        'rounded-full bg-primary/20 px-2 py-0.5 font-mono text-primary text-xs',
        className
      )}
    >
      {lastLatencyMs}ms
    </span>
  );
}
