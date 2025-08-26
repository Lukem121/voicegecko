use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;

use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, Wry};
use tauri_plugin_store::{Store, StoreExt};
use thiserror::Error;

use crate::modules::hardware_info::ModelTier;

#[derive(Debug, Error, Serialize)]
pub enum ModelManagerError {
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    #[error("Download failed: {0}")]
    #[allow(dead_code)]
    DownloadFailed(String),
    #[error("Filesystem error: {0}")]
    FileSystemError(String),
    #[error("Verification failed: {0}")]
    #[allow(dead_code)]
    VerificationFailed(String),
    #[error("Store error: {0}")]
    StoreError(String),
    #[error("Path error: {0}")]
    PathError(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("Tauri error: {0}")]
    TauriError(String),
    #[error("Download error: {0}")]
    DownloadError(String),
}

const STORE_PATH: &str = "models.json";
const SELECTED_TIER_KEY: &str = "selected_tier";
const MODEL_STATUSES_KEY: &str = "model_statuses";
const SELECTED_MODEL_KEY: &str = "selected_model_override";

impl From<std::io::Error> for ModelManagerError {
    fn from(err: std::io::Error) -> Self {
        ModelManagerError::FileSystemError(err.to_string())
    }
}

impl From<tauri_plugin_store::Error> for ModelManagerError {
    fn from(err: tauri_plugin_store::Error) -> Self {
        ModelManagerError::StoreError(err.to_string())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum ModelStatus {
    NotDownloaded,
    Downloading(u8), // Progress percentage
    Downloaded,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Model {
    pub name: String,
    pub description: String,
    pub size: String,
    pub ram: String,
    pub status: ModelStatus,
    pub sha: String,
    pub url: String,
    pub recommended: bool,
    pub tier: ModelTier,
}

fn get_model_statuses(
    store: &Store<Wry>,
) -> Result<HashMap<String, ModelStatus>, ModelManagerError> {
    match store.get(MODEL_STATUSES_KEY) {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| ModelManagerError::StoreError(e.to_string())),
        None => Ok(HashMap::new()),
    }
}

fn set_model_status(
    app: &AppHandle,
    model_id: &str,
    status: ModelStatus,
) -> Result<(), ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    let mut statuses = get_model_statuses(&store)?;
    statuses.insert(model_id.to_string(), status);
    store.set(MODEL_STATUSES_KEY, json!(statuses));
    store.save()?;
    Ok(())
}

/// Compute the SHA1 checksum of a file at the given path as a lowercase hex string
fn compute_file_sha1(path: &std::path::Path) -> Result<String, ModelManagerError> {
    use std::io::Read;
    let mut file = std::fs::File::open(path)
        .map_err(|e| ModelManagerError::IoError(format!("Failed to open file for SHA1: {}", e)))?;
    let mut hasher = Sha1::new();
    let mut buffer = vec![0u8; 8 * 1024 * 1024]; // 8 MiB chunks
    loop {
        let read = file.read(&mut buffer).map_err(|e| {
            ModelManagerError::IoError(format!("Failed to read file for SHA1: {}", e))
        })?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    let digest = hasher.finalize();
    Ok(format!("{:x}", digest))
}

/// Verify that the on-disk model file for the given model_id matches the expected SHA1.
/// If it does not match, the file is removed and the model status is set to NotDownloaded.
pub fn verify_model_checksum(app: AppHandle, model_id: String) -> Result<(), ModelManagerError> {
    // Look up model metadata (including expected SHA)
    let models = list_models(app.clone())?;
    let model = models
        .get(&model_id)
        .ok_or_else(|| ModelManagerError::ModelNotFound(model_id.clone()))?;

    // Resolve file path
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
    let file_path = app_data_dir.join(format!("models/ggml-{}.bin", model_id));
    if !file_path.exists() {
        return Err(ModelManagerError::FileSystemError(format!(
            "Model file not found: {}",
            file_path.display()
        )));
    }

    // Compute actual SHA1
    let actual = compute_file_sha1(&file_path)?;
    let expected = model.sha.to_lowercase();
    let actual_lower = actual.to_lowercase();

    if actual_lower != expected {
        // Remove bad file and mark as not downloaded
        let _ = std::fs::remove_file(&file_path);
        let _ = set_model_status(&app, &model_id, ModelStatus::NotDownloaded);

        // Notify UI
        let _ = app.emit(
            "model-verification-failed",
            (model_id.clone(), expected.clone(), actual_lower.clone()),
        );

        return Err(ModelManagerError::VerificationFailed(format!(
            "Checksum mismatch for '{}': expected {}, got {}",
            model_id, expected, actual_lower
        )));
    }

    Ok(())
}

#[tauri::command]
pub fn synchronize_models(app: AppHandle) -> Result<(), ModelManagerError> {
    println!("[Sync] Starting model synchronization...");

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
    let models_dir = app_data_dir.join("models");

    // Ensure models directory exists
    std::fs::create_dir_all(&models_dir).map_err(|e| ModelManagerError::IoError(e.to_string()))?;

    // Check for bundled model and copy it if needed
    let bundled_model_name = "ggml-base.en.bin";
    let bundled_model_id = "base.en";
    let target_path = models_dir.join("ggml-base.en.bin");

    println!(
        "[Sync] Target path for bundled model: {}",
        target_path.display()
    );

    // Try to find the bundled model in resources (packaged under the `resources/` dir)
    if let Ok(bundled_path) = app.path().resolve(
        format!("resources/{}", bundled_model_name),
        tauri::path::BaseDirectory::Resource,
    ) {
        println!(
            "[Sync] Looking for installer-bundled model at: {}",
            bundled_path.display()
        );

        if bundled_path.exists() {
            if !target_path.exists() {
                println!("[Sync] Copying bundled model to models directory...");
                std::fs::copy(&bundled_path, &target_path)
                    .map_err(|e| ModelManagerError::IoError(e.to_string()))?;
                set_model_status(&app, bundled_model_id, ModelStatus::Downloaded)
                    .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;
                println!("[Sync] Successfully copied bundled model");
            } else {
                println!("[Sync] Bundled model already exists at target location");
                // Make sure status is set correctly
                set_model_status(&app, bundled_model_id, ModelStatus::Downloaded)
                    .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;
            }
        } else {
            println!(
                "[Sync] Bundled model not found at: {}",
                bundled_path.display()
            );

            // Try development path as fallback - look in the actual src-tauri/resources directory
            let current_dir =
                std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            println!("[Sync] Current directory: {}", current_dir.display());

            let dev_paths = vec![
                current_dir
                    .join("src-tauri")
                    .join("resources")
                    .join(bundled_model_name),
                current_dir
                    .join("apps")
                    .join("desktop")
                    .join("src-tauri")
                    .join("resources")
                    .join(bundled_model_name),
                std::path::PathBuf::from("apps/desktop/src-tauri/resources")
                    .join(bundled_model_name),
                // Add the actual absolute path as a last resort
                std::path::PathBuf::from("D:/Projects/voicegecko/apps/desktop/src-tauri/resources")
                    .join(bundled_model_name),
            ];

            let mut found_dev_path = None;
            for dev_path in &dev_paths {
                println!("[Sync] Checking dev path: {}", dev_path.display());
                if dev_path.exists() {
                    println!("[Sync] Found bundled model at: {}", dev_path.display());
                    found_dev_path = Some(dev_path.clone());
                    break;
                }
            }

            if let Some(dev_path) = found_dev_path {
                if !target_path.exists() {
                    println!("[Sync] Copying from dev path to target...");
                    std::fs::copy(&dev_path, &target_path)
                        .map_err(|e| ModelManagerError::IoError(e.to_string()))?;
                    set_model_status(&app, bundled_model_id, ModelStatus::Downloaded)
                        .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;
                    println!("[Sync] Successfully copied bundled model from dev path");
                } else {
                    println!("[Sync] Target already exists, updating status only");
                    set_model_status(&app, bundled_model_id, ModelStatus::Downloaded)
                        .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;
                }
            } else {
                println!("[Sync] Bundled model not found in any development paths");
                // List the resources directory to help debug
                if let Ok(entries) = std::fs::read_dir("apps/desktop/src-tauri/resources") {
                    println!("[Sync] Contents of resources directory:");
                    for entry in entries {
                        if let Ok(entry) = entry {
                            println!("[Sync]   - {}", entry.file_name().to_string_lossy());
                        }
                    }
                }
            }
        }
    } else {
        println!("[Sync] Could not resolve bundled resource path");
    }

    // Schedule background verification to avoid blocking startup
    schedule_background_verification(app.clone());

    println!("[Sync] Model synchronization scheduled in background");

    // Ensure a default tier is selected if none is set
    if get_selected_tier(app.clone())?.is_none() {
        println!("[Sync] No tier selected, setting default to 'minimal'");
        set_selected_tier(app.clone(), "minimal".to_string())?;
    }

    Ok(())
}

// Global guard to prevent duplicate concurrent verifications (e.g., due to Strict Mode double-call)
static VERIFY_RUNNING: AtomicBool = AtomicBool::new(false);

fn schedule_background_verification(app: AppHandle) {
    if VERIFY_RUNNING.swap(true, Ordering::SeqCst) {
        // Already running; skip
        return;
    }

    // Spawn in a blocking task since we will do heavy IO/CPU (SHA1 on large files)
    tauri::async_runtime::spawn(async move {
        println!("[Sync] (bg) Verifying all known models against filesystem...");
        let result: Result<(), ModelManagerError> = (|| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
            let models_dir = app_data_dir.join("models");

            let all_models = get_initial_models();
            let store = app.store(STORE_PATH)?;
            let mut model_statuses = get_model_statuses(&store)?;

            for (model_id, _) in &all_models {
                let expected_file = models_dir.join(format!("ggml-{}.bin", model_id));
                if expected_file.exists() {
                    if let Ok(metadata) = std::fs::metadata(&expected_file) {
                        if metadata.len() > 1_000_000 {
                            // Checksum validation (may delete invalid files and update status)
                            if let Err(e) = verify_model_checksum(app.clone(), model_id.clone()) {
                                println!("[Sync] (bg) Checksum failed for {}: {}", model_id, e);
                                model_statuses.insert(model_id.clone(), ModelStatus::NotDownloaded);
                            } else {
                                if model_statuses.get(model_id) != Some(&ModelStatus::Downloaded) {
                                    println!(
                                        "[Sync] (bg) Found model file, checksum OK: {}",
                                        model_id
                                    );
                                    model_statuses
                                        .insert(model_id.clone(), ModelStatus::Downloaded);
                                }
                            }
                        } else {
                            println!(
                                "[Sync] (bg) Model file too small ({}), marking as not downloaded: {}",
                                metadata.len(),
                                model_id
                            );
                            model_statuses.insert(model_id.clone(), ModelStatus::NotDownloaded);
                        }
                    }
                } else {
                    if model_statuses.get(model_id) == Some(&ModelStatus::Downloaded) {
                        println!(
                            "[Sync] (bg) Model file missing, updating status: {}",
                            model_id
                        );
                        model_statuses.insert(model_id.clone(), ModelStatus::NotDownloaded);
                    }
                }
            }

            // Save updates
            store.set(MODEL_STATUSES_KEY, json!(model_statuses));
            store.save()?;

            // Optional: scan directory for info logs
            if models_dir.exists() {
                match std::fs::read_dir(&models_dir) {
                    Ok(entries) => {
                        let file_count = entries.filter_map(|e| e.ok()).count();
                        println!("[Sync] (bg) Found {} files in models directory", file_count);
                    }
                    Err(e) => println!("[Sync] (bg) Error reading models directory: {}", e),
                }
            }

            Ok(())
        })();

        if let Err(e) = result {
            println!("[Sync] (bg) Verification failed: {}", e);
        } else {
            println!("[Sync] (bg) Verification completed");
        }

        VERIFY_RUNNING.store(false, Ordering::SeqCst);
    });
}

#[tauri::command]
pub fn get_active_model_id(app: AppHandle) -> Result<String, ModelManagerError> {
    // First check if there's a specific model override (admin mode)
    if let Some(model_override) = get_selected_model_override(app.clone())? {
        return Ok(model_override);
    }

    // Get the selected tier
    if let Some(selected_tier) = get_selected_tier(app.clone())? {
        if selected_tier == "cloud" {
            return Ok("cloud".to_string());
        }

        // Get the best available model for the selected tier
        if let Some(tier) = ModelTier::from_string(&selected_tier) {
            if let Ok(model_id) = get_best_model_for_tier(app, tier) {
                return Ok(model_id);
            }
        }
    }

    // Default to cloud if no tier is selected
    Ok("cloud".to_string())
}

#[tauri::command]
pub async fn auto_download_recommended_model(app: AppHandle) -> Result<(), ModelManagerError> {
    // Get hardware info to determine recommended tier
    let hardware_info = crate::modules::hardware_info::detect_hardware();
    let recommended_tier = hardware_info.recommended_tier;

    // Check if any model for the recommended tier is actually downloaded AND exists on disk
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
    let models_dir = app_data_dir.join("models");

    let downloaded_models =
        get_downloaded_models_for_tier(app.clone(), recommended_tier.to_string().to_string())?;

    // Verify that downloaded models actually exist on disk
    let mut verified_models = Vec::new();
    for model_id in &downloaded_models {
        let file_path = models_dir.join(format!("ggml-{}.bin", model_id));
        if file_path.exists() {
            if let Ok(metadata) = std::fs::metadata(&file_path) {
                if metadata.len() > 1_000_000 {
                    // File must be > 1MB
                    verified_models.push(model_id.clone());
                } else {
                    // Update store to reflect reality
                    let _ = set_model_status(&app, model_id, ModelStatus::NotDownloaded);
                }
            }
        } else {
            // Update store to reflect reality
            let _ = set_model_status(&app, model_id, ModelStatus::NotDownloaded);
        }
    }

    let recommended_models_downloaded = !verified_models.is_empty();

    // If no model for recommended tier is downloaded and it's not cloud, start download
    if !recommended_models_downloaded
        && recommended_tier != crate::modules::hardware_info::ModelTier::Cloud
    {
        // Get the primary model for the recommended tier
        let model_ids = recommended_tier.get_model_ids();

        if let Some(model_id) = model_ids.first() {
            // Download the model
            let result = download_model(app.clone(), model_id.to_string()).await;

            match result {
                Ok(_) => {
                    // Verify the file actually exists after download
                    let file_path = models_dir.join(format!("ggml-{}.bin", model_id));
                    if file_path.exists() {
                        // Automatically select the recommended tier after successful download
                        let tier_string = match recommended_tier {
                            crate::modules::hardware_info::ModelTier::Cloud => "cloud",
                            crate::modules::hardware_info::ModelTier::Minimal => "minimal",
                            crate::modules::hardware_info::ModelTier::Balanced => "balanced",
                            crate::modules::hardware_info::ModelTier::Quality => "quality",
                            crate::modules::hardware_info::ModelTier::Maximum => "maximum",
                        };

                        if let Err(e) = set_selected_tier(app.clone(), tier_string.to_string()) {
                            println!(
                                "[Auto Download] Warning: Failed to auto-select tier {}: {}",
                                tier_string, e
                            );
                        } else {
                            // Emit event to update UI
                            let _ = app.emit("tier-auto-selected", tier_string);
                        }
                    }
                }
                Err(e) => {
                    // Don't print error if it's because the file already exists
                    let error_msg = e.to_string();
                    if !error_msg.contains("already downloaded") {
                        println!(
                            "[Auto Download] Model download failed: {} - {}",
                            model_id, e
                        );
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_selected_tier(app: AppHandle) -> Result<Option<String>, ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    let selected_tier = store
        .get(SELECTED_TIER_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    Ok(selected_tier)
}

#[tauri::command]
pub fn set_selected_tier(app: AppHandle, tier: String) -> Result<(), ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    store.set(SELECTED_TIER_KEY, json!(tier));
    store.save()?;

    // When a tier is selected, clear any model override to use tier-based selection
    clear_selected_model_override(app.clone())?;

    Ok(())
}

#[tauri::command]
pub fn get_selected_model_override(app: AppHandle) -> Result<Option<String>, ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    let selected_model = store
        .get(SELECTED_MODEL_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    Ok(selected_model)
}

#[tauri::command]
pub fn set_selected_model_override(
    app: AppHandle,
    model_id: String,
) -> Result<(), ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    store.set(SELECTED_MODEL_KEY, json!(model_id));
    store.save()?;
    Ok(())
}

#[tauri::command]
pub fn clear_selected_model_override(app: AppHandle) -> Result<(), ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    store.delete(SELECTED_MODEL_KEY);
    store.save()?;
    Ok(())
}

#[tauri::command]
pub fn get_best_model_for_tier(
    app: AppHandle,
    tier: ModelTier,
) -> Result<String, ModelManagerError> {
    let models = list_models(app.clone())?;
    let model_ids = tier.get_model_ids();

    // Get the models directory path
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
    let models_dir = app_data_dir.join("models");

    // Find the first available (downloaded AND file exists) model for this tier
    for model_id in model_ids {
        if let Some(model) = models.get(model_id) {
            if model.status == ModelStatus::Downloaded {
                // Double-check the file actually exists
                let file_path = models_dir.join(format!("ggml-{}.bin", model_id));
                if file_path.exists() {
                    if let Ok(metadata) = std::fs::metadata(&file_path) {
                        if metadata.len() > 1_000_000 {
                            return Ok(model_id.to_string());
                        }
                    }
                }
            }
        }
    }

    // If no model is downloaded for this tier, return the primary model ID
    // (which will trigger a download if the user tries to use it)
    Ok(tier.get_primary_model_id().to_string())
}

#[tauri::command]
pub fn get_downloaded_models_for_tier(
    app: AppHandle,
    tier: String,
) -> Result<Vec<String>, ModelManagerError> {
    let models = list_models(app)?;

    if let Some(model_tier) = ModelTier::from_string(&tier) {
        let model_ids = model_tier.get_model_ids();
        let downloaded: Vec<String> = model_ids
            .into_iter()
            .filter(|id| {
                models
                    .get(*id)
                    .map(|m| m.status == ModelStatus::Downloaded)
                    .unwrap_or(false)
            })
            .map(|s| s.to_string())
            .collect();
        Ok(downloaded)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn check_and_fix_partial_downloads(
    app: AppHandle,
) -> Result<Vec<String>, ModelManagerError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
    let models_dir = app_data_dir.join("models");

    let mut partial_files = Vec::new();

    if models_dir.exists() {
        let entries = std::fs::read_dir(&models_dir)
            .map_err(|e| ModelManagerError::IoError(e.to_string()))?;

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                    // Check for .partial files (incomplete downloads)
                    if file_name.ends_with(".partial") {
                        let model_name = file_name
                            .trim_end_matches(".partial")
                            .trim_end_matches(".bin")
                            .trim_start_matches("ggml-");
                        partial_files.push(model_name.to_string());

                        // Remove the partial file to allow fresh download
                        let _ = std::fs::remove_file(&path);
                    }
                    // Check for files that exist but are much smaller than expected
                    else if file_name.ends_with(".bin") && file_name.starts_with("ggml-") {
                        if let Ok(metadata) = std::fs::metadata(&path) {
                            let file_size = metadata.len();
                            // If file is smaller than 10MB, it's likely corrupted/incomplete
                            if file_size < 10_000_000 {
                                let model_name = file_name
                                    .trim_end_matches(".bin")
                                    .trim_start_matches("ggml-");
                                partial_files.push(model_name.to_string());

                                // Remove the corrupted file
                                let _ = std::fs::remove_file(&path);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(partial_files)
}

#[tauri::command]
pub fn list_models(app: AppHandle) -> Result<HashMap<String, Model>, ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    let mut models = get_initial_models();
    let statuses = get_model_statuses(&store)?;

    for (id, model) in models.iter_mut() {
        if let Some(status) = statuses.get(id) {
            model.status = status.clone();
        }
    }

    Ok(models)
}

#[tauri::command]
pub fn force_sync_models(app: AppHandle) -> Result<(), ModelManagerError> {
    println!("[Force Sync] Manually triggered model synchronization");
    synchronize_models(app)
}

#[tauri::command]
pub async fn download_model(app: AppHandle, model_id: String) -> Result<(), ModelManagerError> {
    let download_id = format!(
        "{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );

    // Check current status to prevent double downloads
    let current_models = list_models(app.clone())?;
    if let Some(model) = current_models.get(&model_id) {
        if let ModelStatus::Downloading(_) = model.status {
            return Ok(()); // Already downloading, don't start again
        }
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| ModelManagerError::PathError(e.to_string()))?;
    let models_dir = app_data_dir.join("models");

    // Ensure models directory exists
    std::fs::create_dir_all(&models_dir).map_err(|e| ModelManagerError::IoError(e.to_string()))?;

    let file_path = models_dir.join(format!("ggml-{}.bin", model_id));
    let temp_file_path = models_dir.join(format!("ggml-{}.bin.partial", model_id));

    // Check if final file already exists and is valid
    if file_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&file_path) {
            if metadata.len() > 1_000_000 {
                // File is > 1MB, likely valid
                // Update status and emit completion
                set_model_status(&app, &model_id, ModelStatus::Downloaded).map_err(|e| {
                    ModelManagerError::StoreError(format!("Failed to set model status: {}", e))
                })?;

                app.emit("model-download-progress", (model_id.clone(), 100))
                    .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

                app.emit("model-download-complete", model_id.clone())
                    .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

                return Ok(());
            } else {
                std::fs::remove_file(&file_path)
                    .map_err(|e| ModelManagerError::IoError(e.to_string()))?;
            }
        }
    }

    // Emit initial progress
    app.emit("model-download-progress", (model_id.clone(), 0))
        .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

    let models = list_models(app.clone())?;
    let model = models
        .get(&model_id)
        .ok_or_else(|| ModelManagerError::ModelNotFound(model_id.clone()))?;

    // Create HTTP client with resume support
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300)) // 5 minute timeout
        .build()
        .map_err(|e| ModelManagerError::DownloadError(e.to_string()))?;

    let mut request_builder = client.get(&model.url);

    // Add range header for resume
    let mut start_byte = 0u64;
    if temp_file_path.exists() {
        if let Ok(metadata) = std::fs::metadata(&temp_file_path) {
            start_byte = metadata.len();
            println!(
                "[Download {}] Resuming download from byte: {}",
                download_id, start_byte
            );
            request_builder = request_builder.header("Range", format!("bytes={}-", start_byte));
        }
    }

    let response = request_builder.send().await.map_err(|e| {
        let error_msg = format!("Failed to start download: {}", e);
        // Emit error event
        let _ = app.emit(
            "model-download-error",
            (model_id.clone(), error_msg.clone()),
        );
        ModelManagerError::DownloadError(error_msg)
    })?;

    // Check if server supports range requests for resume
    let supports_resume =
        start_byte > 0 && response.status() == reqwest::StatusCode::PARTIAL_CONTENT;
    let expected_status = if start_byte > 0 {
        reqwest::StatusCode::PARTIAL_CONTENT
    } else {
        reqwest::StatusCode::OK
    };

    if response.status() != expected_status && response.status() != reqwest::StatusCode::OK {
        // If resume failed, start over
        if start_byte > 0 {
            start_byte = 0;
            if temp_file_path.exists() {
                std::fs::remove_file(&temp_file_path)
                    .map_err(|e| ModelManagerError::IoError(e.to_string()))?;
            }

            // Retry with fresh request
            let response = client
                .get(&model.url)
                .send()
                .await
                .map_err(|e| ModelManagerError::DownloadError(e.to_string()))?;

            if !response.status().is_success() {
                return Err(ModelManagerError::DownloadError(format!(
                    "Failed to download model: {}",
                    response.status()
                )));
            }
        } else {
            return Err(ModelManagerError::DownloadError(format!(
                "Failed to download model: {}",
                response.status()
            )));
        }
    }

    let total_size = if supports_resume {
        // For resumed downloads, get total size from Content-Range header
        response
            .headers()
            .get("content-range")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.split('/').nth(1))
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or_else(|| response.content_length().unwrap_or(0) + start_byte)
    } else {
        response.content_length().unwrap_or(0)
    };

    // Open file for writing (append if resuming)
    let mut file = if start_byte > 0 && temp_file_path.exists() {
        std::fs::OpenOptions::new()
            .append(true)
            .open(&temp_file_path)
            .map_err(|e| ModelManagerError::IoError(e.to_string()))?
    } else {
        std::fs::File::create(&temp_file_path)
            .map_err(|e| ModelManagerError::IoError(e.to_string()))?
    };

    let mut downloaded = start_byte;
    let mut stream = response.bytes_stream();
    let mut last_emitted_progress = 0u8;
    let mut last_emitted_bytes = 0u64;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| ModelManagerError::DownloadError(e.to_string()))?;

        use std::io::Write;
        file.write_all(&chunk)
            .map_err(|e| ModelManagerError::IoError(e.to_string()))?;

        downloaded += chunk.len() as u64;

        // Calculate progress
        let progress = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 100.0) as u8
        } else {
            0
        };

        // Only emit progress if it changed by at least 5% OR every 5MB
        let progress_changed = progress > last_emitted_progress + 4; // At least 5% change
        let bytes_changed = downloaded > last_emitted_bytes + 5_000_000; // At least 5MB change
        let should_emit = progress_changed || bytes_changed || progress == 0 || progress == 100;

        if should_emit {
            // Ensure progress never goes backwards
            let final_progress = std::cmp::max(progress, last_emitted_progress);
            app.emit(
                "model-download-progress",
                (model_id.clone(), final_progress),
            )
            .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;
            last_emitted_progress = final_progress;
            last_emitted_bytes = downloaded;
        }
    }

