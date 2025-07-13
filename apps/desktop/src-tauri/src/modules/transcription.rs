use hound::WavReader;
use serde::Serialize;
use tauri::{AppHandle, Manager};
use thiserror::Error;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[derive(Debug, Error, Serialize)]
pub enum TranscriptionError {
    #[error("Model load failed: {0}")]
    ModelLoad(String),
    #[error("Audio processing failed: {0}")]
    AudioProcessing(String),
    #[error("Transcription failed: {0}")]
    Transcription(String),
}

#[tauri::command]
pub async fn transcribe(
    app: AppHandle,
    model_id: String,
    audio_path: String,
) -> Result<String, TranscriptionError> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let model_path = app_data_dir.join(format!("models/ggml-{}.bin", model_id));

    if !model_path.exists() {
        return Err(TranscriptionError::ModelLoad(
            "Model file not found.".to_string(),
        ));
    }

    let ctx: WhisperContext = WhisperContext::new_with_params(
        &model_path.to_string_lossy(),
        WhisperContextParameters::default(),
    )
    .map_err(|e| TranscriptionError::ModelLoad(e.to_string()))?;
    let mut state = ctx.create_state().unwrap();

    let audio_data = read_wav_to_f32(audio_path)?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_n_threads(1); // TODO: Make this configurable
    params.set_translate(false);
    params.set_language(Some("en")); // TODO: Make this configurable
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    state
        .full(params, &audio_data)
        .map_err(|e| TranscriptionError::Transcription(e.to_string()))?;

    let num_segments = state.full_n_segments().unwrap();
    let mut result = String::new();
    for i in 0..num_segments {
        let segment = state.full_get_segment_text(i).unwrap();
        result.push_str(&segment);
    }

    Ok(result)
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
