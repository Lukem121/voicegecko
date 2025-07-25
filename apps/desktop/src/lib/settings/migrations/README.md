# Settings Migration System

A simplified versioning system for settings that's ready to grow with your user base.

## Current State: Version 1 (Clean Start)

The system is now in a clean state:

- All settings start at **version 1**
- No migrations exist or run
- System just ensures `_meta` versioning is present
- Ready for your first migration when needed
- ✅ **Migration system tested and working!**

## Quick Start

```typescript
import { migrationManager } from "./migrations/manager";

// Call once on app startup
const result = await migrationManager.migrateSettings();

if (!result.success) {
  console.error("Migration failed:", result.error);
}
```

This adds versioning metadata to settings if missing:

```json
{
  "_meta": {
    "version": 1,
    "timestamp": 1234567890
  }
  // ... your other settings
}
```

## File Structure

```
migrations/
├── types.ts          # Basic types for versioning
├── registry.ts       # Migration registry (empty)
├── manager.ts        # Simple versioning manager
├── migrations/       # Future migration files go here
└── README.md         # This file
```

## Adding Your First Migration

When you're ready to add your first migration:

### 1. Update Version Number

In `registry.ts`:

```typescript
export const CURRENT_SETTINGS_VERSION = 2; // was 1
```

### 2. Create Migration File

Create `migrations/001-description.ts`:

```typescript
import type { Migration } from "../types";

export const migration_1_to_2: Migration = {
  version: 2,
  description: "Add new feature settings",

  up: (settings: any) => {
    return {
      ...settings,
      newFeature: { enabled: true }, // Add your changes
      _meta: {
        ...settings._meta,
        version: 2,
        timestamp: Date.now(),
      },
    };
  },

  // Optional rollback
  down: (settings: any) => {
    const { newFeature, ...oldSettings } = settings;
    return {
      ...oldSettings,
      _meta: { ...settings._meta, version: 1 },
    };
  },
};
```

### 3. Register Migration

In `registry.ts`:

```typescript
import { migration_1_to_2 } from "./migrations/001-description";

export const MIGRATIONS: Migration<any, any>[] = [
  migration_1_to_2 as Migration<any, any>,
];
```

### 4. Test Your Migration

The migration logic is already implemented in the manager and will automatically run when the app starts.

## Migration Best Practices

### ✅ DO:

- Always update `_meta.version` in migrations
- Check if data exists before transforming
- Use defensive programming (handle missing fields)
- Test with real user data
- Keep migrations simple and focused

### ❌ DON'T:

- Skip version numbers
- Assume data structure exists
- Throw errors for missing data
- Modify original settings object directly

## Common Migration Patterns

### Adding New Field

```typescript
up: (settings) => ({
  ...settings,
  newField: settings.newField ?? "default value",
  _meta: { ...settings._meta, version: 2, timestamp: Date.now() },
});
```

### Renaming Field

```typescript
up: (settings) => {
  const { oldField, ...rest } = settings;
  return {
    ...rest,
    newField: oldField,
    _meta: { ...settings._meta, version: 2, timestamp: Date.now() },
  };
};
```

### Restructuring (Flat → Nested)

```typescript
up: (settings) => {
  const { field1, field2, ...rest } = settings;
  return {
    ...rest,
    category: { field1, field2 },
    _meta: { ...settings._meta, version: 2, timestamp: Date.now() },
  };
};
```

## Future Enhancements

When you have more users, you can add:

- Backup system before migrations
- Rollback functionality
- Migration validation
- Progress tracking for large migrations
- Cloud sync conflict resolution

For now, keep it simple! 🚀
