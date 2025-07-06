use tauri::App;
use tauri_plugin_updater::UpdaterExt;

/// Determine if the app should use local development server
fn should_use_local_dev() -> bool {
    std::env::var("USE_LOCAL_UPDATER").unwrap_or_default() == "true"
}

/// Setup custom updater configuration
/// 
/// This function configures the Tauri updater to use either:
/// - Local development server (localhost:3000) when USE_LOCAL_UPDATER=true
/// - Production server (voicegecko.io) by default
pub fn setup_updater(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let use_local = should_use_local_dev();
    let update_url = if use_local {
        "http://localhost:3000/api/updater/{{target}}/{{current_version}}"
    } else {
        "https://voicegecko.io/api/updater/{{target}}/{{current_version}}"
    };

    println!(
        "Setting up updater with environment: {}", 
        if use_local { "local development" } else { "production" }
    );
    println!("Update URL: {}", update_url);

    let parsed_url = update_url.parse()?;
    let _update = app
        .updater_builder()
        .endpoints(vec![parsed_url])?
        .build()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_local_dev_detection() {
        // This would test the environment variable detection
        // You can expand this as needed
        assert!(!should_use_local_dev()); // Default should be false
    }
} 