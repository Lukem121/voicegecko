use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager, Wry};
use tauri_plugin_store::{Store, StoreExt};
use thiserror::Error;

use crate::modules::hardware_info::{detect_hardware, ModelTier};

#[derive(Debug, Error, Serialize)]
pub enum ModelManagerError {
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    #[error("Download failed: {0}")]
    DownloadFailed(String),
    #[error("Filesystem error: {0}")]
    FileSystemError(String),
    #[error("Verification failed: {0}")]
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
    let bundled_model_name = "ggml-base.en-q8_0.bin";
    let bundled_model_id = "base.en-q8_0";
    let target_path = models_dir.join("ggml-base.en-q8_0.bin");

    println!(
        "[Sync] Target path for bundled model: {}",
        target_path.display()
    );

    // Try to find the bundled model in resources
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_path = resource_dir.join(bundled_model_name);
        println!(
            "[Sync] Looking for bundled model at: {}",
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
        println!("[Sync] Could not get resource directory");
    }

    // Check what files actually exist in the models directory
    // First, check all known models to verify their files still exist
    println!("[Sync] Verifying all known models against filesystem...");
    let all_models = get_initial_models();
    let store = app.store(STORE_PATH)?;
    let mut model_statuses = get_model_statuses(&store)?;

    for (model_id, _) in &all_models {
        let expected_file = models_dir.join(format!("ggml-{}.bin", model_id));

        if expected_file.exists() {
            if let Ok(metadata) = std::fs::metadata(&expected_file) {
                if metadata.len() > 1_000_000 {
                    // File exists and is valid size
                    if model_statuses.get(model_id) != Some(&ModelStatus::Downloaded) {
                        println!("[Sync] Found model file, updating status: {}", model_id);
                        model_statuses.insert(model_id.clone(), ModelStatus::Downloaded);
                    }
                } else {
                    // File exists but is too small
                    println!(
                        "[Sync] Model file too small ({}), marking as not downloaded: {}",
                        metadata.len(),
                        model_id
                    );
                    model_statuses.insert(model_id.clone(), ModelStatus::NotDownloaded);
                }
            }
        } else {
            // File doesn't exist
            if model_statuses.get(model_id) == Some(&ModelStatus::Downloaded) {
                println!("[Sync] Model file missing, updating status: {}", model_id);
                model_statuses.insert(model_id.clone(), ModelStatus::NotDownloaded);
            }
        }
    }

    // Save all status updates at once
    store.set(MODEL_STATUSES_KEY, json!(model_statuses));
    store.save()?;

    // Also scan for any orphaned files that aren't in our model list
    if models_dir.exists() {
        match std::fs::read_dir(&models_dir) {
            Ok(entries) => {
                let mut file_count = 0;
                for entry in entries {
                    if let Ok(entry) = entry {
                        file_count += 1;
                        let path = entry.path();
                        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                            if file_name.ends_with(".bin") && !file_name.ends_with(".partial") {
                                let model_id = if file_name.starts_with("ggml-") {
                                    file_name
                                        .trim_start_matches("ggml-")
                                        .trim_end_matches(".bin")
                                } else {
                                    file_name.trim_end_matches(".bin")
                                };

                                // Check if this model is in our known list
                                if !all_models.contains_key(model_id) {
                                    println!("[Sync] Found orphaned model file: {}", file_name);
                                }
                            }
                        }
                    }
                }
                if file_count == 0 {
                    println!("[Sync] Models directory is empty");
                } else {
                    println!("[Sync] Found {} files in models directory", file_count);
                }
            }
            Err(e) => {
                println!("[Sync] Error reading models directory: {}", e);
            }
        }
    } else {
        println!(
            "[Sync] Models directory does not exist: {}",
            models_dir.display()
        );
    }

    println!("[Sync] Model synchronization completed");

    // Ensure a default tier is selected if none is set
    if get_selected_tier(app.clone())?.is_none() {
        println!("[Sync] No tier selected, setting default to 'minimal'");
        set_selected_tier(app.clone(), "minimal".to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_active_model_id(app: AppHandle) -> Result<String, ModelManagerError> {
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

    // When a tier is selected, try to select the best available model for that tier
    if let Some(model_tier) = ModelTier::from_string(&tier) {
        if let Ok(model_id) = get_best_model_for_tier(app.clone(), model_tier) {
            // set_selected_model(app, model_id)?; // This function is removed
        }
    }

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
        Err(e) => {
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
        (
            "base.en-q8_0",
            "Base Q8_0",
            "Balanced performance with reliable accuracy for everyday use, using Q8_0 quantization.",
            "78 MiB",
            "~1.5 GB",
            "bb1574182e9b924452bf0cd1510ac034d323e948",
            true,
            ModelTier::Minimal,
        ),
        (
            "tiny.en",
            "Tiny",
            "Fastest processing, ideal for quick notes and simple commands.",
            "75 MiB",
            "~1 GB",
            "c78c86eb1a8faa21b369bcd33207cc90d64ae9df",
            false,
            ModelTier::Minimal,
        ),
        (
            "base.en",
            "Base",
            "Balanced performance with reliable accuracy for everyday use.",
            "142 MiB",
            "~1.5 GB",
            "137c40403d78fd54d454da0f9bd998f78703390c",
            false,
            ModelTier::Balanced,
        ),
        (
            "small.en-q5_1",
            "Small Q5_1",
            "Enhanced accuracy for meetings and interviews with Q5_1 quantization for reduced size.",
            "181 MiB",
            "~2 GB",
            "20f54878d608f94e4a8ee3ae56016571d47cba34",
            false,
            ModelTier::Balanced,
        ),
        (
            "small.en",
            "Small",
            "Enhanced accuracy for meetings, interviews, and dictation.",
            "466 MiB",
            "~2 GB",
            "db8a495a91d927739e50b3fc1cc4c6b8f6c2d022",
            false,
            ModelTier::Quality,
        ),
        (
            "medium.en",
            "Medium",
            "Superior accuracy handling accents, background noise, and technical terms.",
            "1.5 GiB",
            "~4 GB",
            "8c30f0e44ce9560643ebd10bbe50cd20eafd3723",
            false,
            ModelTier::Quality,
        ),
        (
            "large-v3-turbo-q5_0",
            "Large Turbo Q5_0",
            "Fastest processing with high accuracy for quick notes and commands, using Q5_0 quantization.",
            "547 MiB",
            "~8 GB",
            "e050f7970618a659205450ad97eb95a18d69c9ee",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3-turbo",
            "Large Turbo",
            "Fastest processing with high accuracy for quick notes and commands.",
            "1.5 GiB",
            "~8 GB",
            "4af2b29d7ec73d781377bfd1758ca957a807e941",
            false,
            ModelTier::Maximum,
        ),
        (
            "large-v3",
            "Large",
            "Maximum accuracy with advanced language understanding and punctuation.",
            "2.9 GiB",
            "~8 GB",
            "ad82bf6a9043ceed055076d0fd39f5f186ff8062",
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
