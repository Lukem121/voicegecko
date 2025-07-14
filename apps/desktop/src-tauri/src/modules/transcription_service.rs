use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use async_trait::async_trait;
use hound::WavReader;
use tauri::{AppHandle, Emitter, Manager};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::modules::transcription::{TranscriptionError, TranscriptionProgress};
use crate::modules::{self};

pub struct TranscriptionService {
    model_cache: Arc<Mutex<HashMap<String, Arc<WhisperContext>>>>,
    cache_enabled: Arc<Mutex<bool>>,
}

#[async_trait]
pub trait TranscriptionProvider: Send + Sync {
    async fn transcribe(
        &self,
        app: AppHandle,
        audio_path: String,
    ) -> Result<String, TranscriptionError>;
}

pub struct LocalWhisperProvider {
    pub model_id: String,
}

#[async_trait]
impl TranscriptionProvider for LocalWhisperProvider {
    async fn transcribe(
        &self,
        app: AppHandle,
        audio_path: String,
    ) -> Result<String, TranscriptionError> {
        let total_time = Instant::now();
        println!("[Rust] Starting transcription for: {}", audio_path);

        let config_time = Instant::now();
        let config = modules::settings::get_transcription_config(app.clone())
            .map_err(|e| TranscriptionError::Transcription(e.to_string()))?;
        println!("[Rust] Get config took: {:?}", config_time.elapsed());

        app.emit(
            "transcription-progress",
            TranscriptionProgress::LoadingModel,
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
        let mut state = ctx.create_state().unwrap();
        println!(
            "[Rust] Create state took: {:?}",
            state_create_time.elapsed()
        );

        let audio_read_time = Instant::now();
        let audio_data = read_wav_to_f32(audio_path)?;
        println!("[Rust] Read audio took: {:?}", audio_read_time.elapsed());

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_n_threads(config.threads as i32);
        params.set_translate(false);
        params.set_language(Some(&config.language));
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);

        app.emit(
            "transcription-progress",
            TranscriptionProgress::Transcribing,
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
            "[Rust] Total transcription time: {:?}",
            total_time.elapsed()
        );
        Ok(result)
    }
}

impl TranscriptionService {
    pub fn new() -> Self {
        Self {
            model_cache: Arc::new(Mutex::new(HashMap::new())),
            cache_enabled: Arc::new(Mutex::new(true)),
        }
    }

    pub fn get_or_load_model(
        &self,
        app: &AppHandle,
        model_id: &str,
    ) -> Result<Arc<WhisperContext>, TranscriptionError> {
        let cache_enabled = *self.cache_enabled.lock().unwrap();

        if cache_enabled {
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

        if cache_enabled {
            let mut cache = self.model_cache.lock().unwrap();
            cache.insert(model_id.to_string(), Arc::clone(&arc_ctx));
        }

        Ok(arc_ctx)
    }

    pub fn set_cache_enabled(&self, enabled: bool) {
        let mut cache_enabled_lock = self.cache_enabled.lock().unwrap();
        *cache_enabled_lock = enabled;
        if !enabled {
            self.clear_cache();
        }
    }

    pub fn get_cache_enabled(&self) -> bool {
        *self.cache_enabled.lock().unwrap()
    }

    pub fn clear_cache(&self) {
        self.model_cache.lock().unwrap().clear();
    }
}

fn read_wav_to_f32(path: String) -> Result<Vec<f32>, TranscriptionError> {
    let mut reader =
        WavReader::open(path).map_err(|e| TranscriptionError::AudioProcessing(e.to_string()))?;
    let samples: Vec<i16> = reader.samples::<i16>().map(|s| s.unwrap()).collect();

    // Convert to f32 samples
    let mut f32_samples = vec![0.0; samples.len()];
    for (i, sample) in samples.iter().enumerate() {
        f32_samples[i] = (*sample as f32) / (i16::MAX as f32);
    }

    Ok(f32_samples)
}
