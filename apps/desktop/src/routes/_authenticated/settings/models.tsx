import { useEffect, useMemo, useState } from "react";
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

// Define types to match Rust structs
interface Model {
  name: string;
  description: string;
  size: string;
  ram: string;
  status: ModelStatus;
  recommended: boolean;
}

type ModelStatus = "NotDownloaded" | { Downloading: number } | "Downloaded";

export const Route = createFileRoute("/_authenticated/settings/models")({
  component: SettingsModelsPage,
});

function SettingsModelsPage() {
  const [selected, setSelected] = useState("cloud");
  const [initialSelected, setInitialSelected] = useState("cloud");
  const [models, setModels] = useState<Record<string, Model>>({});

  const hasChanges = selected !== initialSelected;

  const fetchModels = async () => {
    try {
      const fetchedModels = await invoke<Record<string, Model>>("list_models");
      setModels(fetchedModels);
    } catch (error) {
      toast.error("Failed to fetch models", { description: error as string });
    }
  };

  useEffect(() => {
    void fetchModels();

    const unlistenProgress = listen<[string, number]>(
      "model-download-progress",
      (event) => {
        const [modelId, progress] = event.payload;

        const model = models[modelId];

        if (!model) {
          return;
        }

        setModels((prev) => ({
          ...prev,
          [modelId]: {
            ...model,
            status: { Downloading: progress },
          },
        }));
      },
    );

    const unlistenComplete = listen<string>(
      "model-download-complete",
      (event) => {
        toast.success(`Model ${event.payload} downloaded successfully!`);
        void fetchModels();
      },
    );

    const unlistenDelete = listen<string>("model-delete-complete", (event) => {
      toast.success(`Model ${event.payload} deleted successfully!`);
      void fetchModels();
    });

    return () => {
      void Promise.all([
        unlistenProgress,
        unlistenComplete,
        unlistenDelete,
      ]).then((unlisteners) => unlisteners.forEach((u) => u()));
    };
  }, []);

  const sortedModels = useMemo(() => {
    const modelSortOrder = ["tiny", "small", "base", "medium", "large"];
    const getBaseName = (id: string) => id.split(/[-.]/)[0] ?? "";

    return Object.entries(models).sort(([idA], [idB]) => {
      const baseA = getBaseName(idA);
      const baseB = getBaseName(idB);
      const indexA = modelSortOrder.indexOf(baseA);
      const indexB = modelSortOrder.indexOf(baseB);

      if (indexA !== -1 && indexB !== -1) {
        if (indexA !== indexB) {
          return indexA - indexB;
        }
        return idA.localeCompare(idB);
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return idA.localeCompare(idB);
    });
  }, [models]);

  const handleDownload = async (id: string) => {
    try {
      await invoke("download_model", { modelId: id });
      toast.info(`Downloading ${id} model...`);
    } catch (error) {
      toast.error("Failed to start download", { description: error as string });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke("delete_model", { modelId: id });
    } catch (error) {
      toast.error("Failed to delete model", { description: error as string });
    }
  };

  const handleSave = () => {
    setInitialSelected(selected);
    // You might want to save the selected model to the backend here
    toast.success("Settings saved successfully!");
  };

  const getModelStatus = (status: ModelStatus) => {
    if (typeof status === "object" && "Downloading" in status) {
      return "downloading";
    }
    if (status === "NotDownloaded") {
      return "notdownloaded";
    }
    return status.toLowerCase();
  };

  const getProgress = (status: ModelStatus) => {
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
            value={selected}
            onValueChange={setSelected}
            className="space-y-6"
          >
            {/* Cloud Provider Section */}
            <div>
              <label
                htmlFor="cloud"
                className={`hover:border-primary/80 flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                  selected === "cloud"
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
            <div>
              <h3 className="mb-4 text-lg font-medium">Local Models</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {sortedModels.map(([id, model]) => (
                  <label
                    key={id}
                    htmlFor={id}
                    className={`hover:border-primary/80 flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                      selected === id
                        ? "border-primary ring-primary ring-offset-background ring-2 ring-offset-2"
                        : "border-border"
                    } ${
                      getModelStatus(model.status) !== "downloaded"
                        ? "bg-muted/50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="text-muted-foreground h-6 w-6" />
                        <span className="font-semibold">{model.name}</span>
                        {model.recommended && (
                          <Badge variant="secondary">
                            Recommended for your machine
                          </Badge>
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
                              size="icon-small"
                              className="hover:bg-destructive text-muted-foreground"
                              onClick={(e) => {
                                e.preventDefault();
                                void handleDelete(id);
                              }}
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
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                        {getModelStatus(model.status) === "downloading" && (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={getProgress(model.status)}
                              className="w-full"
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
      <div className="flex justify-end">
        <Button size="lg" disabled={!hasChanges} onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
