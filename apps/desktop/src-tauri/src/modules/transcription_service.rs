use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use async_trait::async_trait;
use tauri::{AppHandle, Emitter, Manager};
use whisper_rs::{
    FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperState,
};

use crate::modules::transcription::{
    TranscriptionError, TranscriptionEvent, TranscriptionProgress,
};
use crate::modules::{self};

pub struct TranscriptionService {
    model_cache: Arc<Mutex<HashMap<String, Arc<WhisperContext>>>>,
    state_cache: Arc<Mutex<HashMap<String, Vec<WhisperState>>>>, // Pool of reusable states
}

#[async_trait]
pub trait TranscriptionProvider: Send + Sync {
    async fn transcribe_buffer(
        &self,
        app: AppHandle,
        audio_samples: Vec<f32>,
    ) -> Result<String, TranscriptionError>;
}

pub struct LocalWhisperProvider {
    pub model_id: String,
}

impl LocalWhisperProvider {
    /// Internal shared transcription logic used by both file and buffer methods
    async fn transcribe_internal(
        &self,
        app: AppHandle,
        audio_data: Vec<f32>,
        source_description: &str,
    ) -> Result<String, TranscriptionError> {
        let total_time = Instant::now();
        println!("[Rust] Starting transcription for: {}", source_description);

        // Check if audio is less than 1 second (assuming 16kHz sample rate)
        // Whisper requires at least 1 second of audio
        const MIN_SAMPLES_REQUIRED: usize = 16000; // 1 second at 16kHz

        if audio_data.len() < MIN_SAMPLES_REQUIRED {
            println!(
                "[Rust] Audio too short: {} samples (< 1 second). Returning empty transcription.",
                audio_data.len()
            );

            // Emit completion event with empty result
            app.emit(
                "transcription-progress",
                TranscriptionEvent::from(TranscriptionProgress::Complete {
                    transcript: String::new(),
                    duration_seconds: Some(audio_data.len() as f32 / 16000.0),
                    model_used: Some(self.model_id.clone()),
                    sample_rate: Some(16000),
                }),
            )
            .unwrap();

            return Ok(String::new());
        }

        app.emit(
            "transcription-progress",
            TranscriptionEvent::from(TranscriptionProgress::LoadingModel),
        )
        .unwrap();
        let service = app.state::<TranscriptionService>();

        let model_load_time = Instant::now();
        let ctx = service.get_or_load_model(&app, &self.model_id)?;
        println!(
            "[Rust] Get or load model took: {:?}",
            model_load_time.elapsed()
        );

        let state_create_time = Instant::now();
        let mut state = service.get_or_create_state(&ctx, &self.model_id)?;
        println!(
            "[Rust] Get or create state took: {:?}",
            state_create_time.elapsed()
        );

        println!(
            "[Rust] Using {} audio samples from {}",
            audio_data.len(),
            source_description
        );

        // Use hardcoded optimal values
        let threads = 4;
        let beam_size = 1; // Greedy for fastest performance
        let best_of = 1; // Single candidate for speed

        let mut params = if beam_size > 1 {
            FullParams::new(SamplingStrategy::BeamSearch {
                beam_size,
                patience: 1.0,
            })
        } else {
            FullParams::new(SamplingStrategy::Greedy { best_of })
        };

        params.set_n_threads(threads);
        params.set_translate(false);
        params.set_language(Some("en")); // Always use English
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);

        app.emit(
            "transcription-progress",
            TranscriptionEvent::from(TranscriptionProgress::Transcribing),
        )
        .unwrap();
        let full_transcribe_time = Instant::now();
        state
            .full(params, &audio_data)
            .map_err(|e| TranscriptionError::Transcription(e.to_string()))?;
        println!(
            "[Rust] Full transcribe took: {:?}",
            full_transcribe_time.elapsed()
        );

        let segment_build_time = Instant::now();
        let num_segments = state.full_n_segments().unwrap();
        let mut result = String::new();
        for i in 0..num_segments {
            let segment = state.full_get_segment_text(i).unwrap();
            result.push_str(&segment);
        }
        println!(
            "[Rust] Segment building took: {:?}",
            segment_build_time.elapsed()
        );

