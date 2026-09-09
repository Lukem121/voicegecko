use tauri::App;

/// The JS `check()` command reads endpoints from `tauri.conf.json`.
/// Building a one-off updater here does not change that command, so we only
/// confirm setup succeeded. Endpoints must be the public HTTPS API — probing
/// localhost first with no timeout left the Settings UI stuck on "Checking…".
pub fn setup_updater(_app: &App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}
