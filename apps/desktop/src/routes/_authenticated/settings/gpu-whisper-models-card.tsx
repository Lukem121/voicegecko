import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@acme/ui/components/ui/collapsible';
import { Progress } from '@acme/ui/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@acme/ui/components/ui/table';
import { cn } from '@acme/ui/lib/utils';
import { listen } from '@tauri-apps/api/event';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, Sparkles, Timer, Trash2, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CompareTranscriptCell } from '~/components/compare-transcript-cell';
import { formatLatency, whisperProfileLabel } from '~/lib/whisper-accuracy';
import {
  cancelWhisperModelDownload,
  compareReadyWhisperModelsOnSamples,
  deleteWhisperModel,
  downloadWhisperModel,
  getSpeechSetupStatus,
  listWhisperModels,
  setSelectedWhisperModelId,
} from '~/services/whisper-models.service';
import type {
  WhisperModelCompareResponse,
  WhisperModelId,
  WhisperModelListItem,
} from '~/types/whisper-models';
import {
  WHISPER_TIER_LABELS,
  WHISPER_TIER_ORDER,
} from '~/types/whisper-models';
import { queryClient } from '~/trpc';

type GpuWhisperModelsCardProps = {
  onRefreshStatus: () => void;
};

const HERO_MODELS: Array<{
  id: WhisperModelId;
  label: string;
  speed: string;
  accuracy: string;
  icon: 'zap' | 'sparkles' | 'timer';
}> = [
  {
    id: 'base.en',
    label: 'Fast',
    speed: 'Quickest',
    accuracy: 'More misses',
    icon: 'zap',
  },
  {
    id: 'small.en',
    label: 'Recommended',
    speed: 'Everyday speed',
    accuracy: 'Strong accuracy',
    icon: 'sparkles',
  },
  {
    id: 'large-v3-turbo',
    label: 'Best',
    speed: 'Slowest',
    accuracy: 'Fewest mistakes',
    icon: 'timer',
  },
];

const HERO_IDS = new Set(HERO_MODELS.map((hero) => hero.id));

const HeroIcon = ({ name }: { name: (typeof HERO_MODELS)[number]['icon'] }) => {
  if (name === 'zap') {
    return <Zap className="h-5 w-5" />;
  }
  if (name === 'sparkles') {
    return <Sparkles className="h-5 w-5" />;
  }
  return <Timer className="h-5 w-5" />;
};

type WhisperChoiceCardProps = {
  label: string;
  speed: string;
  accuracy: string;
  icon: (typeof HERO_MODELS)[number]['icon'];
  model: WhisperModelListItem;
  isDownloading: boolean;
  progress: number;
  onDownload: (modelId: WhisperModelId) => void;
  onCancel: (modelId: WhisperModelId) => void;
  onSelect: (modelId: WhisperModelId) => void;
  downloadDisabled: boolean;
  selectPending: boolean;
};