    // Ensure file is flushed and closed
    file.flush()
        .map_err(|e| ModelManagerError::IoError(e.to_string()))?;
    drop(file); // Explicitly close the file

    // Small delay to ensure file handle is released (Windows issue)
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    // Verify temp file exists before renaming
    if !temp_file_path.exists() {
        // Check if the final file already exists (maybe from a previous successful download)
        if file_path.exists() {
            if let Ok(metadata) = std::fs::metadata(&file_path) {
                if metadata.len() > 1_000_000 {
                    // File is > 1MB, likely valid
                    // Set model status to Downloaded
                    set_model_status(&app, &model_id, ModelStatus::Downloaded).map_err(|e| {
                        ModelManagerError::StoreError(format!("Failed to set model status: {}", e))
                    })?;

                    // Emit completion events
                    app.emit("model-download-progress", (model_id.clone(), 100))
                        .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

                    app.emit("model-download-complete", model_id.clone())
                        .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

                    return Ok(());
                }
            }
        }

        return Err(ModelManagerError::IoError(format!(
            "Temp file does not exist: {}",
            temp_file_path.display()
        )));
    }

    // Remove destination file if it exists (Windows sometimes has issues with this)
    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| {
            ModelManagerError::IoError(format!("Failed to remove existing destination: {}", e))
        })?;
    }

    // Move temp file to final location
    // On Windows, we need to be extra careful with file operations
    match std::fs::rename(&temp_file_path, &file_path) {
        Ok(_) => {}
        Err(_e) => {
            // If rename fails, try a copy + delete approach
            // First remove destination if it exists
            if file_path.exists() {
                std::fs::remove_file(&file_path).map_err(|e| {
                    ModelManagerError::IoError(format!(
                        "Failed to remove existing destination: {}",
                        e
                    ))
                })?;
            }

            // Copy the file
            std::fs::copy(&temp_file_path, &file_path).map_err(|e| {
                ModelManagerError::IoError(format!(
                    "Failed to copy {} to {}: {}",
                    temp_file_path.display(),
                    file_path.display(),
                    e
                ))
            })?;

            // Delete the temp file
            std::fs::remove_file(&temp_file_path).map_err(|e| {
                ModelManagerError::IoError(format!("Failed to remove temp file after copy: {}", e))
            })?;
        }
    }

    // Set model status to Downloaded
    set_model_status(&app, &model_id, ModelStatus::Downloaded)
        .map_err(|e| ModelManagerError::StoreError(format!("Failed to set model status: {}", e)))?;

    // Emit final 100% progress before completion
    app.emit("model-download-progress", (model_id.clone(), 100))
        .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

    // Emit completion event
    app.emit("model-download-complete", model_id.clone())
        .map_err(|e| ModelManagerError::TauriError(e.to_string()))?;

    Ok(())
}

