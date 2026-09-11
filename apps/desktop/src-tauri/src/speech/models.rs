//! Optional polish-model downloads. Whisper ggml lives in model_manager.

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_store::StoreExt;
use thiserror::Error;

use crate::dictation::features;
use crate::intent::llama_process::LlamaProcessManager;
use crate::speech::download_events::emit_download_progress;

pub fn v2_models_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| d.join("voicegecko").join("models"))
}

const STORE_PATH: &str = "v2-models.json";
const STATUSES_KEY: &str = "statuses";

#[derive(Debug, Error, Serialize)]
pub enum V2ModelError {
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
}

impl From<std::io::Error> for V2ModelError {
    fn from(err: std::io::Error) -> Self {
        V2ModelError::IoError(err.to_string())
    }
}

impl From<tauri_plugin_store::Error> for V2ModelError {
    fn from(err: tauri_plugin_store::Error) -> Self {
        V2ModelError::StoreError(err.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum V2ModelStatus {
    NotDownloaded,
    Downloading { progress: u8 },
    Downloaded,
    ManualInstall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct V2ModelEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size: String,
    pub url: Option<String>,
    pub local_path: String,
    pub sha256: Option<String>,
    pub manual_install: bool,
    pub install_notes: Option<String>,
    pub status: V2ModelStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct V2ModelStatusResponse {
    pub id: String,
    pub status: V2ModelStatus,
    pub local_path: String,
    pub exists_on_disk: bool,
    pub bytes_on_disk: u64,
}

struct CatalogItem {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    size: &'static str,
    url: Option<&'static str>,
    relative_path: &'static str,
    sha256: Option<&'static str>,
    manual_install: bool,
    install_notes: Option<&'static str>,
}

fn catalog() -> Vec<CatalogItem> {
    vec![CatalogItem {
        id: "qwen2_5_3b",
        name: "Qwen2.5 3B Instruct",
        description: "Local LLM for polish post-processing (Q4_K_M, ~2 GB).",
        size: "~2 GB",
        url: Some(
            "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
        ),
        relative_path: "llm/qwen2.5-3b-instruct-q4_k_m.gguf",
        sha256: None,
        manual_install: false,
        install_notes: None,
    }]
}

pub fn is_toggle_ready() -> bool {
    crate::speech::whisper_sidecar::is_ready()
}

async fn download_v2_model_inner(app: &AppHandle, model_id: &str) -> Result<(), V2ModelError> {
    let item = find_catalog_item(model_id)
        .ok_or_else(|| V2ModelError::ModelNotFound(model_id.to_string()))?;

    if item.manual_install {
        return Err(V2ModelError::DownloadFailed("This model is installed manually".into()));
    }

    let url = item
        .url
        .ok_or_else(|| V2ModelError::DownloadFailed("No download URL".into()))?;

    let root = models_root()?;
    let local_path = item_local_path(&root, &item);

    if detect_disk_status(&item, &local_path) {
        write_status(app, model_id, V2ModelStatus::Downloaded)?;
        emit_download_progress(app, model_id, 100, "complete");
        let _ = app.emit("v2-model-download-complete", model_id);
        return Ok(());
    }

    write_status(
        app,
        model_id,
        V2ModelStatus::Downloading { progress: 0 },
    )?;
    emit_download_progress(app, model_id, 0, "downloading");

    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent)?;
    }
    download_file_with_resume(app, model_id, url, &local_path).await?;
    if let Some(expected) = item.sha256 {
        verify_sha256(&local_path, expected)?;
    }

    write_status(app, model_id, V2ModelStatus::Downloaded)?;
    emit_download_progress(app, model_id, 100, "complete");
    let _ = app.emit("v2-model-download-complete", model_id);
    Ok(())
}

async fn ensure_whisper_ready(app: &AppHandle) -> Result<(), String> {
    emit_download_progress(app, "whisper_sidecar", 10, "downloading");
    crate::speech::whisper_sidecar::ensure_sidecar_installed(app).await?;
    emit_download_progress(app, "whisper_sidecar", 100, "complete");

    let _ = crate::modules::model_manager::synchronize_models(app.clone());
    let _ = crate::speech::whisper_sidecar::ensure_whisper_model(app)?;

    let recommended = crate::modules::model_manager::DEFAULT_GPU_WHISPER_MODEL_ID;
    if crate::modules::model_manager::model_file_path(app, recommended).is_none() {
        emit_download_progress(app, recommended, 0, "downloading");
        if let Err(error) =
            crate::modules::model_manager::download_model(app.clone(), recommended.to_string()).await
        {
            crate::speech::stt_log::warn(
                "bootstrap",
                &format!("Recommended {recommended} download skipped: {error}"),
            );
            emit_download_progress(app, recommended, 0, "error");
        } else {
            emit_download_progress(app, recommended, 100, "complete");
        }
    }

    if crate::speech::whisper_sidecar::is_ready_for_app(app)
        || crate::speech::whisper_sidecar::is_ready()
    {
        Ok(())
    } else {
        Err("Whisper is still missing. Open Settings → Speed & accuracy to download a model.".into())
    }
}

async fn bootstrap_optional_llm(app: &AppHandle) {
    if !features::get_feature_flags().local_llm_polish {
        return;
    }

    if let Err(error) = LlamaProcessManager::ensure_llama_server_binary(app).await {
        eprintln!("[Bootstrap] llama-server binary: {error}");
        emit_download_progress(app, "llama_server", 0, "error");
        return;
    }
    emit_download_progress(app, "llama_server", 100, "complete");

    if LlamaProcessManager::find_gguf_model().is_some() {
        return;
    }

    if let Err(error) = download_v2_model_inner(app, "qwen2_5_3b").await {
        eprintln!("[Bootstrap] Qwen GGUF download skipped: {error}");
        emit_download_progress(app, "qwen2_5_3b", 0, "error");
        return;
    }

    if let Some(manager) = app.try_state::<std::sync::Arc<LlamaProcessManager>>() {
        let _ = manager.ensure_running(app).await;
    }
}

async fn run_first_run_bootstrap(app: AppHandle) {
    emit_download_progress(&app, "bootstrap", 0, "downloading");

    match ensure_whisper_ready(&app).await {
        Ok(()) => {
            emit_download_progress(&app, "bootstrap", 100, "complete");
            let _ = app.emit("v2-models-ready", ());
            bootstrap_optional_llm(&app).await;
        }
        Err(error) => {
            crate::speech::stt_log::error("bootstrap", &format!("Whisper setup failed: {error}"));
            emit_download_progress(&app, "bootstrap", 0, "error");
            let _ = app.emit("v2-bootstrap-failed", error);
        }
    }
}

/// Auto-download the Whisper sidecar and recommended ggml (non-blocking).
pub fn bootstrap_required_models(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        run_first_run_bootstrap(app).await;
    });
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechSetupStatus {
    pub ready: bool,
    pub sidecar_installed: bool,
    pub selected_model_id: String,
    pub selected_model_ready: bool,
    pub waiting_on: String,
    pub message: String,
    pub progress: u8,
    pub activity: String,
}

#[tauri::command]
pub fn get_speech_setup_status(app: AppHandle) -> SpeechSetupStatus {
    let sidecar_installed = crate::speech::whisper_sidecar::is_sidecar_installed();
    let selected_model_id = crate::speech::whisper_sidecar::selected_model_id(&app);
    let selected_model_ready =
        crate::modules::model_manager::model_file_path(&app, &selected_model_id).is_some();
    let ready = crate::speech::whisper_sidecar::is_ready_for_app(&app) || is_toggle_ready();

    let (waiting_on, message) = if ready && selected_model_ready {
        (
            "none".to_string(),
            format!("Ready — using {selected_model_id}"),
        )
    } else if ready {
        (
            "model".to_string(),
            format!(
                "{selected_model_id} is selected but not downloaded. Dictation is using a fallback until you download it."
            ),
        )
    } else if !sidecar_installed {
        (
            "sidecar".to_string(),
            "The Whisper engine is still being copied. Keep VoiceGecko open.".to_string(),
        )
    } else if !selected_model_ready {
        (
            "model".to_string(),
            format!(
                "{selected_model_id} is selected but not downloaded yet. Download it below, or pick a ready model."
            ),
        )
    } else {
        (
            "setup".to_string(),
            "Speech setup is still finishing. Keep VoiceGecko open.".to_string(),
        )
    };

    let live = crate::speech::download_events::current_setup_progress();
    let mut progress = 0u8;
    let mut activity = message.clone();
    if let Some(live) = live {
        if live.status == "downloading" {
            progress = live.progress;
            let label = match live.model_id.as_str() {
                "whisper_sidecar" => "Whisper engine".to_string(),
                "bootstrap" => "Speech setup".to_string(),
                id => id.to_string(),
            };
            if live.model_id == "whisper_sidecar" || live.model_id == "bootstrap" {
                activity = format!("Copying {label}… {progress}%");
            } else {
                activity = format!("Downloading {label}… {progress}%");
            }
        } else if live.status == "complete" {
            progress = 100;
        }
    }

    if let Ok(models) = crate::modules::model_manager::list_gpu_whisper_models(app.clone()) {
        if let Some(downloading) = models.iter().find(|model| {
            matches!(
                model.status,
                crate::modules::model_manager::ModelStatus::Downloading(_)
            )
        }) {
            if let crate::modules::model_manager::ModelStatus::Downloading(pct) = downloading.status
            {
                progress = pct;
                activity = format!("Downloading {}… {pct}%", downloading.name);
            }
        }
    }

    SpeechSetupStatus {
        ready,
        sidecar_installed,
        selected_model_id,
        selected_model_ready,
        waiting_on,
        message,
        progress,
        activity,
    }
}

#[tauri::command]
pub fn is_v2_toggle_ready(app: AppHandle) -> bool {
    crate::speech::whisper_sidecar::is_ready_for_app(&app) || is_toggle_ready()
}

#[tauri::command]
pub async fn retry_v2_bootstrap(app: AppHandle) {
    run_first_run_bootstrap(app).await;
}

pub fn models_root() -> Result<PathBuf, V2ModelError> {
    let root = v2_models_dir().ok_or_else(|| {
        V2ModelError::PathError("Could not resolve local data directory".into())
    })?;
    fs::create_dir_all(&root)?;
    Ok(root)
}

fn item_local_path(root: &Path, item: &CatalogItem) -> PathBuf {
    root.join(item.relative_path)
}

fn read_statuses(app: &AppHandle) -> Result<std::collections::HashMap<String, V2ModelStatus>, V2ModelError> {
    let store = app.store(STORE_PATH)?;
    match store.get(STATUSES_KEY) {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| V2ModelError::StoreError(e.to_string())),
        None => Ok(std::collections::HashMap::new()),
    }
}

