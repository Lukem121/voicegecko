use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, Runtime,
};
#[derive(Debug, Clone)]
pub struct TrayData {
    pub words_count: String,
    pub time_saved: String,
    pub words_per_minute: String,
}

impl Default for TrayData {
    fn default() -> Self {
        Self {
            words_count: "0".to_string(),
            time_saved: "0 min".to_string(),
            words_per_minute: "—".to_string(),
        }
    }
}

pub struct TrayManager {
    data: Arc<Mutex<TrayData>>,
}

impl TrayManager {
    pub fn new() -> Self {
        Self {
            data: Arc::new(Mutex::new(TrayData::default())),
        }
    }

    pub fn update_data(&self, data: TrayData) {
        if let Ok(mut tray_data) = self.data.lock() {
            *tray_data = data;
        }
    }

    pub fn create_menu<R: Runtime>(&self, app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
        let data = self.data.lock().unwrap().clone();

        let menu = Menu::with_items(
            app,
            &[
                // === TOP ACTION ===
                &MenuItem::with_id(
                    app,
                    "open_voice_gecko",
                    "Open Voice Gecko",
                    true,
                    None::<&str>,
                )?,
                &PredefinedMenuItem::separator(app)?,
                // === NAVIGATION SECTION ===
                &MenuItem::with_id(app, "recording_page", "Recording", true, None::<&str>)?,
                &MenuItem::with_id(app, "dictations_page", "Dictations", true, None::<&str>)?,
                &MenuItem::with_id(
                    app,
                    "add_word_dictionary",
                    "Add Word to Dictionary",
                    true,
                    None::<&str>,
                )?,
                &PredefinedMenuItem::separator(app)?,
                // === STATS SECTION ===
                &MenuItem::with_id(
                    app,
                    "words_dictated",
                    &format!("Words Dictated: {}", data.words_count),
                    false,
                    None::<&str>,
                )?,
                &MenuItem::with_id(
                    app,
                    "time_saved",
                    &format!("Time Saved: {}", data.time_saved),
                    false,
                    None::<&str>,
                )?,
                &MenuItem::with_id(
                    app,
                    "words_per_minute",
                    &format!("Average Speed: {} WPM", data.words_per_minute),
                    false,
                    None::<&str>,
                )?,
                &PredefinedMenuItem::separator(app)?,
                // === SETTINGS SECTION ===
                &MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?,
                &PredefinedMenuItem::separator(app)?,
                // === BOTTOM ACTIONS ===
                &MenuItem::with_id(
                    app,
                    "version_info",
                    &format!("Version: {}", env!("CARGO_PKG_VERSION")),
                    false,
                    None::<&str>,
                )?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?,
            ],
        )?;

        Ok(menu)
    }

    pub fn setup_tray<R: Runtime>(&self, app: &tauri::AppHandle<R>) -> tauri::Result<()> {
        let menu = self.create_menu(app)?;

        let mut tray_builder = TrayIconBuilder::with_id("main");

        // Safely handle the icon - only set it if available
        if let Some(icon) = app.default_window_icon() {
            tray_builder = tray_builder.icon(icon.clone());
        }

        let _tray = tray_builder
            .menu(&menu)
            .on_menu_event(move |app, event| match event.id.as_ref() {
                "open_voice_gecko" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
                "recording_page" => {
                    show_window_and_navigate(app, "/");
                }
                "dictations_page" => {
                    show_window_and_navigate(app, "/dictations");
                }
                "settings" => {
                    show_window_and_navigate(app, "/settings");
                }
                "add_word_dictionary" => {
                    show_window_and_navigate(app, "/dictionary");
                }
                "exit" => {
                    std::process::exit(0);
                }
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            })
            .build(app)?;

        Ok(())
    }

    pub fn update_menu<R: Runtime>(&self, app: &tauri::AppHandle<R>) -> tauri::Result<()> {
        if let Some(tray) = app.tray_by_id("main") {
            let menu = self.create_menu(app)?;
            tray.set_menu(Some(menu))?;
        }
        Ok(())
    }
}

fn show_window_and_navigate<R: Runtime>(app: &tauri::AppHandle<R>, path: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();

        // Emit navigation event to frontend
        let _ = window.emit("navigate", path);
    }
}

// Tauri commands for React to call
#[tauri::command]
pub fn update_tray_stats(
    app: tauri::AppHandle,
    words_count: String,
    time_saved: String,
    words_per_minute: String,
) -> Result<(), String> {
    let tray_manager = app.state::<TrayManager>();

    let new_data = TrayData {
        words_count,
        time_saved,
        words_per_minute,
    };

    tray_manager.update_data(new_data);
    tray_manager.update_menu(&app).map_err(|e| e.to_string())?;

    Ok(())
}
