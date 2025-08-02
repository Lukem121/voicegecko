# VoiceGecko Stores

This directory contains the Zustand state management stores for the VoiceGecko application.

## Stores

| Store                  | Purpose                              | File                    |
| ---------------------- | ------------------------------------ | ----------------------- |
| **Settings Store**     | Application settings and preferences | `settings.store.ts`     |
| **Event Store**        | Recording and transcription state    | `event.store.ts`        |
| **Connectivity Store** | Network connectivity status          | `connectivity.store.ts` |

## Documentation

- **[📖 Settings System Guide](./SETTINGS_SYSTEM.md)** - Comprehensive guide for adding new settings
- **State Management Patterns** - See individual store files for patterns

## Quick Reference: Adding New Settings

1. **Define Interface** → `settings.store.ts`
2. **Set Default Value** → `defaultSettings` object
3. **Add Load Function** → `load*Settings()` function
4. **Create UI Component** → `settings/index.tsx`
5. **Use in Code** → `useSettingsStore.getState()`

📚 **See [SETTINGS_SYSTEM.md](./SETTINGS_SYSTEM.md) for detailed examples and best practices.**