fn write_status(app: &AppHandle, id: &str, status: V2ModelStatus) -> Result<(), V2ModelError> {
    let store = app.store(STORE_PATH)?;
    let mut statuses = read_statuses(app)?;
    statuses.insert(id.to_string(), status);
    store.set(STATUSES_KEY, serde_json::json!(statuses));
    store.save()?;
    Ok(())
}

fn compute_file_sha256(path: &Path) -> Result<String, V2ModelError> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8 * 1024 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn verify_sha256(path: &Path, expected: &str) -> Result<(), V2ModelError> {
    let actual = compute_file_sha256(path)?;
    if actual.eq_ignore_ascii_case(expected) {
        Ok(())
    } else {
        Err(V2ModelError::VerificationFailed(format!(
            "Checksum mismatch: expected {expected}, got {actual}"
        )))
    }
}

fn detect_disk_status(_item: &CatalogItem, local_path: &Path) -> bool {
    local_path.is_file()
}

fn bytes_on_disk(path: &Path) -> u64 {
    if path.is_file() {
        return fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    }
    if !path.is_dir() {
        return 0;
    }
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                total += fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
            } else if p.is_dir() {
                total += bytes_on_disk(&p);
            }
        }
    }
    total
}

fn sync_status_from_disk(app: &AppHandle, item: &CatalogItem, local_path: &Path) -> V2ModelStatus {
    let statuses = read_statuses(app).unwrap_or_default();
    let stored = statuses.get(item.id).cloned();

    if item.manual_install {
        if detect_disk_status(item, local_path) {
            let _ = write_status(app, item.id, V2ModelStatus::Downloaded);
            return V2ModelStatus::Downloaded;
        }
        return V2ModelStatus::NotDownloaded;
    }

    if detect_disk_status(item, local_path) {
        if stored.as_ref() != Some(&V2ModelStatus::Downloaded) {
            let _ = write_status(app, item.id, V2ModelStatus::Downloaded);
        }
        return V2ModelStatus::Downloaded;
    }

    if matches!(stored, Some(V2ModelStatus::Downloading { .. })) {
        return stored.unwrap();
    }

    V2ModelStatus::NotDownloaded
}

