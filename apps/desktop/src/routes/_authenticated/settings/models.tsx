import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Cloud, Download, Server, Trash2 } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/settings/models")({
  component: SettingsModelsPage,
});

const initialLocalModels = [
  {
    id: "tiny",
    name: "Tiny",
    description: "Fastest, for offline notes & commands.",
    size: "75 MB",
    ram: "~1 GB",
    status: "downloaded",
    progress: 100,
  },
  {
    id: "base",
    name: "Base",
    description: "Recommended balance of speed and accuracy.",
    size: "142 MB",
    ram: "~1.5 GB",
    status: "downloaded",
    progress: 100,
    recommended: true,
  },
  {
    id: "small",
    name: "Small",
    description: "Good accuracy for general dictation.",
    size: "466 MB",
    ram: "~2 GB",
    status: "not_downloaded",
    progress: 0,
  },
  {
    id: "medium",
    name: "Medium",
    description: "High accuracy for noisy environments.",
    size: "1.5 GB",
    ram: "~4 GB",
    status: "not_downloaded",
    progress: 0,
  },
  {
    id: "large",
    name: "Large",
    description: "Highest accuracy, resource intensive.",
    size: "2.9 GB",
    ram: "~8 GB",
    status: "not_downloaded",
    progress: 0,
  },
  {
    id: "large-turbo",
    name: "Large Turbo",
    description: "Maximum speed for high-end machines.",
    size: "1.5 GB",
    ram: "~8 GB",
    status: "not_downloaded",
    progress: 0,
  },
];

function SettingsModelsPage() {
  const [selected, setSelected] = useState("base");
  const [initialSelected, setInitialSelected] = useState("base");
  const [models, setModels] = useState(initialLocalModels);

  const hasChanges = selected !== initialSelected;

  const handleDownload = (id: string) => {
    setModels((prevModels) =>
      prevModels.map((model) =>
        model.id === id ? { ...model, status: "downloading" } : model,
      ),
    );
  };

  const handleDelete = (id: string) => {
    setModels((prevModels) =>
      prevModels.map((model) =>
        model.id === id
          ? { ...model, status: "not_downloaded", progress: 0 }
          : model,
      ),
    );
    if (selected === id) {
      setSelected("cloud");
    }
  };

  const handleSave = () => {
    setInitialSelected(selected);
    // In a real app, you'd call an API here to persist the setting.
    console.log("Settings saved:", selected);
  };

  useEffect(() => {
    const downloadingModel = models.find(
      (model) => model.status === "downloading",
    );
    if (!downloadingModel) return;

    const interval = setInterval(() => {
      setModels((prevModels) =>
        prevModels.map((model) => {
          if (model.id === downloadingModel.id) {
            const newProgress = model.progress + 5;
            if (newProgress >= 100) {
              clearInterval(interval);
              return { ...model, status: "downloaded", progress: 100 };
            }
            return { ...model, progress: newProgress };
          }
          return model;
        }),
      );
    }, 200);

    return () => clearInterval(interval);
  }, [models]);

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
                {models.map((model) => (
                  <label
                    key={model.id}
                    htmlFor={model.id}
                    className={`hover:border-primary/80 flex cursor-pointer flex-col rounded-lg border p-4 transition-all ${
                      selected === model.id
                        ? "border-primary ring-primary ring-offset-background ring-2 ring-offset-2"
                        : "border-border"
                    } ${
                      model.status !== "downloaded"
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
                        value={model.id}
                        id={model.id}
                        disabled={model.status !== "downloaded"}
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
                        {model.status === "downloaded" && (
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
                                handleDelete(model.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {model.status === "not_downloaded" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownload(model.id);
                            }}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                        {model.status === "downloading" && (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={model.progress}
                              className="w-full"
                            />
                            <span className="text-muted-foreground text-xs">
                              {model.progress}%
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
