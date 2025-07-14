use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;
use thiserror::Error;

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
}

const SELECTED_MODEL_KEY: &str = "selected_model";

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
}

pub struct ModelManagerState {
    pub store_path: String,
}

impl ModelManagerState {
    pub fn new() -> Self {
        Self {
            store_path: "models.json".to_string(),
        }
    }

    pub fn init(&self, app: &AppHandle) -> Result<(), ModelManagerError> {
        let store = app.store(&self.store_path)?;

        // Check if models are already initialized
        if store.get("models").is_none() {
            let initial_models = get_initial_models();
            store.set("models", json!(initial_models));
            store.save()?;
        }

        Ok(())
    }
}

#[tauri::command]
pub fn set_selected_model(
    app: AppHandle,
    state: tauri::State<ModelManagerState>,
    model_id: String,
) -> Result<(), ModelManagerError> {
    let store = app.store(&state.store_path)?;
    store.set(SELECTED_MODEL_KEY, json!(model_id));
    store.save()?;
    Ok(())
}

#[tauri::command]
pub fn get_selected_model(
    app: AppHandle,
    state: tauri::State<ModelManagerState>,
) -> Result<Option<String>, ModelManagerError> {
    let store = app.store(&state.store_path)?;
    let selected_model = store
        .get(SELECTED_MODEL_KEY)
        .map(|v| v.as_str().unwrap().to_string());
    Ok(selected_model)
}

#[tauri::command]
pub fn get_active_model_id(
    app: AppHandle,
    state: tauri::State<ModelManagerState>,
) -> Result<String, ModelManagerError> {
    let models = list_models(app.clone(), state.clone())?;

    // 1. Check for a user-selected and downloaded model
    if let Some(selected_id) = get_selected_model(app.clone(), state.clone())? {
        if let Some(model) = models.get(&selected_id) {
            if model.status == ModelStatus::Downloaded {
                return Ok(selected_id);
            }
        }
    }

    // 2. Fallback to tiny.en if it's downloaded
    if let Some(model) = models.get("tiny.en") {
        if model.status == ModelStatus::Downloaded {
            return Ok("tiny.en".to_string());
        }
    }

    // 3. Fallback to any other downloaded model
    for (id, model) in models {
        if model.status == ModelStatus::Downloaded {
            return Ok(id);
        }
    }

    // 4. Fallback to cloud
    Ok("cloud".to_string())
}

#[tauri::command]
pub fn list_models(
    app: AppHandle,
    state: tauri::State<ModelManagerState>,
) -> Result<HashMap<String, Model>, ModelManagerError> {
    let store = app.store(&state.store_path)?;
    let models_value = store
        .get("models")
        .ok_or_else(|| ModelManagerError::StoreError("Models not found in store".to_string()))?;

    let models: HashMap<String, Model> = serde_json::from_value(models_value)
        .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;

    Ok(models)
}

#[tauri::command]
pub async fn download_model(
    app: AppHandle,
    state: tauri::State<'_, ModelManagerState>,
    model_id: String,
) -> Result<(), ModelManagerError> {
    let store = app.store(&state.store_path)?;

    let (model_url, sha) = {
        let models_value = store.get("models").ok_or_else(|| {
            ModelManagerError::StoreError("Models not found in store".to_string())
        })?;
        let models: HashMap<String, Model> = serde_json::from_value(models_value)
            .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;

        let model = models
            .get(&model_id)
            .ok_or_else(|| ModelManagerError::ModelNotFound(model_id.clone()))?;

        (model.url.clone(), model.sha.clone())
    };

    let app_data_dir = app.path().app_data_dir().unwrap();
    let models_dir = app_data_dir.join("models");
    if !models_dir.exists() {
        fs::create_dir_all(&models_dir)?;
    }
    let file_path = models_dir.join(format!("ggml-{}.bin", model_id));

    let client = reqwest::Client::new();
    let res = client
        .get(&model_url)
        .send()
        .await
        .map_err(|e| ModelManagerError::DownloadFailed(e.to_string()))?;
    let total_size = res.content_length().unwrap_or(0);

    let mut stream = res.bytes_stream();
    let mut file = fs::File::create(&file_path)?;
    let mut downloaded: u64 = 0;
    let mut hasher = Sha1::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| ModelManagerError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;
        hasher.update(&chunk);

        let progress = (downloaded * 100 / total_size) as u8;
        app.emit("model-download-progress", (model_id.clone(), progress))
            .unwrap();
    }

    let finished_hash = format!("{:x}", hasher.finalize());
    if finished_hash != sha {
        return Err(ModelManagerError::VerificationFailed(
            "SHA mismatch".to_string(),
        ));
    }

    // Update model status in store
    let models_value = store
        .get("models")
        .ok_or_else(|| ModelManagerError::StoreError("Models not found in store".to_string()))?;
    let mut models: HashMap<String, Model> = serde_json::from_value(models_value)
        .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;

    if let Some(model) = models.get_mut(&model_id) {
        model.status = ModelStatus::Downloaded;
    }

    store.set("models", json!(models));
    store.save()?;

    app.emit("model-download-complete", model_id).unwrap();

    Ok(())
}

#[tauri::command]
pub fn delete_model(
    app: AppHandle,
    state: tauri::State<ModelManagerState>,
    model_id: String,
) -> Result<(), ModelManagerError> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let file_path = app_data_dir.join(format!("models/ggml-{}.bin", model_id));

    if file_path.exists() {
        fs::remove_file(file_path)?;
    }

    let store = app.store(&state.store_path)?;
    let models_value = store
        .get("models")
        .ok_or_else(|| ModelManagerError::StoreError("Models not found in store".to_string()))?;
    let mut models: HashMap<String, Model> = serde_json::from_value(models_value)
        .map_err(|e| ModelManagerError::StoreError(e.to_string()))?;

    if let Some(model) = models.get_mut(&model_id) {
        model.status = ModelStatus::NotDownloaded;
    } else {
        return Err(ModelManagerError::ModelNotFound(model_id));
    }

    store.set("models", json!(models));
    store.save()?;

    app.emit("model-delete-complete", model_id).unwrap();

    Ok(())
}

fn get_initial_models() -> HashMap<String, Model> {
    let models_data = vec![
        (
            "tiny.en",
            "Tiny",
            "Fastest processing, ideal for quick notes and simple commands.",
            "75 MiB",
            "~1 GB",
            "c78c86eb1a8faa21b369bcd33207cc90d64ae9df",
            false,
        ),
        (
            "base.en",
            "Base",
            "Balanced performance with reliable accuracy for everyday use.",
            "142 MiB",
            "~1.5 GB",
            "137c40403d78fd54d454da0f9bd998f78703390c",
            true,
        ),
        (
            "small.en",
            "Small",
            "Enhanced accuracy for meetings, interviews, and dictation.",
            "466 MiB",
            "~2 GB",
            "db8a495a91d927739e50b3fc1cc4c6b8f6c2d022",
            false,
        ),
        (
            "medium.en",
            "Medium",
            "Superior accuracy handling accents, background noise, and technical terms.",
            "1.5 GiB",
            "~4 GB",
            "8c30f0e44ce9560643ebd10bbe50cd20eafd3723",
            false,
        ),
        (
            "large-v3",
            "Large",
            "Maximum accuracy with advanced language understanding and punctuation.",
            "2.9 GiB",
            "~8 GB",
            "ad82bf6a9043ceed055076d0fd39f5f186ff8062",
            false,
        ),
    ];

    models_data
        .into_iter()
        .map(|(id, name, description, size, ram, sha, recommended)| {
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
                },
            )
        })
        .collect()
}
