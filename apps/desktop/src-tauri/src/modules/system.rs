use enigo::{Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

#[tauri::command]
pub fn simulate_paste() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize keyboard controller: {}", e))?;

    // Ensure no sticky modifiers are active that could interfere (e.g., Shift)
    let _ = enigo.key(Key::Shift, enigo::Direction::Release);
    let _ = enigo.key(Key::Alt, enigo::Direction::Release);
    let _ = enigo.key(Key::Meta, enigo::Direction::Release);
    // Small delay to let the system settle focus/modifier state
    thread::sleep(Duration::from_millis(30));

    // Simulate Ctrl+V on Windows/Linux or Cmd+V on macOS
    #[cfg(target_os = "macos")]
    {
        enigo
            .key(Key::Meta, enigo::Direction::Press)
            .map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(16));
        enigo
            .key(Key::Unicode('v'), enigo::Direction::Click)
            .map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(8));
        enigo
            .key(Key::Meta, enigo::Direction::Release)
            .map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        enigo
            .key(Key::Control, enigo::Direction::Press)
            .map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(16));
        enigo
            .key(Key::Unicode('v'), enigo::Direction::Click)
            .map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(8));
        enigo
            .key(Key::Control, enigo::Direction::Release)
            .map_err(|e| e.to_string())?;
    }

    // Small post-action delay to ensure delivery before returning
    thread::sleep(Duration::from_millis(10));

    Ok(())
}
