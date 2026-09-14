import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { formatLatency, whisperProfileLabel } from '~/lib/whisper-accuracy';
import { AccuracyTestCard } from '~/routes/_authenticated/settings/accuracy-test-card';
import { GpuWhisperModelsCard } from '~/routes/_authenticated/settings/gpu-whisper-models-card';
import { listWhisperModels } from '~/services/whisper-models.service';
import { useDictationStore } from '~/stores/dictation.store';

export const Route = createFileRoute('/_authenticated/settings/engine-lab')({
  component: EngineLabPage,
});

function EngineLabPage() {
  const lastAccuracy = useDictationStore((s) => s.lastAccuracy);
  const { data: whisperModels = [] } = useQuery({
    queryKey: ['gpu-whisper-models'],
    queryFn: listWhisperModels,
  });
  const activeModel = whisperModels.find((model) => model.selected);
  let activeLabel = 'None selected';
  if (activeModel) {
    const profile = whisperProfileLabel(activeModel.id);
    activeLabel = profile === activeModel.id ? activeModel.name : profile;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">Speed & accuracy</h1>
        <p className="text-muted-foreground text-sm">
          Dictation quality is a tradeoff. Pick a profile, speak once, then
          type what you actually said to see which downloaded model was closest.
        </p>
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">Using </span>
          <span className="font-medium">{activeLabel}</span>
          {lastAccuracy ? (
            <span className="text-muted-foreground">
              {' '}
              · last test {lastAccuracy.percent}% on {lastAccuracy.profileLabel}
              {lastAccuracy.latencyMs != null
                ? ` in ${formatLatency(lastAccuracy.latencyMs)}`
                : ''}
            </span>
          ) : null}
        </p>
      </div>

      <GpuWhisperModelsCard onRefreshStatus={() => undefined} />

      <AccuracyTestCard />
    </div>
  );
}
