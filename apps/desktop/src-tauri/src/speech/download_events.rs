use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use tauri::Emitter;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct V2ModelDownloadProgressEvent {
    pub model_id: String,
    pub progress: u8,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct LastSetupProgress {
    pub model_id: String,
    pub progress: u8,
    pub status: String,
}

fn last_progress() -> &'static Mutex<Option<LastSetupProgress>> {
    static LAST: OnceLock<Mutex<Option<LastSetupProgress>>> = OnceLock::new();
    LAST.get_or_init(|| Mutex::new(None))
}

pub fn current_setup_progress() -> Option<LastSetupProgress> {
    last_progress().lock().ok()?.clone()
}

pub fn emit_download_progress(
    app: &tauri::AppHandle,
    model_id: &str,
    progress: u8,
    status: &str,
) {
    if let Ok(mut guard) = last_progress().lock() {
        *guard = Some(LastSetupProgress {
            model_id: model_id.to_string(),
            progress,
            status: status.to_string(),
        });
    }
    let _ = app.emit(
        "v2-model-download-progress",
        V2ModelDownloadProgressEvent {
            model_id: model_id.to_string(),
            progress,
            status: status.to_string(),
        },
    );
}
