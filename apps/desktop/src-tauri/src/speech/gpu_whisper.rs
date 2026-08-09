use crate::dictation::types::EngineId;
use crate::speech::engine::{DictationEngine, EngineCapabilities, TranscriptionResult};
use crate::speech::stt_log;
use async_trait::async_trait;
use std::time::Instant;

const ENGINE: &str = "gpu_whisper";

pub struct GpuWhisperEngine;

impl GpuWhisperEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl DictationEngine for GpuWhisperEngine {
    fn id(&self) -> EngineId {
        EngineId::InsanelyFastWhisper
    }

    fn display_name(&self) -> &str {
        "Insanely Fast Whisper (GPU)"
    }

    fn capabilities(&self) -> EngineCapabilities {
        EngineCapabilities {
            supports_streaming: false,
            requires_network: false,
            requires_gpu: true,
        }
    }

    fn is_available(&self) -> bool {
        super::whisper_sidecar::is_sidecar_installed()
            && super::whisper_sidecar::whisper_model_path().is_some()
    }

    async fn transcribe_batch(
        &self,
        app: &tauri::AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<TranscriptionResult, String> {
        if !self.is_available() {
            stt_log::warn(
                ENGINE,
                "GPU Whisper unavailable — sidecar or ggml model missing",
            );
            return Err(
                "GPU Whisper unavailable — install WhisperSidecar and download a Whisper model from Engine Lab".into(),
            );
        }

        let start = Instant::now();
        stt_log::info_fmt(
            ENGINE,
            format!(
                "Starting batch transcription ({} samples @ {} Hz)",
                samples.len(),
                sample_rate
            ),
        );

        let hint = super::transcription_hint::get_session_hint(app);
        let text = super::whisper_sidecar::transcribe_samples(
            app,
            samples,
            sample_rate,
            hint.as_deref(),
        )
        .map_err(|e| {
            stt_log::error_fmt(ENGINE, &e);
            e
        })?;

        let latency_ms = start.elapsed().as_millis() as u64;
        stt_log::info_fmt(
            ENGINE,
            format!("Transcription complete in {latency_ms} ms ({} chars)", text.len()),
        );

        Ok(TranscriptionResult {
            text,
            latency_ms,
            is_partial: false,
        })
    }
}

/// Install WhisperSidecar and ensure ggml model is present.
pub async fn bootstrap_gpu_whisper(app: &tauri::AppHandle) -> Result<(), String> {
    stt_log::info(ENGINE, "Bootstrapping GPU Whisper sidecar");
    super::whisper_sidecar::ensure_sidecar_installed(app).await?;
    super::whisper_sidecar::ensure_whisper_model(app)?;
    if super::whisper_sidecar::is_ready() {
        stt_log::info(ENGINE, "GPU Whisper ready");
    } else {
        stt_log::warn(ENGINE, "GPU Whisper bootstrap incomplete");
    }
    Ok(())
}
