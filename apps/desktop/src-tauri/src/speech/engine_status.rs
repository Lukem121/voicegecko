//! Whisper availability checks with human-readable reasons for Speed & accuracy.

use crate::dictation::types::EngineId;
use tauri::AppHandle;

pub struct EngineAvailability {
    pub available: bool,
    pub reason: Option<String>,
}

pub fn evaluate(app: &AppHandle, id: EngineId) -> EngineAvailability {
    match id {
        EngineId::InsanelyFastWhisper => evaluate_gpu_whisper(app),
    }
}

fn evaluate_gpu_whisper(app: &AppHandle) -> EngineAvailability {
    if crate::speech::whisper_sidecar::is_ready_for_app(app) {
        return EngineAvailability {
            available: true,
            reason: None,
        };
    }

    let sidecar = crate::speech::whisper_sidecar::is_sidecar_installed();
    let model_id = crate::speech::whisper_sidecar::selected_model_id(app);
    let model = crate::speech::whisper_sidecar::whisper_model_path_for_app(app).is_some();

    let reason = if !sidecar && !model {
        format!("WhisperSidecar and ggml-{model_id}.bin model missing")
    } else if !sidecar {
        "WhisperSidecar not installed — restart the app".to_string()
    } else {
        format!("ggml-{model_id}.bin not downloaded — download it from Speed & accuracy")
    };

    EngineAvailability {
        available: false,
        reason: Some(reason),
    }
}
