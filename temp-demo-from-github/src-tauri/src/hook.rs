use rdev::{listen, Event, EventType};
use tauri::{WebviewWindow, Emitter};
use serde::Serialize;

#[derive(Serialize, Clone)]
struct MousePos { x: f64, y: f64 }

pub fn start_global_mouse_stream(window: WebviewWindow) {
    std::thread::spawn(move || {
        let callback = move |event: Event| {
            if let EventType::MouseMove { x, y } = event.event_type {
                let _ = window.emit("device-mouse-move", MousePos { x, y });
            }
        };
        if let Err(e) = listen(callback) {
            eprintln!("rdev error: {:?}", e);
        }
    });
}
