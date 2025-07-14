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

const STORE_PATH: &str = "models.json";
const SELECTED_MODEL_KEY: &str = "selected_model";
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
    let store = app.store(STORE_PATH)?;
    let initial_models = get_initial_models();
    let mut stored_statuses = get_model_statuses(&store).unwrap_or_default();
    let app_data_dir = app.path().app_data_dir().unwrap();

    stored_statuses.retain(|id, status| {
        if !initial_models.contains_key(id) {
            return false;
        }
        if *status == ModelStatus::Downloaded {
            let file_path = app_data_dir.join(format!("models/ggml-{}.bin", id));
            if !file_path.exists() {
                return false;
            }
        }
        true
    });

    for (id, _model) in &initial_models {
        if !stored_statuses.contains_key(id) {
            stored_statuses.insert(id.clone(), ModelStatus::NotDownloaded);
        }
    }

    store.set(MODEL_STATUSES_KEY, json!(stored_statuses));
    store.save()?;

    Ok(())
}

#[tauri::command]
pub fn set_selected_model(app: AppHandle, model_id: String) -> Result<(), ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    store.set(SELECTED_MODEL_KEY, json!(model_id));
    store.save()?;
    Ok(())
}

#[tauri::command]
pub fn get_selected_model(app: AppHandle) -> Result<Option<String>, ModelManagerError> {
    let store = app.store(STORE_PATH)?;
    let selected_model = store
        .get(SELECTED_MODEL_KEY)
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    Ok(selected_model)
}

#[tauri::command]
pub fn get_active_model_id(app: AppHandle) -> Result<String, ModelManagerError> {
    let models = list_models(app.clone())?;

    if let Some(selected_id) = get_selected_model(app.clone())? {
        if let Some(model) = models.get(&selected_id) {
            if model.status == ModelStatus::Downloaded {
                return Ok(selected_id);
            }
        }
    }

    if let Some(model) = models.get("tiny.en") {
        if model.status == ModelStatus::Downloaded {
            return Ok("tiny.en".to_string());
        }
    }

    for (id, model) in models {
        if model.status == ModelStatus::Downloaded {
            return Ok(id);
        }
    }

    Ok("cloud".to_string())
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
pub async fn download_model(app: AppHandle, model_id: String) -> Result<(), ModelManagerError> {
    let (model_url, sha) = {
        let models = get_initial_models();
        let model = models
            .get(&model_id)
            .ok_or_else(|| ModelManagerError::ModelNotFound(model_id.clone()))?;
        (model.url.clone(), model.sha.clone())
    };

    set_model_status(&app, &model_id, ModelStatus::Downloading(0))?;

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
    let mut last_progress = 0;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| ModelManagerError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;
        hasher.update(&chunk);

        if total_size > 0 {
            let progress = (downloaded * 100 / total_size) as u8;
            if progress > last_progress {
                set_model_status(&app, &model_id, ModelStatus::Downloading(progress))?;
                app.emit("model-download-progress", (model_id.clone(), progress))
                    .unwrap();
                last_progress = progress;
            }
        }
    }

    let finished_hash = format!("{:x}", hasher.finalize());
    if finished_hash != sha {
        fs::remove_file(&file_path)?;
        set_model_status(&app, &model_id, ModelStatus::NotDownloaded)?;
        return Err(ModelManagerError::VerificationFailed(
            "SHA mismatch".to_string(),
        ));
    }

    set_model_status(&app, &model_id, ModelStatus::Downloaded)?;
    app.emit("model-download-complete", model_id.clone())
        .unwrap();

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
            false,
        ),
        (
            "base.en-q8_0",
            "Base Q8_0",
            "Balanced performance with reliable accuracy for everyday use, using Q8_0 quantization.",
            "78 MiB",
            "~1.5 GB",
            "bb1574182e9b924452bf0cd1510ac034d323e948",
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
        (
            "large-v3-turbo",
            "Large Turbo",
            "Fastest processing with high accuracy for quick notes and commands.",
            "1.5 GiB",
            "~8 GB",
            "4af2b29d7ec73d781377bfd1758ca957a807e941",
            false,
        ),
        (
            "large-v3-turbo-q5_0",
            "Large Turbo Q5_0",
            "Fastest processing with high accuracy for quick notes and commands, using Q5_0 quantization.",
            "547 MiB",
            "~8 GB",
            "e050f7970618a659205450ad97eb95a18d69c9ee",
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
