# Phase 5: Local Processing & UI

## Overview

Implement local Whisper model support, intelligent model selection, and the transcription management UI.

## Tasks

### 1. Local Whisper Model Manager

Create `apps/desktop/src-tauri/src/modules/whisper.rs`:

```rust
use std::path::{Path, PathBuf};
use tauri::{command, State, Manager};
use tokio::fs;
use reqwest;
use futures_util::StreamExt;

#[derive(serde::Serialize, Clone)]
pub struct WhisperModel {
    name: String,
    size: String,
    file_size_mb: u64,
    required_ram_gb: f32,
    accuracy: String,
    speed: String,
    downloaded: bool,
    download_progress: f32,
}

pub struct WhisperManager {
    models_path: PathBuf,
    available_models: Vec<WhisperModel>,
}

impl WhisperManager {
    pub fn new() -> Self {
        let models_path = PathBuf::from(std::env::var("WHISPER_MODEL_PATH")
            .unwrap_or_else(|_| "./storage/models".to_string()));

        let available_models = vec![
            WhisperModel {
                name: "whisper-tiny".to_string(),
                size: "tiny".to_string(),
                file_size_mb: 39,
                required_ram_gb: 1.0,
                accuracy: "Good".to_string(),
                speed: "Very Fast".to_string(),
                downloaded: false,
                download_progress: 0.0,
            },
            WhisperModel {
                name: "whisper-base".to_string(),
                size: "base".to_string(),
                file_size_mb: 74,
                required_ram_gb: 1.5,
                accuracy: "Better".to_string(),
                speed: "Fast".to_string(),
                downloaded: false,
                download_progress: 0.0,
            },
            WhisperModel {
                name: "whisper-small".to_string(),
                size: "small".to_string(),
                file_size_mb: 244,
                required_ram_gb: 3.0,
                accuracy: "Good".to_string(),
                speed: "Medium".to_string(),
                downloaded: false,
                download_progress: 0.0,
            },
            WhisperModel {
                name: "whisper-medium".to_string(),
                size: "medium".to_string(),
                file_size_mb: 769,
                required_ram_gb: 5.0,
                accuracy: "Great".to_string(),
                speed: "Slow".to_string(),
                downloaded: false,
                download_progress: 0.0,
            },
        ];

        Self {
            models_path,
            available_models,
        }
    }

    async fn check_downloaded_models(&mut self) {
        for model in &mut self.available_models {
            let model_file = self.models_path.join(format!("{}.pt", model.name));
            model.downloaded = model_file.exists();
        }
    }
}

#[command]
pub async fn get_available_models(
    state: State<'_, Arc<Mutex<WhisperManager>>>,
) -> Result<Vec<WhisperModel>, String> {
    let mut manager = state.lock().unwrap();
    manager.check_downloaded_models().await;
    Ok(manager.available_models.clone())
}

#[command]
pub async fn download_whisper_model(
    window: tauri::Window,
    state: State<'_, Arc<Mutex<WhisperManager>>>,
    model_name: String,
) -> Result<(), String> {
    let manager = state.lock().unwrap();
    let models_path = manager.models_path.clone();
    drop(manager);

    // Create models directory if it doesn't exist
    fs::create_dir_all(&models_path).await
        .map_err(|e| format!("Failed to create models directory: {}", e))?;

    let model_url = format!(
        "https://huggingface.co/openai/whisper-{}/resolve/main/pytorch_model.bin",
        model_name.split('-').last().unwrap_or("tiny")
    );

    let model_file = models_path.join(format!("{}.pt", model_name));

    // Download with progress
    let client = reqwest::Client::new();
    let response = client
        .get(&model_url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let total_size = response
        .content_length()
        .ok_or("Failed to get content length")?;

    let mut file = tokio::fs::File::create(&model_file).await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded = 0u64;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        tokio::io::copy(&mut chunk.as_ref(), &mut file).await
            .map_err(|e| format!("Write error: {}", e))?;

        downloaded += chunk.len() as u64;
        let progress = (downloaded as f32 / total_size as f32) * 100.0;

        // Emit progress event
        window.emit("download-progress", serde_json::json!({
            "model": model_name,
            "progress": progress,
            "downloaded": downloaded,
            "total": total_size,
        })).ok();
    }

    Ok(())
}

#[command]
pub async fn transcribe_with_local_model(
    state: State<'_, Arc<Mutex<WhisperManager>>>,
    audio_path: String,
    model_name: String,
    language: String,
) -> Result<String, String> {
    // This would integrate with whisper.cpp or whisper-rs
    // For now, return a placeholder

    // In production, you would:
    // 1. Load the model
    // 2. Process the audio file
    // 3. Return the transcription

    Ok("Local transcription placeholder".to_string())
}
```

