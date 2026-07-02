import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Label } from '@acme/ui/components/ui/label';
import { Progress } from '@acme/ui/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@acme/ui/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@acme/ui/components/ui/table';
import { invoke } from '@tauri-apps/api/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Mic, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  compareEnginesOnSamples,
  deleteV2Model,
  downloadV2Model,
  listV2Models,
} from '~/services/v2-models.service';
import { listEngines } from '~/stores/dictation.store';
import { useSettingsStore } from '~/stores/settings.store';
import type { EngineCompareResponse } from '~/types/v2-models';
import type { InteractionModeId } from '~/types/dictation-events';
import type { V2ModelId } from '~/types/v2-models';

type EngineStatusItem = {
  id: string;
  name: string;
  available: boolean;
  enabled: boolean;
  supportsStreaming: boolean;
  unavailableReason?: string | null;
};

const MODE_SHORTCUTS: Record<InteractionModeId, string> = {
  toggle_batch: 'Ctrl+Shift+Z',
  ptt_batch: 'Ctrl+Shift+X',
  flow_stream: 'Ctrl+Shift+Space',
  hands_free: 'Ctrl+Shift+Alt+Z',
  accuracy_cloud: 'Ctrl+Shift+A',
  capsule_compose: 'Ctrl+Shift+G',
};

const MODES: Array<{ id: InteractionModeId; label: string }> = [
  { id: 'toggle_batch', label: 'Toggle batch' },
  { id: 'ptt_batch', label: 'Push-to-talk' },
  { id: 'flow_stream', label: 'Flow stream' },
  { id: 'hands_free', label: 'Hands-free' },
  { id: 'accuracy_cloud', label: 'Accuracy cloud' },
  { id: 'capsule_compose', label: 'Capsule compose' },
];

