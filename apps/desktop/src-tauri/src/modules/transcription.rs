use serde::Serialize;
use tauri::{AppHandle, Emitter};
use thiserror::Error;

use super::model_manager;
use crate::modules::audio::AudioData;
use crate::modules::transcription_service::{LocalWhisperProvider, TranscriptionProvider};

#[derive(Debug, Error, Serialize, Clone)]
pub enum TranscriptionError {
    #[error("Model load failed: {0}")]
    ModelLoad(String),
    #[error("Audio processing failed: {0}")]
    AudioProcessing(String),
    #[error("Transcription failed: {0}")]
    Transcription(String),
}

impl From<model_manager::ModelManagerError> for TranscriptionError {
    fn from(err: model_manager::ModelManagerError) -> Self {
        TranscriptionError::ModelLoad(err.to_string())
    }
}

#[derive(Clone, Serialize)]
pub enum TranscriptionProgress {
    LoadingModel,
    Transcribing,
    Complete(String),
    Error(String),
}

#[derive(Clone, Serialize, Debug)]
pub struct TranscriptionEvent {
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
}

impl From<TranscriptionProgress> for TranscriptionEvent {
    fn from(progress: TranscriptionProgress) -> Self {
        match progress {
            TranscriptionProgress::LoadingModel => TranscriptionEvent {
                status: "LoadingModel".to_string(),
                data: None,
            },
            TranscriptionProgress::Transcribing => TranscriptionEvent {
                status: "Transcribing".to_string(),
                data: None,
            },
            TranscriptionProgress::Complete(transcript) => TranscriptionEvent {
                status: "Complete".to_string(),
                data: Some(transcript),
            },
            TranscriptionProgress::Error(error) => TranscriptionEvent {
                status: "Error".to_string(),
                data: Some(error),
            },
        }
    }
}

#[tauri::command]
pub async fn transcribe_audio_buffer(app: AppHandle, audio_data: AudioData) -> Result<(), String> {
    let model_id = model_manager::get_active_model_id(app.clone()).map_err(|e| e.to_string())?;

    let provider: Box<dyn TranscriptionProvider> = if model_id == "cloud" {
        return Err("Cloud-based transcription is not available at the moment.".to_string());
    } else {
        Box::new(LocalWhisperProvider { model_id })
    };

    // Perform transcription in a separate thread
    tauri::async_runtime::spawn(async move {
        println!("[Rust transcribe_audio_buffer] Starting transcription task");
        let result = provider
            .transcribe_buffer(app.clone(), audio_data.samples)
            .await;
        let event_payload = match result {
            Ok(transcript) => {
                println!(
                    "[Rust transcribe_audio_buffer] Transcription successful: {}",
                    transcript
                );
                TranscriptionProgress::Complete(transcript)
            }
            Err(e) => {
                println!("[Rust transcribe_audio_buffer] Transcription error: {}", e);
                TranscriptionProgress::Error(e.to_string())
            }
        };
        let event = TranscriptionEvent::from(event_payload);
        println!(
            "[Rust transcribe_audio_buffer] Emitting event: {:?}",
            serde_json::to_string(&event).unwrap()
        );
        app.emit("transcription-progress", event).unwrap();
        println!("[Rust transcribe_audio_buffer] Event emitted successfully");
    });

    Ok(())
}
