# Phase 2: Core Infrastructure

## Overview

Build the core infrastructure components including file storage system, Tauri audio recording module, and hardware detection capabilities.

## Tasks

### 1. File Storage System

Create a file management service in `packages/api/src/services/storage/`:

#### `storage.service.ts`

```typescript
import fs from "fs/promises";
import path from "path";
import { createId } from "@paralleldrive/cuid2";

export class StorageService {
  private basePath: string;

  constructor() {
    this.basePath = process.env.AUDIO_STORAGE_PATH || "./storage/audio";
  }

  async ensureUserDirectory(userId: string): Promise<string> {
    const userPath = path.join(this.basePath, userId);
    await fs.mkdir(userPath, { recursive: true });
    return userPath;
  }

  async saveAudioFile(
    userId: string,
    audioBuffer: Buffer,
    format: string = "webm",
  ): Promise<string> {
    const date = new Date();
    const dateFolder = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const timestamp = Date.now();
    const fileId = createId();
    const fileName = `${timestamp}-${fileId}.${format}`;

    const userPath = await this.ensureUserDirectory(userId);
    const datePath = path.join(userPath, dateFolder);
    await fs.mkdir(datePath, { recursive: true });

    const filePath = path.join(datePath, fileName);
    await fs.writeFile(filePath, audioBuffer);

    // Return relative path for database storage
    return path.join(userId, dateFolder, fileName);
  }

  async getAudioFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, relativePath);
    return await fs.readFile(fullPath);
  }

  async deleteAudioFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, relativePath);
    await fs.unlink(fullPath);
  }

  async getFileStats(relativePath: string) {
    const fullPath = path.join(this.basePath, relativePath);
    const stats = await fs.stat(fullPath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }
}
```

### 2. Tauri Audio Module

Create Rust audio recording module in `apps/desktop/src-tauri/src/modules/audio.rs`:

```rust
use tauri::{command, State};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use cpal::{traits::{DeviceTrait, HostTrait, StreamTrait}, Device, StreamConfig};
use hound::{WavWriter, WavSpec};

pub struct AudioRecorder {
    is_recording: Arc<Mutex<bool>>,
    current_stream: Arc<Mutex<Option<cpal::Stream>>>,
    writer: Arc<Mutex<Option<WavWriter<std::io::BufWriter<std::fs::File>>>>>,
}

impl AudioRecorder {
    pub fn new() -> Self {
        Self {
            is_recording: Arc::new(Mutex::new(false)),
            current_stream: Arc::new(Mutex::new(None)),
            writer: Arc::new(Mutex::new(None)),
        }
    }
}

#[command]
pub async fn start_recording(
    state: State<'_, Arc<Mutex<AudioRecorder>>>,
    output_path: String,
) -> Result<String, String> {
    let recorder = state.lock().unwrap();

    if *recorder.is_recording.lock().unwrap() {
        return Err("Already recording".to_string());
    }

    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or("No input device available")?;

    let config = device.default_input_config()
        .map_err(|e| e.to_string())?;

    let spec = WavSpec {
        channels: config.channels(),
        sample_rate: config.sample_rate().0,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let writer = WavWriter::create(&output_path, spec)
        .map_err(|e| e.to_string())?;

    *recorder.writer.lock().unwrap() = Some(writer);
    *recorder.is_recording.lock().unwrap() = true;

    // Start audio stream
    let stream = build_input_stream(&device, &config.into(), recorder.writer.clone())
        .map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;
    *recorder.current_stream.lock().unwrap() = Some(stream);

    Ok(output_path)
}

#[command]
pub async fn stop_recording(
    state: State<'_, Arc<Mutex<AudioRecorder>>>,
) -> Result<(), String> {
    let recorder = state.lock().unwrap();

    *recorder.is_recording.lock().unwrap() = false;

    // Stop and drop the stream
    if let Some(stream) = recorder.current_stream.lock().unwrap().take() {
        drop(stream);
    }

    // Finalize the WAV file
    if let Some(writer) = recorder.writer.lock().unwrap().take() {
        writer.finalize().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[command]
pub async fn get_audio_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let devices = host.input_devices()
        .map_err(|e| e.to_string())?;

    let device_names: Vec<String> = devices
        .filter_map(|device| device.name().ok())
        .collect();

    Ok(device_names)
}

#[command]
pub async fn get_recording_status(
    state: State<'_, Arc<Mutex<AudioRecorder>>>,
) -> Result<bool, String> {
    let recorder = state.lock().unwrap();
    Ok(*recorder.is_recording.lock().unwrap())
}
```

Update `apps/desktop/src-tauri/Cargo.toml`:

```toml
[dependencies]
# ... existing dependencies
cpal = "0.15"
hound = "3.5"
```

### 3. Hardware Detection Module

