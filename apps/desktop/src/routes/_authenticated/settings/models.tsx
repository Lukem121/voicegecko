import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  CheckCircle,
  Cpu,
  Download,
  HardDrive,
  MemoryStick,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Progress } from "@acme/ui/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@acme/ui/components/ui/radio-group";

import type { HardwareInfo, ModelTier } from "~/types/models";
import { useHardwareInfo, useSettingsStore } from "~/stores/settings.store";
import { tierDisplayInfo } from "~/types/models";

export const Route = createFileRoute("/_authenticated/settings/models")({
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
    new Set(),
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
        settings.models.availableModels,
      ).some(
        (model) =>
          typeof model.status === "object" && "Downloading" in model.status,
      );

      // Only refresh if there are active downloads or within first 30 seconds
      const isEarlyInSession = Date.now() - sessionStartTime < 30000;

      if (hasActiveDownloads || isEarlyInSession) {
        refreshModels();
      }
    }, 2000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [refreshModels, settings.models.availableModels, sessionStartTime]);

  // Listen for model events
  useEffect(() => {
    let hasNotifiedAutoDownload = false;

    const unlistenProgress = listen<[string, number]>(
      "model-download-progress",
      (event) => {
        const [modelId, progress] = event.payload;

        // Check if this modelId exists in our available models
        const modelExists = modelId in settings.models.availableModels;
        if (!modelExists) {
          console.warn(
            "[Models UI] Model ID not found in available models:",
            modelId,
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
        if (!hasNotifiedAutoDownload && progress === 0) {
          const model = Object.values(settings.models.availableModels).find(
            (m) =>
              Object.keys(settings.models.availableModels).find(
                (k) => settings.models.availableModels[k] === m,
              ) === modelId,
          );

          if (model && hardwareInfo) {
            const modelTier = model.tier.toLowerCase();
            const recommendedTier = hardwareInfo.recommended_tier.toLowerCase();

            if (modelTier === recommendedTier) {
              toast.info(`Downloading recommended model: ${model.name}`);
              hasNotifiedAutoDownload = true;
            }
          }
        }
      },
    );

    const unlistenComplete = listen<string>(
      "model-download-complete",
      (event) => {
        toast.success(`Model downloaded successfully!`);

        // Immediately remove from progress tracking
        setSmoothedProgress((prev) => {
          const next = { ...prev };
          delete next[event.payload];
          return next;
        });

        // Immediately remove tier from downloading set
        setDownloadingTiers((prev) => {
          const next = new Set(prev);
          // Remove tier from downloading set when any model completes
          const tiers = Object.keys(tierDisplayInfo) as ModelTier[];
          tiers.forEach((tier) => {
            const models = getModelsForTier(tier);
            if (
              models.some(
                (m) =>
                  Object.keys(settings.models.availableModels).find(
                    (k) => settings.models.availableModels[k] === m,
                  ) === event.payload,
              )
            ) {
              next.delete(tier);
            }
          });
          return next;
        });

        // Refresh models after a short delay
        setTimeout(() => {
          void refreshModels();
        }, 100);
      },
    );

    const unlistenError = listen<[string, string]>(
      "model-download-error",
      (event) => {
        const [modelId, errorMessage] = event.payload;

        // Clear smoothed progress for failed model
        setSmoothedProgress((prev) => {
          const next = { ...prev };
          delete next[modelId];
          return next;
        });

        toast.error("Download failed", {
          description: `Failed to download model: ${errorMessage}`,
          action: {
            label: "Retry",
            onClick: async () => {
              try {
                await invoke("check_and_fix_partial_downloads");
                await refreshModels();
                await invoke("download_model", { modelId });
              } catch (error) {
                toast.error("Retry failed", {
                  description: error as string,
                });
              }
            },
          },
        });

        // Remove from downloading tiers
        setDownloadingTiers((prev) => {
          const next = new Set(prev);
          const tiers = Object.keys(tierDisplayInfo) as ModelTier[];
          tiers.forEach((tier) => {
            const models = getModelsForTier(tier);
            if (
              models.some(
                (m) =>
                  Object.keys(settings.models.availableModels).find(
                    (k) => settings.models.availableModels[k] === m,
                  ) === modelId,
              )
            ) {
              next.delete(tier);
            }
          });
          return next;
        });

        void refreshModels();
      },
    );

    const unlistenTierSelected = listen<string>(
      "tier-auto-selected",
      async (event) => {
        const selectedTier = event.payload;

        // Update the store with the new selected tier
        await updateSelectedTier(selectedTier);

        toast.success("Quality automatically set", {
          description: `Selected "${tierDisplayInfo[selectedTier as ModelTier]?.name || selectedTier}" based on your hardware and downloaded model.`,
        });

        // Refresh to update UI
        void refreshModels();
      },
    );

    return () => {
      void Promise.all([
        unlistenProgress,
        unlistenComplete,
        unlistenError,
        unlistenTierSelected,
      ]).then((unlisteners) => unlisteners.forEach((u) => u()));
    };
  }, [
    refreshModels,
    updateModelStatus,
    getModelsForTier,
    settings.models.availableModels,
  ]);

  const handleTierChange = async (tier: string) => {
    try {
      // Only allow selection if the tier has downloaded models or is cloud
      const status = getTierDownloadStatus(tier);
      if (tier !== "cloud" && status !== "complete") {
        // Don't select tiers that aren't ready
        return;
      }

      await updateSelectedTier(tier);
      await invoke("set_selected_tier", { tier });
      toast.success("Quality tier updated successfully!");
    } catch (error) {
      toast.error("Failed to update quality tier", {
        description: error as string,
      });
    }
  };

  const getTierStatus = (tier: ModelTier): React.ReactNode => {
    const status = getTierDownloadStatus(tier);
    const isDownloading = downloadingTiers.has(tier);
    const models = getModelsForTier(tier);

    if (tier === "cloud") {
      return <Badge variant="secondary">Ready</Badge>;
    }

    // Check if tier is complete first, before checking downloading status
    if (status === "complete") {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Ready
        </Badge>
      );
    }

    if (isDownloading || status === "downloading") {
      const downloadingModel = models.find(
        (m) => typeof m.status === "object" && "Downloading" in m.status,
      );

      // Use smoothed progress if available, otherwise fall back to model status
      let progress = 0;
      if (downloadingModel) {
        const modelId = Object.keys(settings.models.availableModels).find(
          (id) => settings.models.availableModels[id] === downloadingModel,
        );
        if (modelId && smoothedProgress[modelId] !== undefined) {
          progress = smoothedProgress[modelId];
        } else if (typeof downloadingModel.status === "object") {
          progress = downloadingModel.status.Downloading;
        }
      }

      return (
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-2 w-16" />
          <span className="text-muted-foreground text-xs">{progress}%</span>
        </div>
      );
    }

    switch (status) {
      case "none":
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={async (e) => {
              e.stopPropagation();
              setDownloadingTiers((prev) => new Set(prev).add(tier));
              const tierModels = getModelsForTier(tier);
              if (tierModels.length > 0) {
                const modelToDownload = Object.keys(
                  settings.models.availableModels,
                ).find(
                  (id) => settings.models.availableModels[id] === tierModels[0],
                );
                if (modelToDownload) {
                  await invoke("download_model", { modelId: modelToDownload });
                }
              }
            }}
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        );
      default:
        return null;
    }
  };

  const isRecommended = (tier: ModelTier): boolean => {
    if (!hardwareInfo) return false;
    // Convert enum to string for comparison since Rust sends it as a string
    const recommendedTierStr =
      typeof hardwareInfo.recommended_tier === "string"
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
        <h2 className="text-2xl font-bold">Quality Settings</h2>
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
                <Cpu className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">
                    {hardwareInfo.cpu_brand}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {hardwareInfo.cpu_count} cores @{" "}
                    {hardwareInfo.cpu_frequency} MHz
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MemoryStick className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">
                    {formatMemory(hardwareInfo.total_memory)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatMemory(hardwareInfo.available_memory)} available
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">
                    Score: {hardwareInfo.capability_score}/100
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {hardwareInfo.has_avx2
                      ? "AVX2"
                      : hardwareInfo.has_avx
                        ? "AVX"
                        : "Basic"}{" "}
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
            value={selectedTier}
            onValueChange={(value) => {
              // Only handle change if the tier is ready
              const status = getTierDownloadStatus(value);
              if (value === "cloud" || status === "complete") {
                handleTierChange(value);
              }
            }}
            className="space-y-4"
          >
            {(Object.keys(tierDisplayInfo) as ModelTier[]).map((tier) => {
              const info = tierDisplayInfo[tier];
              const recommended = isRecommended(tier);
              const tierStatus = getTierDownloadStatus(tier);
              const isDownloading =
                downloadingTiers.has(tier) || tierStatus === "downloading";
              const isDownloaded =
                tier === "cloud" || tierStatus === "complete";
              const isDisabled =
                !isDownloaded || (downloadingTiers.size > 0 && !isDownloading);

              return (
                <div
                  key={tier}
                  className={`flex flex-col rounded-lg border p-4 transition-all ${
                    selectedTier === tier
                      ? "border-primary bg-primary/5 border-2"
                      : isDownloaded && !isDisabled
                        ? "hover:border-primary/50 cursor-pointer"
                        : ""
                  } ${!isDownloaded ? "opacity-75" : ""}`}
                  onClick={() => {
                    if (isDownloaded && !isDisabled) {
                      handleTierChange(tier);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{info.name}</h4>
                          {recommended && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {info.description}
                        </p>
                        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                          {tier === "cloud" ? (
                            <>
                              <span>Internet required</span>
                            </>
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
                        value={tier}
                        id={tier}
                        disabled={!isDownloaded || isDisabled}
                        className="pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
