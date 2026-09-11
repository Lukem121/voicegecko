import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Checkbox } from '@acme/ui/components/ui/checkbox';
import { Label } from '@acme/ui/components/ui/label';
import { Progress } from '@acme/ui/components/ui/progress';
import { Textarea } from '@acme/ui/components/ui/textarea';
import { cn } from '@acme/ui/lib/utils';
import { listen } from '@tauri-apps/api/event';
import { useQuery } from '@tanstack/react-query';
import { Gauge, Mic, RotateCcw, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ACCURACY_TEST_PRESETS,
  formatLatency,
  scoreWhisperAccuracy,
  whisperProfileLabel,
  type AlignedWord,
  type WhisperAccuracyResult,
} from '~/lib/whisper-accuracy';
import { recordingService } from '~/services/recording.service';
import {
  listWhisperModels,
  scoreWhisperModelsOnLastClip,
} from '~/services/whisper-models.service';
import { useDictationStore } from '~/stores/dictation.store';
import { useEventStore } from '~/stores/event.store';

const TEST_OPTIONS = {
  isKeyboardShortcut: false,
  mode: 'toggle_batch',
  outputTarget: 'score_only',
  playStartSound: false,
  playEndSound: false,
} as const;

const SCRIPT_STORAGE_KEY = 'voicegecko-accuracy-script';

const loadSavedScript = (): string =>
  window.localStorage.getItem(SCRIPT_STORAGE_KEY) ?? '';

type HeardModel = {
  modelId: string;
  modelName: string;
  latencyMs: number;
  available: boolean;
  heard: string;
};

type ModelScoreRow = HeardModel & {
  result: WhisperAccuracyResult | null;
};

type AccuracyProgressEvent = {
  index: number;
  total: number;
  modelId: string;
  modelName: string;
};

const scoreTone = (percent: number): string => {
  if (percent >= 90) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (percent >= 75) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-destructive';
};

const alignedClass = (kind: AlignedWord['kind']): string => {
  if (kind === 'match') {
    return 'text-foreground';
  }
  if (kind === 'substitution') {
    return 'rounded-sm bg-destructive/15 px-0.5 text-destructive underline decoration-destructive';
  }
  if (kind === 'insertion') {
    return 'rounded-sm bg-amber-500/15 px-0.5 text-amber-700 italic dark:text-amber-400';
  }
  return 'rounded-sm bg-muted px-0.5 text-muted-foreground line-through';
};

const modelDisplayName = (id: string, name: string): string => {
  const profile = whisperProfileLabel(id);
  if (profile === id) {
    return name;
  }
  return `${profile} · ${name}`;
};

const buildScoreRows = (
  heard: HeardModel[],
  expected: string
): ModelScoreRow[] => {
  const trimmed = expected.trim();
  const rows: ModelScoreRow[] = heard.map((row) => ({
    ...row,
    result: trimmed ? scoreWhisperAccuracy(trimmed, row.heard) : null,
  }));

  if (!trimmed) {
    return rows;
  }

  rows.sort((left, right) => {
    const leftAcc = left.result?.accuracyPercent ?? -1;
    const rightAcc = right.result?.accuracyPercent ?? -1;
    if (rightAcc !== leftAcc) {
      return rightAcc - leftAcc;
    }
    return left.latencyMs - right.latencyMs;
  });
  return rows;
};

function HeardTranscript({
  alignment,
  heard,
}: {
  alignment: AlignedWord[] | null;
  heard: string;
}) {
  if (!heard.trim()) {
    return (
      <p className="text-muted-foreground text-sm">(nothing transcribed)</p>
    );
  }

  if (!alignment || alignment.length === 0) {
    return <p className="text-sm leading-relaxed">{heard}</p>;
  }

  return (
    <p className="text-sm leading-relaxed">
      {alignment.map((word) => (
        <span
          className={cn('mr-1 inline-block', alignedClass(word.kind))}
          key={word.id}
        >
          {word.kind === 'deletion' ? word.expected : word.heard}
        </span>
      ))}
    </p>
  );
}

