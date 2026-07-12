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
import { Input } from '@acme/ui/components/ui/input';
import { Progress } from '@acme/ui/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@acme/ui/components/ui/table';
import { listen } from '@tauri-apps/api/event';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CompareTranscriptCell } from '~/components/compare-transcript-cell';
import {
  cancelWhisperModelDownload,
  compareReadyWhisperModelsOnSamples,
  deleteWhisperModel,
  downloadWhisperModel,
  listWhisperModels,
  setSelectedWhisperModelId,
} from '~/services/whisper-models.service';
import type { WhisperModelCompareResponse } from '~/types/whisper-models';
import type {
  WhisperModelId,
  WhisperModelListItem,
  WhisperModelTier,
} from '~/types/whisper-models';
import {
  WHISPER_TIER_LABELS,
  WHISPER_TIER_ORDER,
} from '~/types/whisper-models';

type GpuWhisperModelsCardProps = {
  onRefreshStatus: () => void;
};

const modelStatusLabel = (status: string): string => {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'downloading':
      return 'Downloading';
    default:
      return 'Not installed';
  }
};

const modelStatusVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'ready':
      return 'default';
    case 'downloading':
      return 'secondary';
    default:
      return 'outline';
  }
};

type WhisperModelRowProps = {
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

function WhisperModelRow({
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
}: WhisperModelRowProps) {
  const isReady = model.status === 'ready';
  const displayStatus = isDownloading
    ? 'downloading'
    : isReady
      ? 'ready'
      : 'not_downloaded';

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{model.name}</p>
            <code className="text-muted-foreground text-xs">{model.id}</code>
            {model.recommended ? (
              <Badge className="text-[10px]" variant="secondary">
                Bundled default
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">{model.description}</p>
          <p className="text-muted-foreground text-xs">
            {model.sizeLabel} · RAM {model.ramLabel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {model.selected ? (
            <Badge variant="default">
              <Check className="mr-1 h-3 w-3" />
              Active
            </Badge>
          ) : null}
          <Badge variant={modelStatusVariant(displayStatus)}>
            {modelStatusLabel(displayStatus)}
          </Badge>
        </div>
      </div>

      {isDownloading ? (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">{progress}% complete</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isDownloading ? (
          <Button
            onClick={() => onCancel(model.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        ) : null}
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
            Use this model
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
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function GpuWhisperModelsCard({
  onRefreshStatus,
}: GpuWhisperModelsCardProps) {
  const [search, setSearch] = useState('');
  const [whisperDownloadProgress, setWhisperDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [activeDownloadIds, setActiveDownloadIds] = useState<Set<string>>(
    new Set()
  );
  const [whisperCompareResult, setWhisperCompareResult] =
    useState<WhisperModelCompareResponse | null>(null);

  const activeDownloadCount = activeDownloadIds.size;

  const {
    data: whisperModels = [],
    refetch: refetchWhisperModels,
    isLoading: whisperModelsLoading,
  } = useQuery({
    queryKey: ['gpu-whisper-models'],
    queryFn: listWhisperModels,
    refetchInterval: activeDownloadCount > 0 ? 1000 : false,
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
          if (!current.has(modelId)) {
            return new Set(current).add(modelId);
          }
          return current;
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
        setActiveDownloadIds((current) => {
          const wasOnlyDownload = current.size === 1 && current.has(modelId);
          if (wasOnlyDownload) {
            void setSelectedWhisperModelId(modelId as WhisperModelId).then(
              () => {
                toast.success(`GPU Whisper now uses ${modelId}`);
                void refetchWhisperModels();
                onRefreshStatus();
              }
            );
          }
          const next = new Set(current);
          next.delete(modelId);
          return next;
        });
        setWhisperDownloadProgress((current) => {
          const next = { ...current };
          delete next[modelId];
          return next;
        });
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

    return () => {
      void unlistenProgress.then((unlisten) => unlisten());
      void unlistenComplete.then((unlisten) => unlisten());
      void unlistenError.then((unlisten) => unlisten());
      void unlistenCancelled.then((unlisten) => unlisten());
    };
  }, [onRefreshStatus, refetchWhisperModels]);

  const whisperDeleteMutation = useMutation({
    mutationFn: (modelId: WhisperModelId) => deleteWhisperModel(modelId),
    onSuccess: () => {
      toast.success('Whisper model removed');
      void refetchWhisperModels();
      onRefreshStatus();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const whisperSelectMutation = useMutation({
    mutationFn: (modelId: WhisperModelId) => setSelectedWhisperModelId(modelId),
    onSuccess: () => {
      toast.success('GPU Whisper model updated');
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
        `Compared ${result.results.length} ready Whisper model${result.results.length === 1 ? '' : 's'}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const readyModelCount = useMemo(
    () => whisperModels.filter((model) => model.status === 'ready').length,
    [whisperModels]
  );

  const filteredModels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return whisperModels;
    }
    return whisperModels.filter(
      (model) =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query)
    );
  }, [search, whisperModels]);

  const groupedModels = useMemo(() => {
    return WHISPER_TIER_ORDER.map((tier) => ({
      tier,
      label: WHISPER_TIER_LABELS[tier],
      models: filteredModels.filter((model) => model.tier === tier),
    })).filter((group) => group.models.length > 0);
  }, [filteredModels]);

  const selectedTier = whisperModels.find((model) => model.selected)?.tier;

  const tierDefaultOpen = (tier: WhisperModelTier): boolean => {
    if (search.trim()) {
      return true;
    }
    if (tier === selectedTier) {
      return true;
    }
    return tier === 'maximum' || tier === 'minimal';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPU Whisper model</CardTitle>
        <CardDescription>
          Full whisper.cpp catalog for Insanely Fast Whisper — all sizes and
          quantizations. Download a model, then click Use. Large models can take
          several minutes — use Cancel if a download stalls, then retry. Stored
          under{' '}
          <code className="text-xs">%LOCALAPPDATA%/voicegecko/models/</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-md border p-3">
          <div>
            <p className="font-medium text-sm">Compare ready models</p>
            <p className="text-muted-foreground text-xs">
              Run every downloaded Whisper model on your most recent dictation.
              Dictate once first, then compare. {readyModelCount} model
              {readyModelCount === 1 ? '' : 's'} ready.
            </p>
          </div>
          <Button
            disabled={
              whisperCompareMutation.isPending || readyModelCount === 0
            }
            onClick={() => whisperCompareMutation.mutate()}
            type="button"
            variant="secondary"
          >
            {whisperCompareMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing ready models…
              </>
            ) : (
              'Compare ready models on last dictation'
            )}
          </Button>

          {whisperCompareResult ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                {whisperCompareResult.sampleLabel}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Transcript</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whisperCompareResult.results.map((row) => (
                      <TableRow key={row.modelId}>
                        <TableCell className="align-top font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{row.modelName}</span>
                            <code className="text-muted-foreground text-xs">
                              {row.modelId}
                            </code>
                            {row.selected ? (
                              <Badge variant="default">Active</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top whitespace-nowrap">
                          {row.latencyMs > 0 ? `${row.latencyMs} ms` : '—'}
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
            </div>
          ) : null}
        </div>

        <Input
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search models (e.g. large-v3-turbo-q8_0, medium.en)…"
          value={search}
        />

        {whisperModelsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Whisper catalog…
          </div>
        ) : groupedModels.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No models match your search.
          </p>
        ) : (
          groupedModels.map((group) => (
            <Collapsible defaultOpen={tierDefaultOpen(group.tier)} key={group.tier}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50">
                <span className="font-medium">{group.label}</span>
                <span className="flex items-center gap-2 text-muted-foreground text-xs">
                  {group.models.length} models
                  <ChevronDown className="h-4 w-4" />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {group.models.map((model) => {
                  const isDownloading =
                    activeDownloadIds.has(model.id) ||
                    model.status === 'downloading';
                  const progress =
                    whisperDownloadProgress[model.id] ?? model.progress;

                  return (
                    <WhisperModelRow
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
                      progress={progress}
                      selectPending={whisperSelectMutation.isPending}
                    />
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}

        <Button
          onClick={() => {
            void refetchWhisperModels();
            onRefreshStatus();
          }}
          type="button"
          variant="outline"
        >
          Refresh Whisper models
        </Button>
      </CardContent>
    </Card>
  );
}