#[tauri::command]
pub fn delete_model(app: AppHandle, model_id: String) -> Result<(), ModelManagerError> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let file_path = app_data_dir.join(format!("models/ggml-{}.bin", model_id));

    if file_path.exists() {
        fs::remove_file(file_path)?;
    }

    set_model_status(&app, &model_id, ModelStatus::NotDownloaded)?;
    app.emit("model-delete-complete", model_id).unwrap();

    Ok(())
}

fn get_initial_models() -> HashMap<String, Model> {
    let models_data = vec![
        // Minimal Tier - Ultra-small models for low-end hardware
        (
            "tiny",
            "Tiny (Multilingual)",
            "Ultra-compact multilingual model, fastest processing for basic dictation.",
            "75 MiB",
            "~512 MB",
            "be07e048e1e599ad46341c8d2a135645097a7df2",
            false,
            ModelTier::Minimal,
        ),
        (
            "tiny-q5_1",
            "Tiny Q5_1",
            "Quantized tiny model with Q5_1 compression for even smaller size.",
            "31 MiB",
            "~512 MB",
            "1be07e048e1e599ad46341c8d2a135645097a7df3",
            false,
            ModelTier::Minimal,
        ),
        (
            "tiny-q8_0",
            "Tiny Q8_0",
            "Quantized tiny model with Q8_0 compression, balanced size and quality.",
            "42 MiB",
            "~512 MB",
            "2be07e048e1e599ad46341c8d2a135645097a7df4",
            false,
            ModelTier::Minimal,
        ),
        (
            "tiny.en",
            "Tiny English",
            "Ultra-fast English-only processing, ideal for quick notes and simple commands.",
            "75 MiB",
            "~1 GB",
            "c78c86eb1a8faa21b369bcd33207cc90d64ae9df",
            false,
            ModelTier::Minimal,
        ),
        (
            "tiny.en-q5_1",
            "Tiny English Q5_1",
            "Compact English-only model with Q5_1 quantization.",
            "31 MiB",
            "~1 GB",
            "3be07e048e1e599ad46341c8d2a135645097a7df5",
            false,
            ModelTier::Minimal,
        ),
        (
            "tiny.en-q8_0",
            "Tiny English Q8_0",
            "English-only tiny model with Q8_0 quantization for better quality.",
            "42 MiB",
            "~1 GB",
            "4be07e048e1e599ad46341c8d2a135645097a7df6",
            false,
            ModelTier::Minimal,
        ),
        (
            "base",
            "Base (Multilingual)",
            "Balanced multilingual model with good performance for general use.",
            "142 MiB",
            "~1.5 GB",
            "60ed5bc3dd14eea856493d334349b405782e8360",
            false,
            ModelTier::Minimal,
        ),
        (
            "base-q5_1",
            "Base Q5_1",
            "Base model with Q5_1 quantization for reduced size.",
            "57 MiB",
            "~1.5 GB",
            "5be07e048e1e599ad46341c8d2a135645097a7df7",
            false,
            ModelTier::Minimal,
        ),
        (
            "base-q8_0",
            "Base Q8_0",
            "Base model with Q8_0 quantization, good balance of size and quality.",
            "78 MiB",
            "~1.5 GB",
            "6be07e048e1e599ad46341c8d2a135645097a7df8",
            false,
            ModelTier::Minimal,
        ),
        (
            "base.en",
            "Base English",
            "Bundled English-only model with balanced performance and reliable accuracy for everyday use.",
            "142 MiB",
            "~1.5 GB",
            "137c40403d78fd54d454da0f9bd998f78703390c",
            true, // This is the bundled model
            ModelTier::Minimal,
        ),
        (
            "base.en-q5_1",
            "Base English Q5_1",
            "English-only base model with Q5_1 quantization for compact size.",
            "57 MiB",
            "~1.5 GB",
            "7be07e048e1e599ad46341c8d2a135645097a7df9",
            false,
            ModelTier::Minimal,
        ),
        (
            "base.en-q8_0",
            "Base English Q8_0",
            "English-only base model with Q8_0 quantization for enhanced quality.",
            "78 MiB",
            "~1.5 GB",
            "8be07e048e1e599ad46341c8d2a135645097a7dfa",
            false,
            ModelTier::Minimal,
        ),
        // Balanced Tier - Small models for mid-range hardware
        (
            "small",
            "Small (Multilingual)",
            "Multilingual small model for enhanced accuracy in meetings and interviews.",
            "466 MiB",
            "~2 GB",
            "9ecf779972d90ba49c06d968637bb58d5274bb6c",
            false,
            ModelTier::Balanced,
        ),
        (
            "small-q5_1",
            "Small Q5_1",
            "Small model with Q5_1 quantization for reduced size while maintaining quality.",
            "181 MiB",
            "~2 GB",
            "20f54878d608f94e4a8ee3ae56016571d47cba34",
            false,
            ModelTier::Balanced,
        ),
        (
            "small-q8_0",
            "Small Q8_0",
            "Small model with Q8_0 quantization, balancing quality and performance.",
            "252 MiB",
            "~2 GB",
            "9d75ff4ccfa0a8217870d7405cf8cef0a5579852",
            false,
            ModelTier::Balanced,
        ),
        (
            "small.en",
            "Small English",
            "English-only small model for enhanced accuracy in professional settings.",
            "466 MiB",
            "~2 GB",
            "abf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6f7",
            false,
            ModelTier::Balanced,
        ),
        (
            "small.en-q5_1",
            "Small English Q5_1",
            "English small model with Q5_1 quantization for meetings and interviews.",
            "181 MiB",
            "~2 GB",
            "bbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6f8",
            false,
            ModelTier::Balanced,
        ),
        (
            "small.en-q8_0",
            "Small English Q8_0",
            "English small model with Q8_0 quantization for professional use.",
            "252 MiB",
            "~2 GB",
            "cbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6f9",
            false,
            ModelTier::Balanced,
        ),
        (
            "small.en-tdrz",
            "Small English TDRZ",
            "Specialized English small model with TDRZ optimization for specific use cases.",
            "465 MiB",
            "~2 GB",
            "dbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6fa",
            false,
            ModelTier::Balanced,
        ),
        // Quality Tier - Medium models for good hardware
        (
            "medium",
            "Medium (Multilingual)",
            "High-quality multilingual model for professional dictation with accent support.",
            "1.5 GiB",
            "~4 GB",
            "345b3b5281bddd61605d6fc76bc5b92d8f20284c4",
            false,
            ModelTier::Quality,
        ),
        (
            "medium-q5_0",
            "Medium Q5_0",
            "Medium model with Q5_0 quantization for superior accuracy with reduced size.",
            "514 MiB",
            "~4 GB",
            "bb3b5281bddd61605d6fc76bc5b92d8f20284c3b",
            false,
            ModelTier::Quality,
        ),
        (
            "medium-q8_0",
            "Medium Q8_0",
            "Medium model with Q8_0 quantization for professional-grade accuracy.",
            "785 MiB",
            "~4 GB",
            "b1cf48c12c807e14881f634fb7b6c6ca867f6b38",
            false,
            ModelTier::Quality,
        ),
        (
            "medium.en",
            "Medium English",
            "High-quality English-only model for professional dictation and dictation.",
            "1.5 GiB",
            "~4 GB",
            "ebf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6fb",
            false,
            ModelTier::Quality,
        ),
        (
            "medium.en-q5_0",
            "Medium English Q5_0",
            "English medium model with Q5_0 quantization, handling accents and background noise.",
            "514 MiB",
            "~4 GB",
            "fbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6fc",
            false,
            ModelTier::Quality,
        ),
        (
            "medium.en-q8_0",
            "Medium English Q8_0",
            "Highest quality medium English model with Q8_0 quantization for professional use.",
            "785 MiB",
            "~4 GB",
            "gbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6fd",
            false,
            ModelTier::Quality,
        ),
        // Maximum Tier - Large models for high-end hardware
        (
            "large-v1",
            "Large V1",
            "First generation large model with maximum accuracy for critical applications.",
            "2.9 GiB",
            "~8 GB",
            "hbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6fe",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v2",
            "Large V2",
            "Second generation large model with improved accuracy and language understanding.",
            "2.9 GiB",
            "~8 GB",
            "ibf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e6ff",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v2-q5_0",
            "Large V2 Q5_0",
            "Large V2 model with Q5_0 quantization for reduced size while maintaining excellence.",
            "1.1 GiB",
            "~8 GB",
            "jbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e600",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v2-q8_0",
            "Large V2 Q8_0",
            "Large V2 model with Q8_0 quantization for professional-grade performance.",
            "1.5 GiB",
            "~8 GB",
            "kbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e601",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3",
            "Large V3",
            "Latest large model with state-of-the-art accuracy and multilingual support.",
            "2.9 GiB",
            "~8 GB",
            "lbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e602",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3-q5_0",
            "Large V3 Q5_0",
            "Large V3 model with Q5_0 quantization for optimal balance of size and quality.",
            "1.1 GiB",
            "~8 GB",
            "mbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e603",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3-turbo",
            "Large V3 Turbo",
            "Optimized large model with maximum accuracy and advanced language understanding.",
            "1.5 GiB",
            "~8 GB",
            "4af2b29d7ec73d781377bfd1758ca957a807e941",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3-turbo-q5_0",
            "Large V3 Turbo Q5_0",
            "Best performance with Q5_0 quantization, advanced language understanding.",
            "547 MiB",
            "~8 GB",
            "e050f7970618a659205450ad97eb95a18d69c9ee",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3-turbo-q8_0",
            "Large V3 Turbo Q8_0",
            "Premium turbo model with Q8_0 quantization for ultimate quality and performance.",
            "834 MiB",
            "~8 GB",
            "nbf2a2c5bf4d1c9bb1cd9b21e1b4c1a3c4d5e604",
            false,
            ModelTier::Maximum,
        ),
    ];

    models_data
        .into_iter()
        .map(
            |(id, name, description, size, ram, sha, recommended, tier)| {
                let url = format!(
                    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
                    id
                );
                (
                    id.to_string(),
                    Model {
                        name: name.to_string(),
                        description: description.to_string(),
                        size: size.to_string(),
                        ram: ram.to_string(),
                        status: ModelStatus::NotDownloaded,
                        sha: sha.to_string(),
                        url,
                        recommended,
                        tier,
                    },
                )
            },
        )
        .collect()
}
