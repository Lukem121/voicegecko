# Settings System Documentation

This document provides a comprehensive guide for adding new settings to the VoiceGecko application. The settings system is robust, type-safe, and handles persistence, defaults, and UI integration seamlessly.

## Architecture Overview

The settings system consists of several interconnected components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Settings UI   │◄───┤  Settings Store  │───►│  Tauri Store    │
│   (React)       │    │   (Zustand)      │    │ (Persistence)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Load Functions │
                       │  (Async Loaders) │
                       └──────────────────┘
```

### Key Components

1. **TypeScript Interfaces** - Type definitions for all settings
2. **Default Settings Object** - Fallback values for new installations
3. **Load Functions** - Async functions that load settings with defaults
4. **Zustand Store** - State management and update methods
5. **React UI Components** - Settings interface components
6. **Tauri Store** - File-based persistence layer

## File Locations

| Component            | File Path                                                   |
| -------------------- | ----------------------------------------------------------- |
| **Core Store**       | `apps/desktop/src/stores/settings.store.ts`                 |
| **Settings UI**      | `apps/desktop/src/routes/_authenticated/settings/index.tsx` |
| **Type Definitions** | Located within `settings.store.ts`                          |

## Step-by-Step Guide: Adding a New Setting

### Example: Adding "Auto-paste on completion"

Let's walk through adding a boolean setting to the Personalization category:

#### 1. Define the TypeScript Interface

**Location**: `apps/desktop/src/stores/settings.store.ts`

```typescript
interface PersonalizationSettings {
  interactionSounds: boolean;
  smartFormatting: boolean;
  autoAddToDictionary: boolean;
  autoPasteOnCompletion: boolean; // ← Add your new setting here
}
```

#### 2. Set the Default Value

**Location**: `apps/desktop/src/stores/settings.store.ts` → `defaultSettings` object

```typescript
const defaultSettings: AppSettings = {
  // ... other categories
  personalization: {
    interactionSounds: true,
    smartFormatting: true,
    autoAddToDictionary: true,
    autoPasteOnCompletion: true, // ← Set default value (true = enabled by default)
  },
  // ... other categories
};
```

#### 3. Add to Load Function

**Location**: `apps/desktop/src/stores/settings.store.ts` → appropriate `load*Settings()` function

```typescript
async function loadPersonalizationSettings(): Promise<PersonalizationSettings> {
  return {
    interactionSounds:
      (await settingsStore.get<boolean>("personalization.interactionSounds")) ??
      true,
    smartFormatting:
      (await settingsStore.get<boolean>("personalization.smartFormatting")) ??
      true,
    autoAddToDictionary:
      (await settingsStore.get<boolean>(
        "personalization.autoAddToDictionary",
      )) ?? true,
    autoPasteOnCompletion:
      (await settingsStore.get<boolean>(
        "personalization.autoPasteOnCompletion", // ← Store key format
      )) ?? true, // ← Default fallback value
  };
}
```

**Key Pattern**: The `?? defaultValue` ensures that if the setting doesn't exist in storage, it falls back to the specified default.

#### 4. Add UI Components

**Location**: `apps/desktop/src/routes/_authenticated/settings/index.tsx`

```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label>Auto-paste on completion</Label>
    <p className="text-muted-foreground text-sm">
      Automatically paste transcriptions into the active text field when
      transcription completes
    </p>
  </div>
  <Switch
    checked={settings.personalization.autoPasteOnCompletion}
    onCheckedChange={(checked) =>
      updatePersonalizationSetting("autoPasteOnCompletion", checked)
    }
  />
</div>
```

#### 5. Use the Setting in Your Code

```typescript
import { useSettingsStore } from "~/stores/settings.store";

// In your service/component
const { settings } = useSettingsStore.getState();
if (settings.personalization.autoPasteOnCompletion) {
  // Your feature logic here
}
```

## Setting Categories

### Audio Settings

- **Interface**: `AudioSettings`
- **Load Function**: `loadAudioSettings()`
- **Store Keys**: Direct keys (e.g., `"muteSystemAudio"`)
- **Update Method**: Individual methods (e.g., `updateMuteSystemAudio`)

### General Settings

- **Interface**: `GeneralSettings`
- **Load Function**: Special (loaded via Tauri commands)
- **Store Keys**: Via Tauri backend
- **Update Method**: Individual methods with Tauri calls

### Privacy Settings

- **Interface**: `PrivacySettings`
- **Load Function**: `loadPrivacySettings()`
- **Store Keys**: Namespaced (e.g., `"privacy.usageAnalytics"`)
- **Update Method**: `updatePrivacySetting(key, value)`

### Personalization Settings

- **Interface**: `PersonalizationSettings`
- **Load Function**: `loadPersonalizationSettings()`
- **Store Keys**: Namespaced (e.g., `"personalization.autoPasteOnCompletion"`)
- **Update Method**: `updatePersonalizationSetting(key, value)`

## Common Patterns

### Pattern 1: Simple Boolean Setting

```typescript
// 1. Interface
interface CategorySettings {
  myFeature: boolean;
}

// 2. Default
const defaultSettings = {
  category: {
    myFeature: true, // Default enabled
  }
};

