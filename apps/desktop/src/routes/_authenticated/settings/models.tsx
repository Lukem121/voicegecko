/** biome-ignore-all lint/style/noNestedTernary: lazy */

import { log } from '@acme/observability/log';
import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';

import { Progress } from '@acme/ui/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@acme/ui/components/ui/radio-group';
import { createFileRoute } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  CheckCircle,
  Cpu,
  Download,
  HardDrive,
  MemoryStick,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type Model,
  useHardwareInfo,
  useSettingsStore,
} from '~/stores/settings.store';
import type { ModelTier } from '~/types/models';
import { tierDisplayInfo } from '~/types/models';

export const Route = createFileRoute('/_authenticated/settings/models')({
  component: SettingsModelsPage,
});

function SettingsModelsPage() {
  const {
    settings,
    updateSelectedTier,
    refreshModels,
    updateModelStatus,
    getModelsForTier,
    getTierDownloadStatus,
  } = useSettingsStore();

  const hardwareInfo = useHardwareInfo();
  const selectedTier = settings.models.selectedTier;
  const [downloadingTiers, setDownloadingTiers] = useState<Set<string>>(
    new Set()
  );
  const [smoothedProgress, setSmoothedProgress] = useState<
    Record<string, number>
  >({});

  // Track when the component was mounted for early session detection
  const sessionStartTime = useRef(Date.now()).current;

  // Periodically refresh models to catch background downloads
  useEffect(() => {
    // Initial refresh after a short delay to catch auto-downloads
    const initialTimer = setTimeout(() => {
      refreshModels();
    }, 1500);

    // Set up periodic refresh while there might be active downloads
    const interval = setInterval(() => {
      // Check if any models are currently downloading
      const hasActiveDownloads = Object.values(
        settings.models.availableModels
      ).some(
        (model) =>
          typeof model.status === 'object' && 'Downloading' in model.status
      );

      // Only refresh if there are active downloads or within first 30 seconds
      const isEarlyInSession = Date.now() - sessionStartTime < 30_000;

      if (hasActiveDownloads || isEarlyInSession) {
        refreshModels();
      }
    }, 2000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [refreshModels, settings.models.availableModels, sessionStartTime]);

  // Helper function to handle model download progress
  const handleModelDownloadProgress =
    (hasNotifiedAutoDownload: { current: boolean }) =>
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: lazy
    (event: { payload: [string, number] }) => {
      const [modelId, progress] = event.payload;

      // Check if this modelId exists in our available models
      const modelExists = modelId in settings.models.availableModels;
      if (!modelExists) {
        log.warn(
          '[Models UI] Model ID not found in available models:',
          modelId
        );
      }

      // Smooth progress updates - only allow progress to increase
      setSmoothedProgress((prev) => {
        const currentProgress = prev[modelId] || 0;
        const newProgress = Math.max(currentProgress, progress);
        return {
          ...prev,
          [modelId]: newProgress,
        };
      });

      updateModelStatus(modelId, { Downloading: progress });

      // Notify user about automatic download on first progress event
      if (!hasNotifiedAutoDownload.current && progress === 0) {
        const model = Object.values(settings.models.availableModels).find(
          (m) =>
            Object.keys(settings.models.availableModels).find(
              (k) => settings.models.availableModels[k] === m
            ) === modelId
        );

        if (model && hardwareInfo) {
          const modelTier = model.tier.toLowerCase();
          const recommendedTier = hardwareInfo.recommended_tier.toLowerCase();

          if (modelTier === recommendedTier) {
            toast.info(`Downloading recommended model: ${model.name}`);
            hasNotifiedAutoDownload.current = true;
          }
        }
      }
    };

  // Helper function to remove tier from downloading set
  const removeTierFromDownloadingSet = (modelId: string) => {
    setDownloadingTiers((prev) => {
      const next = new Set(prev);
      const tiers = Object.keys(tierDisplayInfo) as ModelTier[];
      for (const tier of tiers) {
        const models = getModelsForTier(tier);
        if (
          models.some(
            (m) =>
              Object.keys(settings.models.availableModels).find(
                (k) => settings.models.availableModels[k] === m
              ) === modelId
          )
        ) {
          next.delete(tier);
        }
      }
      return next;
    });
  };

  // Helper function to handle model download completion
  const handleModelDownloadComplete = (event: { payload: string }) => {
    toast.success('Model downloaded successfully!');

    // Immediately remove from progress tracking
    setSmoothedProgress((prev) => {
      const next = { ...prev };
      delete next[event.payload];
      return next;
    });

    // Remove tier from downloading set
    removeTierFromDownloadingSet(event.payload);

    // Refresh models after a short delay
    setTimeout(() => {
      refreshModels();
    }, 100);
  };

  // Helper function to handle model download errors
  const handleModelDownloadError = (event: { payload: [string, string] }) => {
    const [modelId, errorMessage] = event.payload;

    // Clear smoothed progress for failed model
    setSmoothedProgress((prev) => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });

    toast.error('Download failed', {
      description: `Failed to download model: ${errorMessage}`,
      action: {
        label: 'Retry',
        onClick: async () => {
          try {
            await invoke('check_and_fix_partial_downloads');
            await refreshModels();
            await invoke('download_model', { modelId });
          } catch (error) {
            toast.error('Retry failed', {
              description: error as string,
            });
          }
        },
      },
    });

    // Remove from downloading tiers
    removeTierFromDownloadingSet(modelId);
    refreshModels();
  };

  // Helper function to handle tier auto-selection
  const handleTierAutoSelected = async (event: { payload: string }) => {
    const autoSelectedTier = event.payload;

    // Update the store with the new selected tier
    await updateSelectedTier(autoSelectedTier);

    toast.success('Quality automatically set', {
      description: `Selected "${tierDisplayInfo[autoSelectedTier as ModelTier]?.name || autoSelectedTier}" based on your hardware and downloaded model.`,
    });

    // Refresh to update UI
    refreshModels();
  };

  // Listen for model events
  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to unlisten
  useEffect(() => {
    const hasNotifiedAutoDownload = { current: false };

    const unlistenProgress = listen<[string, number]>(
      'model-download-progress',
      handleModelDownloadProgress(hasNotifiedAutoDownload)
    );

    const unlistenComplete = listen<string>(
      'model-download-complete',
      handleModelDownloadComplete
    );

    const unlistenError = listen<[string, string]>(
      'model-download-error',
      handleModelDownloadError
    );

    const unlistenTierSelected = listen<string>(
      'tier-auto-selected',
      handleTierAutoSelected
    );

    return () => {
      Promise.all([
        unlistenProgress,
        unlistenComplete,
        unlistenError,
        unlistenTierSelected,
      ]).then((unlisteners) => {
        for (const unlisten of unlisteners) {
          unlisten();
        }
      });
    };
  }, [
    refreshModels,
    updateModelStatus,
    getModelsForTier,
    settings.models.availableModels,
    hardwareInfo,
    updateSelectedTier,
  ]);

  const handleTierChange = async (tier: string) => {
    try {
      // Only allow selection if the tier has downloaded models or is cloud
      const status = getTierDownloadStatus(tier);
      if (tier !== 'cloud' && status !== 'complete') {
        // Don't select tiers that aren't ready
        return;
      }

      await updateSelectedTier(tier);
      await invoke('set_selected_tier', { tier });
      toast.success('Quality tier updated successfully!');
    } catch (error) {
      toast.error('Failed to update quality tier', {
        description: error as string,
      });
    }
  };

  // Helper function to get download progress for a tier
  const getTierDownloadProgress = (models: Model[]) => {
    const downloadingModel = models.find(
      (m) => typeof m.status === 'object' && 'Downloading' in m.status
    );

    let progress = 0;
    if (downloadingModel) {
      const modelId = Object.keys(settings.models.availableModels).find(
        (id) => settings.models.availableModels[id] === downloadingModel
      );
      if (modelId && smoothedProgress[modelId] !== undefined) {
        progress = smoothedProgress[modelId];
      } else if (typeof downloadingModel.status === 'object') {
        progress = downloadingModel.status.Downloading;
      }
    }
    return progress;
  };

  // Helper function to handle model download start
  const handleDownloadStart = async (tier: ModelTier) => {
    setDownloadingTiers((prev) => new Set(prev).add(tier));
    const tierModels = getModelsForTier(tier);
    if (tierModels.length > 0) {
      const modelToDownload = Object.keys(settings.models.availableModels).find(
        (id) => settings.models.availableModels[id] === tierModels[0]
      );
      if (modelToDownload) {
        await invoke('download_model', { modelId: modelToDownload });
      }
    }
  };

  // Helper function to render downloading status
  const renderDownloadingStatus = (progress: number) => (
    <div className="flex items-center gap-2">
      <Progress className="h-2 w-16" value={progress} />
      <span className="text-muted-foreground text-xs">{progress}%</span>
    </div>
  );

  // Helper function to render download button
  const renderDownloadButton = (tier: ModelTier) => (
    <Button
      className="h-7 gap-1"
      onClick={async (e) => {
        e.stopPropagation();
        await handleDownloadStart(tier);
      }}
      size="sm"
      variant="outline"
    >
      <Download className="h-3 w-3" />
      Download
    </Button>
  );

  const getTierStatus = (tier: ModelTier): React.ReactNode => {
    const status = getTierDownloadStatus(tier);
    const isDownloading = downloadingTiers.has(tier);
    const models = getModelsForTier(tier);

    if (tier === 'cloud') {
      return <Badge variant="secondary">Ready</Badge>;
    }

    if (status === 'complete') {
      return (
        <Badge className="gap-1" variant="secondary">
          <CheckCircle className="h-3 w-3" />
          Ready
        </Badge>
      );
    }

    if (isDownloading || status === 'downloading') {
      const progress = getTierDownloadProgress(models);
      return renderDownloadingStatus(progress);
    }

    if (status === 'none') {
      return renderDownloadButton(tier);
    }

    return null;
  };

  const isRecommended = (tier: ModelTier): boolean => {
    if (!hardwareInfo) {
      return false;
    }
    // Convert enum to string for comparison since Rust sends it as a string
    const recommendedTierStr =
      typeof hardwareInfo.recommended_tier === 'string'
        ? hardwareInfo.recommended_tier.toLowerCase()
        : hardwareInfo.recommended_tier;
    return recommendedTierStr === tier;
  };

  const formatMemory = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-bold text-2xl">Quality Settings</h2>
        <p className="text-muted-foreground">
          Choose your preferred transcription quality based on your hardware
        </p>
      </div>
      {/* Hardware Info Card */}
      {hardwareInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>
              Your hardware has been analyzed to recommend the best quality tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">
                    {hardwareInfo.cpu_brand}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {hardwareInfo.cpu_count} cores @{' '}
                    {hardwareInfo.cpu_frequency} MHz
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">
                    {formatMemory(hardwareInfo.total_memory)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatMemory(hardwareInfo.available_memory)} available
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">
                    Score: {hardwareInfo.capability_score}/100
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {hardwareInfo.has_avx2
                      ? 'AVX2'
                      : hardwareInfo.has_avx
                        ? 'AVX'
                        : 'Basic'}{' '}
                    support
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Tier Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription Quality</CardTitle>
          <CardDescription>
            Select the quality tier that best fits your needs. Higher tiers
            provide better accuracy but require more resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            className="space-y-4"
            onValueChange={(value) => {
              // Only handle change if the tier is ready
              const status = getTierDownloadStatus(value);
              if (value === 'cloud' || status === 'complete') {
                handleTierChange(value);
              }
            }}
            value={selectedTier}
          >
            {/** biome-ignore lint/complexity/noExcessiveCognitiveComplexity: lazy */}
            {(Object.keys(tierDisplayInfo) as ModelTier[]).map((tier) => {
              const info = tierDisplayInfo[tier];
              const recommended = isRecommended(tier);
              const tierStatus = getTierDownloadStatus(tier);
              const isDownloading =
                downloadingTiers.has(tier) || tierStatus === 'downloading';
              const isDownloaded =
                tier === 'cloud' || tierStatus === 'complete';
              const isDisabled =
                !isDownloaded || (downloadingTiers.size > 0 && !isDownloading);

              return (
                <button
                  className={`flex flex-col rounded-lg border p-4 transition-all ${
                    selectedTier === tier
                      ? 'border-2 border-primary bg-primary/5'
                      : isDownloaded && !isDisabled
                        ? 'cursor-pointer hover:border-primary/50'
                        : ''
                  } ${isDownloaded ? '' : 'opacity-75'}`}
                  key={tier}
                  onClick={() => {
                    if (isDownloaded && !isDisabled) {
                      handleTierChange(tier);
                    }
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{info.name}</h4>
                          {recommended && (
                            <Badge className="gap-1" variant="default">
                              <CheckCircle className="h-3 w-3" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground text-sm">
                          {info.description}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
                          {tier === 'cloud' ? (
                            <span>Internet required</span>
                          ) : (
                            <>
                              <span>Min RAM: {info.min_ram_gb} GB</span>
                              <span>
                                Size: ~
                                {formatMemory(info.typical_model_size_mb)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getTierStatus(tier)}
                      <RadioGroupItem
                        className="pointer-events-none"
                        disabled={!isDownloaded || isDisabled}
                        id={tier}
                        value={tier}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
