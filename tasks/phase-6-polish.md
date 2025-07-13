# Phase 6: Polish & Features

## Overview

Add keyboard shortcuts, export functionality, error handling, and final polish to complete the MVP.

## Tasks

### 1. Global Keyboard Shortcuts

Create `apps/desktop/src-tauri/src/modules/shortcuts.rs`:

```rust
use tauri::{GlobalShortcutManager, Manager, command};
use tauri::api::notification::Notification;

pub fn register_shortcuts(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let mut shortcut_manager = app.global_shortcut_manager();

    // Push-to-talk: Ctrl+Win
    shortcut_manager.register("Ctrl+Super", move || {
        // Emit event to frontend
        app.emit_all("shortcut-triggered", "push-to-talk").ok();
    })?;

    // Toggle recording: Ctrl+Shift+X
    shortcut_manager.register("Ctrl+Shift+X", move || {
        app.emit_all("shortcut-triggered", "toggle-recording").ok();
    })?;

    // Quick save: Ctrl+Shift+S
    shortcut_manager.register("Ctrl+Shift+S", move || {
        app.emit_all("shortcut-triggered", "quick-save").ok();
    })?;

    Ok(())
}

#[command]
pub async fn show_notification(title: String, body: String) -> Result<(), String> {
    Notification::new("com.voicegecko.app")
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

### 2. Keyboard Shortcut Hook

Create `apps/desktop/src/hooks/use-keyboard-shortcuts.ts`:

```typescript
import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";

import { toast } from "@acme/ui/toast";

interface ShortcutHandlers {
  "push-to-talk"?: () => void;
  "toggle-recording"?: () => void;
  "quick-save"?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const navigate = useNavigate();
  const pushToTalkTimeout = useRef<NodeJS.Timeout>();
  const isRecording = useRef(false);

  useEffect(() => {
    const unsubscribe = listen<string>("shortcut-triggered", (event) => {
      const shortcut = event.payload;

      switch (shortcut) {
        case "push-to-talk":
          handlePushToTalk();
          break;
        case "toggle-recording":
          handlers["toggle-recording"]?.();
          break;
        case "quick-save":
          handlers["quick-save"]?.();
          break;
      }
    });

    // Cleanup
    return () => {
      unsubscribe.then((fn) => fn());
      if (pushToTalkTimeout.current) {
        clearTimeout(pushToTalkTimeout.current);
      }
    };
  }, [handlers]);

  const handlePushToTalk = () => {
    if (!isRecording.current) {
      // Start recording
      handlers["push-to-talk"]?.();
      isRecording.current = true;

      // Show notification
      invoke("show_notification", {
        title: "Recording Started",
        body: "Release Ctrl+Win to stop",
      });
    }

    // Reset timeout
    if (pushToTalkTimeout.current) {
      clearTimeout(pushToTalkTimeout.current);
    }

    // Stop recording after key release (detected by no new events)
    pushToTalkTimeout.current = setTimeout(() => {
      if (isRecording.current) {
        handlers["push-to-talk"]?.();
        isRecording.current = false;

        invoke("show_notification", {
          title: "Recording Saved",
          body: "Processing transcription...",
        });
      }
    }, 500);
  };
}
```

### 3. Advanced Export System

Create `apps/desktop/src/components/export/export-dialog.tsx`:

```tsx
import { useState } from "react";
import { Code, FileJson, FileText, Table } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import { Label } from "@acme/ui/label";
import { RadioGroup, RadioGroupItem } from "@acme/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcriptions: any[];
  onExport: (options: ExportOptions) => void;
}

interface ExportOptions {
  format: "txt" | "json" | "csv" | "md";
  includeMetadata: boolean;
  includeTimestamps: boolean;
  dateRange: "all" | "week" | "month" | "custom";
}

