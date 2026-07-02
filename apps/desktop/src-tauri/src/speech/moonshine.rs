use crate::dictation::types::EngineId;
use crate::speech::engine::{DictationEngine, EngineCapabilities, TranscriptionResult};
use crate::speech::moonshine_ffi;
use async_trait::async_trait;
use std::time::Instant;

pub struct MoonshineEngine;

impl MoonshineEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl DictationEngine for MoonshineEngine {
    fn id(&self) -> EngineId {
        EngineId::MoonshineMedium
    }

    fn display_name(&self) -> &str {
        "Moonshine Medium"
    }

    fn capabilities(&self) -> EngineCapabilities {
        EngineCapabilities {
            supports_streaming: true,
            requires_network: false,
            requires_gpu: false,
        }
    }

    fn is_available(&self) -> bool {
        // Flow mode defers to Parakeet stream when moonshine.dll is absent; bootstrap does not block toggle.
        moonshine_ffi::is_available()
    }

    async fn transcribe_stream_chunk(
        &self,
        _app: &tauri::AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<Option<TranscriptionResult>, String> {
        if !self.is_available() {
            return Ok(None);
        }
        let start = Instant::now();
        let text = moonshine_ffi::transcribe_stream_chunk(samples, sample_rate)?;
        if text.is_empty() {
            return Ok(None);
        }
        Ok(Some(TranscriptionResult {
            text,
            latency_ms: start.elapsed().as_millis() as u64,
            is_partial: true,
        }))
    }

    async fn transcribe_batch(
        &self,
        _app: &tauri::AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<TranscriptionResult, String> {
        let start = Instant::now();
        let text = moonshine_ffi::transcribe_batch(samples, sample_rate)?;
        Ok(TranscriptionResult {
            text,
            latency_ms: start.elapsed().as_millis() as u64,
            is_partial: false,
        })
    }
}
