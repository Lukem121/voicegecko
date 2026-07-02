use crate::dictation::dictionary_cache::DictionaryPromptCache;
use crate::dictation::features::FeatureFlags;
use crate::dictation::session::{DictationSessionManager, EngineStatusItem};
use crate::dictation::types::{EngineCompareResponse, SessionStatus, StartSessionRequest};
use crate::modules::audio::AudioData;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn start_dictation_session(
    app: AppHandle,
    request: StartSessionRequest,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<SessionStatus, String> {
    manager.start_session(app, request)
}

#[tauri::command]
pub async fn stop_dictation_session(
    app: AppHandle,
    audio_data: AudioData,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<(), String> {
    manager.stop_session_and_transcribe(app, audio_data)
}

#[tauri::command]
pub fn get_dictation_session_status(
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Option<SessionStatus> {
    manager.get_status()
}

#[tauri::command]
pub fn cancel_dictation_session(
    app: tauri::AppHandle,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<(), String> {
    manager.cancel_session(&app)
}

#[tauri::command]
pub async fn confirm_dictation_paste(
    app: AppHandle,
    session_id: String,
    text: String,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<(), String> {
    manager
        .confirm_dictation_paste(app, session_id, text)
        .await
}

#[tauri::command]
pub async fn prewarm_engines(
    app: AppHandle,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<(), String> {
    manager.prewarm_engines(&app).await
}

#[tauri::command]
pub async fn bootstrap_optional_engines(
    app: AppHandle,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<(), String> {
    manager.bootstrap_optional_engines(&app).await
}

#[tauri::command]
pub fn get_engine_status(
    app: AppHandle,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Vec<EngineStatusItem> {
    manager.engine_status(&app)
}

#[tauri::command]
pub fn set_feature_flags(flags: FeatureFlags) {
    crate::dictation::features::set_feature_flags(flags);
}

#[tauri::command]
pub fn get_feature_flags() -> FeatureFlags {
    crate::dictation::features::get_feature_flags()
}

#[tauri::command]
pub fn list_dictation_engines(
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Vec<(String, String, bool)> {
    manager.list_engines()
}

#[tauri::command]
pub async fn undo_last_dictation(app: AppHandle) -> Result<(), String> {
    crate::inject::undo::hydrate_from_db();

    let Some((_, text, pasted, previous_clipboard)) = crate::inject::undo::pop_last() else {
        return Err("Nothing to undo".into());
    };

    if pasted {
        crate::inject::undo::undo_pasted_chars(text.chars().count())?;
    }

    if let Some(prev) = previous_clipboard {
        crate::inject::clipboard::copy_to_clipboard(&app, &prev).await?;
    }

    Ok(())
}

#[tauri::command]
pub fn set_dictionary_prompt_cache(
    prompt: Option<String>,
    cache: tauri::State<'_, DictionaryPromptCache>,
) {
    cache.set(prompt);
}

#[tauri::command]
pub fn get_dictionary_prompt_cache(
    cache: tauri::State<'_, DictionaryPromptCache>,
) -> Option<String> {
    cache.get()
}

#[tauri::command]
pub fn get_local_dictionary_prompt(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let db = crate::db::open_db(&app)?;
    crate::db::get_dictionary_prompt(&db)
}

#[tauri::command]
pub fn sync_local_dictionary_words(
    app: tauri::AppHandle,
    words: Vec<String>,
) -> Result<(), String> {
    let db = crate::db::open_db(&app)?;
    for word in words {
        let trimmed = word.trim();
        if !trimmed.is_empty() {
            crate::db::upsert_dictionary_word(&db, trimmed)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_intent_enabled(enabled: bool) {
    crate::intent::profiles::set_intent_enabled(enabled);
}

#[tauri::command]
pub async fn compare_engines_on_samples(
    app: AppHandle,
    samples: Option<Vec<f32>>,
    sample_rate: Option<u32>,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<EngineCompareResponse, String> {
    let (samples, sample_rate) = if let (Some(samples), Some(sample_rate)) = (samples, sample_rate) {
        (samples, sample_rate)
    } else {
        manager.last_compare_samples()?
    };

    manager
        .compare_engines_on_samples(&app, samples, sample_rate)
        .await
}

#[tauri::command]
pub fn list_local_dictations(
    app: tauri::AppHandle,
    limit: Option<usize>,
) -> Result<Vec<crate::db::LocalDictationRow>, String> {
    let db = crate::db::open_db(&app)?;
    crate::db::list_local_dictations(&db, limit.unwrap_or(50))
}

#[tauri::command]
pub fn save_engine_feedback(
    app: tauri::AppHandle,
    engine_id: String,
    clip_id: Option<String>,
    rating: i32,
    notes: Option<String>,
) -> Result<(), String> {
    let db = crate::db::open_db(&app)?;
    crate::db::save_engine_feedback(
        &db,
        &engine_id,
        clip_id.as_deref(),
        rating,
        notes.as_deref(),
    )
}
