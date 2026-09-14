use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};
use tracing::info;

use crate::audio::capture::{CaptureHandle, MonitorHandle};
use crate::audio::devices;
use crate::audio::pipeline::{debug_saves_enabled, process, save_debug_wav, AudioPipelineConfig};
use crate::audio::playback;
use crate::audio::state::AudioState;
use crate::audio::types::{AudioDevice, AudioStopMetadata, PcmBuffer, SoundVariant, TARGET_SAMPLE_RATE};
use crate::dictation::orchestrator::DictationOrchestrator;

#[tauri::command]
pub fn set_audio_pipeline_config(
    state: tauri::State<AudioState>,
    config: AudioPipelineConfig,
) -> Result<(), String> {
    state.set_pipeline_config(config);
    Ok(())
}

#[tauri::command]
pub fn get_audio_pipeline_config(
    state: tauri::State<AudioState>,
) -> Result<AudioPipelineConfig, String> {
    Ok(state.pipeline_config())
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    devices::list_devices()
}

#[tauri::command]
pub fn start_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
    device: Option<String>,
) -> Result<(), String> {
    let hub = state.streaming_hub.clone();
    let handle = CaptureHandle::start(app.clone(), device, Some(hub))?;
    state.start_capture(handle)?;

    app.emit("recording-state-changed", "recording".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_recording(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
) -> Result<AudioStopMetadata, String> {
    let raw_samples = state.stop_capture()?;

    if raw_samples.is_empty() {
        return Err("No audio data recorded".to_string());
    }

    let metadata = serde_json::json!({
        "samplesLength": raw_samples.len(),
        "durationSeconds": raw_samples.len() as f32 / TARGET_SAMPLE_RATE as f32,
        "sampleRate": TARGET_SAMPLE_RATE
    });
    let _ = app.emit("end-to-end-performance-start", metadata);

    let pipeline_config = state.pipeline_config();
    let debug_ts = debug_saves_enabled().then(|| {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    });

    if let Some(ts) = debug_ts {
        if let Ok(dir) = app.path().app_data_dir() {
            let debug_dir = dir.join("audio_debug");
            let _ = std::fs::create_dir_all(&debug_dir);
            let path = debug_dir.join(format!("raw_audio_{ts}.wav"));
            if let Err(e) = save_debug_wav(&raw_samples, &path) {
                tracing::warn!(error = %e, "failed to save raw debug wav");
            }
        }
    }

    let processed = process(raw_samples, &pipeline_config);

    if let Some(ts) = debug_ts {
        if let Ok(dir) = app.path().app_data_dir() {
            let debug_dir = dir.join("audio_debug");
            let path = debug_dir.join(format!("processed_audio_{ts}.wav"));
            if let Err(e) = save_debug_wav(&processed, &path) {
                tracing::warn!(error = %e, "failed to save processed debug wav");
            }
        }
    }

    let pcm = PcmBuffer::mono_16k(processed);
    let stop_meta = AudioStopMetadata {
        duration_secs: pcm.duration_secs(),
        sample_rate: pcm.sample_rate,
        sample_count: pcm.samples.len(),
    };

    state.store_pcm(pcm.clone());

    let _ = app.emit("audio-processing-complete", ());

    info!(
        duration_secs = stop_meta.duration_secs,
        sample_count = stop_meta.sample_count,
        "capture stopped"
    );

    DictationOrchestrator::finish_capture(app, pcm);

    Ok(stop_meta)
}

#[tauri::command]
pub fn cancel_recording(state: tauri::State<AudioState>, app: tauri::AppHandle) -> Result<(), String> {
    state.cancel_capture();

    app.emit("recording-state-changed", "idle".to_string())
        .map_err(|e| e.to_string())?;

    DictationOrchestrator::cancel(&app);
    Ok(())
}

#[tauri::command]
pub fn start_microphone_test(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
    device: Option<String>,
) -> Result<(), String> {
    devices::validate_device(device.as_deref())?;

    let handle = MonitorHandle::start(app.clone(), device)?;
    state.start_monitor(handle)?;

    app.emit("microphone-test-started", ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stop_microphone_test(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    state.stop_monitor()?;
    app.emit("microphone-test-stopped", ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn play_notification_sound(
    state: tauri::State<AudioState>,
    app: tauri::AppHandle,
    sound_name: String,
    variant: SoundVariant,
) -> Result<(), String> {
    playback::play(&state.sink, &app, sound_name, variant)
}

#[tauri::command]
pub fn set_volume(state: tauri::State<AudioState>, volume: f32) -> Result<(), String> {
    playback::set_volume(&state.sink, volume)
}

#[tauri::command]
pub fn mute_system_audio() -> Result<(), String> {
    crate::audio::system::mute::set_system_audio_mute(true)
}

#[tauri::command]
pub fn unmute_system_audio() -> Result<(), String> {
    crate::audio::system::mute::set_system_audio_mute(false)
}
