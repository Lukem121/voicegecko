import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CheckCircle, Cloud, Download, Server, Trash2 } from "lucide-react";
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

import { useSettingsStore } from "~/stores/settings.store";

export const Route = createFileRoute("/_authenticated/settings/models")({
  component: SettingsModelsPage,
});

function SettingsModelsPage() {
  const { settings, updateSelectedModel, refreshModels, updateModelStatus } =
    useSettingsStore();
  const models = settings.models.availableModels;
  const selectedModel = settings.models.selectedModel;

  useEffect(() => {
    const unlistenProgress = listen<[string, number]>(
      "model-download-progress",
      (event) => {
        const [modelId, progress] = event.payload;
        updateModelStatus(modelId, { Downloading: progress });
      },
    );

    const unlistenComplete = listen<string>(
      "model-download-complete",
      (event) => {
        toast.success(`Model ${event.payload} downloaded successfully!`);
        void refreshModels();
      },
    );

    const unlistenDelete = listen<string>("model-delete-complete", (event) => {
      toast.success(`Model ${event.payload} deleted successfully!`);
      void refreshModels();
    });

    return () => {
      void Promise.all([
        unlistenProgress,
        unlistenComplete,
        unlistenDelete,
      ]).then((unlisteners) => unlisteners.forEach((u) => u()));
    };
  }, [refreshModels, updateModelStatus]);

  const sortedModels = useMemo(() => {
    const modelSortOrder = [
      "tiny.en",
      "base.en",
      "small.en",
      "medium.en",
      "large-v3",
    ];
    return Object.entries(models).sort(([idA], [idB]) => {
      const indexA = modelSortOrder.indexOf(idA);
      const indexB = modelSortOrder.indexOf(idB);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return idA.localeCompare(idB);
    });
  }, [models]);

  const handleModelChange = async (modelId: string) => {
    try {
      await updateSelectedModel(modelId);
      toast.success("Model selected successfully!");
    } catch (error) {
      toast.error("Failed to select model", {
        description: error as string,
      });
    }
  };

  const handleDownload = async (modelId: string) => {
    try {
      await invoke("download_model", { modelId });
    } catch (error) {
      toast.error(`Failed to download model ${modelId}`, {
        description: error as string,
      });
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      await invoke("delete_model", { modelId });
      // If the deleted model was selected, switch to cloud
      if (selectedModel === modelId) {
        await updateSelectedModel("cloud");
      }
    } catch (error) {
      toast.error(`Failed to delete model ${modelId}`, {
        description: error as string,
      });
    }
  };

  const getModelStatus = (status: (typeof models)[string]["status"]) => {
    if (typeof status === "object" && "Downloading" in status) {
      return "downloading";
    }
    if (status === "NotDownloaded") {
      return "notdownloaded";
    }
    return status.toLowerCase();
  };

  const getProgress = (status: (typeof models)[string]["status"]) => {
    if (typeof status === "object" && "Downloading" in status) {
      return status.Downloading;
    }
    return 0;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Transcription Model</CardTitle>
          <CardDescription>
            Select the model that best fits your needs for accuracy and speed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedModel}
            onValueChange={handleModelChange}
            className="space-y-6"
          >
            {/* Cloud Provider Section */}
            <div>
              <label
                htmlFor="cloud"
                className={`hover:border-primary/80 flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                  selectedModel === "cloud"
                    ? "border-primary ring-primary ring-offset-background ring-2 ring-offset-2"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Cloud className="h-8 w-8 text-blue-500" />
                    <div>
                      <h4 className="font-semibold">Cloud Provider</h4>
                      <p className="text-muted-foreground text-sm">
                        Highest accuracy and performance. Requires internet.
                      </p>
                    </div>
                  </div>
                  <RadioGroupItem value="cloud" id="cloud" />
                </div>
              </label>
            </div>

            {/* Local Models Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Local Models</h4>
                  <p className="text-muted-foreground text-sm">
                    Run directly on your machine. No internet required.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {sortedModels.map(([id, model]) => (
                  <label
                    key={id}
                    htmlFor={id}
                    className={`hover:border-primary/80 flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                      selectedModel === id
                        ? "border-primary ring-primary ring-offset-background ring-2 ring-offset-2"
                        : "border-border"
                    } ${
                      getModelStatus(model.status) !== "downloaded"
                        ? "bg-muted/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="text-muted-foreground h-6 w-6" />
                        <span className="font-semibold">{model.name}</span>
                        {model.recommended && (
                          <Badge variant="secondary">Recommended</Badge>
                        )}
                      </div>
                      <RadioGroupItem
                        value={id}
                        id={id}
                        disabled={getModelStatus(model.status) !== "downloaded"}
                      />
                    </div>
                    <p className="text-muted-foreground my-3 text-sm">
                      {model.description}
                    </p>
                    <div className="mt-auto flex items-end justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{model.size}</Badge>
                        <Badge variant="outline">{model.ram} RAM</Badge>
                      </div>
                      <div className="w-32 text-right">
                        {getModelStatus(model.status) === "downloaded" && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-primary flex items-center gap-2 text-sm font-medium">
                              <CheckCircle className="h-4 w-4" />
                              <span>Ready</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-destructive h-8 w-8 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                void handleDelete(id);
                              }}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {getModelStatus(model.status) === "notdownloaded" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              void handleDownload(id);
                            }}
                            type="button"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                        {getModelStatus(model.status) === "downloading" && (
                          <div className="flex w-full items-center gap-2">
                            <Progress
                              value={getProgress(model.status)}
                              className="h-2"
                            />
                            <span className="text-muted-foreground text-xs">
                              {getProgress(model.status)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
