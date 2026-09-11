//! Persistent llama-server child process for local LLM polish.

use futures_util::StreamExt;
use parking_lot::Mutex;
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use zip::ZipArchive;

use crate::dictation::features;
use crate::intent::profiles;
use crate::speech::download_events::emit_download_progress;

const DEFAULT_PORT: u16 = 8080;
const LLAMA_CPU_ZIP_URL: &str =
    "https://github.com/ggml-org/llama.cpp/releases/download/b7600/llama-b7600-bin-win-cpu-x64.zip";

pub struct LlamaProcessManager {
    child: Mutex<Option<Child>>,
    port: u16,
    starting: AtomicBool,
}

impl LlamaProcessManager {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            port: DEFAULT_PORT,
            starting: AtomicBool::new(false),
        }
    }

    pub fn should_prewarm() -> bool {
        let flags = features::get_feature_flags();
        flags.local_llm_polish && profiles::is_intent_enabled()
    }

    pub fn base_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }

    pub fn llama_local_dir() -> PathBuf {
        dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("voicegecko")
            .join("binaries")
            .join("llama")
            .join("win-x64")
    }

    pub fn llama_server_binary(app: &AppHandle) -> Option<PathBuf> {
        let local = Self::llama_local_dir().join("llama-server.exe");
        if local.exists() {
            return Some(local);
        }

        let candidates = [
            app.path()
                .resolve(
                    "resources/binaries/llama/win-x64/llama-server.exe",
                    tauri::path::BaseDirectory::Resource,
                )
                .ok(),
            Some(
                std::env::current_dir()
                    .unwrap_or_default()
                    .join("apps/desktop/src-tauri/resources/binaries/llama/win-x64/llama-server.exe"),
            ),
            Some(PathBuf::from(
                "apps/desktop/src-tauri/resources/binaries/llama/win-x64/llama-server.exe",
            )),
        ];

        candidates.into_iter().flatten().find(|p| p.exists())
    }

    pub fn find_gguf_model() -> Option<PathBuf> {
        let llm_dir = crate::speech::models::v2_models_dir()?.join("llm");
        if !llm_dir.exists() {
            return None;
        }

        let preferred = llm_dir.join("qwen2.5-3b-instruct-q4_k_m.gguf");
        if preferred.exists() {
            return Some(preferred);
        }

        fs::read_dir(&llm_dir)
            .ok()?
            .flatten()
            .map(|e| e.path())
            .find(|p| {
                p.extension()
                    .and_then(|ext| ext.to_str())
                    .is_some_and(|ext| ext.eq_ignore_ascii_case("gguf"))
            })
    }

    fn emit_llama_progress(app: &AppHandle, progress: u8, status: &str) {
        emit_download_progress(app, "llama_server", progress, status);
    }

    fn copy_bundled_llama_binary(app: &AppHandle) -> Result<Option<PathBuf>, String> {
        let dest_dir = Self::llama_local_dir();
        let dest = dest_dir.join("llama-server.exe");
        if dest.exists() {
            return Ok(Some(dest));
        }

        let bundled = app
            .path()
            .resolve(
                "resources/binaries/llama/win-x64/llama-server.exe",
                tauri::path::BaseDirectory::Resource,
            )
            .ok()
            .filter(|path| path.exists());

        let Some(src) = bundled else {
            return Ok(None);
        };

        fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
        fs::copy(&src, &dest).map_err(|e| e.to_string())?;
        Ok(Some(dest))
    }

    fn extract_zip_to_dir(archive_bytes: &[u8], dest_dir: &PathBuf) -> Result<(), String> {
        fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;
        let reader = std::io::Cursor::new(archive_bytes);
        let mut archive = ZipArchive::new(reader).map_err(|e| e.to_string())?;

        for index in 0..archive.len() {
            let mut file = archive.by_index(index).map_err(|e| e.to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => dest_dir.join(path),
                None => continue,
            };

            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
                continue;
            }

            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }

            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub async fn ensure_llama_server_binary(app: &AppHandle) -> Result<PathBuf, String> {
        if let Some(path) = Self::llama_server_binary(app) {
            return Ok(path);
        }

        if let Some(path) = Self::copy_bundled_llama_binary(app)? {
            Self::emit_llama_progress(app, 100, "complete");
            return Ok(path);
        }

        Self::emit_llama_progress(app, 0, "downloading");

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(900))
            .build()
            .map_err(|e| e.to_string())?;

        let response = client
            .get(LLAMA_CPU_ZIP_URL)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!(
                "llama-server download failed: HTTP {}",
                response.status()
            ));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut archive_bytes = Vec::new();
        let mut stream = response.bytes_stream();
        let mut downloaded = 0u64;
        let mut last_progress = 0u8;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;
            archive_bytes.extend_from_slice(&chunk);

            let progress = if total_size > 0 {
                ((downloaded as f64 / total_size as f64) * 100.0) as u8
            } else {
                0
            };

            if progress >= last_progress.saturating_add(5) || progress == 100 {
                Self::emit_llama_progress(app, progress, "downloading");
                last_progress = progress;
            }
        }

        let dest_dir = Self::llama_local_dir();
        Self::extract_zip_to_dir(&archive_bytes, &dest_dir)?;

        let exe = dest_dir.join("llama-server.exe");
        if !exe.exists() {
            return Err("llama-server.exe not found after extracting release zip".into());
        }

        Self::emit_llama_progress(app, 100, "complete");
        Ok(exe)
    }

    fn child_running(child: &mut Child) -> bool {
        match child.try_wait() {
            Ok(None) => true,
            Ok(Some(_)) => false,
            Err(_) => false,
        }
    }

    pub fn is_running(&self) -> bool {
        let mut guard = self.child.lock();
        if let Some(child) = guard.as_mut() {
            if Self::child_running(child) {
                return true;
            }
            *guard = None;
        }
        false
    }

    pub fn kill(&self) {
        let mut guard = self.child.lock();
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    pub async fn health_check(&self) -> bool {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build();

        let Ok(client) = client else {
            return false;
        };

        let base = self.base_url();
        for path in ["/health", "/v1/models"] {
            if let Ok(response) = client.get(format!("{base}{path}")).send().await {
                if response.status().is_success() {
                    return true;
                }
            }
        }
        false
    }

    pub async fn ensure_running(&self, app: &AppHandle) -> Result<(), String> {
        if self.is_running() && self.health_check().await {
            return Ok(());
        }

        if self.starting.swap(true, Ordering::SeqCst) {
            for _ in 0..40 {
                tokio::time::sleep(Duration::from_millis(250)).await;
                if self.health_check().await {
                    self.starting.store(false, Ordering::SeqCst);
                    return Ok(());
                }
            }
            self.starting.store(false, Ordering::SeqCst);
            return Err("Timed out waiting for llama-server startup".into());
        }

        let result = self.spawn(app).await;
        self.starting.store(false, Ordering::SeqCst);
        result
    }

    async fn spawn(&self, app: &AppHandle) -> Result<(), String> {
        self.kill();

        let binary = Self::ensure_llama_server_binary(app).await?;

        let model = Self::find_gguf_model()
            .ok_or_else(|| "No GGUF model found under voicegecko/models/llm/".to_string())?;

        let mut command = Command::new(&binary);
        command
            .arg("--model")
            .arg(model)
            .arg("--port")
            .arg(self.port.to_string())
            .arg("--ctx-size")
            .arg("4096")
            .arg("--threads")
            .arg("6")
            .arg("--n-gpu-layers")
            .arg("0")
            .arg("--log-disable")
            .arg("--no-webui")
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        let child = command
            .spawn()
            .map_err(|e| format!("Failed to spawn llama-server: {e}"))?;
        *self.child.lock() = Some(child);

        for _ in 0..60 {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if self.health_check().await {
                return Ok(());
            }
            if !self.is_running() {
                return Err("llama-server exited during startup".into());
            }
        }

        self.kill();
        Err("llama-server failed health check after startup".into())
    }

    pub async fn prewarm(app: AppHandle) {
        if !Self::should_prewarm() {
            return;
        }
        if Self::find_gguf_model().is_none() {
            return;
        }
        if let Some(manager) = app.try_state::<std::sync::Arc<LlamaProcessManager>>() {
            let _ = manager.ensure_running(&app).await;
        }
    }
}

impl Default for LlamaProcessManager {
    fn default() -> Self {
        Self::new()
    }
}
