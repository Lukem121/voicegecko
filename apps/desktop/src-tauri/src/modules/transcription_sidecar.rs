use async_trait::async_trait;
use serde::Deserialize;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Instant;
use tauri::Manager;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt as TokioAsyncWriteExt, BufReader};
use tokio::process::{Child, Command as TokioCommand};
use tokio::sync::Mutex;

use crate::modules::transcription::{
    TranscriptionError, TranscriptionEvent, TranscriptionProgress,
};

#[async_trait]
pub trait TranscriptionProvider: Send + Sync {
    async fn transcribe_buffer(
        &self,
        app: AppHandle,
        audio_samples: Vec<f32>,
    ) -> Result<String, TranscriptionError>;
}

struct SidecarProcess {
    child: Child,
    stdin: tokio::process::ChildStdin,
    stdout: BufReader<tokio::process::ChildStdout>,
}

#[derive(Clone)]
pub struct SidecarManager {
    process: Arc<Mutex<Option<SidecarProcess>>>,
}

#[derive(Clone)]
pub struct TranscriptionState {
    pub manager: Arc<SidecarManager>,
}

impl Default for TranscriptionState {
    fn default() -> Self {
        Self {
            manager: Arc::new(SidecarManager::new()),
        }
    }
}

#[derive(Clone)]
pub struct SidecarWhisperProvider {
    pub model_id: String,
}

#[derive(Deserialize)]
struct SidecarResponse {
    text: String,
}

impl SidecarManager {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn prewarm(&self, app: &AppHandle, model_id: &str) -> Result<(), TranscriptionError> {
        self.ensure_running_with_model(app, model_id).await
    }

    async fn ensure_running_with_model(
        &self,
        app: &AppHandle,
        model_id: &str,
    ) -> Result<(), TranscriptionError> {
        let mut process_guard = self.process.lock().await;

        // Check if process is still alive
        if let Some(ref mut sidecar) = process_guard.as_mut() {
            match sidecar.child.try_wait() {
                Ok(Some(_)) => {
                    // Process has exited, need to restart
                    println!("[Sidecar] Process exited, restarting...");
                    *process_guard = None;
                }
                Ok(None) => {
                    // Process is still running
                    return Ok(());
                }
                Err(e) => {
                    println!("[Sidecar] Error checking process status: {}", e);
                    *process_guard = None;
                }
            }
        }

        // Start new process
        println!("[Sidecar] Starting warm sidecar in server mode...");
        let sidecar_path = SidecarWhisperProvider::resolve_sidecar_path(app)?;

        let model_file = format!("ggml-{}.bin", model_id);
        let models_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| TranscriptionError::ModelLoad(e.to_string()))?
            .join("models");
        let model_path = models_dir.join(&model_file);

        if !model_path.exists() {
            return Err(TranscriptionError::ModelLoad(format!(
                "Model file not found at {}",
                model_path.to_string_lossy()
            )));
        }

        let mut cmd = TokioCommand::new(sidecar_path);
        cmd.arg("--server")
            .arg("--model")
            .arg(model_path.to_string_lossy().to_string())
            .arg("--language")
            .arg("en")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit()); // Forward stderr to see detailed logs

        // On Windows, ensure no console window is shown
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd.spawn().map_err(|e| {
            TranscriptionError::Transcription(format!("Failed to start warm sidecar: {}", e))
        })?;

        let stdin = child.stdin.take().ok_or_else(|| {
            TranscriptionError::Transcription("Failed to get sidecar stdin".to_string())
        })?;

        let stdout = child.stdout.take().ok_or_else(|| {
            TranscriptionError::Transcription("Failed to get sidecar stdout".to_string())
        })?;

        *process_guard = Some(SidecarProcess {
            child,
            stdin,
            stdout: BufReader::new(stdout),
        });

        println!("[Sidecar] Warm sidecar started successfully");
        Ok(())
    }

    async fn send_file_request_simple(
        &self,
        app: &AppHandle,
        model_id: &str,
        wav_file_path: &std::path::Path,
    ) -> Result<String, TranscriptionError> {
        let total_ipc_time = Instant::now();
        self.ensure_running_with_model(app, model_id).await?;

        let mut process_guard = self.process.lock().await;
        let sidecar = process_guard
            .as_mut()
            .ok_or_else(|| TranscriptionError::Transcription("Sidecar not running".to_string()))?;

        // Send file path as single line
        let send_start = Instant::now();
        let path_str = format!("{}\n", wav_file_path.to_string_lossy());
        let path_bytes = path_str.as_bytes();

        sidecar.stdin.write_all(path_bytes).await.map_err(|e| {
            TranscriptionError::Transcription(format!("Failed to write file path: {}", e))
        })?;

        sidecar.stdin.flush().await.map_err(|e| {
            TranscriptionError::Transcription(format!("Failed to flush stdin: {}", e))
        })?;
        println!(
            "[PERF] 📤 Rust->Sidecar send took: {:?}",
            send_start.elapsed()
        );

        // Read JSON response as single line using BufReader
        let read_start = Instant::now();
        let mut response_line = String::new();
        sidecar
            .stdout
            .read_line(&mut response_line)
            .await
            .map_err(|e| {
                TranscriptionError::Transcription(format!("Failed to read response line: {}", e))
            })?;

        // Remove all whitespace and control characters, including UTF-8 BOM
        response_line = response_line
            .trim()
            .trim_start_matches('\u{feff}')
            .to_string();

        println!(
            "[PERF] 📥 Rust read response took: {:?} | size: {} chars",
            read_start.elapsed(),
            response_line.len()
        );
        println!("[PERF] 🔍 Raw response: {:?}", response_line);

        let parse_start = Instant::now();
        let resp: SidecarResponse = serde_json::from_str(&response_line).map_err(|e| {
            // Debug the exact bytes to see what's wrong
            let bytes: Vec<u8> = response_line.bytes().collect();
            TranscriptionError::Transcription(format!(
                "Invalid JSON response: {} | Raw: {} | Bytes: {:?}",
                e, response_line, bytes
            ))
        })?;
        println!("[PERF] 📥 Rust parse took: {:?}", parse_start.elapsed());
        println!(
            "[PERF] 🔄 Total Rust IPC took: {:?}",
            total_ipc_time.elapsed()
        );

        Ok(resp.text.trim().to_string())
    }

    // (no shutdown; process persists for app lifetime)
}

