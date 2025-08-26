use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

// rdev is not available on mobile targets; restrict to desktop platforms
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use rdev::{listen, Event, EventType};

#[derive(Serialize, Clone)]
pub struct MousePos {
    pub x: f64,
    pub y: f64,
}

/// Starts a background thread that listens to global mouse move events
/// and emits them to the `gecko-bar` webview window as `device-mouse-move`.
#[allow(unused_variables)]
pub fn start_global_mouse_stream_for_gecko_bar(app: AppHandle) {
    // Only implement on desktop platforms where rdev is supported
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        if let Some(window) = app.get_webview_window("gecko-bar") {
            std::thread::spawn(move || {
                let callback = move |event: Event| {
                    if let EventType::MouseMove { x, y } = event.event_type {
                        let _ = window.emit("device-mouse-move", MousePos { x, y });
                    }
                };
                if let Err(e) = listen(callback) {
                    eprintln!("[mouse_hook] rdev error: {:?}", e);
                }
            });
        } else {
            eprintln!("[mouse_hook] gecko-bar window not found; mouse stream not started");
        }
    }
}
