use crate::context::window::gather_active_window_context;
use tauri::AppHandle;

pub async fn read_clipboard(app: &AppHandle) -> Option<String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().read_text().ok()
}

pub async fn copy_to_clipboard(app: &AppHandle, text: &str) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}

fn should_type_instead_of_paste() -> bool {
    let ctx = gather_active_window_context();
    let process = ctx
        .process_name
        .unwrap_or_default()
        .to_lowercase();

    process.ends_with("windowsterminal.exe")
        || process.ends_with("cmd.exe")
        || process.ends_with("pwsh.exe")
        || process.ends_with("powershell.exe")
}

pub async fn copy_and_paste_from_main_window(app: &AppHandle, text: &str) -> Result<bool, String> {
    if should_type_instead_of_paste() {
        crate::modules::system::simulate_type_text(text)?;
        return Ok(true);
    }

    copy_to_clipboard(app, text).await?;
    crate::modules::system::simulate_paste()?;
    Ok(true)
}

pub async fn paste_text_from_main_window(app: &AppHandle, text: &str) -> Result<(), String> {
    if should_type_instead_of_paste() {
        crate::modules::system::simulate_type_text(text)?;
        return Ok(());
    }

    copy_to_clipboard(app, text).await?;
    crate::modules::system::simulate_paste()?;
    Ok(())
}
