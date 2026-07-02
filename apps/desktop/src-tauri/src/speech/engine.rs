use crate::dictation::types::EngineId;
use async_trait::async_trait;
use tauri::AppHandle;

#[derive(Debug, Clone)]
pub struct TranscriptionResult {
    pub text: String,
    pub latency_ms: u64,
    pub is_partial: bool,
}

#[derive(Debug, Clone)]
pub struct EngineCapabilities {
    pub supports_streaming: bool,
    pub requires_network: bool,
    pub requires_gpu: bool,
}

#[async_trait]
pub trait DictationEngine: Send + Sync {
    fn id(&self) -> EngineId;
    fn display_name(&self) -> &str;
    fn capabilities(&self) -> EngineCapabilities;

    async fn transcribe_batch(
        &self,
        app: &AppHandle,
        samples: &[f32],
        sample_rate: u32,
    ) -> Result<TranscriptionResult, String>;

    async fn transcribe_stream_chunk(
        &self,
        _app: &AppHandle,
        _samples: &[f32],
        _sample_rate: u32,
    ) -> Result<Option<TranscriptionResult>, String> {
        Ok(None)
    }

    fn is_available(&self) -> bool {
        true
    }
}