fn catalog_entry(app: &AppHandle, item: &CatalogItem, root: &Path) -> V2ModelEntry {
    let local_path = item_local_path(root, item);
    let status = sync_status_from_disk(app, item, &local_path);

    V2ModelEntry {
        id: item.id.to_string(),
        name: item.name.to_string(),
        description: item.description.to_string(),
        size: item.size.to_string(),
        url: item.url.map(str::to_string),
        local_path: local_path.display().to_string(),
        sha256: item.sha256.map(str::to_string),
        manual_install: item.manual_install,
        install_notes: item.install_notes.map(str::to_string),
        status,
    }
}

fn find_catalog_item(id: &str) -> Option<CatalogItem> {
    catalog().into_iter().find(|item| item.id == id)
}

static DOWNLOAD_RUNNING: AtomicBool = AtomicBool::new(false);

async fn download_file_with_resume(
    app: &AppHandle,
    model_id: &str,
    url: &str,
    dest: &Path,
) -> Result<(), V2ModelError> {
    let temp_path = dest.with_extension("partial");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| V2ModelError::DownloadFailed(e.to_string()))?;

    let mut start_byte = 0u64;
    let mut request = client.get(url);
    if temp_path.exists() {
        if let Ok(meta) = fs::metadata(&temp_path) {
            start_byte = meta.len();
            request = request.header("Range", format!("bytes={start_byte}-"));
        }
    }

    let response = request
        .send()
        .await
        .map_err(|e| V2ModelError::DownloadFailed(e.to_string()))?;

    if !response.status().is_success()
        && response.status() != reqwest::StatusCode::PARTIAL_CONTENT
    {
        return Err(V2ModelError::DownloadFailed(format!(
            "HTTP {}",
            response.status()
        )));
    }

    let total_size = if response.status() == reqwest::StatusCode::PARTIAL_CONTENT {
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

    let mut file = if start_byte > 0 && temp_path.exists() {
        fs::OpenOptions::new().append(true).open(&temp_path)?
    } else {
        fs::File::create(&temp_path)?
    };

    let mut downloaded = start_byte;
    let mut stream = response.bytes_stream();
    let mut last_progress = 0u8;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| V2ModelError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 100.0) as u8
        } else {
            0
        };

        if progress >= last_progress.saturating_add(5) || progress == 100 {
            emit_download_progress(app, model_id, progress, "downloading");
            let _ = write_status(
                app,
                model_id,
                V2ModelStatus::Downloading { progress },
            );
            last_progress = progress;
        }
    }

    file.flush()?;
    drop(file);
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    if dest.exists() {
        if dest.is_dir() {
            fs::remove_dir_all(dest)?;
        } else {
            fs::remove_file(dest)?;
        }
    }

    fs::rename(&temp_path, dest)?;
    Ok(())
}

