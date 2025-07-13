use tauri::Manager;

mod modules;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(modules::audio::AudioState::new())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
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
                println!("Single instance received URL: {} (automatically forwarded to deep link system)", url);
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
            modules::audio::play_notification_sound
        ])
        .setup(|app| {
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
