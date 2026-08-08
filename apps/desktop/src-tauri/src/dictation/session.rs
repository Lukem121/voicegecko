use crate::dictation::config::ModeConfig;
use crate::dictation::hands_free::HandsFreeController;
use crate::dictation::registry::EngineRegistry;
use crate::dictation::streaming::StreamingPipeline;
use crate::dictation::types::{
    DictationEvent, EngineCompareResult, EngineCompareResponse, EngineId, InteractionMode,
    OutputTarget, SessionPhase, SessionStatus, StartSessionRequest,
};
use crate::audio::StreamingAudioHub;
use crate::inject::{clipboard, undo};
use crate::intent::profiles;
use crate::speech::spoken_commands;
use crate::audio::AudioData;
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::Arc;
use once_cell::sync::Lazy;
use tauri::{AppHandle, Emitter, Manager};

static LAST_COMPARE_SAMPLES: Lazy<Mutex<Option<(Vec<f32>, u32)>>> =
    Lazy::new(|| Mutex::new(None));

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatusItem {
    pub id: String,
    pub name: String,
    pub available: bool,
    pub enabled: bool,
    pub supports_streaming: bool,
    pub unavailable_reason: Option<String>,
}

pub struct DictationSessionManager {
    registry: Arc<EngineRegistry>,
    active: Mutex<Option<ActiveSession>>,
    streaming: StreamingPipeline,
}

struct ActiveSession {
    session_id: String,
    mode: InteractionMode,
    engine_id: EngineId,
    output_target: OutputTarget,
    show_live_preview: bool,
    phase: SessionPhase,
    is_recording: bool,
}

impl DictationSessionManager {
    pub fn new() -> Self {
        Self {
            registry: Arc::new(EngineRegistry::new()),
            active: Mutex::new(None),
            streaming: StreamingPipeline::new(),
        }
    }

    fn stop_streaming(&self, app: &AppHandle) {
        if let Some(hub) = app.try_state::<Arc<StreamingAudioHub>>() {
            self.streaming.stop(&hub);
        }
    }

    fn emit(&self, app: &AppHandle, event: DictationEvent) {
        let _ = app.emit(DictationEvent::event_name(), event);
    }

    fn emit_phase(&self, app: &AppHandle, session_id: &str, phase: SessionPhase) {
        self.emit(
            app,
            DictationEvent::PhaseChanged {
                session_id: session_id.to_string(),
                phase: format!("{:?}", phase).to_lowercase(),
            },
        );
    }

    pub fn start_session(
        &self,
        app: AppHandle,
        request: StartSessionRequest,
    ) -> Result<SessionStatus, String> {
        let mode = InteractionMode::from_str_id(&request.mode)
            .ok_or_else(|| format!("Unknown mode: {}", request.mode))?;

        if !crate::speech::models::is_toggle_ready() {
            return Err(
                "Speech models are still downloading. Keep VoiceGecko open and try again shortly."
                    .into(),
            );
        }

        let config = ModeConfig::for_mode(mode);
        let engine_id = request
            .engine_id
            .as_deref()
            .and_then(EngineId::from_str_id)
            .unwrap_or(config.default_engine);

        let output_target = request
            .output_target
            .as_deref()
            .and_then(OutputTarget::from_str_id)
            .unwrap_or(config.output_target);

        let show_live_preview = request.show_live_preview.unwrap_or(config.show_live_preview);

        if let Some(pipeline) = request.audio_pipeline.clone() {
            let audio_state = app.state::<crate::audio::AudioState>();
            audio_state.set_pipeline_config(pipeline);
        }

        let dictionary = crate::dictation::dictionary_cache::get_cached_prompt(&app).or_else(|| {
            crate::db::open_db(&app)
                .ok()
                .and_then(|conn| crate::db::get_dictionary_prompt(&conn).ok().flatten())
        });
        crate::speech::transcription_hint::prepare_session(
            &app,
            request.dev_context.as_deref(),
            request.force_developer_profile.unwrap_or(false),
            dictionary.as_deref(),
        );

        let session_id = uuid::Uuid::new_v4().to_string();

        {
            let mut guard = self.active.lock();
            if guard.is_some() {
                return Err("Session already active".into());
            }
            *guard = Some(ActiveSession {
                session_id: session_id.clone(),
                mode,
                engine_id,
                output_target,
                show_live_preview,
                phase: SessionPhase::Recording,
                is_recording: true,
            });
        }

        self.emit(
            &app,
            DictationEvent::SessionStarted {
                session_id: session_id.clone(),
                mode: mode.as_str().to_string(),
                engine_id: engine_id.as_str().to_string(),
                output_target: output_target.as_str().to_string(),
            },
        );
        self.emit(
            &app,
            DictationEvent::RecordingStarted {
                session_id: session_id.clone(),
            },
        );
        self.emit_phase(&app, &session_id, SessionPhase::Recording);

        if mode == InteractionMode::HandsFree {
            if let Some(hub) = app.try_state::<Arc<StreamingAudioHub>>() {
                hub.enable();
                if let Some(hf) = app.try_state::<Arc<HandsFreeController>>() {
                    let manager = app.state::<Arc<DictationSessionManager>>().inner().clone();
                    hf.start(app.clone(), hub.inner().clone(), manager);
                }
            }
        } else if StreamingPipeline::should_stream(mode, show_live_preview) {
            if let Some(hub) = app.try_state::<Arc<StreamingAudioHub>>() {
                self.streaming.start(
                    app.clone(),
                    hub.inner().clone(),
                    session_id.clone(),
                    mode,
                    engine_id,
                    Arc::clone(&self.registry),
                );
            }
        }

        Ok(SessionStatus {
            session_id,
            phase: "recording".into(),
            mode: mode.as_str().into(),
            engine_id: engine_id.as_str().into(),
            is_recording: true,
        })
    }

