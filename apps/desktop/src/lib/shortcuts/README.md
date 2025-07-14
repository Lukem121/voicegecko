# Keyboard Shortcuts System

This directory contains the keyboard shortcut system for VoiceGecko. The system is designed to be flexible, maintainable, and easy to extend.

## Architecture Overview

### Types of Shortcuts

We have two categories of shortcuts:

1. **Standard Shortcuts** (`ShortcutAction`): Simple shortcuts that execute once when pressed
   - `toggle-recording`: Start/stop recording with a single key press
   - `paste-last-transcription`: Paste the last transcription to clipboard
   - `open-last-transcription`: Navigate to transcriptions page

2. **Special Shortcuts** (`SpecialShortcut`): Shortcuts that need custom handling
   - `push-to-talk`: Requires keydown/keyup event handling for hold-to-record functionality

### Key Components

- **`manager.ts`**: Singleton responsible for registering/unregistering global shortcuts with Tauri
- **`actions.ts`**: Contains action handlers for standard shortcuts
- **`types.ts`**: TypeScript type definitions
- **`constants.ts`**: Default shortcut configurations
- **`utils.ts`**: Utility functions for platform detection, validation, and key formatting

### How It Works

1. **Standard Shortcuts**:
   - Registered globally through Tauri's global-shortcut plugin
   - Execute their action immediately when the key combination is pressed
   - Managed by the `ShortcutManager`

2. **Push-to-Talk**:
   - NOT registered as a global shortcut
   - Handled by the `usePushToTalk` hook with custom keydown/keyup listeners
   - Allows for hold-to-record functionality

### Design Decisions

1. **Separation of Concerns**: Push-to-talk is handled separately because it needs different behavior (press vs hold) compared to standard shortcuts.

2. **Type Safety**: We use separate types for standard and special shortcuts to ensure type safety without complex union types.

3. **Platform Awareness**: The system handles platform differences (e.g., Cmd on Mac vs Ctrl on Windows) automatically.

4. **User Customization**: Users can customize shortcuts through the settings page, with validation to ensure valid combinations.

### Adding New Shortcuts

To add a new standard shortcut:

1. Add the action to `ShortcutAction` type in `types.ts`
2. Add the handler to `shortcutActions` in `actions.ts`
3. Add default configuration to `DEFAULT_SHORTCUTS` in `constants.ts`

To add a new special shortcut (like push-to-talk):

1. Add to `SpecialShortcut` type in `types.ts`
2. Create a custom hook to handle the special behavior
3. Add default configuration to `DEFAULT_SHORTCUTS`

### Storage

Shortcuts are persisted using Tauri's store plugin in `shortcuts.json`. The system loads saved shortcuts on startup and falls back to defaults if none are found.
