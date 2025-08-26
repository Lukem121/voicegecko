use serde::Serialize;
use tauri::{AppHandle, Emitter};
use thiserror::Error;

use super::model_manager;
use crate::modules::audio::AudioData;
use crate::modules::dictation_sidecar::{DictationProvider, SidecarWhisperProvider};

#[derive(Debug, Error, Serialize, Clone)]
pub enum DictationError {
    #[error("Model load failed: {0}")]
    ModelLoad(String),
    #[error("Audio processing failed: {0}")]
    #[allow(dead_code)]
    AudioProcessing(String),
    #[error("Dictation failed: {0}")]
    Dictation(String),
}

impl From<model_manager::ModelManagerError> for DictationError {
    fn from(err: model_manager::ModelManagerError) -> Self {
        DictationError::ModelLoad(err.to_string())
    }
}

#[derive(Clone, Serialize)]
pub enum DictationProgress {
    LoadingModel,
    Transcribing,
    Complete {
        transcript: String,
        duration_seconds: Option<f32>,
        model_used: Option<String>,
        sample_rate: Option<u32>,
    },
    Error(String),
}

#[derive(Clone, Serialize, Debug)]
pub struct DictationEvent {
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration_seconds: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    model_used: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sample_rate: Option<u32>,
}

impl From<DictationProgress> for DictationEvent {
    fn from(progress: DictationProgress) -> Self {
        match progress {
            DictationProgress::LoadingModel => DictationEvent {
                status: "LoadingModel".to_string(),
                data: None,
                duration_seconds: None,
                model_used: None,
                sample_rate: None,
            },
            DictationProgress::Transcribing => DictationEvent {
                status: "Transcribing".to_string(),
                data: None,
                duration_seconds: None,
                model_used: None,
                sample_rate: None,
            },
            DictationProgress::Complete {
                transcript,
                duration_seconds,
                model_used,
                sample_rate,
            } => DictationEvent {
                status: "Complete".to_string(),
                data: Some(transcript),
                duration_seconds,
                model_used,
                sample_rate,
            },
            DictationProgress::Error(error) => DictationEvent {
                status: "Error".to_string(),
                data: Some(error),
                duration_seconds: None,
                model_used: None,
                sample_rate: None,
            },
        }
    }
}

#[tauri::command]
pub async fn transcribe_audio_buffer(
    app: AppHandle,
    audio_data: AudioData,
    dictionary_prompt: Option<String>,
) -> Result<(), String> {
    let model_id = model_manager::get_active_model_id(app.clone()).map_err(|e| e.to_string())?;

    let provider: Box<dyn DictationProvider> = if model_id == "cloud" {
        // Emit event for frontend to handle cloud dictation
        println!(
            "[Rust transcribe_audio_buffer] Cloud model selected, emitting event for frontend"
        );
        app.emit("cloud-dictation-requested", &audio_data)
            .map_err(|e| format!("Failed to emit cloud dictation event: {}", e))?;
        return Ok(());
    } else {
        Box::new(SidecarWhisperProvider::new(
            model_id.clone(),
            dictionary_prompt,
        ))
    };

    // Calculate duration in seconds
    let duration_seconds = if audio_data.sample_rate > 0 {
        Some(audio_data.samples.len() as f32 / audio_data.sample_rate as f32)
    } else {
        None
    };

    let sample_rate = Some(audio_data.sample_rate);

    // Perform dictation in a separate thread
    tauri::async_runtime::spawn(async move {
        println!("[Rust transcribe_audio_buffer] Starting dictation task");

        // Emit dictation start event for performance tracking
        let _ = app.emit("dictation-start", ());

        let result = provider
            .transcribe_buffer(app.clone(), audio_data.samples)
            .await;
        let event_payload = match result {
            Ok(transcript) => {
                println!(
                    "[Rust transcribe_audio_buffer] Dictation successful: {}",
                    transcript
                );
                DictationProgress::Complete {
                    transcript,
                    duration_seconds,
                    model_used: Some(model_id),
                    sample_rate,
                }
            }
            Err(e) => {
                println!("[Rust transcribe_audio_buffer] Dictation error: {}", e);
                DictationProgress::Error(e.to_string())
            }
        };
        let event = DictationEvent::from(event_payload);
        println!(
            "[Rust transcribe_audio_buffer] Emitting event: {:?}",
            serde_json::to_string(&event).unwrap()
        );
        app.emit("dictation-progress", event).unwrap();
        println!("[Rust transcribe_audio_buffer] Event emitted successfully");
    });

    Ok(())
}

/// OPTIMIZATION: Internal dictation that bypasses frontend data transfer
/// This eliminates ~267ms of serialization overhead by keeping audio in Rust
pub async fn start_internal_dictation(
    app: AppHandle,
    audio_data: AudioData,
) -> Result<(), DictationError> {
    println!("[PERF] 🚀 Starting OPTIMIZED internal dictation (no frontend round-trip)");

    // Get active model and dictionary prompt
    let model_id = match crate::modules::model_manager::get_active_model_id(app.clone()) {
        Ok(id) => id,
        Err(e) => {
            println!("[Rust] Failed to get active model ID: {}", e);
            return Err(DictationError::ModelLoad(e.to_string()));
        }
    };

    // Skip cloud dictation for this optimization (would require API call)
    if model_id == "cloud" {
        println!("[PERF] Cloud model detected - falling back to frontend flow for API access");
        // Emit event for frontend to handle cloud dictation
        app.emit("cloud-dictation-requested", &audio_data)
            .map_err(|e| {
                DictationError::ModelLoad(format!("Failed to emit cloud dictation event: {}", e))
            })?;
        return Ok(());
    }

    // Get dictionary prompt from frontend dictionary service (lightweight JSON call)
    // This is much faster than transferring 2MB+ of audio data
    let dictionary_prompt = match app.emit("request-dictionary-prompt", ()) {
        Ok(_) => {
            // For now, use default prompt - could implement IPC response if needed
            Some("VoiceGecko, VoiceGecko, Hello, welcome to my lecture., Kubernetes, Kubernetes, Kubernetes, PostgreSQL, PostgreSQL, PostgreSQL".to_string())
        }
        Err(_) => None,
    };

    let provider = SidecarWhisperProvider::new(model_id.clone(), dictionary_prompt);

    // Calculate duration for metadata
    let duration_seconds = if audio_data.sample_rate > 0 {
        Some(audio_data.samples.len() as f32 / audio_data.sample_rate as f32)
    } else {
        None
    };
    let sample_rate = Some(audio_data.sample_rate);

    // Emit dictation start event
    let _ = app.emit("dictation-start", ());

    // Perform dictation directly
    let result = provider
        .transcribe_buffer(app.clone(), audio_data.samples)
        .await;

    let event_payload = match result {
        Ok(transcript) => {
            println!("[PERF] ✅ Internal dictation successful: {}", transcript);
            DictationProgress::Complete {
                transcript,
                duration_seconds,
                model_used: Some(model_id),
                sample_rate,
            }
        }
        Err(e) => {
            println!("[PERF] ❌ Internal dictation error: {}", e);
            DictationProgress::Error(e.to_string())
        }
    };

    let event = DictationEvent::from(event_payload);
    println!("[PERF] 📡 Emitting internal dictation result");
    app.emit("dictation-progress", event).unwrap();

    Ok(())
}
