use enigo::{Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

#[tauri::command]
pub fn simulate_paste() -> Result<(), String> {
    simulate_paste_with_options(false)
}

/// Enhanced paste simulation with options for different paste behaviors
#[tauri::command]
pub fn simulate_paste_with_options(prevent_auto_newline: bool) -> Result<(), String> {
    println!("[DEBUG] simulate_paste called - beginning paste simulation");

    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize keyboard controller: {}", e))?;

    // Ensure no sticky modifiers are active that could interfere (e.g., Shift)
    let _ = enigo.key(Key::Shift, enigo::Direction::Release);
    let _ = enigo.key(Key::Alt, enigo::Direction::Release);
    let _ = enigo.key(Key::Meta, enigo::Direction::Release);
    // Small delay to let the system settle focus/modifier state
    thread::sleep(Duration::from_millis(30));

    println!("[DEBUG] Cleared modifier keys, beginning paste operation");

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

    // Optional: If the target application tends to add unwanted newlines after paste,
    // we can attempt to remove them by pressing backspace
    if prevent_auto_newline {
        println!("[DEBUG] Attempting to prevent auto-newline by pressing backspace");
        thread::sleep(Duration::from_millis(50)); // Allow paste to complete
        enigo
            .key(Key::Backspace, enigo::Direction::Click)
            .map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(10));
    }

    println!("[DEBUG] simulate_paste completed successfully");
    Ok(())
}
