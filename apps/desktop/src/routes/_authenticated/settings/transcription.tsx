import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Input } from "@acme/ui/components/ui/input";
import { Label } from "@acme/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings/transcription")({
  component: SettingsTranscriptionPage,
});

interface TranscriptionConfig {
  language: string;
  threads: number;
}

function SettingsTranscriptionPage() {
  const [config, setConfig] = useState<TranscriptionConfig>({
    language: "en",
    threads: 4,
  });
  const [initialConfig, setInitialConfig] = useState<TranscriptionConfig>({
    language: "en",
    threads: 4,
  });

  const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);

  const fetchConfig = async () => {
    try {
      const fetchedConfig = await invoke<TranscriptionConfig>(
        "get_transcription_config",
      );
      setConfig(fetchedConfig);
      setInitialConfig(fetchedConfig);
    } catch (error) {
      toast.error("Failed to fetch transcription settings", {
        description: error as string,
      });
    }
  };

  useEffect(() => {
    void fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      await invoke("set_transcription_config", { config });
      setInitialConfig(config);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings", {
        description: error as string,
      });
    }
  };

  const handleThreadsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const threads = value === "" ? 0 : parseInt(value, 10);
    if (!isNaN(threads)) {
      setConfig((prev) => ({
        ...prev,
        threads: Math.max(0, threads),
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcription Settings</CardTitle>
        <CardDescription>
          Customize transcription language and performance settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={config.language}
            onValueChange={(value) =>
              setConfig((prev) => ({ ...prev, language: value }))
            }
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="threads">Threads</Label>
          <Input
            id="threads"
            type="number"
            value={config.threads}
            onChange={handleThreadsChange}
            placeholder="e.g., 4"
          />
        </div>
      </CardContent>
      {hasChanges && (
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