    pub fn stop_session_and_transcribe(
        self: &Arc<Self>,
        app: AppHandle,
        audio_data: AudioData,
    ) -> Result<(), String> {
        let (session_id, mode, engine_id, output_target) = {
            let mut guard = self.active.lock();
            let session = guard.as_mut().ok_or("No active session")?;
            session.is_recording = false;
            session.phase = SessionPhase::Transcribing;
            (
                session.session_id.clone(),
                session.mode,
                session.engine_id,
                session.output_target,
            )
        };

        self.emit_phase(&app, &session_id, SessionPhase::Transcribing);
        self.stop_streaming(&app);

        *LAST_COMPARE_SAMPLES.lock() = Some((
            audio_data.samples.clone(),
            audio_data.sample_rate,
        ));

        let manager = Arc::clone(self);
        let app_clone = app.clone();
        let sid = session_id.clone();

        tauri::async_runtime::spawn(async move {
            if let Err(e) = manager
                .run_transcription_pipeline(
                    app_clone.clone(),
                    sid.clone(),
                    mode,
                    engine_id,
                    output_target,
                    audio_data,
                    true,
                )
                .await
            {
                manager.emit(
                    &app_clone,
                    DictationEvent::SessionError {
                        session_id: sid,
                        message: e,
                        recoverable: true,
                    },
                );
                *manager.active.lock() = None;
            }
        });

        Ok(())
    }

    pub async fn transcribe_segment(
        &self,
        app: AppHandle,
        samples: Vec<f32>,
    ) -> Result<(), String> {
        let (session_id, engine_id, output_target) = {
            let guard = self.active.lock();
            let session = guard.as_ref().ok_or("No active session")?;
            (
                session.session_id.clone(),
                session.engine_id,
                session.output_target,
            )
        };

        let audio_data = AudioData {
            samples,
            sample_rate: 16_000,
            channels: 1,
        };

        self.run_transcription_pipeline(
            app,
            session_id,
            InteractionMode::HandsFree,
            engine_id,
            output_target,
            audio_data,
            false,
        )
        .await
    }

