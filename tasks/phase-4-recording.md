# Phase 4: Recording & Processing

## Overview

Build the recording UI components, audio processing pipeline, and transcription queue system.

## Tasks

### 1. Recording Component

Create `apps/desktop/src/components/recording/audio-recorder.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, Square } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";
import { Progress } from "@acme/ui/progress";

import { useAudioRecorder } from "../../hooks/use-audio-recorder";
import { formatDuration } from "../../utils/format-duration";
import { AudioWaveform } from "./audio-waveform";

interface AudioRecorderProps {
  onRecordingComplete: (audioData: {
    filePath: string;
    duration: number;
    size: number;
  }) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const { isRecording, startRecording, stopRecording, recordingPath } =
    useAudioRecorder({
      onRecordingComplete: (filePath) => {
        // Process and save recording
        onRecordingComplete({
          filePath,
          duration,
          size: 0, // Will be calculated
        });
      },
    });

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const handleStartRecording = async () => {
    setDuration(0);
    await startRecording();
  };

  const handleStopRecording = async () => {
    await stopRecording();
    setDuration(0);
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <div className="relative">
                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-red-500" />
              </div>
            ) : null}
            <span className="text-sm font-medium">
              {isRecording ? "Recording" : "Ready to record"}
            </span>
          </div>
          <span className="font-mono text-2xl">{formatDuration(duration)}</span>
        </div>

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="h-24 rounded-lg bg-muted/50 p-2">
            <AudioWaveform isActive={isRecording && !isPaused} />
          </div>
        )}

        {/* Usage Quota */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Weekly usage</span>
            <span>1,234 / 2,000 words</span>
          </div>
          <Progress value={61.7} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <Button
              size="lg"
              onClick={handleStartRecording}
              className="h-16 w-16 rounded-full"
            >
              <Mic className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={togglePause}
                className="h-12 w-12 rounded-full"
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopRecording}
                className="h-16 w-16 rounded-full"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Recording Tips */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Press Ctrl+Win to start/stop recording</p>
          <p>Speak clearly and minimize background noise</p>
        </div>
      </div>
    </Card>
  );
}
```

### 2. Audio Waveform Component

Create `apps/desktop/src/components/recording/audio-waveform.tsx`:

```tsx
import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  isActive: boolean;
}

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const width = (canvas.width = canvas.offsetWidth * 2);
    const height = (canvas.height = canvas.offsetHeight * 2);

    ctx.scale(2, 2);

    let offset = 0;

    const draw = () => {
      if (!isActive) return;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const bars = 50;
      const barWidth = canvas.offsetWidth / bars;

      for (let i = 0; i < bars; i++) {
        const x = i * barWidth + barWidth / 2;
        const amplitude =
          Math.sin((i + offset) * 0.1) * 20 + Math.random() * 10;
        const y = canvas.offsetHeight / 2;

        ctx.moveTo(x, y - amplitude);
        ctx.lineTo(x, y + amplitude);
      }

      ctx.stroke();
      offset += 0.5;

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isActive) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

### 3. Audio Processing Pipeline

Create `apps/desktop/src-tauri/src/modules/audio_processing.rs`:

```rust
use std::path::Path;
use std::process::Command;
use tauri::command;

#[derive(serde::Serialize)]
pub struct ProcessedAudio {
    output_path: String,
    format: String,
    size_bytes: u64,
    duration_seconds: f32,
}

#[command]
pub async fn convert_audio_to_webm(
    input_path: String,
    output_path: String,
) -> Result<ProcessedAudio, String> {
    // Use FFmpeg to convert WAV to WebM with Opus codec
    let output = Command::new("ffmpeg")
        .args(&[
            "-i", &input_path,
            "-c:a", "libopus",
            "-b:a", "32k", // 32kbps is good for speech
            "-application", "voip", // Optimized for voice
            "-y", // Overwrite output
            &output_path,
        ])
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "FFmpeg conversion failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Get file info
    let metadata = std::fs::metadata(&output_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    // Get duration using ffprobe
    let duration_output = Command::new("ffprobe")
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            &output_path,
        ])
        .output()
        .map_err(|e| format!("FFprobe error: {}", e))?;

    let duration = String::from_utf8_lossy(&duration_output.stdout)
        .trim()
        .parse::<f32>()
        .unwrap_or(0.0);

    // Clean up original WAV file
    std::fs::remove_file(&input_path).ok();

    Ok(ProcessedAudio {
        output_path,
        format: "webm".to_string(),
        size_bytes: metadata.len(),
        duration_seconds: duration,
    })
}

