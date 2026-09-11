use std::sync::Arc;
use tauri::Manager;

use crate::audio::types::PcmBuffer;
use crate::dictation::session::DictationSessionManager;

pub struct DictationOrchestrator;

impl DictationOrchestrator {
    pub fn finish_capture(app: tauri::AppHandle, pcm: PcmBuffer) {
        let app_for_dictation = app.clone();
        tauri::async_runtime::spawn(async move {
            let manager: Arc<DictationSessionManager> = app_for_dictation
                .state::<Arc<DictationSessionManager>>()
                .inner()
                .clone();
            let _ = manager.stop_session_and_transcribe(app_for_dictation, pcm);
        });
    }

    pub fn cancel(app: &tauri::AppHandle) {
        if let Some(manager) = app.try_state::<Arc<DictationSessionManager>>() {
            let _ = manager.cancel_session(app);
        }
    }
}
