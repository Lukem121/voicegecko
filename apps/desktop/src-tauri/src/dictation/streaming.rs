use crate::audio_v2::StreamingAudioHub;
use crate::dictation::registry::EngineRegistry;
use crate::dictation::types::{DictationEvent, EngineId, InteractionMode};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const MIN_PARTIAL_SAMPLES: usize = 16_000; // 1s @ 16kHz
const POLL_INTERVAL_MS: u64 = 100;

pub struct StreamingPipeline {
    running: AtomicBool,
}

impl StreamingPipeline {
    pub fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
        }
    }

    pub fn should_stream(mode: InteractionMode, show_live_preview: bool) -> bool {
        matches!(
            mode,
            InteractionMode::FlowStream | InteractionMode::CapsuleCompose
        ) || show_live_preview
    }

    pub fn start(
        &self,
        app: AppHandle,
        hub: Arc<StreamingAudioHub>,
        session_id: String,
        mode: InteractionMode,
        engine_id: EngineId,
    ) {
        if self.running.swap(true, Ordering::SeqCst) {
            return;
        }

        hub.enable();

        tauri::async_runtime::spawn(async move {
            let registry = EngineRegistry::new();
            let resolved = resolve_stream_engine(&registry, engine_id);
            let engine = match registry.get(resolved) {
                Some(e) => e,
                None => {
                    hub.disable();
                    return;
                }
            };

            let mut last_text = String::new();

            while hub.is_enabled() {
                tokio::time::sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;

                let samples = hub.snapshot();
                if samples.len() < MIN_PARTIAL_SAMPLES {
                    continue;
                }

                match engine
                    .transcribe_stream_chunk(&app, &samples, 16_000)
                    .await
                {
                    Ok(Some(result)) if !result.text.is_empty() && result.text != last_text => {
                        last_text = result.text.clone();
                        let _ = app.emit(
                            DictationEvent::event_name(),
                            DictationEvent::PartialTranscript {
                                session_id: session_id.clone(),
                                text: result.text,
                                is_final: false,
                            },
                        );
                    }
                    Ok(_) => {}
                    Err(_) if mode == InteractionMode::FlowStream => {
                        // Flow mode expects streaming — ignore transient errors
                    }
                    Err(_) => {}
                }
            }
        });
    }

    pub fn stop(&self, hub: &StreamingAudioHub) {
        hub.disable();
        self.running.store(false, Ordering::SeqCst);
    }
}

impl Default for StreamingPipeline {
    fn default() -> Self {
        Self::new()
    }
}

fn resolve_stream_engine(registry: &EngineRegistry, preferred: EngineId) -> EngineId {
    let try_engine = |id: EngineId| -> Option<EngineId> {
        if !crate::dictation::features::is_engine_enabled(id.as_str()) {
            return None;
        }
        registry.get(id).and_then(|engine| {
            if engine.is_available() && engine.capabilities().supports_streaming {
                Some(id)
            } else {
                None
            }
        })
    };

    if let Some(id) = try_engine(preferred) {
        return id;
    }

    for id in [EngineId::MoonshineMedium, EngineId::ParakeetTdtV2] {
        if let Some(resolved) = try_engine(id) {
            return resolved;
        }
    }

    preferred
}