Create `apps/desktop/src-tauri/src/modules/hardware.rs`:

```rust
use sysinfo::{System, SystemExt};
use tauri::command;

#[derive(serde::Serialize)]
pub struct HardwareInfo {
    total_memory: u64,  // in MB
    available_memory: u64,  // in MB
    cpu_count: usize,
    has_gpu: bool,
    recommended_model: String,
    can_run_local: bool,
}

#[command]
pub async fn get_hardware_info() -> Result<HardwareInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_memory = sys.total_memory() / 1024 / 1024; // Convert to MB
    let available_memory = sys.available_memory() / 1024 / 1024;
    let cpu_count = sys.cpus().len();

    // Simple GPU detection (can be enhanced)
    let has_gpu = check_gpu_availability();

    // Model recommendation logic
    let (recommended_model, can_run_local) = match total_memory {
        0..=3999 => ("whisper-1", false), // Less than 4GB: Cloud only
        4000..=7999 => ("whisper-tiny", true), // 4-8GB: Tiny model
        8000..=15999 => ("whisper-base", true), // 8-16GB: Base/Small model
        _ => ("whisper-medium", true), // 16GB+: Medium/Large model
    };

    Ok(HardwareInfo {
        total_memory,
        available_memory,
        cpu_count,
        has_gpu,
        recommended_model: recommended_model.to_string(),
        can_run_local,
    })
}

fn check_gpu_availability() -> bool {
    // Basic check - can be enhanced with actual GPU detection
    #[cfg(target_os = "windows")]
    {
        // Check for NVIDIA/AMD GPU on Windows
        std::process::Command::new("wmic")
            .args(&["path", "win32_VideoController", "get", "name"])
            .output()
            .map(|output| {
                let text = String::from_utf8_lossy(&output.stdout);
                text.contains("NVIDIA") || text.contains("AMD")
            })
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        false // Simplified for now
    }
}
```

Update `apps/desktop/src-tauri/Cargo.toml`:

```toml
[dependencies]
# ... existing dependencies
sysinfo = "0.29"
```

### 4. Frontend Audio Recording Hook

Create `apps/desktop/src/hooks/use-audio-recorder.ts`:

```typescript
import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

interface UseAudioRecorderOptions {
  onRecordingComplete?: (filePath: string) => void;
  onError?: (error: string) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const outputPath = `recording_${timestamp}.wav`;

      const path = await invoke<string>("start_recording", { outputPath });
      setRecordingPath(path);
      setIsRecording(true);
    } catch (error) {
      options.onError?.(error as string);
    }
  }, [options]);

  const stopRecording = useCallback(async () => {
    try {
      await invoke("stop_recording");
      setIsRecording(false);

      if (recordingPath) {
        options.onRecordingComplete?.(recordingPath);
      }
    } catch (error) {
      options.onError?.(error as string);
    }
  }, [recordingPath, options]);

  const getAudioDevices = useCallback(async () => {
    try {
      return await invoke<string[]>("get_audio_devices");
    } catch (error) {
      options.onError?.(error as string);
      return [];
    }
  }, [options]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    getAudioDevices,
    recordingPath,
  };
}
```

### 5. Hardware Detection Hook

Create `apps/desktop/src/hooks/use-hardware-info.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/tauri";

interface HardwareInfo {
  totalMemory: number;
  availableMemory: number;
  cpuCount: number;
  hasGpu: boolean;
  recommendedModel: string;
  canRunLocal: boolean;
}

export function useHardwareInfo() {
  return useQuery({
    queryKey: ["hardware-info"],
    queryFn: async () => {
      return await invoke<HardwareInfo>("get_hardware_info");
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
```

## Integration Steps

1. Update `apps/desktop/src-tauri/src/modules/mod.rs`:

```rust
pub mod updater;
pub mod audio;
pub mod hardware;
```

2. Update `apps/desktop/src-tauri/src/main.rs`:

```rust
use modules::{audio, hardware};

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(audio::AudioRecorder::new())))
        .invoke_handler(tauri::generate_handler![
            // ... existing handlers
            audio::start_recording,
            audio::stop_recording,
            audio::get_audio_devices,
            audio::get_recording_status,
            hardware::get_hardware_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Validation Checklist

- [ ] File storage creates proper directory structure
- [ ] Audio recording starts and stops correctly
- [ ] WAV files are saved to the correct location
- [ ] Hardware detection returns accurate memory information
- [ ] Model recommendations match hardware capabilities
- [ ] Frontend hooks integrate properly with Tauri commands

## Next Steps

After completing Phase 2:

- [Phase 3: API Layer](./phase-3-api-layer.md) - Create tRPC routes
- [Phase 4: Recording & Processing](./phase-4-recording.md) - Build the UI
