# Automation Improvements

## Current Pain Points

1. **Manual version updates** across 4 different files
2. **Manual GitHub Actions runner** management
3. **Version synchronization** between web and desktop apps

## Recommended Automation Solutions

### 1. Automated Version Management

#### Option A: NPM Version Script (Recommended for Solo Dev)

Create a simple script to update all version files at once:

```bash
# Add to root package.json scripts:
"version:bump": "node scripts/bump-version.js"
```

Create `scripts/bump-version.js`:

```javascript
// This script would update all 4 files with the new version
// Run with: pnpm version:bump 0.0.8
```

#### Option B: Changesets (More Advanced)

- Automatic changelog generation
- Automated version bumping
- Better for tracking changes

### 2. Release Script

Create `scripts/release.sh`:

```bash
#!/bin/bash
# 1. Bump versions
# 2. Commit changes
# 3. Create git tag
# 4. Push to release branch
# 5. Create GitHub release
```

### 3. Self-Hosted Runner Management

#### Auto-start Runner

- Set up runner as a Windows service
- Use PM2 or similar for process management
- Add health checks

#### GitHub Actions Improvements

- Add better error handling
- Add Slack/Discord notifications
- Add rollback capabilities

## Quick Wins (Implement First)

### 1. Version Check Script

Add to `package.json` scripts:

```json
{
  "scripts": {
    "version:check": "node scripts/check-versions.js"
  }
}
```

### 2. Pre-release Validation

```json
{
  "scripts": {
    "pre-release": "pnpm lint && pnpm typecheck && pnpm version:check"
  }
}
```

### 2.5. Forced Update Guidance (Manual Step)

Add a note to your release steps for breaking changes:

1. Publish desktop artifacts (GitHub Release).
2. Set `MIN_SUPPORTED_DESKTOP_VERSION` in the web environment to the new desktop version.
3. Deploy the web app so TRPC begins returning HTTP 426 to older clients.

### 3. Release Checklist Script

Interactive script that walks through the release process.

## Future Improvements

- **Semantic Release**: Automatic version bumping based on commit messages
- **Release Drafter**: Auto-generate release notes
- **Dependabot**: Automated dependency updates
- **Release Calendar**: Schedule releases

## Implementation Priority

1. ✅ **Documentation** (Done)
2. 🔄 **Version check script** (Quick win)
3. 🔄 **Automated version bump script** (High impact)
4. 🔄 **Release validation script** (Safety)
5. 🔄 **GitHub Actions improvements** (Medium term)
