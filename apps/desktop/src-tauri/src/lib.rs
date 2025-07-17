use tauri::Manager;

mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
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

            // Focus the window
            let window = app.get_webview_window("main").unwrap();
            window.set_focus().unwrap();
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            modules::audio::list_audio_devices,
            modules::audio::start_recording,
            modules::audio::stop_recording,
            modules::audio::cancel_recording,
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
            modules::model_manager::list_models,
            modules::model_manager::download_model,
            modules::model_manager::delete_model,
            modules::model_manager::get_selected_model,
            modules::model_manager::set_selected_model,
            modules::model_manager::get_active_model_id,
            modules::model_manager::synchronize_models,
            modules::transcription::transcribe_audio_buffer,
            modules::settings::get_transcription_config,
            modules::settings::set_transcription_config,
            modules::settings::get_gecko_bar_config,
            modules::settings::set_gecko_bar_config,
            modules::settings::get_autostart_config,
            modules::settings::set_autostart_config
        ])
        .setup(|app| {
            let (_stream, stream_handle) = rodio::OutputStream::try_default().unwrap();
            let sink = rodio::Sink::try_new(&stream_handle).unwrap();
            app.manage(modules::audio::AudioState::new(sink));

            modules::model_manager::synchronize_models(app.handle().clone())?;

            let transcription_service =
                modules::transcription_service::TranscriptionService::new();
            
            // Preload the active model to ensure fast first transcription
            if let Err(e) = transcription_service.preload_active_model(&app.handle()) {
                println!("[Rust] Failed to preload model during startup: {}", e);
                // Don't fail startup if preloading fails
            }
            
            app.manage(transcription_service);

            // Keep the stream alive for the duration of the app
            std::mem::forget(_stream);
            std::mem::forget(stream_handle);

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            // Setup custom updater configuration
            modules::updater::setup_updater(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