### 2. Model Selection Service

Create `packages/api/src/services/model-selection/model-selection.service.ts`:

```typescript
import { HardwareInfo } from "../types";

export class ModelSelectionService {
  selectOptimalModel(
    hardwareInfo: HardwareInfo,
    userPreference: string | null,
    localModelsAvailable: string[],
  ): {
    model: string;
    isLocal: boolean;
    reason: string;
  } {
    // If user has no preference, use hardware-based selection
    if (!userPreference) {
      return this.selectBasedOnHardware(hardwareInfo, localModelsAvailable);
    }

    // Check if preferred model is available locally
    if (
      userPreference.startsWith("whisper-") &&
      localModelsAvailable.includes(userPreference)
    ) {
      return {
        model: userPreference,
        isLocal: true,
        reason: "Using your preferred local model",
      };
    }

    // If preferred model is cloud-only or not downloaded
    if (userPreference === "whisper-1") {
      return {
        model: "whisper-1",
        isLocal: false,
        reason: "Using OpenAI Whisper API as preferred",
      };
    }

    // Fallback to hardware-based selection
    return this.selectBasedOnHardware(hardwareInfo, localModelsAvailable);
  }

  private selectBasedOnHardware(
    hardwareInfo: HardwareInfo,
    localModelsAvailable: string[],
  ): {
    model: string;
    isLocal: boolean;
    reason: string;
  } {
    const { totalMemory, hasGpu, recommendedModel, canRunLocal } = hardwareInfo;

    // If can't run local models, use cloud
    if (!canRunLocal) {
      return {
        model: "whisper-1",
        isLocal: false,
        reason: "Insufficient hardware for local processing",
      };
    }

    // Check if recommended model is available
    if (localModelsAvailable.includes(recommendedModel)) {
      return {
        model: recommendedModel,
        isLocal: true,
        reason: `Optimal model for your ${Math.round(totalMemory / 1024)}GB RAM`,
      };
    }

    // Find best available model based on hardware
    const modelsByRequirements = [
      { name: "whisper-medium", ram: 5000 },
      { name: "whisper-small", ram: 3000 },
      { name: "whisper-base", ram: 1500 },
      { name: "whisper-tiny", ram: 1000 },
    ];

    for (const model of modelsByRequirements) {
      if (
        totalMemory >= model.ram &&
        localModelsAvailable.includes(model.name)
      ) {
        return {
          model: model.name,
          isLocal: true,
          reason: `Best available model for your hardware`,
        };
      }
    }

    // Fallback to cloud
    return {
      model: "whisper-1",
      isLocal: false,
      reason: "No suitable local models downloaded",
    };
  }
}
```

### 3. Transcription List View

Update `apps/desktop/src/routes/_authenticated/transcriptions.tsx`:

