use hound::WavReader;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use thiserror::Error;
use whisper_rs::{FullParams, SamplingStrategy};

use super::model_manager;
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

#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    model_manager_state: State<'_, model_manager::ModelManagerState>,
    audio_path: String,
) -> Result<String, TranscriptionError> {
    let model_id = model_manager::get_active_model_id(app.clone(), model_manager_state)?;

    let provider: Box<dyn TranscriptionProvider> = if model_id == "cloud" {
        return Err(TranscriptionError::Transcription(
            "Cloud-based transcription is not available at the moment.".to_string(),
        ));
    } else {
        Box::new(LocalWhisperProvider { model_id })
    };

    provider.transcribe(app, audio_path).await
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
