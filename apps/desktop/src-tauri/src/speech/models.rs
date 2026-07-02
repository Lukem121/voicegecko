//! v2 model download manager — Silero VAD, Parakeet INT8, Moonshine manual path.

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
use crate::speech::parakeet_sidecar;
use crate::speech::vad;

/// Models required for Ctrl+Shift+Z toggle dictation offline.
pub const REQUIRED_TOGGLE_MODEL_IDS: &[&str] = &["silero_vad", "parakeet_tdt_v2"];

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
    vec![
        CatalogItem {
            id: "silero_vad",
            name: "Silero VAD",
            description: "Voice activity detection for hands-free segmentation (~2 MB).",
            size: "~2 MB",
            url: Some(
                "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx",
            ),
            relative_path: "silero_vad.onnx",
            sha256: None,
            manual_install: false,
            install_notes: None,
        },
        CatalogItem {
            id: "parakeet_tdt_v2",
            name: "Parakeet TDT v2 INT8",
            description: "NVIDIA Parakeet TDT 0.6B INT8 ONNX pack for local batch STT (~640 MB).",
            size: "~640 MB",
            url: Some(
                "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2",
            ),
            relative_path: "parakeet-tdt-v2",
            sha256: None,
            manual_install: false,
            install_notes: None,
        },
        CatalogItem {
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
        },
        CatalogItem {
            id: "moonshine_medium",
            name: "Moonshine Medium (manual)",
            description: "Moonshine streaming DLL + models are installed manually by the user.",
            size: "varies",
            url: None,
            relative_path: "moonshine-medium-streaming",
            sha256: None,
            manual_install: true,
            install_notes: Some(
                "Install moonshine.dll to %LOCALAPPDATA%\\voicegecko\\moonshine\\ and run \
                 `python -m moonshine_voice.download --language en`. Models are copied automatically \
                 from %LOCALAPPDATA%\\voicegecko\\models\\moonshine-medium-streaming\\ when found.",
            ),
        },
    ]
}
pub fn is_toggle_ready() -> bool {
    let Ok(root) = models_root() else {
        return false;
    };

    let silero = catalog()
        .into_iter()
        .find(|item| item.id == "silero_vad")
        .map(|item| item_local_path(&root, &item));
    let parakeet = catalog()
        .into_iter()
        .find(|item| item.id == "parakeet_tdt_v2")
        .map(|item| item_local_path(&root, &item));

    let silero_ok = silero
        .as_ref()
        .is_some_and(|path| detect_disk_status(
            &find_catalog_item("silero_vad").expect("silero catalog"),
            path,
        ));
    let parakeet_ok = parakeet
        .as_ref()
        .is_some_and(|path| detect_disk_status(
            &find_catalog_item("parakeet_tdt_v2").expect("parakeet catalog"),
            path,
        ));

    silero_ok && parakeet_ok && parakeet_sidecar::is_sidecar_available()
}

/// Copies `resources/models/silero_vad.onnx` when bundled; otherwise returns false
/// so bootstrap falls through to the network download (~2 MB).
fn copy_bundled_silero_if_available(app: &AppHandle) -> Result<bool, V2ModelError> {
    let root = models_root()?;
    let item = find_catalog_item("silero_vad")
        .ok_or_else(|| V2ModelError::ModelNotFound("silero_vad".into()))?;
    let dest = item_local_path(&root, &item);
    if detect_disk_status(&item, &dest) {
        return Ok(true);
    }

    let bundled = app
        .path()
        .resolve(
            "resources/models/silero_vad.onnx",
            tauri::path::BaseDirectory::Resource,
        )
        .ok()
        .filter(|path| path.exists());

    if let Some(src) = bundled {
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&src, &dest)?;
        write_status(app, "silero_vad", V2ModelStatus::Downloaded)?;
        emit_download_progress(app, "silero_vad", 100, "complete");
        return Ok(true);
    }

    Ok(false)
}

