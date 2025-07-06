# Tauri App Modules

This directory contains the organized modules for the VoiceGecko desktop application.

## Current Structure

```
modules/
├── mod.rs          # Module declarations
├── updater.rs      # App update functionality
└── README.md       # This file
```

## Module Organization Principles

Each module should:

- Have a single, clear responsibility
- Export a clean public API
- Include relevant tests in a `tests` submodule
- Have comprehensive documentation

## Planned Modules

As the application grows, consider organizing code into these modules:

- **`audio.rs`** - Audio recording, processing, and playback
- **`settings.rs`** - Application configuration and user preferences
- **`database.rs`** - Local data storage and management
- **`api_client.rs`** - HTTP client for VoiceGecko API communication
- **`voice_processing.rs`** - Voice analysis and processing logic
- **`ui_state.rs`** - Application state management
- **`file_system.rs`** - File operations and management

## Usage Pattern

Import modules in `lib.rs`:

```rust
mod modules;

// Use in setup
modules::updater::setup_updater(app)?;
modules::settings::load_user_preferences(app)?;
```

## Testing

Each module should include tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_functionality() {
        // Test implementation
    }
}
```
