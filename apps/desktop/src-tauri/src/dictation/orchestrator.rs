use std::sync::Arc;
use tauri::{AppHandle, Manager};

use crate::audio::types::PcmBuffer;
use crate::dictation::session::DictationSessionManager;
use crate::dictation::types::InteractionMode;

pub struct DictationOrchestrator;

impl DictationOrchestrator {
    pub fn finish_capture(app: AppHandle, pcm: PcmBuffer) {
        let app_for_dictation = app.clone();
        tauri::async_runtime::spawn(async move {
            let manager: Arc<DictationSessionManager> = app_for_dictation
                .state::<Arc<DictationSessionManager>>()
                .inner()
                .clone();

            let is_hands_free = manager
                .get_status()
                .map(|s| s.mode == InteractionMode::HandsFree.as_str())
                .unwrap_or(false);

            if is_hands_free {
                manager.stop_hands_free_session(app_for_dictation);
            } else {
                let _ = manager.stop_session_and_transcribe(app_for_dictation, pcm);
            }
        });
    }

    pub fn cancel(app: &AppHandle) {
        if let Some(manager) = app.try_state::<Arc<DictationSessionManager>>() {
            let _ = manager.cancel_session(app);
        }
    }
}