function WhisperChoiceCard({
  label,
  speed,
  accuracy,
  icon,
  model,
  isDownloading,
  progress,
  onDownload,
  onCancel,
  onSelect,
  downloadDisabled,
  selectPending,
}: WhisperChoiceCardProps) {
  const isReady = model.status === 'ready';
  const canSelect = isReady && !model.selected && !selectPending;

  const activate = () => {
    if (canSelect) {
      onSelect(model.id);
      return;
    }
    if (!(isReady || isDownloading || downloadDisabled)) {
      onDownload(model.id);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border p-4 text-left',
        model.selected && 'border-primary bg-primary/5 ring-2 ring-primary/20'
      )}
    >
      <button
        className="flex flex-1 flex-col items-start gap-3 text-left"
        disabled={model.selected || isDownloading || selectPending}
        onClick={activate}
        type="button"
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="text-muted-foreground">
            <HeroIcon name={icon} />
          </span>
          {model.selected ? (
            <Badge variant="default">
              <Check className="mr-1 h-3 w-3" />
              In use
            </Badge>
          ) : null}
        </div>
        <div>
          <p className="font-semibold text-lg">{label}</p>
          <p className="text-muted-foreground text-sm">
            {speed} · {accuracy}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">{model.sizeLabel}</p>
        </div>
      </button>

      {isDownloading ? (
        <div className="mt-4 space-y-2">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">{progress}% downloaded</p>
          <Button
            onClick={() => onCancel(model.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {!isReady && !isDownloading ? (
        <Button
          className="mt-4"
          disabled={downloadDisabled}
          onClick={() => onDownload(model.id)}
          type="button"
        >
          Download
        </Button>
      ) : null}

      {canSelect ? (
        <Button
          className="mt-4"
          onClick={() => onSelect(model.id)}
          type="button"
          variant="secondary"
        >
          Use this
        </Button>
      ) : null}
    </div>
  );
}

type AdvancedModelRowProps = {
  model: WhisperModelListItem;
  isDownloading: boolean;
  progress: number;
  onDownload: (modelId: WhisperModelId) => void;
  onCancel: (modelId: WhisperModelId) => void;
  onSelect: (modelId: WhisperModelId) => void;
  onDelete: (modelId: WhisperModelId) => void;
  downloadDisabled: boolean;
  selectPending: boolean;
  deletePending: boolean;
};

function AdvancedModelRow({
  model,
  isDownloading,
  progress,
  onDownload,
  onCancel,
  onSelect,
  onDelete,
  downloadDisabled,
  selectPending,
  deletePending,
}: AdvancedModelRowProps) {
  const isReady = model.status === 'ready';

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{model.name}</p>
          <p className="text-muted-foreground text-xs">
            {model.id} · {model.sizeLabel}
          </p>
          <p className="text-muted-foreground text-xs">{model.description}</p>
        </div>
          {model.selected ? <Badge variant="default">In use</Badge> : null}
          {isReady && !model.selected ? (
            <Badge variant="outline">Ready</Badge>
          ) : null}
          {!isReady && !isDownloading ? (
            <Badge variant="outline">Not downloaded</Badge>
          ) : null}
      </div>
      {isDownloading ? (
        <div className="space-y-1">
          <Progress value={progress} />
          <Button
            onClick={() => onCancel(model.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!isReady && !isDownloading ? (
          <Button
            disabled={downloadDisabled}
            onClick={() => onDownload(model.id)}
            size="sm"
            type="button"
          >
            Download
          </Button>
        ) : null}
        {isReady && !model.selected ? (
          <Button
            disabled={selectPending}
            onClick={() => onSelect(model.id)}
            size="sm"
            type="button"
          >
            Use this
          </Button>
        ) : null}
        {isReady && model.id !== 'base.en' ? (
          <Button
            disabled={deletePending}
            onClick={() => onDelete(model.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SpeechSetupBanner({
  ready,
  message,
  waitingOn,
  progress,
  activity,
}: {
  ready: boolean;
  message: string;
  waitingOn: string;
  progress: number;
  activity: string;
}) {
  if (ready && waitingOn === 'none') {
    return (
      <div className="rounded-lg border bg-emerald-500/10 px-3 py-2 text-sm">
        {message}
      </div>
    );
  }

  const showBar = !ready || waitingOn !== 'none';

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm">
      <p className="font-medium">Speech setup</p>
      <p className="text-muted-foreground text-xs">{activity || message}</p>
      {showBar ? (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs tabular-nums">
            {progress}%
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function GpuWhisperModelsCard({
  onRefreshStatus,
}: GpuWhisperModelsCardProps) {
  const [whisperDownloadProgress, setWhisperDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [activeDownloadIds, setActiveDownloadIds] = useState<Set<string>>(
    new Set()
  );
  const [whisperCompareResult, setWhisperCompareResult] =
    useState<WhisperModelCompareResponse | null>(null);
  const userRequestedDownloads = useRef(new Set<string>());

  const activeDownloadCount = activeDownloadIds.size;

  const { data: setupStatus } = useQuery({
    queryKey: ['speech-setup-status'],
    queryFn: getSpeechSetupStatus,
    refetchInterval: (query) =>
      query.state.data?.ready && query.state.data.waitingOn === 'none'
        ? 4000
        : 400,
  });

  const {
    data: whisperModels = [],
    refetch: refetchWhisperModels,
    isLoading: whisperModelsLoading,
  } = useQuery({
    queryKey: ['gpu-whisper-models'],
    queryFn: listWhisperModels,
    refetchInterval:
      activeDownloadCount > 0 || setupStatus?.ready === false ? 1000 : false,
  });

  const removeActiveDownload = (modelId: string) => {
    setActiveDownloadIds((current) => {
      const next = new Set(current);
      next.delete(modelId);
      return next;
    });
    setWhisperDownloadProgress((current) => {
      const next = { ...current };
      delete next[modelId];
      return next;
    });
  };

  const startWhisperDownload = (modelId: WhisperModelId) => {
    if (activeDownloadIds.has(modelId)) {
      return;
    }

    setActiveDownloadIds((current) => new Set(current).add(modelId));
    userRequestedDownloads.current.add(modelId);
    setWhisperDownloadProgress((current) => ({ ...current, [modelId]: 0 }));

    void downloadWhisperModel(modelId).catch((error: unknown) => {
      removeActiveDownload(modelId);
      toast.error(
        error instanceof Error ? error.message : 'Whisper download failed'
      );
    });
  };

  const cancelWhisperDownload = (modelId: WhisperModelId) => {
    void cancelWhisperModelDownload(modelId)
      .then(() => {
        removeActiveDownload(modelId);
        void refetchWhisperModels();
        onRefreshStatus();
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to cancel download'
        );
      });
  };

  useEffect(() => {
    const unlistenProgress = listen<[string, number]>(
      'model-download-progress',
      (event) => {
        const [modelId, progress] = event.payload;
        setActiveDownloadIds((current) => {
          if (current.has(modelId)) {
            return current;
          }
          return new Set(current).add(modelId);
        });
        setWhisperDownloadProgress((current) => ({
          ...current,
          [modelId]: progress,
        }));
      }
    );
    const unlistenComplete = listen<string>(
      'model-download-complete',
      (event) => {
        const modelId = event.payload;
        const userRequested = userRequestedDownloads.current.has(modelId);
        userRequestedDownloads.current.delete(modelId);
        setActiveDownloadIds((current) => {
          const next = new Set(current);
          next.delete(modelId);
          return next;
        });
        setWhisperDownloadProgress((current) => {
          const next = { ...current };
          delete next[modelId];
          return next;
        });
        if (userRequested) {
          void setSelectedWhisperModelId(modelId as WhisperModelId).then(
            () => {
              toast.success(`Now using ${whisperProfileLabel(modelId)}`);
              void refetchWhisperModels();
              onRefreshStatus();
            }
          );
        }
        void refetchWhisperModels();
        onRefreshStatus();
      }
    );
    const unlistenError = listen<[string, string]>(
      'model-download-error',
      (event) => {
        const [modelId, message] = event.payload;
        removeActiveDownload(modelId);
        toast.error(message);
        void refetchWhisperModels();
      }
    );
    const unlistenCancelled = listen<string>(
      'model-download-cancelled',
      (event) => {
        removeActiveDownload(event.payload);
        void refetchWhisperModels();
        onRefreshStatus();
      }
    );

    const unlistenV2Progress = listen<{
      modelId: string;
      progress: number;
      status: string;
    }>('v2-model-download-progress', (event) => {
      const { modelId, progress, status } = event.payload;
      void queryClient.invalidateQueries({ queryKey: ['speech-setup-status'] });
      if (modelId === 'bootstrap' || modelId === 'whisper_sidecar') {
        return;
      }
      if (status === 'downloading') {
        setActiveDownloadIds((current) => {
          if (current.has(modelId)) {
            return current;
          }
          return new Set(current).add(modelId);
        });
        setWhisperDownloadProgress((current) => ({
          ...current,
          [modelId]: progress,
        }));
      }
    });

    return () => {
      void unlistenProgress.then((unlisten) => unlisten());
      void unlistenComplete.then((unlisten) => unlisten());
      void unlistenError.then((unlisten) => unlisten());
      void unlistenCancelled.then((unlisten) => unlisten());
      void unlistenV2Progress.then((unlisten) => unlisten());
    };
  }, [onRefreshStatus, refetchWhisperModels]);

  const whisperDeleteMutation = useMutation({
    mutationFn: (modelId: WhisperModelId) => deleteWhisperModel(modelId),
    onSuccess: (_result, modelId) => {
      toast.success(`${whisperProfileLabel(modelId)} removed`);
      void refetchWhisperModels();
      onRefreshStatus();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const whisperSelectMutation = useMutation({
    mutationFn: (modelId: WhisperModelId) => setSelectedWhisperModelId(modelId),
    onSuccess: (_result, modelId) => {
      toast.success(`Now using ${whisperProfileLabel(modelId)}`);
      void refetchWhisperModels();
      onRefreshStatus();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const whisperCompareMutation = useMutation({
    mutationFn: compareReadyWhisperModelsOnSamples,
    onSuccess: (result) => {
      setWhisperCompareResult(result);
      toast.success(
        `Compared ${result.results.length} model${result.results.length === 1 ? '' : 's'}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const modelsById = useMemo(() => {
    const map = new Map<string, WhisperModelListItem>();
    for (const model of whisperModels) {
      map.set(model.id, model);
    }
    return map;
  }, [whisperModels]);

  const heroModels = HERO_MODELS.map((hero) => ({
    ...hero,
    model: modelsById.get(hero.id),
  }));

  const catalogModels = whisperModels.filter((model) => !HERO_IDS.has(model.id));
  const modelsByTier = WHISPER_TIER_ORDER.map((tier) => ({
    tier,
    label: WHISPER_TIER_LABELS[tier],
    models: catalogModels.filter((model) => model.tier === tier),
  })).filter((group) => group.models.length > 0);

  const readyCount = whisperModels.filter(
    (model) => model.status === 'ready'
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose speed vs accuracy</CardTitle>
        <CardDescription>
          Fast, Recommended, and Best cover most people. Every Whisper.cpp model
          is still listed under Advanced if you want to compare them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {setupStatus ? (
          <SpeechSetupBanner
            activity={setupStatus.activity}
            message={setupStatus.message}
            progress={setupStatus.progress}
            ready={setupStatus.ready}
            waitingOn={setupStatus.waitingOn}
          />
        ) : null}
        {whisperModelsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading models…
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {heroModels.map((hero) =>
              hero.model ? (
                <WhisperChoiceCard
                  accuracy={hero.accuracy}
                  downloadDisabled={activeDownloadIds.has(hero.model.id)}
                  icon={hero.icon}
                  isDownloading={
                    activeDownloadIds.has(hero.model.id) ||
                    hero.model.status === 'downloading'
                  }
                  key={hero.id}
                  label={hero.label}
                  model={hero.model}
                  onCancel={cancelWhisperDownload}
                  onDownload={startWhisperDownload}
                  onSelect={(modelId) => whisperSelectMutation.mutate(modelId)}
                  progress={
                    whisperDownloadProgress[hero.model.id] ??
                    hero.model.progress
                  }
                  selectPending={whisperSelectMutation.isPending}
                  speed={hero.speed}
                />
              ) : (
                <div
                  className="rounded-xl border p-4 text-muted-foreground text-sm"
                  key={hero.id}
                >
                  {hero.label} is not in the catalog.
                </div>
              )
            )}
          </div>
        )}

        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-muted-foreground text-sm hover:text-foreground">
            <span>Advanced — all Whisper models</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {modelsByTier.map((group) => (
              <div className="space-y-3" key={group.tier}>
                <p className="font-medium text-sm">{group.label}</p>
                {group.models.map((model) => {
                  const isDownloading =
                    activeDownloadIds.has(model.id) ||
                    model.status === 'downloading';
                  return (
                    <AdvancedModelRow
                      deletePending={whisperDeleteMutation.isPending}
                      downloadDisabled={isDownloading}
                      isDownloading={isDownloading}
                      key={model.id}
                      model={model}
                      onCancel={cancelWhisperDownload}
                      onDelete={(modelId) =>
                        whisperDeleteMutation.mutate(modelId)
                      }
                      onDownload={startWhisperDownload}
                      onSelect={(modelId) =>
                        whisperSelectMutation.mutate(modelId)
                      }
                      progress={
                        whisperDownloadProgress[model.id] ?? model.progress
                      }
                      selectPending={whisperSelectMutation.isPending}
                    />
                  );
                })}
              </div>
            ))}

            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Replay last clip</p>
                <p className="text-muted-foreground text-xs">
                  Dictate once, then run every installed model on that audio. Shows
                  speed side by side. {readyCount} installed.
                </p>
              </div>
              <Button
                disabled={whisperCompareMutation.isPending || readyCount === 0}
                onClick={() => whisperCompareMutation.mutate()}
                type="button"
                variant="secondary"
              >
                {whisperCompareMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comparing…
                  </>
                ) : (
                  'Compare installed models'
                )}
              </Button>

              {whisperCompareResult ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Transcript</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {whisperCompareResult.results.map((row) => (
                        <TableRow key={row.modelId}>
                          <TableCell className="align-top font-medium">
                            {row.modelName}
                            {row.selected ? (
                              <Badge className="ml-2" variant="default">
                                In use
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="align-top whitespace-nowrap">
                            {row.latencyMs > 0
                              ? formatLatency(row.latencyMs)
                              : '—'}
                          </TableCell>
                          <TableCell className="align-top">
                            <CompareTranscriptCell
                              text={row.text}
                              textSnippet={row.textSnippet}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