```tsx
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

import { TranscriptionDetail } from "../../components/transcription/transcription-detail";
import { api } from "../../trpc";

export const Route = createFileRoute("/_authenticated/transcriptions")({
  component: TranscriptionsPage,
});

function TranscriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTranscription, setSelectedTranscription] = useState<
    string | null
  >(null);

  const { data, isLoading, fetchNextPage, hasNextPage } =
    api.transcription.list.useInfiniteQuery(
      {
        limit: 20,
        search: search || undefined,
        status: statusFilter === "all" ? undefined : (statusFilter as any),
      },
      {
        getNextPageParam: (lastPage, pages) =>
          lastPage.hasMore ? pages.length * 20 : undefined,
      },
    );

  const transcriptions = data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="container mx-auto py-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Transcriptions</h1>
            <p className="text-muted-foreground">
              Manage and search your voice transcriptions
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search transcriptions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Transcription List */}
          <div className="space-y-2">
            {transcriptions.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                onClick={() => setSelectedTranscription(item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium">
                        {item.title || "Untitled Recording"}
                      </h3>
                      {item.isFavorite && (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>

                    {item.transcriptionText && (
                      <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                        {item.transcriptionText}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(item.audioDuration / 60)}:
                        {String(item.audioDuration % 60).padStart(2, "0")}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {item.wordCount || 0} words
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <Badge variant="outline">
                      {item.modelUsed || "Pending"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage}
              >
                Load More
              </Button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTranscription && (
          <div className="w-96">
            <TranscriptionDetail
              transcriptionId={selectedTranscription}
              onClose={() => setSelectedTranscription(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. Transcription Detail Component

Create `apps/desktop/src/components/transcription/transcription-detail.tsx`:

```tsx
import { useState } from "react";
import {
  Copy,
  Download,
  Edit,
  Save,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";
import { Separator } from "@acme/ui/separator";
import { Textarea } from "@acme/ui/textarea";
import { toast } from "@acme/ui/toast";

import { api } from "../../trpc";

interface TranscriptionDetailProps {
  transcriptionId: string;
  onClose: () => void;
}

export function TranscriptionDetail({
  transcriptionId,
  onClose,
}: TranscriptionDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedNotes, setEditedNotes] = useState("");

  const { data: transcription } = api.transcription.getById.useQuery({
    id: transcriptionId,
  });

  const utils = api.useUtils();

  const updateMutation = api.transcription.update.useMutation({
    onSuccess: () => {
      toast.success("Transcription updated");
      utils.transcription.invalidate();
      setIsEditing(false);
    },
  });

  const deleteMutation = api.transcription.delete.useMutation({
    onSuccess: () => {
      toast.success("Transcription deleted");
      utils.transcription.invalidate();
      onClose();
    },
  });

  if (!transcription) return null;

  const handleExport = async () => {
    const text = `${transcription.title || "Untitled"}\n\n${transcription.transcriptionText}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transcription.title || "transcription"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription.transcriptionText || "");
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="h-full overflow-auto p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="border-b bg-transparent text-lg font-semibold"
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-semibold">
                {transcription.title || "Untitled Recording"}
              </h2>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              updateMutation.mutate({
                id: transcriptionId,
                isFavorite: !transcription.isFavorite,
              });
            }}
          >
            {transcription.isFavorite ? (
              <StarOff className="h-4 w-4" />
            ) : (
              <Star className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={
              isEditing
                ? () => {
                    updateMutation.mutate({
                      id: transcriptionId,
                      title: editedTitle,
                      notes: editedNotes,
                    });
                  }
                : () => {
                    setEditedTitle(transcription.title || "");
                    setEditedNotes(transcription.notes || "");
                    setIsEditing(true);
                  }
            }
          >
            {isEditing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Edit className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteMutation.mutate({ id: transcriptionId })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={transcription.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model</span>
            <Badge variant="outline">{transcription.modelUsed}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span>
              {Math.floor(transcription.audioDuration / 60)}m{" "}
              {transcription.audioDuration % 60}s
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Words</span>
            <span>{transcription.wordCount}</span>
          </div>
        </div>

        <Separator />

        {/* Transcription Text */}
        <div className="space-y-2">
          <h3 className="font-medium">Transcription</h3>
          <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
            {transcription.transcriptionText || "Processing..."}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <h3 className="font-medium">Notes</h3>
          {isEditing ? (
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              {transcription.notes || "No notes added"}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
```

## Validation Checklist

- [ ] Whisper models can be downloaded with progress tracking
- [ ] Model selection intelligently chooses between local and cloud
- [ ] Local transcription processes audio correctly
- [ ] Transcription list displays all items with search/filter
- [ ] Detail view allows editing and exporting
- [ ] Favorite functionality works correctly
- [ ] Export creates proper text files
- [ ] UI updates reflect processing status

## Next Steps

Complete the implementation with:

- [Phase 6: Polish & Features](./phase-6-polish.md)