#[command]
pub async fn get_audio_metadata(file_path: String) -> Result<AudioMetadata, String> {
    let duration_output = Command::new("ffprobe")
        .args(&[
            "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=duration,bit_rate,sample_rate,channels",
            "-of", "json",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("FFprobe error: {}", e))?;

    let json_str = String::from_utf8_lossy(&duration_output.stdout);
    let metadata: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    // Extract metadata from JSON response
    // ... parse and return metadata

    Ok(AudioMetadata {
        duration: 0.0,
        bitrate: 0,
        sample_rate: 0,
        channels: 0,
    })
}
```

### 4. Recording Page Update

Update `apps/desktop/src/routes/_authenticated/recording.tsx`:

```tsx
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@acme/ui/card";
import { toast } from "@acme/ui/toast";

import { AudioRecorder } from "../../components/recording/audio-recorder";
import { RecentRecordings } from "../../components/recording/recent-recordings";
import { api } from "../../trpc";

export const Route = createFileRoute("/_authenticated/recording")({
  component: RecordingPage,
});

function RecordingPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const utils = api.useUtils();

  const createTranscription = api.transcription.create.useMutation({
    onSuccess: () => {
      toast.success("Recording saved and queued for transcription");
      utils.transcription.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRecordingComplete = async (audioData: {
    filePath: string;
    duration: number;
    size: number;
  }) => {
    setIsProcessing(true);

    try {
      // Convert to WebM
      const processed = await invoke("convert_audio_to_webm", {
        inputPath: audioData.filePath,
        outputPath: audioData.filePath.replace(".wav", ".webm"),
      });

      // Upload and create transcription
      await createTranscription.mutateAsync({
        audioFilePath: processed.output_path,
        audioFileSize: processed.size_bytes,
        audioDuration: processed.duration_seconds,
        title: `Recording ${new Date().toLocaleString()}`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Failed to process recording");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold">Voice Recording</h1>

        <AudioRecorder onRecordingComplete={handleRecordingComplete} />

        {isProcessing && (
          <Card className="mt-4 p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
              <span>Processing recording...</span>
            </div>
          </Card>
        )}
      </div>

      <div className="mx-auto max-w-4xl">
        <RecentRecordings />
      </div>
    </div>
  );
}
```

### 5. Recent Recordings Component

Create `apps/desktop/src/components/recording/recent-recordings.tsx`:

```tsx
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, FileAudio, Loader2, XCircle } from "lucide-react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";

import { api } from "../../trpc";

export function RecentRecordings() {
  const { data, isLoading } = api.transcription.list.useQuery({
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  if (!data?.items.length) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <FileAudio className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No recordings yet</p>
          <p className="text-sm">
            Start recording to see your transcriptions here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Recent Recordings</h2>

      <div className="space-y-2">
        {data.items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileAudio className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.title || "Untitled"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt))} ago
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                {item.status === "completed" && (
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "processing":
      return (
        <Badge variant="default" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}
```

## Validation Checklist

- [ ] Recording starts and stops correctly
- [ ] Audio waveform displays during recording
- [ ] Duration timer works accurately
- [ ] Audio is converted to WebM format
- [ ] Files are saved with correct naming structure
- [ ] Transcription records are created in database
- [ ] Recent recordings list updates in real-time
- [ ] Usage quota is displayed and enforced

## Next Steps

Continue with:

- [Phase 5: Local Processing & UI](./phase-5-local-processing.md)
- [Phase 6: Polish & Features](./phase-6-polish.md)
