use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use crate::context::window::gather_active_window_context;
use crate::intent::profiles::IntentProfile;

/// Max Whisper initial-prompt length (model limit is ~224 tokens).
const MAX_HINT_CHARS: usize = 900;

const DEVELOPER_SEED: &str = "Software engineering discussion with AI coding agents. \
TypeScript, JavaScript, Rust, React, Tauri, async, await, API, git, npm, Cursor, VoiceGecko.";

pub struct TranscriptionHintState {
    hint: Mutex<Option<String>>,
    dev_context: Mutex<Option<String>>,
}

impl TranscriptionHintState {
    pub fn new() -> Self {
        Self {
            hint: Mutex::new(None),
            dev_context: Mutex::new(None),
        }
    }

    pub fn set_session(
        &self,
        hint: Option<String>,
        dev_context: Option<String>,
    ) {
        *self.hint.lock() = hint.filter(|h| !h.trim().is_empty());
        *self.dev_context.lock() = dev_context.filter(|c| !c.trim().is_empty());
    }

    pub fn clear_session(&self) {
        *self.hint.lock() = None;
        *self.dev_context.lock() = None;
    }

    pub fn hint(&self) -> Option<String> {
        self.hint.lock().clone()
    }

    pub fn dev_context(&self) -> Option<String> {
        self.dev_context.lock().clone()
    }
}

impl Default for TranscriptionHintState {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_session_hint(app: &AppHandle) -> Option<String> {
    app.try_state::<TranscriptionHintState>()
        .and_then(|s| s.hint())
}

pub fn get_dev_context(app: &AppHandle) -> Option<String> {
    app.try_state::<TranscriptionHintState>()
        .and_then(|s| s.dev_context())
}

pub fn prepare_session(
    app: &AppHandle,
    dev_context: Option<&str>,
    force_developer_profile: bool,
    dictionary: Option<&str>,
) {
    let window = gather_active_window_context();
    let profile = if force_developer_profile {
        IntentProfile::Developer
    } else {
        crate::intent::profiles::detect_profile_from_window(&window)
    };

    let hint = build_transcription_hint(
        profile,
        dev_context,
        dictionary,
        Some(&window.title),
    );

    let dev = dev_context.map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);

    if let Some(store) = app.try_state::<TranscriptionHintState>() {
        store.set_session(hint, dev);
    }
}

pub fn clear_session(app: &AppHandle) {
    if let Some(store) = app.try_state::<TranscriptionHintState>() {
        store.clear_session();
    }
}

pub fn build_transcription_hint(
    profile: IntentProfile,
    dev_context: Option<&str>,
    dictionary: Option<&str>,
    window_title: Option<&str>,
) -> Option<String> {
    let mut segments: Vec<String> = Vec::new();

    if profile == IntentProfile::Developer {
        segments.push(DEVELOPER_SEED.to_string());
    }

    if let Some(ctx) = dev_context.map(str::trim).filter(|s| !s.is_empty()) {
        segments.push(format!("Context: {ctx}"));
    }

    if let Some(title) = window_title.map(str::trim).filter(|s| !s.is_empty()) {
        segments.push(format!("Active window: {title}"));
    }

    if let Some(words) = dictionary.map(str::trim).filter(|s| !s.is_empty()) {
        segments.push(format!("Vocabulary: {words}"));
    }

    if segments.is_empty() {
        return None;
    }

    let mut combined = segments.join(" ");
    if combined.len() > MAX_HINT_CHARS {
        combined.truncate(MAX_HINT_CHARS);
        if let Some(last_space) = combined.rfind(' ') {
            combined.truncate(last_space);
        }
    }

    Some(combined)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn developer_hint_includes_seed_and_dictionary() {
        let hint = build_transcription_hint(
            IntentProfile::Developer,
            Some("VoiceGecko desktop app"),
            Some("useState, Tauri"),
            Some("session.rs — voicegecko"),
        )
        .expect("hint");

        assert!(hint.contains("Software engineering"));
        assert!(hint.contains("VoiceGecko desktop app"));
        assert!(hint.contains("useState"));
        assert!(hint.contains("session.rs"));
    }

    #[test]
    fn general_profile_omits_developer_seed() {
        let hint = build_transcription_hint(
            IntentProfile::General,
            None,
            Some("Acme Corp"),
            None,
        )
        .expect("hint");

        assert!(!hint.contains("coding agents"));
        assert!(hint.contains("Acme Corp"));
    }
}