async fn download_v2_model_inner(app: &AppHandle, model_id: &str) -> Result<(), V2ModelError> {
    let item = find_catalog_item(model_id)
        .ok_or_else(|| V2ModelError::ModelNotFound(model_id.to_string()))?;

    if item.manual_install {
        return Err(V2ModelError::DownloadFailed(
            "Moonshine is installed manually — see install notes".into(),
        ));
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

    match item.id {
        "silero_vad" | "qwen2_5_3b" => {
            if let Some(parent) = local_path.parent() {
                fs::create_dir_all(parent)?;
            }
            download_file_with_resume(app, model_id, url, &local_path).await?;
            if let Some(expected) = item.sha256 {
                verify_sha256(&local_path, expected)?;
            }
        }
        "parakeet_tdt_v2" => {
            let archive_path = root.join("parakeet-tdt-v2.tar.bz2");
            download_file_with_resume(app, model_id, url, &archive_path).await?;
            if let Some(expected) = item.sha256 {
                verify_sha256(&archive_path, expected)?;
            }
            extract_parakeet_archive(&archive_path, &local_path)?;
            let _ = fs::remove_file(&archive_path);
            parakeet_sidecar::ensure_sidecar_installed(app)
                .await
                .map_err(|e| V2ModelError::DownloadFailed(e))?;
        }
        _ => {
            return Err(V2ModelError::ModelNotFound(model_id.to_string()));
        }
    }

    write_status(app, model_id, V2ModelStatus::Downloaded)?;
    emit_download_progress(app, model_id, 100, "complete");
    let _ = app.emit("v2-model-download-complete", model_id);
    Ok(())
}

async fn ensure_required_v2_models(app: &AppHandle) -> Result<(), String> {
    let _ = copy_bundled_silero_if_available(app).map_err(|e| e.to_string());

    for model_id in REQUIRED_TOGGLE_MODEL_IDS {
        download_v2_model_inner(app, model_id)
            .await
            .map_err(|e| format!("Failed to download {model_id}: {e}"))?;
    }

    parakeet_sidecar::ensure_sidecar_installed(app)
        .await
        .map_err(|e| format!("Failed to install Parakeet sidecar: {e}"))?;

    Ok(())
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
    if is_toggle_ready() {
        let _ = app.emit("v2-models-ready", ());
        bootstrap_optional_llm(&app).await;
        return;
    }

    emit_download_progress(&app, "bootstrap", 0, "downloading");

    match ensure_required_v2_models(&app).await {
        Ok(()) => {
            emit_download_progress(&app, "bootstrap", 100, "complete");
            let _ = app.emit("v2-models-ready", ());
            bootstrap_optional_llm(&app).await;
        }
        Err(error) => {
            crate::speech::stt_log::error("bootstrap", &format!("Required models failed: {error}"));
            emit_download_progress(&app, "bootstrap", 0, "error");
            let _ = app.emit("v2-bootstrap-failed", error);
        }
    }
}

/// Auto-download speech models required for offline toggle dictation (non-blocking).
pub fn bootstrap_required_models(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        run_first_run_bootstrap(app).await;
    });
}

/// Whether Silero VAD, Parakeet model, and sherpa sidecar are all present.
#[tauri::command]
pub fn is_v2_toggle_ready() -> bool {
    is_toggle_ready()
}

/// Re-run required-model bootstrap (e.g. after a failed first-run download).
#[tauri::command]
pub async fn retry_v2_bootstrap(app: AppHandle) {
    run_first_run_bootstrap(app).await;
}

pub fn models_root() -> Result<PathBuf, V2ModelError> {
    let root = vad::v2_models_dir().ok_or_else(|| {
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

fn parakeet_ready(path: &Path) -> bool {
    path.join("model.onnx").exists()
        || path.join("encoder.onnx").exists()
        || path.join("tokens.txt").exists()
}

fn moonshine_ready(path: &Path) -> bool {
    path.join("encoder_model.ort").is_file()
}

fn detect_disk_status(item: &CatalogItem, local_path: &Path) -> bool {
    if item.manual_install {
        return moonshine_ready(local_path);
    }

    match item.id {
        "silero_vad" => local_path.is_file(),
        "parakeet_tdt_v2" => parakeet_ready(local_path),
        "qwen2_5_3b" => local_path.is_file(),
        _ => local_path.exists(),
    }
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
        if item.id == "moonshine_medium" && crate::speech::moonshine_ffi::is_available() {
            let _ = write_status(app, item.id, V2ModelStatus::Downloaded);
            return V2ModelStatus::Downloaded;
        }
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

fn extract_parakeet_archive(archive_path: &Path, dest_dir: &Path) -> Result<(), V2ModelError> {
    fs::create_dir_all(dest_dir)?;
    let file = fs::File::open(archive_path)?;
    let decompressor = bzip2::read::BzDecoder::new(file);
    let mut archive = tar::Archive::new(decompressor);

    archive
        .unpack(dest_dir)
        .map_err(|e| V2ModelError::IoError(format!("Failed to extract Parakeet archive: {e}")))?;

    // Sherpa tarballs often contain a single top-level directory — flatten if needed.
    if !parakeet_ready(dest_dir) {
        if let Ok(entries) = fs::read_dir(dest_dir) {
            let subdirs: Vec<PathBuf> = entries
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.is_dir())
                .collect();
            if subdirs.len() == 1 {
                let inner = &subdirs[0];
                if let Ok(inner_entries) = fs::read_dir(inner) {
                    for entry in inner_entries.flatten() {
                        let from = entry.path();
                        let to = dest_dir.join(entry.file_name());
                        if to.exists() {
                            if to.is_dir() {
                                fs::remove_dir_all(&to)?;
                            } else {
                                fs::remove_file(&to)?;
                            }
                        }
                        fs::rename(from, to)?;
                    }
                }
                let _ = fs::remove_dir(inner);
            }
        }
    }

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
            "Moonshine is managed manually".into(),
        ));
    }

    let root = models_root()?;
    let local_path = item_local_path(&root, &item);

    if local_path.is_file() && local_path.exists() {
        fs::remove_file(&local_path)?;
    } else if local_path.is_dir() && local_path.exists() {
        fs::remove_dir_all(&local_path)?;
    }

    let partial = match item.id {
        "parakeet_tdt_v2" => Some(root.join("parakeet-tdt-v2.tar.partial")),
        "qwen2_5_3b" => Some(local_path.with_extension("partial")),
        _ => Some(local_path.with_extension("partial")),
    };
    if let Some(p) = partial {
        if p.exists() {
            let _ = fs::remove_file(p);
        }
    }

    write_status(&app, &model_id, V2ModelStatus::NotDownloaded)?;
    let _ = app.emit("v2-model-delete-complete", model_id);
    Ok(())
}
