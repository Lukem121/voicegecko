use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
