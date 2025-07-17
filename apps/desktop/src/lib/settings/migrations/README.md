# Settings Migration System

This system handles backward compatibility for settings as the application evolves. It ensures that user settings are preserved and properly migrated when updating to new versions.

## Overview

The migration system:

- Automatically runs during app initialization
- Creates backups before migrating
- Supports rollback (if migrations define `down` methods)
- Works with all LazyStore-based settings

## Architecture

```
migrations/
├── types.ts          # TypeScript types
├── registry.ts       # Migration registry and version control
├── manager.ts        # Migration execution logic
├── migrations/       # Individual migration files
│   ├── 001-add-versioning.ts
│   ├── 002-audio-settings-restructure.ts
│   └── ...
└── README.md         # This file
```

## Adding a New Migration

### 1. Update the Version Number

In `registry.ts`, increment `CURRENT_SETTINGS_VERSION`:

```typescript
export const CURRENT_SETTINGS_VERSION = 4; // was 3
```

### 2. Create Migration File

Create a new file in `migrations/` following the naming convention:
`00X-description.ts`

```typescript
import type { Migration } from "../types";

export const migration_3_to_4: Migration = {
  version: 4,
  description: "Add new feature settings",

  up: (settings: any) => {
    const newSettings = { ...settings };

    // Add your migration logic here
    newSettings.newFeature = {
      enabled: true,
      config: "default",
    };

    // Always update version
    newSettings._meta = {
      ...newSettings._meta,
      version: 4,
      timestamp: Date.now(),
    };

    return newSettings;
  },

  // Optional: Add rollback support
  down: (settings: any) => {
    const oldSettings = { ...settings };

    // Remove the new feature
    delete oldSettings.newFeature;

    // Revert version
    oldSettings._meta = {
      ...oldSettings._meta,
      version: 3,
      timestamp: Date.now(),
    };

    return oldSettings;
  },
};
```

### 3. Register the Migration

Add your migration to `registry.ts`:

```typescript
import { migration_3_to_4 } from "./migrations/003-new-feature";

export const MIGRATIONS: Migration[] = [
  migration_1_to_2,
  migration_2_to_3,
  migration_3_to_4, // Add your new migration
];
```

## Migration Guidelines

### DO:

- Always update the `_meta.version` field
- Create defensive migrations that check if data exists
- Test migrations with real user data samples
- Keep migrations simple and focused
- Document complex transformations

### DON'T:

- Don't assume data structure - always check
- Don't throw errors - handle edge cases gracefully
- Don't modify the original settings object
- Don't skip versions (migrations must be sequential)

## Testing Migrations

### Manual Testing

1. Create a test settings file with old structure:

```json
{
  "selectedDevice": "Microphone",
  "volume": 0.8
}
```

2. Run the app and verify migration:

```json
{
  "_meta": {
    "version": 3,
    "timestamp": 1234567890
  },
  "audio": {
    "selectedDevice": "Microphone",
    "notificationVolume": 0.8
  }
}
```

### Automated Testing (Future)

```typescript
import { migration_2_to_3 } from "./migrations/002-audio-settings-restructure";

test("migrates audio settings correctly", () => {
  const oldSettings = {
    selectedDevice: "Test Device",
    volume: 0.5,
  };

  const newSettings = migration_2_to_3.up(oldSettings);

  expect(newSettings.audio.selectedDevice).toBe("Test Device");
  expect(newSettings.audio.notificationVolume).toBe(0.5);
  expect(newSettings._meta.version).toBe(3);
});
```

## Backup and Recovery

Backups are automatically created before each migration:

- Stored as: `{storeName}-backup-{timestamp}.json`
- Example: `settings-backup-2024-01-15T10-30-45-123Z.json`

To restore from backup:

```typescript
await migrationManager.restoreFromBackup(
  "settings-backup-2024-01-15T10-30-45-123Z.json",
  "settings",
);
```

## Future Cloud Sync Considerations

The migration system is designed with cloud sync in mind:

1. **Version Tracking**: Each setting has `_meta.version` for conflict resolution
2. **Timestamps**: Track when settings were last modified
3. **Device ID**: Can be added to `_sync` metadata
4. **Conflict Resolution**: Higher version wins, or prompt user

Example future structure:

```typescript
{
  "_meta": {
    "version": 3,
    "timestamp": 1234567890,
    "appVersion": "1.2.0"
  },
  "_sync": {
    "lastSynced": 1234567890,
    "deviceId": "device-123",
    "conflicts": []
  },
  // ... actual settings
}
```

## Common Migration Patterns

### Renaming a Field

```typescript
up: (settings) => ({
  ...settings,
  newFieldName: settings.oldFieldName,
  oldFieldName: undefined, // Remove old field
});
```

### Moving to Nested Structure

```typescript
up: (settings) => ({
  ...settings,
  category: {
    field1: settings.field1,
    field2: settings.field2,
  },
  field1: undefined,
  field2: undefined,
});
```

### Adding Defaults

```typescript
up: (settings) => ({
  ...settings,
  newField: settings.newField ?? "default value",
});
```

### Converting Types

```typescript
up: (settings) => ({
  ...settings,
  // Convert string to number
  volume:
    typeof settings.volume === "string"
      ? parseFloat(settings.volume)
      : settings.volume,
});
```