// 3. Load Function
async function loadCategorySettings() {
  return {
    myFeature: (await settingsStore.get<boolean>("category.myFeature")) ?? true,
  };
}

// 4. UI
<Switch
  checked={settings.category.myFeature}
  onCheckedChange={(checked) =>
    updateCategorySetting("myFeature", checked)
  }
/>
```

### Pattern 2: String/Enum Setting

```typescript
// 1. Interface
interface CategorySettings {
  mode: "auto" | "manual" | "disabled";
}

// 2. Default
const defaultSettings = {
  category: {
    mode: "auto" as const,
  }
};

// 3. Load Function
async function loadCategorySettings() {
  return {
    mode: (await settingsStore.get<string>("category.mode")) ?? "auto",
  };
}

// 4. UI
<Select
  value={settings.category.mode}
  onValueChange={(value) => updateCategorySetting("mode", value)}
>
  <SelectItem value="auto">Automatic</SelectItem>
  <SelectItem value="manual">Manual</SelectItem>
  <SelectItem value="disabled">Disabled</SelectItem>
</Select>
```

### Pattern 3: Number Setting

```typescript
// 1. Interface
interface CategorySettings {
  volume: number;
}

// 2. Default
const defaultSettings = {
  category: {
    volume: 1.0,
  }
};

// 3. Load Function
async function loadCategorySettings() {
  return {
    volume: (await settingsStore.get<number>("category.volume")) ?? 1.0,
  };
}

// 4. UI
<Slider
  value={[settings.category.volume]}
  onValueChange={(v) => updateCategorySetting("volume", v[0] ?? 1.0)}
  max={1}
  step={0.1}
/>
```

## Storage Key Conventions

| Category        | Key Format      | Example                                   |
| --------------- | --------------- | ----------------------------------------- |
| Audio           | Direct          | `"muteSystemAudio"`                       |
| General         | Backend-managed | Handled by Tauri commands                 |
| Privacy         | Namespaced      | `"privacy.usageAnalytics"`                |
| Personalization | Namespaced      | `"personalization.autoPasteOnCompletion"` |

## Update Method Patterns

### Individual Update Methods (Audio/General)

```typescript
updateMuteSystemAudio: async (mute: boolean) => {
  const { settings } = get();
  const newSettings = {
    ...settings,
    audio: { ...settings.audio, muteSystemAudio: mute },
  };
  set({ settings: newSettings });
  await saveWithMeta(settingsStore, "muteSystemAudio", mute);
},
```

### Generic Update Methods (Privacy/Personalization)

```typescript
updatePersonalizationSetting: async (key: keyof PersonalizationSettings, value: boolean) => {
  const { settings } = get();
  const newSettings = {
    ...settings,
    personalization: { ...settings.personalization, [key]: value },
  };
  set({ settings: newSettings });
  await saveWithMeta(settingsStore, `personalization.${key}`, value);
},
```

## Best Practices

### ✅ Do

1. **Always provide defaults** in both `defaultSettings` and load functions
2. **Use type-safe interfaces** for all settings
3. **Follow existing naming conventions** for consistency
4. **Test both new installations and upgrades** to ensure defaults work
5. **Use descriptive UI labels and help text**
6. **Handle errors gracefully** in async operations

### ❌ Don't

1. **Don't forget the load function** - settings won't persist properly
2. **Don't use different default values** between `defaultSettings` and load functions
3. **Don't directly mutate settings state** - always create new objects
4. **Don't skip TypeScript types** - they prevent runtime errors
5. **Don't forget to export new interfaces** if needed by other components

## Migration Considerations

When adding new settings, consider:

1. **Backward Compatibility**: New settings should have sensible defaults
2. **Migration Scripts**: Located in `apps/desktop/src/lib/settings/migrations/`
3. **Version Bumping**: Update `CURRENT_SETTINGS_VERSION` if needed

## Debugging Tips

1. **Check Browser DevTools**: Settings are logged during initialization
2. **Verify Load Function**: Ensure new settings appear in the loaded state
3. **Test Fresh Install**: Clear settings file to test default behavior
4. **Check File System**: Settings stored in `~/.local/share/dev.voicegecko.app/settings.json`

## Example: Complete Implementation

Here's the complete implementation for the auto-paste feature:

```typescript
// 1. Interface Definition
interface PersonalizationSettings {
  autoPasteOnCompletion: boolean;
}

// 2. Default Value
const defaultSettings = {
  personalization: {
    autoPasteOnCompletion: true,
  }
};

// 3. Load Function
async function loadPersonalizationSettings() {
  return {
    autoPasteOnCompletion:
      (await settingsStore.get<boolean>("personalization.autoPasteOnCompletion")) ?? true,
  };
}

// 4. UI Component
<Switch
  checked={settings.personalization.autoPasteOnCompletion}
  onCheckedChange={(checked) =>
    updatePersonalizationSetting("autoPasteOnCompletion", checked)
  }
/>

// 5. Usage in Code
if (settings.personalization.autoPasteOnCompletion) {
  await invoke("simulate_paste");
}
```

This documentation should serve as a comprehensive reference for future settings development!