        println!(
            "[Rust] Total transcription time ({}): {:?}",
            source_description,
            total_time.elapsed()
        );

        // Return state to cache for reuse
        service.return_state(&self.model_id, state);

        Ok(result)
    }
}

#[async_trait]
impl TranscriptionProvider for LocalWhisperProvider {
    async fn transcribe_buffer(
        &self,
        app: AppHandle,
        audio_samples: Vec<f32>,
    ) -> Result<String, TranscriptionError> {
        self.transcribe_internal(app, audio_samples, "memory buffer")
            .await
    }
}

impl TranscriptionService {
    pub fn new() -> Self {
        Self {
            model_cache: Arc::new(Mutex::new(HashMap::new())),
            state_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Preload the active model into memory during startup to ensure fast first transcription
    pub fn preload_active_model(&self, app: &AppHandle) -> Result<(), TranscriptionError> {
        // Get the active model ID using the same logic as transcription
        let model_id = match crate::modules::model_manager::get_active_model_id(app.clone()) {
            Ok(id) => id,
            Err(e) => {
                println!("[Rust] Failed to get active model ID: {}", e);
                return Ok(()); // Don't fail startup if we can't get the model ID
            }
        };

        // Skip preloading for cloud models
        if model_id == "cloud" {
            println!("[Rust] Active model is cloud, skipping preload");
            return Ok(());
        }

        println!("[Rust] Preloading model {} during startup", model_id);

        // Load the model into cache
        match self.get_or_load_model(app, &model_id) {
            Ok(_) => {
                println!("[Rust] Successfully preloaded model {}", model_id);
                Ok(())
            }
            Err(e) => {
                println!("[Rust] Failed to preload model {}: {}", model_id, e);
                // Don't fail startup if preloading fails
                Ok(())
            }
        }
    }

    pub fn get_or_load_model(
        &self,
        app: &AppHandle,
        model_id: &str,
    ) -> Result<Arc<WhisperContext>, TranscriptionError> {
        {
            let cache = self.model_cache.lock().unwrap();
            if let Some(model) = cache.get(model_id) {
                println!("Model {} found in cache", model_id);
                return Ok(Arc::clone(model));
            }
        }

        println!("Model {} not in cache, loading from disk", model_id);
        let app_data_dir = app.path().app_data_dir().unwrap();
        let model_path = app_data_dir.join(format!("models/ggml-{}.bin", model_id));

        if !model_path.exists() {
            return Err(TranscriptionError::ModelLoad(format!(
                "Model file not found at {}",
                model_path.to_string_lossy()
            )));
        }

        let model_load_time = Instant::now();
        let ctx = WhisperContext::new_with_params(
            &model_path.to_string_lossy(),
            WhisperContextParameters::default(),
        )
        .map_err(|e| TranscriptionError::ModelLoad(e.to_string()))?;
        println!(
            "[Rust] Model loading from disk took: {:?}",
            model_load_time.elapsed()
        );

        let arc_ctx = Arc::new(ctx);

        {
            let mut cache = self.model_cache.lock().unwrap();
            cache.insert(model_id.to_string(), Arc::clone(&arc_ctx));
        }

        Ok(arc_ctx)
    }

    pub fn get_or_create_state(
        &self,
        ctx: &Arc<WhisperContext>,
        model_id: &str,
    ) -> Result<WhisperState, TranscriptionError> {
        {
            let mut state_cache = self.state_cache.lock().unwrap();
            if let Some(states) = state_cache.get_mut(model_id) {
                if let Some(state) = states.pop() {
                    println!("Reusing cached state for model {}", model_id);
                    return Ok(state);
                }
            }
        }

        println!("Creating new state for model {}", model_id);
        ctx.create_state()
            .map_err(|e| TranscriptionError::Transcription(e.to_string()))
    }

    pub fn return_state(&self, model_id: &str, state: WhisperState) {
        let mut state_cache = self.state_cache.lock().unwrap();
        let states = state_cache
            .entry(model_id.to_string())
            .or_insert_with(Vec::new);

        // Limit the number of cached states per model to prevent memory bloat
        if states.len() < 3 {
            states.push(state);
            println!("Returned state to cache for model {}", model_id);
        }
    }
}
