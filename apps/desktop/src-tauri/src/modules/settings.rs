use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const SETTINGS_STORE_PATH: &str = "settings.json";
const TRANSCRIPTION_CONFIG_KEY: &str = "transcriptionConfig";
const GECKO_BAR_CONFIG_KEY: &str = "geckoBarConfig";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TranscriptionConfig {
    pub language: String,
    pub threads: usize,
    pub beam_size: i32,
    pub best_of: i32,
}

impl Default for TranscriptionConfig {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            threads: 4,
            beam_size: 1, // 1 = greedy (fastest), higher = better quality but slower
            best_of: 1,   // Number of candidates to consider (1 = fastest)
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeckoBarConfig {
    pub enabled: bool,
    #[serde(default = "default_hide_on_fullscreen")]
    pub hide_on_fullscreen: bool,
}

fn default_hide_on_fullscreen() -> bool {
    true // Default to hiding on fullscreen
}

impl Default for GeckoBarConfig {
    fn default() -> Self {
        Self {
            enabled: true, // Enabled by default
            hide_on_fullscreen: default_hide_on_fullscreen(),
        }
    }
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

#[tauri::command]
pub fn get_gecko_bar_config(app: AppHandle) -> Result<GeckoBarConfig, String> {
    let store = app.store(SETTINGS_STORE_PATH).map_err(|e| e.to_string())?;

    match store.get(GECKO_BAR_CONFIG_KEY) {
        Some(value) => serde_json::from_value(value.clone()).map_err(|e| e.to_string()),
        None => Ok(GeckoBarConfig::default()),
    }
}

#[tauri::command]
pub fn set_gecko_bar_config(app: AppHandle, config: GeckoBarConfig) -> Result<(), String> {
    let store = app.store(SETTINGS_STORE_PATH).map_err(|e| e.to_string())?;

    store.set(
        GECKO_BAR_CONFIG_KEY.to_string(),
        serde_json::to_value(config).map_err(|e| e.to_string())?,
    );

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}
