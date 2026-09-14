use crate::dictation::types::EngineId;
use crate::speech::engine::DictationEngine;
use crate::speech::gpu_whisper;
use std::sync::Arc;

pub struct EngineRegistry {
    engines: Vec<Arc<dyn DictationEngine>>,
}

impl EngineRegistry {
    pub fn new() -> Self {
        Self {
            engines: vec![Arc::new(gpu_whisper::GpuWhisperEngine::new())],
        }
    }

    pub fn get(&self, id: EngineId) -> Option<Arc<dyn DictationEngine>> {
        self.engines.iter().find(|e| e.id() == id).cloned()
    }

    pub fn list(&self) -> Vec<EngineId> {
        self.engines.iter().map(|e| e.id()).collect()
    }
}

impl Default for EngineRegistry {
    fn default() -> Self {
        Self::new()
    }
}