const modelStatusLabel = (status: string): string => {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'downloading':
      return 'Downloading';
    case 'error':
      return 'Error';
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
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const Route = createFileRoute('/_authenticated/settings/engine-lab')({
  component: EngineLabPage,
});

function EngineLabPage() {
  const { data: engines = [], refetch } = useQuery({
    queryKey: ['dictation-engines'],
    queryFn: listEngines,
  });
  const { data: engineStatus = [], refetch: refetchStatus } = useQuery({
    queryKey: ['engine-status'],
    queryFn: () => invoke<EngineStatusItem[]>('get_engine_status'),
  });

  const {
    data: v2Models = [],
    refetch: refetchModels,
    isLoading: modelsLoading,
  } = useQuery({
    queryKey: ['v2-models'],
    queryFn: listV2Models,
    refetchInterval: (query) => {
      const hasDownloading = query.state.data?.some(
        (model) => model.status === 'downloading'
      );
      return hasDownloading ? 1000 : false;
    },
  });

  const updateDictationSetting = useSettingsStore((s) => s.updateDictationSetting);
  const modeOverrides = useSettingsStore(
    (s) => s.settings.dictation.modeEngineOverrides
  );

  const [selectedEngine, setSelectedEngine] = useState('parakeet_tdt_v2');
  const [selectedMode, setSelectedMode] = useState<InteractionModeId>(
    'toggle_batch'
  );
  const [compareResult, setCompareResult] =
    useState<EngineCompareResponse | null>(null);

  const downloadMutation = useMutation({
    mutationFn: (modelId: V2ModelId) => downloadV2Model(modelId),
    onSuccess: () => {
      toast.success('Download started');
      void refetchModels();
      void refetchStatus();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (modelId: V2ModelId) => deleteV2Model(modelId),
    onSuccess: () => {
      toast.success('Model removed');
      void refetchModels();
      void refetchStatus();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const compareMutation = useMutation({
    mutationFn: compareEnginesOnSamples,
    onSuccess: (result) => {
      setCompareResult(result);
      if (result.usedFallback) {
        toast.info(
          'Showing last dictation only — full multi-engine compare needs backend wiring.'
        );
      } else {
        toast.success('Engine comparison complete');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const submitRating = async (rating: number) => {
    await invoke('save_engine_feedback', {
      engineId: selectedEngine,
      clipId: null,
      rating,
      notes: null,
    });
    toast.success('Feedback saved locally');
  };

  const prewarm = async () => {
    try {
      await invoke('bootstrap_optional_engines');
      toast.success('Optional engines bootstrapped');
      await refetchStatus();
      void refetchModels();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Optional bootstrap failed'
      );
    }
  };

  const saveModeOverride = async () => {
    await updateDictationSetting('modeEngineOverrides', {
      ...modeOverrides,
      [selectedMode]: selectedEngine,
    });
    toast.success(`Saved ${selectedEngine} for ${selectedMode}`);
  };

  const clearModeOverride = async () => {
    const next = { ...modeOverrides };
    delete next[selectedMode];
    await updateDictationSetting('modeEngineOverrides', next);
    toast.success('Cleared mode override');
  };

  const testWithMic = async () => {
    await updateDictationSetting('modeEngineOverrides', {
      ...modeOverrides,
      [selectedMode]: selectedEngine,
    });
    const shortcut = MODE_SHORTCUTS[selectedMode];
    toast.success(`Override saved — press ${shortcut} to test with your mic`, {
      description: `${selectedEngine} will run on the next ${selectedMode.replaceAll('_', ' ')} session.`,
      duration: 6000,
    });
  };

  const installedEngineList: EngineStatusItem[] =
    engineStatus.length > 0
      ? engineStatus
      : engines.map(([id, name, available]) => ({
          id,
          name,
          available,
          enabled: true,
          supportsStreaming:
            id.includes('moonshine') || id.includes('parakeet'),
          unavailableReason: null,
        }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">Engine Lab</h1>
        <p className="text-muted-foreground text-sm">
          Download v2 models, compare STT engines, and assign per-mode overrides.
          Toggle batch defaults to Parakeet TDT v2. Required models download
          automatically on first launch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model downloads</CardTitle>
          <CardDescription>
            On-device assets for VAD and local transcription. Installed
            automatically under{' '}
            <code className="text-xs">%LOCALAPPDATA%/voicegecko/</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modelsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading model catalog…
            </div>
          ) : (
            v2Models.map((model) => (
              <div
                className="space-y-2 rounded-md border p-3"
                key={model.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{model.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {model.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {model.sizeLabel}
                      {model.installedPath
                        ? ` · ${model.installedPath}`
                        : null}
                    </p>
                  </div>
                  <Badge variant={modelStatusVariant(model.status)}>
                    {modelStatusLabel(model.status)}
                  </Badge>
                </div>

                {model.status === 'downloading' ? (
                  <div className="space-y-1">
                    <Progress value={model.progress} />
                    <p className="text-muted-foreground text-xs">
                      {model.progress}% complete
                    </p>
                  </div>
                ) : null}

                {model.error ? (
                  <p className="text-destructive text-xs">{model.error}</p>
                ) : null}

                <div className="flex gap-2">
                  {model.status !== 'ready' && model.status !== 'downloading' ? (
                    <Button
                      disabled={downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate(model.id)}
                      size="sm"
                      type="button"
                    >
                      Download
                    </Button>
                  ) : null}
                  {model.status === 'ready' ? (
                    <Button
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(model.id)}
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
            ))
          )}
          <Button
            onClick={() => {
              void refetchModels();
              void refetchStatus();
            }}
            type="button"
            variant="outline"
          >
            Refresh status
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compare engines</CardTitle>
          <CardDescription>
            Run all installed engines on your most recent dictation sample.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            disabled={compareMutation.isPending}
            onClick={() => compareMutation.mutate()}
            type="button"
          >
            {compareMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing…
              </>
            ) : (
              'Compare on last dictation'
            )}
          </Button>

          {compareResult ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                {compareResult.sampleLabel}
                {compareResult.usedFallback ? ' (fallback — dictate again for live compare)' : null}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engine</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Snippet</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareResult.results.map((row) => (
                    <TableRow key={row.engineId}>
                      <TableCell className="font-medium">
                        {row.engineName}
                      </TableCell>
                      <TableCell>
                        {row.latencyMs > 0
                          ? `${row.latencyMs} ms`
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {row.textSnippet || '—'}
                      </TableCell>
                      <TableCell>
                        {row.rating === null ? '—' : row.rating}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mode + engine override</CardTitle>
          <CardDescription>
            Overrides apply on the next session start for that mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Interaction mode</Label>
            <Select
              onValueChange={(value) =>
                setSelectedMode(value as InteractionModeId)
              }
              value={selectedMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.label} ({MODE_SHORTCUTS[mode.id]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Engine override</Label>
            <Select onValueChange={setSelectedEngine} value={selectedEngine}>
              <SelectTrigger>
                <SelectValue placeholder="Select engine" />
              </SelectTrigger>
              <SelectContent>
                {engines.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modeOverrides[selectedMode] ? (
              <p className="text-muted-foreground text-xs">
                Current override: {modeOverrides[selectedMode]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveModeOverride} type="button">
              Save override
            </Button>
            <Button onClick={clearModeOverride} type="button" variant="outline">
              Clear override
            </Button>
            <Button onClick={testWithMic} type="button" variant="secondary">
              <Mic className="mr-2 h-4 w-4" />
              Test with mic
            </Button>
            <Button onClick={prewarm} type="button" variant="outline">
              Bootstrap optional engines
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installed engines</CardTitle>
          <CardDescription>
            Availability reflects downloaded models and API keys on this machine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {installedEngineList.map((engine) => (
            <button
              className="flex w-full items-center justify-between rounded-md border p-3 text-left"
              key={engine.id}
              onClick={() => setSelectedEngine(engine.id)}
              type="button"
            >
              <div>
                <p className="font-medium">{engine.name}</p>
                <p className="text-muted-foreground text-xs">{engine.id}</p>
                {!engine.available && engine.unavailableReason ? (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {engine.unavailableReason}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {selectedEngine === engine.id ? (
                  <Badge variant="outline">Selected</Badge>
                ) : null}
                {'supportsStreaming' in engine && engine.supportsStreaming ? (
                  <Badge variant="secondary">Stream</Badge>
                ) : null}
                <Badge variant={engine.available ? 'default' : 'secondary'}>
                  {engine.available ? 'Ready' : 'Unavailable'}
                </Badge>
              </div>
            </button>
          ))}
          <Button
            onClick={() => {
              void refetch();
              void refetchStatus();
            }}
            type="button"
            variant="outline"
          >
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate engine</CardTitle>
          <CardDescription>
            Stored in local SQLite for A/B comparison.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => submitRating(1)} type="button" variant="outline">
            Poor
          </Button>
          <Button onClick={() => submitRating(3)} type="button" variant="outline">
            OK
          </Button>
          <Button onClick={() => submitRating(5)} type="button">
            Great
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual install (advanced)</CardTitle>
          <CardDescription>
            Only needed when automatic setup fails or for optional engines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground text-sm">
          <p>
            <strong>Parakeet + VAD:</strong> installed automatically on first
            launch. Retry from Model downloads above if setup failed.
          </p>
          <p>
            <strong>Moonshine Flow:</strong>{' '}
            <code>%LOCALAPPDATA%\voicegecko\moonshine\moonshine.dll</code> plus{' '}
            <code>encoder_model.ort</code> under{' '}
            <code>models\medium-streaming\</code> or{' '}
            <code>models\moonshine-medium-streaming\</code>. Download models:{' '}
            <code>python -m moonshine_voice.download --language en</code>
          </p>
          <p>
            <strong>GPU Whisper:</strong> bundled{' '}
            <code>WhisperSidecar.exe</code> installs on startup; requires{' '}
            <code>ggml-base.en.bin</code> (synced from bundled resources).
          </p>
          <p>
            <strong>Cloud GPT-4o:</strong> set <code>OPENAI_API_KEY</code> in
            repo root <code>.env</code> or{' '}
            <code>apps/desktop/.env.development</code>
          </p>
          <p>
            <strong>Debug logs:</strong> speech engine logs appear in the dev
            terminal with prefix <code>[speech]</code> — filter for engine name
            (parakeet, moonshine, cloud_gpt4o, gpu_whisper, dictation).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benchmarks</CardTitle>
          <CardDescription>
            Run spikes from{' '}
            <code className="text-xs">apps/desktop/benchmarks/spike</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            See <code>apps/desktop/benchmarks/README.md</code> in the repo. Fill
            in <code>benchmarks/results/SPIKE_REPORT.md</code> after running on
            your hardware.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