#[tauri::command]
pub fn list_v2_models(app: AppHandle) -> Result<Vec<V2ModelEntry>, V2ModelError> {
    let root = models_root()?;
    Ok(catalog()
        .iter()
        .map(|item| catalog_entry(&app, item, &root))
        .collect())
}

#[tauri::command]
pub fn get_v2_model_status(app: AppHandle, model_id: String) -> Result<V2ModelStatusResponse, V2ModelError> {
    let item = find_catalog_item(&model_id)
        .ok_or_else(|| V2ModelError::ModelNotFound(model_id.clone()))?;
    let root = models_root()?;
    let local_path = item_local_path(&root, &item);
    let status = sync_status_from_disk(&app, &item, &local_path);
    let exists = detect_disk_status(&item, &local_path);

    Ok(V2ModelStatusResponse {
        id: model_id,
        status,
        local_path: local_path.display().to_string(),
        exists_on_disk: exists,
        bytes_on_disk: if exists { bytes_on_disk(&local_path) } else { 0 },
    })
}

#[tauri::command]
pub async fn download_v2_model(app: AppHandle, model_id: String) -> Result<(), V2ModelError> {
    if DOWNLOAD_RUNNING.swap(true, Ordering::SeqCst) {
        return Err(V2ModelError::DownloadFailed(
            "Another v2 model download is already running".into(),
        ));
    }

    let result = download_v2_model_inner(&app, &model_id).await;
    DOWNLOAD_RUNNING.store(false, Ordering::SeqCst);
    result
}

#[tauri::command]
pub fn delete_v2_model(app: AppHandle, model_id: String) -> Result<(), V2ModelError> {
    let item = find_catalog_item(&model_id)
        .ok_or_else(|| V2ModelError::ModelNotFound(model_id.clone()))?;

    if item.manual_install {
        return Err(V2ModelError::FileSystemError(
            "This model is installed manually".into(),
        ));
    }

    let local_path = item_local_path(&models_root()?, &item);

    if local_path.is_file() && local_path.exists() {
        fs::remove_file(&local_path)?;
    } else if local_path.is_dir() && local_path.exists() {
        fs::remove_dir_all(&local_path)?;
    }

    let partial = local_path.with_extension("partial");
    if partial.exists() {
        let _ = fs::remove_file(partial);
    }

    write_status(&app, &model_id, V2ModelStatus::NotDownloaded)?;
    let _ = app.emit("v2-model-delete-complete", model_id);
    Ok(())
}
