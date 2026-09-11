use tauri::Manager;
use sentry;
use tauri_plugin_sentry::{minidump};
mod audio;
mod modules;
mod dictation;
mod speech;
mod intent;
mod inject;
mod context;
mod db;

use std::sync::Arc;
use dictation::dictionary_cache::DictionaryPromptCache;
use dictation::session::DictationSessionManager;
use intent::llama_process::LlamaProcessManager;
use audio::StreamingAudioHub;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    let client = sentry::init((
        "https://5131669e441c266a66c873d2c97d3571@o4504837577768960.ingest.us.sentry.io/4509740408897546",
        sentry::ClientOptions {
            release: sentry::release_name!(),
            auto_session_tracking: true,
            send_default_pii: true,
            ..Default::default()
        },
    ));

    // Caution! Everything before here runs in both app and crash reporter processes
    #[cfg(not(target_os = "ios"))]
    let _guard = minidump::init(&client);
    // Everything after here runs in only the app process

    tauri::Builder::default()
        .plugin(tauri_plugin_sentry::init(&client))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .build(),
        )
        .manage(Arc::new(DictationSessionManager::new()))
        .manage(Arc::new(StreamingAudioHub::new()))
        .manage(Arc::new(LlamaProcessManager::new()))
        .manage(DictionaryPromptCache::default())
        .manage(speech::transcription_hint::TranscriptionHintState::default())
        .manage(modules::gecko_bar::SnoozeState::default())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Hide the main window instead of closing it so the tray can always reopen it
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // With the deep-link feature enabled, the plugin automatically forwards
            // deep links to the deep link system, so we just need to log for debugging
            if argv.len() > 1 {
                let url = &argv[1];
                println!(
                    "Single instance received URL: {} (automatically forwarded to deep link system)",
                    url
                );
            }

            // Ensure the main window is visible and focused
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            audio::set_audio_pipeline_config,
            audio::get_audio_pipeline_config,
            audio::list_audio_devices,
            audio::start_recording,
            audio::stop_recording,
            audio::cancel_recording,
            audio::start_microphone_test,
            audio::stop_microphone_test,
            audio::play_notification_sound,
            audio::set_volume,
            audio::mute_system_audio,
            audio::unmute_system_audio,
            modules::gecko_bar::show_gecko_bar,
            modules::gecko_bar::hide_gecko_bar,
            modules::gecko_bar::is_gecko_bar_visible,
            modules::gecko_bar::reposition_gecko_bar,
            modules::gecko_bar::is_fullscreen_app_active,
            modules::gecko_bar::set_gecko_bar_fullscreen_mode,
            modules::gecko_bar::send_gecko_bar_notification,
            modules::gecko_bar::set_gecko_bar_cursor_passthrough,
            modules::gecko_bar::snooze_gecko_bar_until,
            modules::gecko_bar::should_show_gecko_bar,
            modules::gecko_bar::snooze_gecko_bar_for_ms,
            modules::hardware_info::get_hardware_info,
            modules::hardware_info::get_recommended_tier,
            modules::model_manager::list_models,
            modules::model_manager::download_model,
            modules::model_manager::cancel_model_download,
            modules::model_manager::delete_model,
            modules::model_manager::get_active_model_id,
            modules::model_manager::synchronize_models,
            modules::model_manager::force_sync_models,
            modules::model_manager::get_selected_tier,
            modules::model_manager::set_selected_tier,
            modules::model_manager::get_selected_model_override,
            modules::model_manager::set_selected_model_override,
            modules::model_manager::clear_selected_model_override,
            modules::model_manager::get_best_model_for_tier,
            modules::model_manager::get_downloaded_models_for_tier,
            modules::model_manager::auto_download_recommended_model,
            modules::model_manager::check_and_fix_partial_downloads,
            modules::model_manager::get_gpu_whisper_model_id,
            modules::model_manager::set_gpu_whisper_model_id,
            modules::model_manager::list_gpu_whisper_models,
            dictation::start_dictation_session,
            dictation::get_dictation_session_status,
            dictation::cancel_dictation_session,
            dictation::list_dictation_engines,
            dictation::undo_last_dictation,
            dictation::set_dictionary_prompt_cache,
            dictation::get_dictionary_prompt_cache,
            dictation::get_local_dictionary_prompt,
            dictation::sync_local_dictionary_words,
            dictation::list_local_dictionary,
            dictation::add_local_dictionary_word,
            dictation::update_local_dictionary_word,
            dictation::delete_local_dictionary_word,
            dictation::save_engine_feedback,
            dictation::set_intent_enabled,
            dictation::confirm_dictation_paste,
            dictation::prewarm_engines,
            dictation::bootstrap_optional_engines,
            dictation::get_engine_status,
            dictation::set_feature_flags,
            dictation::get_feature_flags,
            dictation::list_local_dictations,
            dictation::delete_local_dictation,
            dictation::count_local_dictations,
            speech::models::list_v2_models,
            speech::models::get_v2_model_status,
            speech::models::download_v2_model,
            speech::models::delete_v2_model,
            speech::models::is_v2_toggle_ready,
            speech::models::get_speech_setup_status,
            speech::models::retry_v2_bootstrap,
            dictation::compare_ready_whisper_models_on_samples,
            dictation::score_whisper_models_on_last_clip,
            modules::settings::get_cpu_count,
            modules::settings::get_gecko_bar_config,
            modules::settings::set_gecko_bar_config,
            modules::settings::get_autostart_config,
            modules::settings::set_autostart_config,
            modules::system::simulate_paste,
            modules::system::simulate_paste_with_options,
            modules::tray::update_tray_stats
        ])
        .setup(|app| {
            crate::db::set_app_handle(app.handle().clone());
            if let Ok(db) = crate::db::open_db(app.handle()) {
                let _ = crate::db::hydrate_undo_stack(&db);
            }

            // Ensure OS autostart state matches our stored/default config on startup
            {
                use tauri_plugin_autostart::ManagerExt;
                // If there is no stored config, this will return the default (now enabled)
                let config = modules::settings::get_autostart_config(app.handle().clone())
                    .unwrap_or_else(|_| modules::settings::AutostartConfig::default());
                if config.enabled {
                    let _ = app.autolaunch().enable();
                } else {
                    let _ = app.autolaunch().disable();
                }
            }
            // Check if the app was launched via autostart
            let args: Vec<String> = std::env::args().collect();
            let is_autostart = args.iter().any(|arg| arg == "--autostart");
            
            println!("[Rust] App launched with args: {:?}", args);
            println!("[Rust] Is autostart launch: {}", is_autostart);
            
            // If NOT launched via autostart, show the main window (it starts hidden by default)
            if !is_autostart {
                println!("[Rust] Showing main window for normal launch");
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                }
            } else {
                println!("[Rust] Keeping main window hidden due to autostart launch");
            }

            // Respect gecko bar snooze preference on startup
            {
                let app_handle = app.handle().clone();
                if let Ok(show) = modules::gecko_bar::should_show_gecko_bar(app_handle.clone()) {
                    if show {
                        let _ = modules::gecko_bar::show_gecko_bar(app_handle.clone(), None);
                    } else {
                        let _ = modules::gecko_bar::hide_gecko_bar(app_handle.clone());
                    }
                }
            }
            // Initialize optional audio sink gracefully (handle systems with no output device)
            let streaming_hub = app.state::<Arc<StreamingAudioHub>>().inner().clone();
            let mut managed = false;
            if let Ok((_stream, stream_handle)) = rodio::OutputStream::try_default() {
                if let Ok(sink) = rodio::Sink::try_new(&stream_handle) {
                    app.manage(audio::AudioState::new(Some(sink), streaming_hub.clone()));
                    // Keep the stream alive for the duration of the app
                    std::mem::forget(_stream);
                    std::mem::forget(stream_handle);
                    managed = true;
                }
            }
            if !managed {
                // Fall back to no sink; sound playback and volume changes will be no-ops
                app.manage(audio::AudioState::new(None, streaming_hub));
            }

            speech::models::bootstrap_required_models(app.handle());

            // Prewarm Whisper after startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let manager = app_handle
                    .state::<Arc<DictationSessionManager>>()
                    .inner()
                    .clone();
                if let Err(error) = manager.bootstrap_optional_engines(&app_handle).await {
                    eprintln!("[Rust] Optional engine bootstrap: {error}");
                }
                LlamaProcessManager::prewarm(app_handle).await;
            });

            // Setup system tray - allow app to continue even if tray setup fails
            let tray_manager = modules::tray::TrayManager::new();
            match tray_manager.setup_tray(&app.handle()) {
                Ok(_) => {
                    println!("[Rust] System tray initialized successfully");
                }
                Err(e) => {
                    // Log the error but don't crash - the app can still function without a tray icon
                    // This can happen when Windows Explorer is not running properly or system tray is unavailable
                    eprintln!("[Rust] Warning: Failed to setup system tray: {}. App will continue without tray icon.", e);
                    sentry::capture_message(
                        &format!("System tray setup failed (non-fatal): {}", e),
                        sentry::Level::Warning,
                    );
                }
            }
            app.manage(tray_manager);

            // Output stream may or may not be initialized above.

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            // Setup custom updater configuration
            modules::updater::setup_updater(app)?;

            // Start global mouse stream for gecko bar click-through handling
            {
                let app_handle = app.handle().clone();
                // spawn to avoid blocking setup; rdev listener runs in its own thread
                tauri::async_runtime::spawn(async move {
                    modules::mouse_hook::start_global_mouse_stream_for_gecko_bar(app_handle);
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(manager) = app.try_state::<Arc<LlamaProcessManager>>() {
                    manager.kill();
                }
            }
        });
}
