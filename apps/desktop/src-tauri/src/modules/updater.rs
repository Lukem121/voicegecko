use tauri::App;
use tauri_plugin_updater::UpdaterExt;

/// Determine if the app should use local development server
fn should_use_local_dev() -> bool {
    let is_debug = cfg!(debug_assertions);
    println!("Debug assertions enabled: {}", is_debug);
    is_debug    
}

/// Setup custom updater configuration
pub fn setup_updater(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let use_local = should_use_local_dev();
    let update_url = if use_local {
        "http://localhost:3000/api/updater/{{target}}/{{current_version}}"
    } else {
        "https://voicegecko.io/api/updater/{{target}}/{{current_version}}"
    };

    println!(
        "Setting up updater with environment: {}", 
        if use_local { "local development (debug build)" } else { "production (release build)" }
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
        // In test builds, debug_assertions is typically enabled
        // This test validates the function works correctly
        let result = should_use_local_dev();
        
        // The result should match the compile-time debug_assertions setting
        #[cfg(debug_assertions)]
        assert!(result);
        
        #[cfg(not(debug_assertions))]
        assert!(!result);
    }
} 