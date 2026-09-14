use crate::dictation::dictionary_cache::DictionaryPromptCache;
use crate::dictation::features::FeatureFlags;
use crate::dictation::session::{DictationSessionManager, EngineStatusItem};
use crate::dictation::types::{SessionStatus, StartSessionRequest, WhisperModelCompareResponse};
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
pub fn list_local_dictionary(
    app: tauri::AppHandle,
    sort_by: Option<String>,
) -> Result<Vec<crate::db::LocalDictionaryRow>, String> {
    let db = crate::db::open_db(&app)?;
    crate::db::list_dictionary_words(&db, sort_by.as_deref().unwrap_or("alphabetical"))
}

#[tauri::command]
pub fn add_local_dictionary_word(
    app: tauri::AppHandle,
    word: String,
    cache: tauri::State<'_, DictionaryPromptCache>,
) -> Result<crate::db::LocalDictionaryRow, String> {
    let db = crate::db::open_db(&app)?;
    let row = crate::db::add_dictionary_word(&db, &word)?;
    if let Ok(Some(prompt)) = crate::db::get_dictionary_prompt(&db) {
        cache.set(Some(prompt));
    }
    Ok(row)
}

#[tauri::command]
pub fn update_local_dictionary_word(
    app: tauri::AppHandle,
    id: String,
    word: String,
    cache: tauri::State<'_, DictionaryPromptCache>,
) -> Result<crate::db::LocalDictionaryRow, String> {
    let db = crate::db::open_db(&app)?;
    let row = crate::db::update_dictionary_word(&db, &id, &word)?;
    if let Ok(Some(prompt)) = crate::db::get_dictionary_prompt(&db) {
        cache.set(Some(prompt));
    } else {
        cache.set(None);
    }
    Ok(row)
}

#[tauri::command]
pub fn delete_local_dictionary_word(
    app: tauri::AppHandle,
    id: String,
    cache: tauri::State<'_, DictionaryPromptCache>,
) -> Result<(), String> {
    let db = crate::db::open_db(&app)?;
    crate::db::delete_dictionary_word(&db, &id)?;
    if let Ok(Some(prompt)) = crate::db::get_dictionary_prompt(&db) {
        cache.set(Some(prompt));
    } else {
        cache.set(None);
    }
    Ok(())
}

#[tauri::command]
pub fn set_intent_enabled(enabled: bool) {
    crate::intent::profiles::set_intent_enabled(enabled);
}

#[tauri::command]
pub async fn compare_ready_whisper_models_on_samples(
    app: AppHandle,
    manager: State<'_, Arc<DictationSessionManager>>,
) -> Result<WhisperModelCompareResponse, String> {
    let (samples, sample_rate) = manager.last_compare_samples()?;
    crate::speech::whisper_sidecar::compare_ready_models_on_samples(&app, &samples, sample_rate)
}

#[tauri::command]
pub async fn score_whisper_models_on_last_clip(
    app: AppHandle,
    manager: State<'_, Arc<DictationSessionManager>>,
    model_ids: Vec<String>,
) -> Result<WhisperModelCompareResponse, String> {
    let (samples, sample_rate) = manager.last_compare_samples()?;
    crate::speech::whisper_sidecar::score_models_on_samples(&app, &samples, sample_rate, &model_ids)
}

#[tauri::command]
pub fn list_local_dictations(
    app: tauri::AppHandle,
    limit: Option<usize>,
    search: Option<String>,
    cursor: Option<String>,
) -> Result<Vec<crate::db::LocalDictationRow>, String> {
    let db = crate::db::open_db(&app)?;
    crate::db::list_local_dictations_filtered(
        &db,
        limit.unwrap_or(50),
        search.as_deref(),
        cursor.as_deref(),
    )
}

#[tauri::command]
pub fn delete_local_dictation(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = crate::db::open_db(&app)?;
    crate::db::delete_local_dictation(&db, &id)
}

#[tauri::command]
pub fn count_local_dictations(
    app: tauri::AppHandle,
    search: Option<String>,
) -> Result<usize, String> {
    let db = crate::db::open_db(&app)?;
    crate::db::count_local_dictations(&db, search.as_deref())
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
