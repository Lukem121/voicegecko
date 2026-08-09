use crate::dictation::types::EngineId;
use crate::speech::engine::DictationEngine;
use crate::speech::{gpu_whisper, moonshine, parakeet};
use std::sync::Arc;

pub struct EngineRegistry {
    engines: Vec<Arc<dyn DictationEngine>>,
}

impl EngineRegistry {
    pub fn new() -> Self {
        let engines: Vec<Arc<dyn DictationEngine>> = vec![
            Arc::new(parakeet::ParakeetEngine::new()),
            Arc::new(moonshine::MoonshineEngine::new()),
            Arc::new(gpu_whisper::GpuWhisperEngine::new()),
        ];
        Self { engines }
    }

    pub fn get(&self, id: EngineId) -> Option<Arc<dyn DictationEngine>> {
        self.engines
            .iter()
            .find(|e| e.id() == id)
            .cloned()
    }

    pub fn list(&self) -> Vec<EngineId> {
        self.engines
            .iter()
            .filter(|e| crate::dictation::features::is_engine_enabled(e.id().as_str()))
            .map(|e| e.id())
            .collect()
    }
}

impl Default for EngineRegistry {
    fn default() -> Self {
        Self::new()
    }
}
