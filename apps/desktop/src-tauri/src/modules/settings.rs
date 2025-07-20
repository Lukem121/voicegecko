use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const SETTINGS_STORE_PATH: &str = "settings.json";
const GECKO_BAR_CONFIG_KEY: &str = "geckoBarConfig";
const AUTOSTART_CONFIG_KEY: &str = "autostartConfig";

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AutostartConfig {
    pub enabled: bool,
}

impl Default for AutostartConfig {
    fn default() -> Self {
        Self {
            enabled: false, // Default to not enabled
        }
    }
}

#[tauri::command]
pub fn get_cpu_count() -> Result<usize, String> {
    std::thread::available_parallelism()
        .map(|n| n.get())
        .map_err(|e| format!("Failed to get CPU count: {}", e))
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

#[tauri::command]
pub fn get_autostart_config(app: AppHandle) -> Result<AutostartConfig, String> {
    let store = app.store(SETTINGS_STORE_PATH).map_err(|e| e.to_string())?;

    match store.get(AUTOSTART_CONFIG_KEY) {
        Some(value) => serde_json::from_value(value.clone()).map_err(|e| e.to_string()),
        None => Ok(AutostartConfig::default()),
    }
}

#[tauri::command]
pub fn set_autostart_config(app: AppHandle, config: AutostartConfig) -> Result<(), String> {
    let store = app.store(SETTINGS_STORE_PATH).map_err(|e| e.to_string())?;

    // Store the enabled state before moving config
    let enabled = config.enabled;

    store.set(
        AUTOSTART_CONFIG_KEY.to_string(),
        serde_json::to_value(config).map_err(|e| e.to_string())?,
    );

    store.save().map_err(|e| e.to_string())?;

    // Apply the autostart setting immediately
    use tauri_plugin_autostart::ManagerExt;

    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }

    Ok(())
}
