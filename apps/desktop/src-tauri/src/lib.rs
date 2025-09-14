use tauri::Manager;
use sentry;
use tauri_plugin_sentry::{minidump};
mod modules;
use modules::dictation_sidecar::DictationState;
use modules::model_manager;

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
        .manage(DictationState::default())
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
            modules::audio::list_audio_devices,
            modules::audio::start_recording,
            modules::audio::stop_recording,
            modules::audio::cancel_recording,
            modules::audio::start_microphone_test,
            modules::audio::stop_microphone_test,
            modules::audio::play_notification_sound,
            modules::audio::set_volume,
            modules::audio::mute_system_audio,
            modules::audio::unmute_system_audio,
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
            modules::dictation::transcribe_audio_buffer,
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
                        let _ = modules::gecko_bar::show_gecko_bar(app_handle.clone());
                    } else {
                        let _ = modules::gecko_bar::hide_gecko_bar(app_handle.clone());
                    }
                }
            }
            // Initialize optional audio sink gracefully (handle systems with no output device)
            let mut managed = false;
            if let Ok((_stream, stream_handle)) = rodio::OutputStream::try_default() {
                if let Ok(sink) = rodio::Sink::try_new(&stream_handle) {
                    app.manage(modules::audio::AudioState::new(Some(sink)));
                    // Keep the stream alive for the duration of the app
                    std::mem::forget(_stream);
                    std::mem::forget(stream_handle);
                    managed = true;
                }
            }
            if !managed {
                // Fall back to no sink; sound playback and volume changes will be no-ops
                app.manage(modules::audio::AudioState::new(None));
            }

            modules::model_manager::synchronize_models(app.handle().clone())?;

            // Prewarm the warm sidecar with the active model to avoid first-use latency
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(model_id) = model_manager::get_active_model_id(app_handle.clone()) {
                    let state = app_handle.state::<DictationState>();
                    let _ = state.manager.prewarm(&app_handle, &model_id).await;
                }
            });

            // Sidecar-based dictation does not need to preload models here.

            // Setup system tray
            let tray_manager = modules::tray::TrayManager::new();
            tray_manager.setup_tray(&app.handle()).expect("Failed to setup system tray");
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
