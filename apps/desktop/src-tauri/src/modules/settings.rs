use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_store::StoreExt;

use super::transcription_service::TranscriptionService;

const SETTINGS_STORE_PATH: &str = "settings.json";
const TRANSCRIPTION_CONFIG_KEY: &str = "transcriptionConfig";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TranscriptionConfig {
    pub language: String,
    pub threads: usize,
}

impl Default for TranscriptionConfig {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            threads: 4,
        }
    }
}

#[tauri::command]
pub fn get_model_cache_enabled(
    transcription_service: State<TranscriptionService>,
) -> Result<bool, String> {
    Ok(transcription_service.get_cache_enabled())
}

#[tauri::command]
pub fn set_model_cache_enabled(
    transcription_service: State<TranscriptionService>,
    enabled: bool,
) -> Result<(), String> {
    transcription_service.set_cache_enabled(enabled);
    Ok(())
}

#[tauri::command]
pub fn get_transcription_config(app: AppHandle) -> Result<TranscriptionConfig, String> {
    let store = app.store(SETTINGS_STORE_PATH).map_err(|e| e.to_string())?;

    match store.get(TRANSCRIPTION_CONFIG_KEY) {
        Some(value) => serde_json::from_value(value.clone()).map_err(|e| e.to_string()),
        None => Ok(TranscriptionConfig::default()),
    }
}

#[tauri::command]
pub fn set_transcription_config(app: AppHandle, config: TranscriptionConfig) -> Result<(), String> {
    let store = app.store(SETTINGS_STORE_PATH).map_err(|e| e.to_string())?;

    store.set(
        TRANSCRIPTION_CONFIG_KEY.to_string(),
        serde_json::to_value(config).map_err(|e| e.to_string())?,
    );

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}