    pub fn stop_hands_free_session(self: &Arc<Self>, app: AppHandle) {
        let tail = app
            .try_state::<Arc<HandsFreeController>>()
            .map(|hf| hf.stop());

        self.stop_streaming(&app);

        let session_id = {
            let guard = self.active.lock();
            guard.as_ref().map(|s| s.session_id.clone())
        };

        let Some(sid) = session_id else {
            return;
        };

        if let Some(tail_samples) = tail.flatten() {
            let manager = Arc::clone(self);
            let sid_clone = sid.clone();
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                let _ = manager
                    .transcribe_segment(app_clone.clone(), tail_samples)
                    .await;
                manager.finish_hands_free_session(&app_clone, &sid_clone);
                *manager.active.lock() = None;
            });
        } else {
            self.finish_hands_free_session(&app, &sid);
            *self.active.lock() = None;
        }
    }

    fn finish_hands_free_session(&self, app: &AppHandle, session_id: &str) {
        self.emit(
            app,
            DictationEvent::SessionComplete {
                session_id: session_id.to_string(),
                text: String::new(),
            },
        );
        self.emit_phase(app, session_id, SessionPhase::Done);
    }

    async fn run_transcription_pipeline(
        &self,
        app: AppHandle,
        session_id: String,
        _mode: InteractionMode,
        engine_id: EngineId,
        output_target: OutputTarget,
        audio_data: AudioData,
        clear_session: bool,
    ) -> Result<(), String> {
        let engine_id = self.resolve_engine_id(engine_id);

        let engine = self
            .registry
            .get(engine_id)
            .ok_or_else(|| format!("Engine not found: {}", engine_id.as_str()))?;

        crate::speech::stt_log::info_fmt(
            "dictation",
            format!(
                "Transcribing session {session_id} with {} ({} samples @ {} Hz)",
                engine.display_name(),
                audio_data.samples.len(),
                audio_data.sample_rate
            ),
        );

        if !engine.is_available() {
            let msg = format!(
                "Engine {} is not available on this system",
                engine.display_name()
            );
            crate::speech::stt_log::warn("dictation", &msg);
            return Err(msg);
        }

        let result = engine
            .transcribe_batch(&app, &audio_data.samples, audio_data.sample_rate)
            .await
            .map_err(|e| {
                crate::speech::stt_log::error_fmt(
                    "dictation",
                    format!(
                        "Engine {} failed for session {session_id}: {e}",
                        engine.display_name()
                    ),
                );
                e
            })?;

        crate::speech::stt_log::info_fmt(
            "dictation",
            format!(
                "Session {session_id} transcript ready in {} ms",
                result.latency_ms
            ),
        );

        let mut raw_text = result.text.clone();

        if let Some(action) = spoken_commands::match_spoken_command(&raw_text) {
            if action == "undo_last_dictation" {
                if let Some((_, previous, _, _)) = undo::pop_last() {
                    raw_text = previous;
                } else {
                    return Err("Nothing to undo".into());
                }
            } else if let Some(transformed) = spoken_commands::apply_text_command(action, &raw_text) {
                raw_text = transformed;
            }
        }

        self.emit(
            &app,
            DictationEvent::FinalTranscript {
                session_id: session_id.clone(),
                text: raw_text.clone(),
                engine_id: engine_id.as_str().to_string(),
                latency_ms: result.latency_ms,
            },
        );

        let formatted = self.apply_intent_if_enabled(&app, &raw_text).await;

        if formatted != raw_text {
            self.emit(
                &app,
                DictationEvent::FormattingStarted {
                    session_id: session_id.clone(),
                },
            );
            self.emit(
                &app,
                DictationEvent::FormattedText {
                    session_id: session_id.clone(),
                    text: formatted.clone(),
                },
            );
        }

        self.emit_phase(&app, &session_id, SessionPhase::Injecting);

        let previous_clipboard = clipboard::read_clipboard(&app).await;
        let pasted = self
            .inject_output(&app, &session_id, &formatted, output_target)
            .await?;

        undo::record_dictation(
            &session_id,
            &formatted,
            pasted,
            previous_clipboard,
        );

        let ctx = crate::context::window::gather_active_window_context();
        let profile = profiles::detect_profile(&raw_text).as_str();
        if let Ok(db) = crate::db::open_db(&app) {
            let _ = crate::db::save_dictation_rich(
                &db,
                &session_id,
                &raw_text,
                &formatted,
                profile,
                _mode.as_str(),
                engine_id.as_str(),
                result.latency_ms,
                Some(&ctx.title),
                ctx.process_name.as_deref(),
            );
        }

        if clear_session {
            self.emit(
                &app,
                DictationEvent::SessionComplete {
                    session_id: session_id.clone(),
                    text: formatted.clone(),
                },
            );
            self.emit_phase(&app, &session_id, SessionPhase::Done);
            if output_target != OutputTarget::BoxConfirmPaste {
                *self.active.lock() = None;
                crate::speech::transcription_hint::clear_session(&app);
            } else if let Some(session) = self.active.lock().as_mut() {
                session.is_recording = false;
            }
        } else {
            self.emit_phase(&app, &session_id, SessionPhase::Recording);
        }
        Ok(())
    }

    pub async fn confirm_dictation_paste(
        &self,
        app: AppHandle,
        session_id: String,
        text: String,
    ) -> Result<(), String> {
        let awaiting = {
            let guard = self.active.lock();
            guard.as_ref().map(|s| {
                (
                    s.session_id.clone(),
                    s.output_target,
                )
            })
        };

        let Some((active_id, output_target)) = awaiting else {
            return Err("No session awaiting confirm".into());
        };

        if active_id != session_id {
            return Err("Session id mismatch".into());
        }

        if output_target != OutputTarget::BoxConfirmPaste {
            return Err("Session is not in confirm-paste mode".into());
        }

        let previous_clipboard = clipboard::read_clipboard(&app).await;
        clipboard::paste_text_from_main_window(&app, &text).await?;
        undo::record_dictation(&session_id, &text, true, previous_clipboard);

        self.emit(
            &app,
            DictationEvent::InjectionComplete {
                session_id: session_id.clone(),
                pasted: true,
            },
        );
        self.emit(
            &app,
            DictationEvent::SessionComplete {
                session_id: session_id.clone(),
                text: text.clone(),
            },
        );
        self.emit_phase(&app, &session_id, SessionPhase::Done);
        *self.active.lock() = None;
        Ok(())
    }

    pub async fn bootstrap_optional_engines(&self, app: &AppHandle) -> Result<(), String> {
        crate::speech::stt_log::info("bootstrap", "Starting optional engine bootstrap");

        let _ = crate::speech::moonshine_ffi::install_bundled_assets(app);
        match crate::speech::moonshine_ffi::bootstrap_models() {
            Ok(true) => crate::speech::stt_log::info("moonshine", "Models bootstrapped from known paths"),
            Ok(false) => crate::speech::stt_log::warn(
                "moonshine",
                &crate::speech::moonshine_ffi::availability_status(),
            ),
            Err(e) => crate::speech::stt_log::warn("moonshine", &e),
        }

        match crate::speech::moonshine_ffi::prewarm() {
            Ok(()) => crate::speech::stt_log::info("moonshine", "Prewarm succeeded"),
            Err(e) => crate::speech::stt_log::warn("moonshine", &e),
        }

        crate::speech::gpu_whisper::bootstrap_gpu_whisper(app)
            .await
            .map_err(|e| {
                crate::speech::stt_log::error("gpu_whisper", &e);
                e
            })?;

        crate::speech::stt_log::info("bootstrap", "Optional engine bootstrap finished");
        Ok(())
    }

    pub async fn prewarm_engines(&self, app: &AppHandle) -> Result<(), String> {
        self.bootstrap_optional_engines(app).await
    }

    pub fn engine_status(&self, app: &AppHandle) -> Vec<EngineStatusItem> {
        self.registry
            .list()
            .into_iter()
            .filter_map(|id| {
                self.registry.get(id).map(|engine| {
                    let availability = crate::speech::engine_status::evaluate(app, id);
                    EngineStatusItem {
                        id: id.as_str().to_string(),
                        name: engine.display_name().to_string(),
                        available: availability.available,
                        enabled: crate::dictation::features::is_engine_enabled(id.as_str()),
                        supports_streaming: engine.capabilities().supports_streaming,
                        unavailable_reason: availability.reason,
                    }
                })
            })
            .collect()
    }

    async fn apply_intent_if_enabled(&self, app: &AppHandle, text: &str) -> String {
        if !profiles::is_intent_enabled() {
            return text.to_string();
        }

        let dictionary = crate::dictation::dictionary_cache::get_cached_prompt(app).or_else(|| {
            crate::db::open_db(app)
                .ok()
                .and_then(|conn| crate::db::get_dictionary_prompt(&conn).ok().flatten())
        });

        let dev_context = crate::speech::transcription_hint::get_dev_context(app);

        profiles::format_with_intent(
            text,
            dictionary.as_deref(),
            dev_context.as_deref(),
            Some(app),
        )
            .await
            .unwrap_or_else(|_| text.to_string())
    }

    async fn inject_output(
        &self,
        app: &AppHandle,
        session_id: &str,
        text: &str,
        target: OutputTarget,
    ) -> Result<bool, String> {
        self.emit(
            app,
            DictationEvent::InjectionStarted {
                session_id: session_id.to_string(),
                target: target.as_str().to_string(),
            },
        );

        let pasted = match target {
            OutputTarget::PasteOnly | OutputTarget::BoxThenPaste => {
                clipboard::copy_and_paste_from_main_window(app, text).await?
            }
            OutputTarget::BoxConfirmPaste | OutputTarget::BoxOnly => {
                clipboard::copy_to_clipboard(app, text).await?;
                false
            }
        };

        self.emit(
            app,
            DictationEvent::InjectionComplete {
                session_id: session_id.to_string(),
                pasted,
            },
        );

        Ok(pasted)
    }

    fn resolve_engine_id(&self, preferred: EngineId) -> EngineId {
        let try_engine = |id: EngineId| -> Option<EngineId> {
            if !crate::dictation::features::is_engine_enabled(id.as_str()) {
                return None;
            }
            self.registry.get(id).and_then(|engine| {
                if engine.is_available() {
                    Some(id)
                } else {
                    None
                }
            })
        };

        if let Some(id) = try_engine(preferred) {
            return id;
        }

        const FALLBACK_ORDER: [EngineId; 3] = [
            EngineId::ParakeetTdtV2,
            EngineId::MoonshineMedium,
            EngineId::InsanelyFastWhisper,
        ];

        for id in FALLBACK_ORDER {
            if let Some(resolved) = try_engine(id) {
                return resolved;
            }
        }

        preferred
    }

    pub fn get_status(&self) -> Option<SessionStatus> {
        self.active.lock().as_ref().map(|s| SessionStatus {
            session_id: s.session_id.clone(),
            phase: format!("{:?}", s.phase).to_lowercase(),
            mode: s.mode.as_str().into(),
            engine_id: s.engine_id.as_str().into(),
            is_recording: s.is_recording,
        })
    }

    pub fn cancel_session(&self, app: &AppHandle) -> Result<(), String> {
        if let Some(hf) = app.try_state::<Arc<HandsFreeController>>() {
            hf.stop();
        }
        self.stop_streaming(app);
        crate::speech::transcription_hint::clear_session(app);
        let mut guard = self.active.lock();
        if guard.is_some() {
            *guard = None;
            Ok(())
        } else {
            Err("No active session".into())
        }
    }

    pub fn list_engines(&self) -> Vec<(String, String, bool)> {
        self.registry
            .list()
            .into_iter()
            .filter_map(|id| {
                self.registry.get(id).map(|e| {
                    (
                        id.as_str().to_string(),
                        e.display_name().to_string(),
                        e.is_available(),
                    )
                })
            })
            .collect()
    }

    pub fn last_compare_samples(&self) -> Result<(Vec<f32>, u32), String> {
        LAST_COMPARE_SAMPLES
            .lock()
            .clone()
            .ok_or_else(|| {
                "No recorded audio yet — dictate something first, then compare engines".into()
            })
    }

    pub async fn compare_engines_on_samples(
        &self,
        app: &AppHandle,
        samples: Vec<f32>,
        sample_rate: u32,
    ) -> Result<EngineCompareResponse, String> {
        if samples.is_empty() {
            return Err("Audio samples are empty".into());
        }

        let engine_ids = [
            EngineId::ParakeetTdtV2,
            EngineId::MoonshineMedium,
            EngineId::InsanelyFastWhisper,
        ];

        let mut results = Vec::with_capacity(engine_ids.len());

        for engine_id in engine_ids {
            let id_str = engine_id.as_str().to_string();
            let Some(engine) = self.registry.get(engine_id) else {
                results.push(EngineCompareResult {
                    engine_id: id_str.clone(),
                    engine_name: id_str,
                    text: String::new(),
                    text_snippet: String::new(),
                    latency_ms: 0,
                    available: false,
                    rating: None,
                });
                continue;
            };

            let availability = crate::speech::engine_status::evaluate(app, engine_id);
            let engine_name = engine.display_name().to_string();
            crate::speech::stt_log::info_fmt(
                "dictation",
                format!("Compare: {engine_name} available={}", availability.available),
            );

            if !availability.available {
                results.push(EngineCompareResult {
                    engine_id: id_str,
                    engine_name,
                    text: availability.reason.clone().unwrap_or_default(),
                    text_snippet: availability
                        .reason
                        .unwrap_or_else(|| "Unavailable".into()),
                    latency_ms: 0,
                    available: false,
                    rating: None,
                });
                continue;
            }

            match engine.transcribe_batch(app, &samples, sample_rate).await {
                Ok(transcript) => {
                    let snippet = summarize_text(&transcript.text, 160);
                    results.push(EngineCompareResult {
                        engine_id: id_str,
                        engine_name,
                        text_snippet: snippet,
                        text: transcript.text,
                        latency_ms: transcript.latency_ms,
                        available: true,
                        rating: None,
                    });
                }
                Err(err) => results.push(EngineCompareResult {
                    engine_id: id_str,
                    engine_name,
                    text: err.clone(),
                    text_snippet: summarize_text(&err, 160),
                    latency_ms: 0,
                    available: true,
                    rating: None,
                }),
            }
        }

        Ok(EngineCompareResponse {
            sample_id: "last_dictation".into(),
            sample_label: format!(
                "Last dictation ({:.1}s @ {} Hz)",
                samples.len() as f64 / sample_rate as f64,
                sample_rate
            ),
            results,
        })
    }
}

fn summarize_text(text: &str, max_chars: usize) -> String {
    let trimmed = text.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }
    trimmed.chars().take(max_chars).collect::<String>() + "…"
}

impl Default for DictationSessionManager {
    fn default() -> Self {
        Self::new()
    }
}
