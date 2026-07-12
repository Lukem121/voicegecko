//! Per-engine availability checks with human-readable reasons for Engine Lab.

use crate::dictation::types::EngineId;
use tauri::AppHandle;

pub struct EngineAvailability {
    pub available: bool,
    pub reason: Option<String>,
}

pub fn evaluate(app: &AppHandle, id: EngineId) -> EngineAvailability {
    match id {
        EngineId::ParakeetTdtV2 => evaluate_parakeet(),
        EngineId::MoonshineMedium => evaluate_moonshine(),
        EngineId::Gpt4oTranscribe | EngineId::Gpt4oMiniTranscribe => evaluate_cloud(),
        EngineId::InsanelyFastWhisper => evaluate_gpu_whisper(app),
    }
}

fn evaluate_parakeet() -> EngineAvailability {
    if !crate::speech::models::is_toggle_ready() {
        let silero = crate::speech::vad::silero_vad_model_path()
            .map(|p| p.is_file())
            .unwrap_or(false);
        let sidecar = crate::speech::parakeet_sidecar::is_sidecar_available();
        let reason = if !silero && !sidecar {
            "Missing Silero VAD model and Sherpa sidecar".to_string()
        } else if !silero {
            "Missing Silero VAD model".to_string()
        } else if !sidecar {
            "Missing Sherpa sidecar (sherpa-onnx-offline.exe)".to_string()
        } else {
            "Parakeet ONNX model pack incomplete".to_string()
        };
        return EngineAvailability {
            available: false,
            reason: Some(reason),
        };
    }
    EngineAvailability {
        available: true,
        reason: None,
    }
}

fn evaluate_moonshine() -> EngineAvailability {
    if crate::speech::moonshine_ffi::is_available() {
        return EngineAvailability {
            available: true,
            reason: None,
        };
    }
    EngineAvailability {
        available: false,
        reason: Some(crate::speech::moonshine_ffi::availability_status()),
    }
}

fn evaluate_cloud() -> EngineAvailability {
    match std::env::var("OPENAI_API_KEY") {
        Ok(key) if !key.trim().is_empty() => EngineAvailability {
            available: true,
            reason: None,
        },
        Ok(_) => EngineAvailability {
            available: false,
            reason: Some("Cloud API key is empty".into()),
        },
        Err(_) => EngineAvailability {
            available: false,
            reason: Some("Cloud transcription is not configured".into()),
        },
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
        format!(
            "WhisperSidecar and ggml-{model_id}.bin model missing"
        )
    } else if !sidecar {
        "WhisperSidecar not installed — restart app or run optional bootstrap".to_string()
    } else {
        format!(
            "ggml-{model_id}.bin not downloaded — download from Engine Lab → GPU Whisper model"
        )
    };

    EngineAvailability {
        available: false,
        reason: Some(reason),
    }
}
