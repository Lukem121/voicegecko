use crate::dictation::types::EngineId;
use crate::speech::engine::{DictationEngine, EngineCapabilities, TranscriptionResult};
use async_trait::async_trait;
use std::path::PathBuf;
use std::time::Instant;

pub struct ParakeetEngine {
    model_dir: Option<PathBuf>,
}

impl ParakeetEngine {
    pub fn new() -> Self {
        let model_dir = dirs::data_local_dir()
            .map(|d| d.join("voicegecko").join("models").join("parakeet-tdt-v2"));
        Self { model_dir }
    }

    fn model_ready(&self) -> bool {
        self.model_dir
            .as_ref()
            .map(|d| {
                d.join("tokens.txt").is_file()
                    && (d.join("encoder.int8.onnx").is_file()
                        || d.join("encoder.onnx").is_file()
                        || d.join("model.onnx").is_file())
            })
            .unwrap_or(false)
    }

    fn can_transcribe(&self) -> bool {
        self.model_ready()
            && (super::parakeet_sidecar::is_sidecar_available()
                || self.model_dir.as_ref().map(|d| d.join("model.onnx").exists()).unwrap_or(false))
    }
}

#[async_trait]
impl DictationEngine for ParakeetEngine {
    fn id(&self) -> EngineId {
        EngineId::ParakeetTdtV2
    }

    fn display_name(&self) -> &str {
        "Parakeet TDT v2"
    }

    fn capabilities(&self) -> EngineCapabilities {
        EngineCapabilities {
            supports_streaming: true,
            requires_network: false,
            requires_gpu: false,
        }
    }

    fn is_available(&self) -> bool {
        self.can_transcribe()
    }

    async fn transcribe_batch(
        &self,
        _app: &tauri::AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<TranscriptionResult, String> {
        if !self.model_ready() {
            return Err(
                "Parakeet model is still downloading — wait for setup to finish.".into(),
            );
        }
        let start = Instant::now();
        let text = transcribe_parakeet_onnx(samples, sample_rate, self.model_dir.as_ref().unwrap()).await?;
        Ok(TranscriptionResult {
            text,
            latency_ms: start.elapsed().as_millis() as u64,
            is_partial: false,
        })
    }

    async fn transcribe_stream_chunk(
        &self,
        _app: &tauri::AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<Option<TranscriptionResult>, String> {
        if !self.model_ready() {
            return Ok(None);
        }
        let start = Instant::now();
        let text = transcribe_parakeet_onnx(samples, sample_rate, self.model_dir.as_ref().unwrap()).await?;
        if text.is_empty() {
            return Ok(None);
        }
        Ok(Some(TranscriptionResult {
            text,
            latency_ms: start.elapsed().as_millis() as u64,
            is_partial: true,
        }))
    }
}

async fn transcribe_parakeet_onnx(
    samples: &[f32],
    sample_rate: u32,
    model_dir: &PathBuf,
) -> Result<String, String> {
    if super::parakeet_sidecar::is_sidecar_available() {
        let wav = super::parakeet_sidecar::write_temp_wav(samples, sample_rate)?;
        let result = super::parakeet_sidecar::transcribe_wav_file(model_dir, &wav);
        let _ = std::fs::remove_file(&wav);
        return result;
    }

    Err("Parakeet ONNX session not yet initialized — install sherpa-onnx-offline sidecar".into())
}