export function ExportDialog({
  open,
  onOpenChange,
  transcriptions,
  onExport,
}: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: "txt",
    includeMetadata: false,
    includeTimestamps: false,
    dateRange: "all",
  });

  const formatIcons = {
    txt: <FileText className="h-4 w-4" />,
    json: <FileJson className="h-4 w-4" />,
    csv: <Table className="h-4 w-4" />,
    md: <Code className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Transcriptions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value) =>
                setOptions({ ...options, format: value as any })
              }
            >
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formatIcons).map(([format, icon]) => (
                  <div key={format} className="flex items-center space-x-2">
                    <RadioGroupItem value={format} id={format} />
                    <Label
                      htmlFor={format}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      {icon}
                      <span className="uppercase">{format}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeMetadata: !!checked })
                  }
                />
                <Label htmlFor="metadata" className="cursor-pointer">
                  Include metadata (date, duration, model used)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timestamps"
                  checked={options.includeTimestamps}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeTimestamps: !!checked })
                  }
                  disabled={options.format !== "json"}
                />
                <Label htmlFor="timestamps" className="cursor-pointer">
                  Include timestamps (JSON only)
                </Label>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Date Range</Label>
            <Select
              value={options.dateRange}
              onValueChange={(value) =>
                setOptions({ ...options, dateRange: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transcriptions</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="mb-1 font-medium">Export Summary</p>
            <p className="text-muted-foreground">
              {transcriptions.length} transcriptions will be exported as{" "}
              {options.format.toUpperCase()}
              {options.includeMetadata && " with metadata"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onExport(options);
              onOpenChange(false);
            }}
          >
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Error Handling System

Create `packages/api/src/middleware/error-handler.ts`:

```typescript
import { TRPCError } from "@trpc/server";

import { Context } from "../trpc";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = {
  onError({ error, type, path, input, ctx, req }: any) {
    console.error(`Error in ${type} ${path}:`, error);

    // Log to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // logToSentry(error, { type, path, input });
    }

    // Handle specific error types
    if (error.code === "UNAUTHORIZED") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Please sign in to continue",
      });
    }

    if (error.code === "FORBIDDEN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to perform this action",
      });
    }

    // Handle quota exceeded
    if (error.code === "QUOTA_EXCEEDED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Weekly transcription limit exceeded. Upgrade to Pro for unlimited transcriptions.",
      });
    }

    // Handle OpenAI API errors
    if (error.message?.includes("OpenAI")) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Transcription service temporarily unavailable. Please try again.",
      });
    }

    // Default error
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    });
  },
};
```

### 5. Settings Page Implementation

Update `apps/desktop/src/routes/_authenticated/settings.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Download, HardDrive, Trash2 } from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";
import { Label } from "@acme/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Separator } from "@acme/ui/separator";
import { Switch } from "@acme/ui/switch";

import { ModelManager } from "../../components/settings/model-manager";
import { useHardwareInfo } from "../../hooks/use-hardware-info";
import { api } from "../../trpc";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: hardwareInfo } = useHardwareInfo();
  const { data: preferences, refetch } = api.user.getPreferences.useQuery();
  const updatePreferences = api.user.updatePreferences.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>

      <div className="space-y-6">
        {/* Recording Settings */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Recording</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-save">Auto-save recordings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save recordings after stopping
                </p>
              </div>
              <Switch
                id="auto-save"
                checked={preferences?.autoSave ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences.mutate({ autoSave: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-transcribe">Auto-transcribe</Label>
                <p className="text-sm text-muted-foreground">
                  Start transcription immediately after recording
                </p>
              </div>
              <Switch
                id="auto-transcribe"
                checked={preferences?.autoTranscribe ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences.mutate({ autoTranscribe: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Default language</Label>
              <Select
                value={preferences?.defaultLanguage || "en"}
                onValueChange={(value) =>
                  updatePreferences.mutate({ defaultLanguage: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Processing Settings */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Processing</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="use-local">
                  Use local models when available
                </Label>
                <p className="text-sm text-muted-foreground">
                  Process transcriptions on your device when possible
                </p>
              </div>
              <Switch
                id="use-local"
                checked={preferences?.useLocalModels ?? true}
                onCheckedChange={(checked) =>
                  updatePreferences.mutate({ useLocalModels: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Preferred model</Label>
              <Select
                value={preferences?.preferredModel || "auto"}
                onValueChange={(value) =>
                  updatePreferences.mutate({ preferredModel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic (Recommended)</SelectItem>
                  <SelectItem value="whisper-1">
                    OpenAI Whisper (Cloud)
                  </SelectItem>
                  <SelectItem value="whisper-tiny">
                    Whisper Tiny (Fast)
                  </SelectItem>
                  <SelectItem value="whisper-base">Whisper Base</SelectItem>
                  <SelectItem value="whisper-small">Whisper Small</SelectItem>
                  <SelectItem value="whisper-medium">Whisper Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Hardware Info */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">System Information</h2>

          {hardwareInfo && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  Memory
                </span>
                <span>{Math.round(hardwareInfo.totalMemory / 1024)} GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Cpu className="h-4 w-4" />
                  CPU Cores
                </span>
                <span>{hardwareInfo.cpuCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">GPU Available</span>
                <Badge variant={hardwareInfo.hasGpu ? "default" : "secondary"}>
                  {hardwareInfo.hasGpu ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recommended Model</span>
                <Badge>{hardwareInfo.recommendedModel}</Badge>
              </div>
            </div>
          )}
        </Card>

        {/* Model Management */}
        <ModelManager />

        {/* Keyboard Shortcuts */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Keyboard Shortcuts</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Push to talk</span>
              <kbd className="rounded bg-muted px-2 py-1 text-xs">Ctrl+Win</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Toggle recording</span>
              <kbd className="rounded bg-muted px-2 py-1 text-xs">
                Ctrl+Shift+X
              </kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quick save</span>
              <kbd className="rounded bg-muted px-2 py-1 text-xs">
                Ctrl+Shift+S
              </kbd>
            </div>
          </div>
        </Card>

        {/* Storage Management */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Storage</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Audio Files</p>
                <p className="text-sm text-muted-foreground">
                  23 files using 1.2 GB
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Old Files
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Whisper Models</p>
                <p className="text-sm text-muted-foreground">
                  2 models using 856 MB
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage Models
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

## Final Integration

### Update Main Window

Update `apps/desktop/src-tauri/src/main.rs`:

```rust
use modules::{audio, hardware, whisper, shortcuts};

fn main() {
    let context = tauri::generate_context!();

    tauri::Builder::default()
        .setup(|app| {
            // Register global shortcuts
            shortcuts::register_shortcuts(app)?;

            // Initialize managers
            app.manage(Arc::new(Mutex::new(audio::AudioRecorder::new())));
            app.manage(Arc::new(Mutex::new(whisper::WhisperManager::new())));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ... all handlers
            shortcuts::show_notification,
        ])
        .run(context)
        .expect("error while running tauri application");
}
```

## Validation Checklist

- [ ] Global keyboard shortcuts work across the system
- [ ] Push-to-talk functionality responds correctly
- [ ] Export supports multiple formats with options
- [ ] Error messages are user-friendly and actionable
- [ ] Settings persist and apply correctly
- [ ] Model management UI works smoothly
- [ ] Storage cleanup functions properly
- [ ] All edge cases handled gracefully

## MVP Complete! 🎉

Your VoiceGecko MVP is now ready with:

- ✅ Voice recording with waveform visualization
- ✅ Hybrid transcription (cloud + local)
- ✅ Usage tracking and quotas
- ✅ Transcription management UI
- ✅ Export functionality
- ✅ Keyboard shortcuts
- ✅ Settings and preferences
- ✅ Error handling