export function AccuracyTestCard() {
  const recordingStatus = useEventStore((s) => s.recordingStatus);
  const phase = useDictationStore((s) => s.phase);
  const setLastAccuracy = useDictationStore((s) => s.setLastAccuracy);
  const { data: whisperModels = [] } = useQuery({
    queryKey: ['gpu-whisper-models'],
    queryFn: listWhisperModels,
  });
  const readyModels = useMemo(
    () => whisperModels.filter((model) => model.status === 'ready'),
    [whisperModels]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const initializedSelection = useRef(false);
  const capturedThisTake = useRef(false);
  const [pendingScore, setPendingScore] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [progress, setProgress] = useState<AccuracyProgressEvent | null>(
    null
  );
  const [transcripts, setTranscripts] = useState<HeardModel[] | null>(null);
  const [script, setScript] = useState(loadSavedScript);

  const isRecording = recordingStatus === 'recording';
  const isBusy = isRecording || isScoring || pendingScore;
  const rows = useMemo(
    () => (transcripts ? buildScoreRows(transcripts, script) : null),
    [script, transcripts]
  );

  const scoreSelectedModels = useCallback(async () => {
    const ids = selectedIds;
    if (ids.length === 0) {
      toast.error('Select at least one downloaded model');
      return;
    }

    setIsScoring(true);
    setProgress({
      index: 1,
      total: ids.length,
      modelId: ids.at(0) ?? '',
      modelName: 'Whisper',
    });

    try {
      const response = await scoreWhisperModelsOnLastClip(ids);
      setTranscripts(
        response.results.map((row) => ({
          modelId: row.modelId,
          modelName: row.modelName,
          latencyMs: row.latencyMs,
          available: row.available,
          heard: row.text,
        }))
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Could not score models'
      );
    } finally {
      setIsScoring(false);
      setProgress(null);
    }
  }, [selectedIds]);

  useEffect(() => {
    if (initializedSelection.current || readyModels.length === 0) {
      return;
    }
    initializedSelection.current = true;
    setSelectedIds(readyModels.map((model) => model.id));
  }, [readyModels]);

  useEffect(() => {
    const unlisten = listen<AccuracyProgressEvent>(
      'whisper-accuracy-progress',
      (event) => {
        setProgress(event.payload);
      }
    );
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      capturedThisTake.current = true;
    }
  }, [isRecording]);

  useEffect(() => {
    if (!pendingScore || isRecording || isScoring) {
      return;
    }
    if (phase === 'error') {
      setPendingScore(false);
      capturedThisTake.current = false;
      toast.error('Accuracy test failed — try again');
      return;
    }
    if (!capturedThisTake.current || phase !== 'done') {
      return;
    }

    capturedThisTake.current = false;
    setPendingScore(false);
    void scoreSelectedModels();
  }, [
    isRecording,
    isScoring,
    pendingScore,
    phase,
    scoreSelectedModels,
  ]);

  useEffect(() => {
    const winner = rows?.at(0);
    if (!winner?.result) {
      return;
    }
    setLastAccuracy({
      percent: winner.result.accuracyPercent,
      latencyMs: winner.latencyMs,
      profileLabel: winner.modelName,
    });
  }, [rows, setLastAccuracy]);

  const toggleId = (modelId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        if (current.includes(modelId)) {
          return current;
        }
        return [...current, modelId];
      }
      return current.filter((id) => id !== modelId);
    });
  };

  const applyScript = (value: string) => {
    setScript(value);
    window.localStorage.setItem(SCRIPT_STORAGE_KEY, value);
  };

  const toggleTest = async () => {
    if (isRecording) {
      await recordingService.toggleRecording(TEST_OPTIONS);
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Select at least one downloaded model');
      return;
    }

    capturedThisTake.current = false;
    setTranscripts(null);
    setPendingScore(true);
    await recordingService.toggleRecording(TEST_OPTIONS);
  };

  let buttonLabel = 'Start speaking';
  if (isRecording) {
    buttonLabel = 'Stop and score';
  } else if (isScoring) {
    buttonLabel = 'Scoring models…';
  } else if (pendingScore) {
    buttonLabel = 'Preparing clip…';
  }

  const expectedReady = script.trim().length > 0;
  const bestAccuracy = rows?.at(0)?.result?.accuracyPercent;
  const fastestMs = rows
    ?.filter((row) => row.available)
    .reduce<number | null>((fastest, row) => {
      if (fastest == null || row.latencyMs < fastest) {
        return row.latencyMs;
      }
      return fastest;
    }, null);

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.index / progress.total) * 100)
      : 0;
  const selectedPreset = ACCURACY_TEST_PRESETS.find(
    (preset) => preset.script === script
  );

  let scriptLabel = 'What you actually said';
  if (isRecording) {
    scriptLabel = 'Reading now';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Measure downloaded models
        </CardTitle>
        <CardDescription>
          Click once, say something, click again. Then type what you actually
          said — scores update against that text. Use Score last recording to
          rerun models on the previous clip without speaking again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-sm">Models to score</p>
            <div className="flex gap-2">
              <Button
                disabled={isBusy || readyModels.length === 0}
                onClick={() =>
                  setSelectedIds(readyModels.map((model) => model.id))
                }
                size="sm"
                type="button"
                variant="ghost"
              >
                All downloaded
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => setSelectedIds([])}
                size="sm"
                type="button"
                variant="ghost"
              >
                None
              </Button>
            </div>
          </div>
          {readyModels.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Download at least one model above, then come back to test it.
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
              {readyModels.map((model) => {
                const checkboxId = `accuracy-model-${model.id}`;
                const checked = selectedIds.includes(model.id);
                return (
                  <div
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    key={model.id}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isBusy}
                      id={checkboxId}
                      onCheckedChange={(value) =>
                        toggleId(model.id, value === true)
                      }
                    />
                    <Label
                      className="flex-1 cursor-pointer font-normal"
                      htmlFor={checkboxId}
                    >
                      {modelDisplayName(model.id, model.name)}
                      {model.selected ? (
                        <span className="ml-2 text-muted-foreground text-xs">
                          in use
                        </span>
                      ) : null}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            {selectedIds.length} selected · scored one at a time after you
            stop
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accuracy-script">{scriptLabel}</Label>
          <div className="flex flex-wrap gap-2">
            {ACCURACY_TEST_PRESETS.map((preset) => {
              const selected = selectedPreset?.id === preset.id;
              return (
                <Button
                  aria-pressed={selected}
                  disabled={isRecording || isScoring}
                  key={preset.id}
                  onClick={() => applyScript(preset.script)}
                  size="sm"
                  title={preset.hint}
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">
            {selectedPreset
              ? `Optional read-aloud: ${selectedPreset.hint}`
              : 'Speak freely, then type what you said. Accuracy updates as you edit.'}
          </p>
          <Textarea
            className={cn(
              'min-h-[120px] resize-y text-base leading-7',
              isRecording && 'border-primary ring-2 ring-primary/30'
            )}
            disabled={isRecording}
            id="accuracy-script"
            onChange={(event) => applyScript(event.target.value)}
            placeholder="Type what you actually said after you stop, or pick a preset to read."
            value={script}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              readyModels.length === 0 ||
              ((isScoring || pendingScore) && !isRecording)
            }
            onClick={() => {
              void toggleTest();
            }}
            size="lg"
            type="button"
            variant={isRecording ? 'destructive' : 'default'}
          >
            {isRecording ? (
              <Square className="mr-2 h-4 w-4" />
            ) : (
              <Mic className="mr-2 h-4 w-4" />
            )}
            {buttonLabel}
          </Button>
          <Button
            disabled={isBusy || readyModels.length === 0}
            onClick={() => {
              void scoreSelectedModels();
            }}
            size="lg"
            type="button"
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Score last recording
          </Button>
        </div>

        {isScoring && progress ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Scoring {progress.modelName} ({progress.index} of{' '}
              {progress.total})
            </p>
            <Progress value={progressPercent} />
          </div>
        ) : null}

        {rows && !expectedReady ? (
          <p className="text-muted-foreground text-sm">
            Type what you said above to see which model was closest.
          </p>
        ) : null}

        {rows ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                className="space-y-2 rounded-xl border p-4"
                key={row.modelId}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{row.modelName}</p>
                  {expectedReady &&
                  row.result?.accuracyPercent === bestAccuracy ? (
                    <Badge variant="default">Most accurate</Badge>
                  ) : null}
                  {fastestMs != null && row.latencyMs === fastestMs ? (
                    <Badge variant="secondary">Fastest</Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-4">
                  {row.result ? (
                    <p
                      className={cn(
                        'font-semibold tabular-nums',
                        scoreTone(row.result.accuracyPercent)
                      )}
                    >
                      {row.result.accuracyPercent}% accurate
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Waiting for what you said
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {formatLatency(row.latencyMs)}
                  </p>
                  {row.result ? (
                    <p className="text-muted-foreground text-xs">
                      {row.result.substitutions} swapped · {row.result.deletions}{' '}
                      missed · {row.result.insertions} extra
                    </p>
                  ) : null}
                </div>
                <HeardTranscript
                  alignment={row.result?.alignment ?? null}
                  heard={row.heard}
                />
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
