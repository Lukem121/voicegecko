use crate::context::window::gather_active_window_context;
use parking_lot::RwLock;
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IntentProfile {
    General,
    Developer,
    Formal,
    Chat,
    Raw,
}

impl IntentProfile {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::General => "general",
            Self::Developer => "developer",
            Self::Formal => "formal",
            Self::Chat => "chat",
            Self::Raw => "raw",
        }
    }
}

static INTENT_ENABLED: OnceLock<RwLock<bool>> = OnceLock::new();

fn intent_enabled_store() -> &'static RwLock<bool> {
    INTENT_ENABLED.get_or_init(|| RwLock::new(true))
}

pub fn set_intent_enabled(enabled: bool) {
    *intent_enabled_store().write() = enabled;
}

pub fn is_intent_enabled() -> bool {
    if !crate::dictation::features::get_feature_flags().local_llm_polish {
        return false;
    }
    *intent_enabled_store().read()
}

pub fn detect_profile(text: &str) -> IntentProfile {
    let ctx = gather_active_window_context();
    let title_lower = ctx.title.to_lowercase();
    let process_lower = ctx.process_name.unwrap_or_default().to_lowercase();

    if process_lower.contains("code")
        || process_lower.contains("cursor")
        || process_lower.contains("devenv")
        || title_lower.contains("visual studio")
        || title_lower.contains(".rs")
        || title_lower.contains(".ts")
    {
        return IntentProfile::Developer;
    }

    if title_lower.contains("slack") || title_lower.contains("discord") {
        return IntentProfile::Chat;
    }

    if title_lower.contains("outlook")
        || process_lower.contains("winword")
        || title_lower.contains("word")
    {
        return IntentProfile::Formal;
    }

    if text.split_whitespace().count() > 80 {
        return IntentProfile::Formal;
    }

    IntentProfile::General
}

pub async fn format_with_intent(
    text: &str,
    dictionary: Option<&str>,
    app: Option<&tauri::AppHandle>,
) -> Result<String, String> {
    let profile = detect_profile(text);
    super::llama_server::polish_text_with_profile(text, profile, dictionary, app).await
}