impl SidecarWhisperProvider {
    pub fn new(model_id: String, _dictionary_prompt: Option<String>) -> Self {
        Self { model_id }
    }

    fn resolve_sidecar_path(app: &AppHandle) -> Result<PathBuf, TranscriptionError> {
        // Match how other resources are loaded (e.g., notification sounds use "resources/...")
        let candidates = [
            "resources/binaries/whisper-sidecar/win-x64/whisper-sidecar.exe",
            "resources/binaries/whisper-sidecar/win-x64/WhisperSidecar.exe",
        ];

        for rel in candidates {
            if let Ok(path) = app
                .path()
                .resolve(rel, tauri::path::BaseDirectory::Resource)
            {
                if path.exists() {
                    return Ok(path);
                }
            }
        }

        Err(TranscriptionError::Transcription(
            "Sidecar not found under resources/binaries/whisper-sidecar/win-x64".to_string(),
        ))
    }

    fn write_wav_16k_mono(app: &AppHandle, samples: &[f32]) -> Result<PathBuf, TranscriptionError> {
        // Write a simple WAV (PCM16, 16kHz mono) to temp file
        let tmp_dir = app
            .path()
            .temp_dir()
            .map_err(|e| TranscriptionError::AudioProcessing(format!("Temp dir error: {}", e)))?;
        let file_path = tmp_dir.join(format!("vg_input_{}.wav", std::process::id()));

        let mut file = File::create(&file_path).map_err(|e| {
            TranscriptionError::AudioProcessing(format!("Create wav failed: {}", e))
        })?;

        let sample_rate = 16000u32;
        let num_channels = 1u16;
        let bits_per_sample = 16u16; // PCM16
        let byte_rate = sample_rate * num_channels as u32 * (bits_per_sample as u32 / 8);
        let block_align = num_channels * (bits_per_sample / 8);
        let data_size = samples.len() as u32 * (bits_per_sample as u32 / 8);
        let file_size = 36 + data_size;

        // RIFF header
        file.write_all(b"RIFF")
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&file_size.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(b"WAVE")
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;

        // fmt chunk
        file.write_all(b"fmt ")
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&16u32.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?; // chunk size
        file.write_all(&1u16.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?; // PCM format
        file.write_all(&num_channels.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&sample_rate.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&byte_rate.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&block_align.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&bits_per_sample.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;

        // data chunk
        file.write_all(b"data")
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        file.write_all(&data_size.to_le_bytes())
            .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;

        // frames (convert f32 [-1,1] to i16 PCM)
        for &sample in samples {
            let s = (sample.max(-1.0).min(1.0) * 32767.0).round() as i32;
            let s_clamped = s.clamp(-32768, 32767) as i16;
            file.write_all(&s_clamped.to_le_bytes())
                .map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
        }

        Ok(file_path)
    }
}

#[async_trait]
impl TranscriptionProvider for SidecarWhisperProvider {
    async fn transcribe_buffer(
        &self,
        app: AppHandle,
        audio_samples: Vec<f32>,
    ) -> Result<String, TranscriptionError> {
        let total_time = Instant::now();

        app.emit(
            "transcription-progress",
            TranscriptionEvent::from(TranscriptionProgress::LoadingModel),
        )
        .unwrap();

        // Write WAV file directly (like your old performant code)
        let file_write_start = Instant::now();
        let wav_path = Self::write_wav_16k_mono(&app, &audio_samples)?;
        println!(
            "[PERF] Optimized: WAV file write took: {:?} | path: {}",
            file_write_start.elapsed(),
            wav_path.to_string_lossy()
        );

        app.emit(
            "transcription-progress",
            TranscriptionEvent::from(TranscriptionProgress::Transcribing),
        )
        .unwrap();

        // Use global warm sidecar with fixed line-based IPC
        let state = app.state::<TranscriptionState>();
        let manager = &state.manager;
        let request_start = Instant::now();
        let result = manager
            .send_file_request_simple(&app, &self.model_id, &wav_path)
            .await?;
        println!(
            "[PERF] Warm sidecar: File processing took: {:?}",
            request_start.elapsed()
        );

        // Clean up temp file
        let _ = std::fs::remove_file(&wav_path);

        println!(
            "[PERF] Optimized: Total transcription time: {:?}",
            total_time.elapsed()
        );

        Ok(result)
    }
}

impl SidecarWhisperProvider {
    // removed unused single-shot and encode helpers
}
