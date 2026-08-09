use serde::Serialize;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct V2ModelDownloadProgressEvent {
    pub model_id: String,
    pub progress: u8,
    pub status: String,
}

pub fn emit_download_progress(
    app: &tauri::AppHandle,
    model_id: &str,
    progress: u8,
    status: &str,
) {
    let _ = app.emit(
        "v2-model-download-progress",
        V2ModelDownloadProgressEvent {
            model_id: model_id.to_string(),
            progress,
            status: status.to_string(),
        },
    );
}
