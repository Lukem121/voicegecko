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
    pub dictionary_prompt: Option<String>,
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
        println!(
            "[PERF] =================== TRANSCRIPTION PERFORMANCE ANALYSIS ==================="
        );
        println!(
            "[PERF] Starting transcription for: {} | Audio samples: {} | Memory size: ~{:.2} MB",
            source_description,
            audio_data.len(),
            (audio_data.len() * std::mem::size_of::<f32>()) as f32 / 1_048_576.0
        );

        // Check if audio is less than 1 second (assuming 16kHz sample rate)
        // Whisper requires at least 1 second of audio
        const MIN_SAMPLES_REQUIRED: usize = 16000; // 1 second at 16kHz

        if audio_data.len() < MIN_SAMPLES_REQUIRED {
            println!(
                "[PERF] Audio too short: {} samples (< 1 second). Returning empty transcription.",
                audio_data.len()
            );
            return Ok(String::new());
        }

        // Pre-transcription: Analyze audio to detect if it's mostly silence
        let silence_check_time = Instant::now();
        let is_silent = Self::is_audio_effectively_silent(&audio_data);
        println!(
            "[PERF] Silence detection took: {:?}",
            silence_check_time.elapsed()
        );

        if is_silent {
            println!("[PERF] Audio detected as effectively silent. Skipping transcription and returning empty result.");
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
        let model_load_duration = model_load_time.elapsed();
        println!("[PERF] Model loading took: {:?}", model_load_duration);

        let state_create_time = Instant::now();
        let mut state = service.get_or_create_state(&ctx, &self.model_id)?;
        let state_create_duration = state_create_time.elapsed();
        println!("[PERF] State creation took: {:?}", state_create_duration);

        println!(
            "[PERF] Using {} audio samples from {}",
            audio_data.len(),
            source_description
        );

        // Use hardcoded optimal values
        let threads = 4;
        let beam_size = 1; // Greedy for fastest performance
        let best_of = 1; // Single candidate for speed
        println!(
            "[PERF] Whisper config: {} threads, beam_size: {}, best_of: {}",
            threads, beam_size, best_of
        );

        let params_setup_time = Instant::now();
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
        params.set_suppress_blank(true);

        // Add dictionary to params
        // Because it wasn't trained with instruction-following techniques, Whisper operates more like a base GPT model. Keep in mind that Whisper only considers the first 224 tokens of the prompt.

        // Default dictionary items that should always be included
        let default_dictionary_items =
            vec!["VoiceGecko", "VoiceGecko", "Hello, welcome to my lecture."];

        // Build the complete dictionary prompt
        let mut complete_prompt = String::new();

        // Always include default dictionary items first
        if !default_dictionary_items.is_empty() {
            complete_prompt.push_str(&default_dictionary_items.join(", "));
        }

        // Append user-provided dictionary items if they exist
        if let Some(ref user_prompt) = self.dictionary_prompt {
            if !user_prompt.is_empty() {
                if !complete_prompt.is_empty() {
                    complete_prompt.push_str(", ");
                }
                complete_prompt.push_str(user_prompt);
            }
        }

        // Set the complete prompt if we have any dictionary items
        if !complete_prompt.is_empty() {
            println!(
                "[PERF] 📖 Setting dictionary prompt (length: {} chars): {}",
                complete_prompt.len(),
                complete_prompt
            );
            params.set_initial_prompt(&complete_prompt);
        }

        println!(
            "[PERF] Parameters setup took: {:?}",
            params_setup_time.elapsed()
        );

        app.emit(
            "transcription-progress",
            TranscriptionEvent::from(TranscriptionProgress::Transcribing),
        )
        .unwrap();

        // The main Whisper inference call - this is typically the slowest part
        let full_transcribe_time = Instant::now();
        state
            .full(params, &audio_data)
            .map_err(|e| TranscriptionError::Transcription(e.to_string()))?;
        let transcription_duration = full_transcribe_time.elapsed();
        println!("[PERF] 🔥 WHISPER INFERENCE took: {:?} | Audio duration: {:.2}s | Real-time factor: {:.2}x", 
            transcription_duration,
            audio_data.len() as f32 / 16000.0,
            (audio_data.len() as f32 / 16000.0) / transcription_duration.as_secs_f32()
        );

        let segment_build_time = Instant::now();
        let num_segments = state.full_n_segments().unwrap();
        let mut result = String::new();
        println!("[PERF] Processing {} segments", num_segments);

        for i in 0..num_segments {
            let segment = state.full_get_segment_text(i).unwrap();
            // Debug: Log segment content to identify newline sources
            if i < 3 {
                // Only log first few segments to avoid spam
                println!(
                    "[DEBUG] Segment {}: '{}'",
                    i,
                    segment.replace('\n', "\\n").replace('\r', "\\r")
                );
            }
            result.push_str(&segment);
        }
        let segment_duration = segment_build_time.elapsed();
        println!("[PERF] Segment building took: {:?}", segment_duration);

        let total_duration = total_time.elapsed();
        println!(
            "[PERF] ================= TOTAL TRANSCRIPTION TIME: {:?} =================",
            total_duration
        );
        println!(
            "[PERF] Breakdown - Model: {:?} | State: {:?} | Inference: {:?} | Segments: {:?}",
            model_load_duration, state_create_duration, transcription_duration, segment_duration
        );

        // Return state to cache for reuse
        service.return_state(&self.model_id, state);

        // Debug: Log raw result before cleaning
        println!(
            "[DEBUG] Raw transcript before cleaning: '{}'",
            result.replace('\n', "\\n").replace('\r', "\\r")
        );

        // Comprehensive text cleaning to remove unwanted whitespace and newlines
        let mut cleaned_result = result
            .trim() // Remove leading/trailing whitespace
            .replace('\n', " ") // Replace newlines with spaces
            .replace('\r', " ") // Replace carriage returns with spaces
            .to_string();

        // Normalize multiple spaces to single spaces
        while cleaned_result.contains("  ") {
            cleaned_result = cleaned_result.replace("  ", " ");
        }

        // Final trim after space normalization
        cleaned_result = cleaned_result.trim().to_string();

        // Remove surrounding quotes if present
        if cleaned_result.len() >= 2
            && cleaned_result.starts_with('"')
            && cleaned_result.ends_with('"')
        {
            cleaned_result = cleaned_result[1..cleaned_result.len() - 1].to_string();
            // Trim again after quote removal
            cleaned_result = cleaned_result.trim().to_string();
        }

        println!("[DEBUG] Final cleaned transcript: '{}'", cleaned_result);
        Ok(cleaned_result)
    }

    /// Analyze audio to determine if it's effectively silent or contains no meaningful speech
    fn is_audio_effectively_silent(audio_data: &[f32]) -> bool {
        if audio_data.is_empty() {
            return true;
        }

        // Calculate RMS energy
        let rms = (audio_data.iter().map(|&x| x * x).sum::<f32>() / audio_data.len() as f32).sqrt();

        // Calculate peak amplitude
        let peak = audio_data
            .iter()
            .map(|&x| x.abs())
            .fold(0.0f32, |a, b| a.max(b));

        // Very low energy threshold - if RMS is below this, it's effectively silent
        const SILENCE_RMS_THRESHOLD: f32 = 0.01;

        // Very low peak threshold - if peak is below this, it's effectively silent
        const SILENCE_PEAK_THRESHOLD: f32 = 0.05;

        // Check if audio is below silence thresholds
        if rms < SILENCE_RMS_THRESHOLD && peak < SILENCE_PEAK_THRESHOLD {
            println!(
                "[Rust] Audio analysis: RMS={:.4}, Peak={:.4} - detected as silent",
                rms, peak
            );
            return true;
        }

        // Additional check: Count what percentage of the audio is near-zero
        let near_zero_threshold = 0.005;
        let near_zero_count = audio_data
            .iter()
            .filter(|&&x| x.abs() < near_zero_threshold)
            .count();
        let near_zero_percentage = near_zero_count as f32 / audio_data.len() as f32;

        // If more than 95% of samples are near zero, consider it silent
        if near_zero_percentage > 0.95 {
            println!(
                "[Rust] Audio analysis: {:.1}% of samples near zero - detected as silent",
                near_zero_percentage * 100.0
            );
            return true;
        }

        // Check for consistent low-level noise (possible empty room tone)
        // If the audio has very consistent low energy (low variance), it might be just noise
        let mean = audio_data.iter().sum::<f32>() / audio_data.len() as f32;
        let variance = audio_data
            .iter()
            .map(|&x| (x - mean) * (x - mean))
            .sum::<f32>()
            / audio_data.len() as f32;
        let std_dev = variance.sqrt();

        // If standard deviation is very low and RMS is low, it's likely just noise
        if std_dev < 0.02 && rms < 0.03 {
            println!(
                "[Rust] Audio analysis: Low variance ({:.4}) and low RMS ({:.4}) - detected as background noise",
                std_dev, rms
            );
            return true;
        }

        println!(
            "[Rust] Audio analysis: RMS={:.4}, Peak={:.4}, StdDev={:.4}, ZeroPercent={:.1}% - proceeding with transcription",
            rms, peak, std_dev, near_zero_percentage * 100.0
        );
        false
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

        // Load the model into cache and pre-create a state for instant access
        match self.get_or_load_model(app, &model_id) {
            Ok(ctx) => {
                println!("[Rust] Successfully preloaded model {}", model_id);

                // Pre-create a state for even faster first transcription
                match ctx.create_state() {
                    Ok(state) => {
                        self.return_state(&model_id, state);
                        println!("[Rust] Pre-created state for model {}", model_id);
                    }
                    Err(e) => {
                        println!("[Rust] Failed to pre-create state for {}: {}", model_id, e);
                        // Still successful if just model loading worked
                    }
                }
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
